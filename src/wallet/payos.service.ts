import { createHmac } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CreatePaymentLinkInput {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  buyerName?: string;
}

export interface PaymentLinkResult {
  orderCode: number;
  checkoutUrl: string;
  qrCode: string;
  accountNo: string;
  accountName: string;
}

/**
 * Server-side PayOS client. Keeps the checksum key on the backend and signs
 * requests / verifies webhooks with HMAC-SHA256 per PayOS v2 spec.
 */
@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);
  private readonly clientId: string;
  private readonly apiKey: string;
  private readonly checksumKey: string;
  private readonly endpoint: string;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('PAYOS_CLIENT_ID', '');
    this.apiKey = config.get<string>('PAYOS_API_KEY', '');
    this.checksumKey = config.get<string>('PAYOS_CHECKSUM_KEY', '');
    this.endpoint = config
      .get<string>('PAYOS_API_ENDPOINT', 'https://api-merchant.payos.vn/v2')
      .replace(/\/$/, '');
  }

  generateOrderCode(): number {
    const timestampStr = Date.now().toString().slice(-9);
    const randomStr = Math.floor(100 + Math.random() * 900).toString();
    return parseInt(timestampStr + randomStr, 10);
  }

  private sign(dataString: string): string {
    return createHmac('sha256', this.checksumKey).update(dataString).digest('hex');
  }

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
    if (!this.clientId || !this.apiKey || !this.checksumKey) {
      throw new BadRequestException('PayOS chưa được cấu hình (PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY).');
    }

    const { orderCode, amount, description, returnUrl, cancelUrl, buyerName } = input;
    // PayOS create-link signature: fixed field order.
    const signature = this.sign(
      `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`,
    );

    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/payment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.clientId,
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          orderCode,
          amount,
          description,
          cancelUrl,
          returnUrl,
          signature,
          buyerName: buyerName || undefined,
        }),
      });
    } catch (err) {
      this.logger.error('PayOS network error', err as Error);
      throw new BadRequestException('Không kết nối được tới PayOS.');
    }

    const result = (await response.json()) as {
      code?: string;
      desc?: string;
      message?: string;
      data?: {
        checkoutUrl: string;
        qrCode?: string;
        accountNumber?: string;
        accountName?: string;
      };
    };

    if (response.ok && result.code === '00' && result.data) {
      return {
        orderCode,
        checkoutUrl: result.data.checkoutUrl,
        qrCode:
          result.data.qrCode ||
          `https://qr.payos.vn/${this.clientId}/${orderCode}/${amount}`,
        accountNo: result.data.accountNumber || '',
        accountName: result.data.accountName || '',
      };
    }

    throw new BadRequestException(result.desc || result.message || 'Không thể tạo đơn PayOS.');
  }

  /** Reads a payment request's status from PayOS (authoritative source of truth). */
  async checkPaymentStatus(
    orderCode: number,
  ): Promise<{ isPaid: boolean; status: string; amountPaid: number }> {
    if (!this.clientId || !this.apiKey) {
      return { isPaid: false, status: 'PENDING', amountPaid: 0 };
    }
    try {
      const res = await fetch(`${this.endpoint}/payment-requests/${orderCode}`, {
        headers: { 'x-client-id': this.clientId, 'x-api-key': this.apiKey },
      });
      const result = (await res.json()) as {
        code?: string;
        data?: { status?: string; amountPaid?: number };
      };
      if (res.ok && result.code === '00' && result.data) {
        const status = result.data.status ?? 'PENDING';
        return {
          isPaid: status === 'PAID',
          status,
          amountPaid: Number(result.data.amountPaid ?? 0),
        };
      }
    } catch (err) {
      this.logger.warn(`checkPaymentStatus failed for ${orderCode}: ${String(err)}`);
    }
    return { isPaid: false, status: 'PENDING', amountPaid: 0 };
  }

  /**
   * Cancels a pending payment request on PayOS so an abandoned top-up doesn't
   * linger as "Chờ thanh toán". Best-effort: returns false instead of throwing
   * when PayOS rejects (e.g. the order is already paid or already cancelled).
   */
  async cancelPaymentLink(orderCode: number, reason: string): Promise<boolean> {
    if (!this.clientId || !this.apiKey) return false;
    try {
      const res = await fetch(
        `${this.endpoint}/payment-requests/${orderCode}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': this.clientId,
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify({ cancellationReason: reason }),
        },
      );
      const result = (await res.json()) as { code?: string; desc?: string };
      if (res.ok && result.code === '00') return true;
      this.logger.warn(
        `cancelPaymentLink ${orderCode} rejected: ${result.desc || result.code}`,
      );
    } catch (err) {
      this.logger.warn(`cancelPaymentLink failed for ${orderCode}: ${String(err)}`);
    }
    return false;
  }

  /**
   * Verifies a webhook body: HMAC-SHA256 over data fields sorted alphabetically
   * as `key=value&...` (null/undefined coerced to empty string).
   */
  verifyWebhookSignature(data: Record<string, unknown>, signature: string): boolean {
    if (!data || !signature) return false;
    const sorted = Object.keys(data)
      .sort()
      .map((key) => {
        const value = data[key];
        const normalized =
          value === null || value === undefined ? '' : String(value);
        return `${key}=${normalized}`;
      })
      .join('&');
    return this.sign(sorted) === signature;
  }
}
