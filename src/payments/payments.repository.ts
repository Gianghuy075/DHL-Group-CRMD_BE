import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Payment } from './entities/payment.entity';
import { Kiosk } from '../kiosks/entities/kiosk.entity';
import { Customer } from '../customers/entities/customer.entity';
import { PAYMENT_SORTABLE_COLUMNS } from './dto/list-payments.query';

export interface PaymentListFilters {
  searchTerm?: string;
  status?: string;
  paymentMethod?: string;
  businessTypeId?: string;
  customerId?: string;
}

export interface PaymentListPaged extends PaymentListFilters {
  sortColumn: string;
  sortAscending: boolean;
  page: number;
  pageSize: number;
}

function normalizeSearchTerm(value: string): string {
  return String(value || '')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  private get schema(): string {
    return (this.repo.manager.connection.options as { schema?: string }).schema ?? 'public';
  }

  private hydratedQuery(): SelectQueryBuilder<Payment> {
    return this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.customers', 'customers')
      .leftJoinAndSelect('p.kiosks', 'kiosks')
      .leftJoinAndSelect('kiosks.business_types', 'business_types');
  }

  private applyFilters(qb: SelectQueryBuilder<Payment>, f: PaymentListFilters): void {
    if (f.customerId) qb.andWhere('p.customer_id = :customerId', { customerId: f.customerId });
    if (f.status) qb.andWhere('p.payment_status = :status', { status: f.status });
    if (f.paymentMethod) qb.andWhere('p.payment_method = :method', { method: f.paymentMethod });
    if (f.businessTypeId) {
      qb.andWhere('kiosks.business_type_id = :btId', { btId: f.businessTypeId });
    }

    const search = normalizeSearchTerm(f.searchTerm ?? '');
    if (search) {
      qb.andWhere(
        `(p.payment_status ILIKE :pattern OR p.payment_method ILIKE :pattern
          OR p.discount_reason ILIKE :pattern OR p.note ILIKE :pattern
          OR customers.facebook_name ILIKE :pattern OR customers.facebook_id ILIKE :pattern
          OR customers.phone ILIKE :pattern
          OR kiosks.facebook_name ILIKE :pattern OR kiosks.facebook_id ILIKE :pattern
          OR business_types.name ILIKE :pattern)`,
        { pattern: `%${search}%` },
      );
    }
  }

  async findAndCount(f: PaymentListPaged): Promise<[Payment[], number]> {
    const qb = this.hydratedQuery();
    this.applyFilters(qb, f);

    const orderColumn = PAYMENT_SORTABLE_COLUMNS.includes(f.sortColumn as never)
      ? f.sortColumn
      : 'created_at';
    qb.orderBy(`p.${orderColumn}`, f.sortAscending ? 'ASC' : 'DESC');
    qb.skip((f.page - 1) * f.pageSize).take(f.pageSize);

    return qb.getManyAndCount();
  }

  /** All matching rows (no pagination) for revenue/summary aggregation. */
  findForSummary(f: PaymentListFilters): Promise<Payment[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoin('p.customers', 'customers')
      .leftJoin('p.kiosks', 'kiosks')
      .leftJoin('kiosks.business_types', 'business_types');
    this.applyFilters(qb, f);
    return qb.getMany();
  }

  findPending(): Promise<Payment[]> {
    return this.hydratedQuery()
      .where('p.payment_status = :pending', { pending: 'pending' })
      .orderBy('p.created_at', 'ASC')
      .getMany();
  }

  findByKiosk(kioskId: string): Promise<Payment[]> {
    return this.repo
      .createQueryBuilder('p')
      .where('p.kiosk_id = :kioskId', { kioskId })
      .orderBy('p.created_at', 'DESC')
      .getMany();
  }

  findById(id: string): Promise<Payment | null> {
    return this.hydratedQuery().where('p.id = :id', { id }).getOne();
  }

  findRawById(id: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<Payment>): Promise<Payment> {
    return this.repo.save(this.repo.create(data));
  }

  save(payment: Payment): Promise<Payment> {
    return this.repo.save(payment);
  }

  /** Calls the DB's SECURITY DEFINER confirm_payment(uuid) — same as the FE RPC. */
  async confirm(id: string): Promise<void> {
    try {
      await this.repo.query(`SELECT "${this.schema}".confirm_payment($1)`, [id]);
    } catch (error) {
      // Surface the DB message (e.g. "Không tìm thấy thanh toán chờ duyệt.").
      throw new BadRequestException((error as Error).message);
    }
  }

  async reject(id: string): Promise<Payment> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Payment)
      .set({ payment_status: 'rejected' })
      .where('id = :id AND payment_status = :pending', { id, pending: 'pending' })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Không tìm thấy thanh toán chờ duyệt.');
    }
    return this.findRawById(id) as Promise<Payment>;
  }

  /**
   * Cancels a pending registration atomically: mark the payment cancelled and,
   * if the kiosk/customer are still pending, flip them to inactive. Any failure
   * rolls the whole transaction back (replaces the FE's manual compensation).
   */
  async cancelRegistration(id: string): Promise<Payment> {
    return this.repo.manager.transaction(async (em) => {
      const payment = await em.findOne(Payment, {
        where: { id },
        relations: ['customers', 'kiosks'],
      });

      if (!payment || payment.payment_status !== 'pending') {
        throw new ConflictException('Không tìm thấy thanh toán chờ duyệt.');
      }

      await em.update(Payment, { id }, { payment_status: 'cancelled' });
      payment.payment_status = 'cancelled';

      if (payment.kiosk_id && payment.kiosks?.status === 'pending') {
        await em.update(
          Kiosk,
          { id: payment.kiosk_id, status: 'pending' },
          { status: 'inactive' },
        );
      }

      if (payment.customer_id && payment.customers?.status === 'pending') {
        await em.update(
          Customer,
          { id: payment.customer_id, status: 'pending' },
          { status: 'inactive' },
        );
      }

      return payment;
    });
  }
}
