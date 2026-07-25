import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Customer } from '../customers/entities/customer.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { PayosService } from './payos.service';
import { PayosWebhookDto } from './dto/payos-webhook.dto';

export interface WalletInfo {
  walletBalance: number;
  bonusBalance: number;
  totalAvailable: number;
}

@Injectable()
export class WalletService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly payos: PayosService,
  ) {}

  async getInfo(customerId: string): Promise<WalletInfo> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    const walletBalance = Number(customer?.wallet_balance ?? 0);
    return { walletBalance, bonusBalance: 0, totalAvailable: walletBalance };
  }

  async listTransactions(customerId: string): Promise<{ data: WalletTransaction[] }> {
    const data = await this.txRepo.find({
      where: { customer_id: customerId },
      order: { created_at: 'DESC' },
    });
    return { data };
  }

  async createTopup(
    customerId: string,
    amount: number,
    buyerName: string | undefined,
    returnUrl?: string,
    cancelUrl?: string,
  ) {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 10000) {
      throw new BadRequestException('Số tiền nạp tối thiểu là 10.000 đ.');
    }

    const orderCode = this.payos.generateOrderCode();
    const description = `NAP VI ${orderCode}`.slice(0, 25);
    const fallbackUrl = returnUrl || 'https://localhost';

    const link = await this.payos.createPaymentLink({
      orderCode,
      amount: numericAmount,
      description,
      returnUrl: returnUrl || fallbackUrl,
      cancelUrl: cancelUrl || returnUrl || fallbackUrl,
      buyerName,
    });

    await this.txRepo.save(
      this.txRepo.create({
        customer_id: customerId,
        transaction_type: 'deposit',
        amount: numericAmount,
        order_code: orderCode,
        payment_method: 'payos',
        status: 'pending',
        description: `Nạp ví qua PayOS ${orderCode}`,
      }),
    );

    return { success: true, amount: numericAmount, description, ...link };
  }

  /**
   * Atomically settles a pending deposit: locks the tx row, marks it completed
   * and credits the wallet. Idempotent by order_code — safe to call from both
   * the webhook and the polled confirm endpoint (whichever fires first wins).
   * Returns the (possibly unchanged) wallet balance and whether it credited.
   */
  private async settleDeposit(
    orderCode: number,
  ): Promise<{ credited: boolean; walletBalance: number }> {
    return this.dataSource.transaction(async (manager) => {
      const tx = await manager.findOne(WalletTransaction, {
        where: { order_code: orderCode },
        lock: { mode: 'pessimistic_write' },
      });
      if (!tx || !tx.customer_id) {
        return { credited: false, walletBalance: 0 };
      }
      if (tx.status === 'completed') {
        const c = await manager.findOne(Customer, { where: { id: tx.customer_id } });
        return { credited: false, walletBalance: Number(c?.wallet_balance ?? 0) };
      }
      tx.status = 'completed';
      await manager.save(tx);
      await manager.increment(
        Customer,
        { id: tx.customer_id },
        'wallet_balance',
        Number(tx.amount),
      );
      const c = await manager.findOne(Customer, { where: { id: tx.customer_id } });
      return { credited: true, walletBalance: Number(c?.wallet_balance ?? 0) };
    });
  }

  /**
   * PayOS webhook handler. Verifies the signature, then settles the deposit.
   * Idempotent by order_code.
   */
  async handleWebhook(body: PayosWebhookDto) {
    if (!this.payos.verifyWebhookSignature(body.data, body.signature)) {
      throw new UnauthorizedException('Chữ ký webhook PayOS không hợp lệ.');
    }

    const orderCode = Number(body.data['orderCode']);
    if (!orderCode) {
      throw new BadRequestException('Webhook thiếu orderCode.');
    }

    await this.settleDeposit(orderCode);
    return { success: true };
  }

  /**
   * Polled status check for the topup modal. Reads PayOS as the source of truth
   * so the FE can advance without waiting on the (deferred) webhook.
   */
  async getPaymentStatus(customerId: string, orderCode: number) {
    const tx = await this.txRepo.findOne({ where: { order_code: orderCode } });
    if (!tx || tx.customer_id !== customerId) {
      throw new NotFoundException('Không tìm thấy đơn nạp.');
    }
    if (tx.status === 'completed') {
      return { isPaid: true, status: 'PAID' };
    }
    const result = await this.payos.checkPaymentStatus(orderCode);
    return { isPaid: result.isPaid, status: result.status };
  }

  /**
   * Server-authoritative deposit confirmation used by the FE poll loop while the
   * webhook is deferred. Re-checks PayOS, then credits idempotently. Never trusts
   * a client-supplied amount — the stored pending tx amount is the source.
   */
  async confirmDeposit(customerId: string, orderCode: number) {
    const tx = await this.txRepo.findOne({ where: { order_code: orderCode } });
    if (!tx || tx.customer_id !== customerId) {
      throw new NotFoundException('Không tìm thấy đơn nạp.');
    }
    if (tx.status === 'completed') {
      const info = await this.getInfo(customerId);
      return { success: true, wallet_balance: info.walletBalance };
    }
    const status = await this.payos.checkPaymentStatus(orderCode);
    if (!status.isPaid) {
      throw new BadRequestException('Chưa nhận được thanh toán từ PayOS.');
    }
    const settled = await this.settleDeposit(orderCode);
    return { success: true, wallet_balance: settled.walletBalance };
  }

  /**
   * Deducts `amount` from a customer's wallet within an existing transaction.
   * Locks the row to prevent concurrent overspend. Throws if balance is short.
   */
  async debit(
    manager: EntityManager,
    customerId: string,
    amount: number,
    description: string,
  ): Promise<void> {
    const customer = await manager.findOne(Customer, {
      where: { id: customerId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng.');
    }
    if (Number(customer.wallet_balance) < amount) {
      throw new BadRequestException(
        `Số dư Ví Ảo không đủ (Số dư: ${Number(customer.wallet_balance).toLocaleString('vi-VN')} đ, Cần: ${amount.toLocaleString('vi-VN')} đ). Vui lòng nạp thêm!`,
      );
    }
    await manager.decrement(Customer, { id: customerId }, 'wallet_balance', amount);
    await manager.save(
      manager.create(WalletTransaction, {
        customer_id: customerId,
        transaction_type: 'spending',
        amount: -amount,
        payment_method: 'wallet',
        status: 'completed',
        description,
      }),
    );
  }

  /**
   * Credits `amount` to a customer's wallet within an existing transaction.
   * `type` must satisfy the DB CHECK ('bonus' for rewards, 'refund' for refunds).
   */
  async credit(
    manager: EntityManager,
    customerId: string,
    amount: number,
    type: 'bonus' | 'refund',
    description: string,
  ): Promise<void> {
    await manager.increment(Customer, { id: customerId }, 'wallet_balance', amount);
    await manager.save(
      manager.create(WalletTransaction, {
        customer_id: customerId,
        transaction_type: type,
        amount,
        payment_method: 'wallet',
        status: 'completed',
        description,
      }),
    );
  }
}
