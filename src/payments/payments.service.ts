import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PaymentsRepository, PaymentListFilters } from './payments.repository';
import { KiosksRepository } from '../kiosks/kiosks.repository';
import { Payment } from './entities/payment.entity';
import { ListPaymentsQuery } from './dto/list-payments.query';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { RenewKioskDto } from './dto/renew-kiosk.dto';
import {
  PaymentSummary,
  RenewalPreview,
  buildPaymentSummary,
  buildRenewalPreview,
  normalizeOptionalText,
} from './payments.util';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly payments: PaymentsRepository,
    private readonly kiosks: KiosksRepository,
  ) {}

  private filtersOf(query: ListPaymentsQuery): PaymentListFilters {
    return {
      searchTerm: query.searchTerm,
      status: query.status,
      paymentMethod: query.paymentMethod,
      businessTypeId: query.businessTypeId,
      customerId: query.customerId,
    };
  }

  async list(query: ListPaymentsQuery): Promise<{ data: Payment[]; count: number }> {
    const [data, count] = await this.payments.findAndCount({
      ...this.filtersOf(query),
      sortColumn: query.sortColumn ?? 'created_at',
      sortAscending: query.sortAscending ?? false,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
    });
    return { data, count };
  }

  async listWithSummary(
    query: ListPaymentsQuery,
  ): Promise<{ data: Payment[]; count: number; summary: PaymentSummary }> {
    const filters = this.filtersOf(query);
    const [[data, count], summaryRows] = await Promise.all([
      this.payments.findAndCount({
        ...filters,
        sortColumn: query.sortColumn ?? 'created_at',
        sortAscending: query.sortAscending ?? false,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
      }),
      this.payments.findForSummary(filters),
    ]);
    return { data, count, summary: buildPaymentSummary(summaryRows) };
  }

  async getSummary(query: ListPaymentsQuery): Promise<{ data: PaymentSummary }> {
    const rows = await this.payments.findForSummary(this.filtersOf(query));
    return { data: buildPaymentSummary(rows) };
  }

  async listPending(): Promise<{ data: Payment[] }> {
    return { data: await this.payments.findPending() };
  }

  async listByKiosk(kioskId: string): Promise<{ data: Payment[] }> {
    return { data: await this.payments.findByKiosk(kioskId) };
  }

  async getById(id: string): Promise<{ data: Payment }> {
    const payment = await this.payments.findById(id);
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return { data: payment };
  }

  async create(dto: CreatePaymentDto): Promise<{ data: Payment }> {
    return { data: await this.payments.create(dto) };
  }

  async updatePending(id: string, dto: UpdatePaymentDto): Promise<{ data: Payment }> {
    const payment = await this.payments.findRawById(id);
    if (!payment || payment.payment_status !== 'pending') {
      throw new NotFoundException('Không tìm thấy thanh toán chờ duyệt.');
    }
    return { data: await this.payments.save(Object.assign(payment, dto)) };
  }

  async confirm(id: string): Promise<{ data: { id: string } }> {
    await this.payments.confirm(id);
    return { data: { id } };
  }

  async reject(id: string): Promise<{ data: Payment }> {
    return { data: await this.payments.reject(id) };
  }

  async cancelRegistration(id: string): Promise<{ data: Payment }> {
    return { data: await this.payments.cancelRegistration(id) };
  }

  async renewKiosk(
    dto: RenewKioskDto,
  ): Promise<{ data: { payment: Payment; renewal: RenewalPreview } }> {
    const kiosk = await this.kiosks.findById(dto.kioskId);
    if (!kiosk) throw new NotFoundException('Kiosk là bắt buộc để gia hạn.');
    if (!kiosk.customer_id) throw new BadRequestException('Kiosk thiếu customer_id.');

    const renewal = buildRenewalPreview(kiosk, {
      months: dto.months ?? 1,
      discount: dto.discount ?? 0,
    });

    const created = await this.payments.create({
      customer_id: kiosk.customer_id,
      kiosk_id: kiosk.id,
      start_date: renewal.startDate,
      end_date: renewal.endDate,
      months: renewal.months,
      price_per_month: renewal.pricePerMonth,
      discount: renewal.discount,
      discount_reason: normalizeOptionalText(dto.discountReason),
      total_amount: renewal.totalAmount,
      payment_method: 'transfer',
      payment_status: 'pending',
      note: normalizeOptionalText(dto.note),
    });

    await this.payments.confirm(created.id);
    const payment = (await this.payments.findById(created.id)) ?? created;
    return { data: { payment, renewal } };
  }
}
