import { BadRequestException } from '@nestjs/common';

import { Kiosk } from '../kiosks/entities/kiosk.entity';
import { Payment } from './entities/payment.entity';

export interface RenewalPreview {
  businessTypeName: string;
  months: number;
  startDate: string;
  endDate: string;
  pricePerMonth: number;
  discount: number;
  subtotal: number;
  totalAmount: number;
}

export interface PaymentSummary {
  totalRevenue: number;
  monthRevenue: number;
  transferRevenue: number;
  pendingCount: number;
}

// --- date-only helpers (ported from FE utils/date.js) ---
function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return startOfToday();
  return new Date(year, month - 1, day);
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextRenewalStartDate(endDate: string | null): Date {
  if (!endDate) return startOfToday();
  const date = parseDateOnly(endDate);
  date.setDate(date.getDate() + 1);
  return date;
}

export function normalizeOptionalText(value: unknown): string | null {
  return String(value ?? '').trim() || null;
}

export function buildRenewalPreview(
  kiosk: Kiosk,
  { months = 1, discount = 0 }: { months?: number; discount?: number } = {},
): RenewalPreview {
  if (!kiosk) {
    throw new BadRequestException('Kiosk là bắt buộc để gia hạn.');
  }
  if (!kiosk.business_types) {
    throw new BadRequestException('Kiosk thiếu loại hình kinh doanh.');
  }

  const normalizedMonths = Number(months);
  const normalizedDiscount = Math.max(Number(discount || 0), 0);
  const pricePerMonth = Number(kiosk.business_types.price_per_month);

  if (!Number.isInteger(normalizedMonths) || normalizedMonths < 1) {
    throw new BadRequestException('Số tháng phải là số nguyên lớn hơn 0.');
  }
  if (!Number.isFinite(pricePerMonth)) {
    throw new BadRequestException('Giá loại hình kinh doanh không hợp lệ.');
  }

  const start = nextRenewalStartDate(kiosk.end_date);
  const end = addMonths(start, normalizedMonths);
  const subtotal = pricePerMonth * normalizedMonths;

  return {
    businessTypeName: kiosk.business_types.name || '',
    months: normalizedMonths,
    startDate: toDateOnly(start),
    endDate: toDateOnly(end),
    pricePerMonth,
    discount: normalizedDiscount,
    subtotal,
    totalAmount: Math.max(subtotal - normalizedDiscount, 0),
  };
}

function isSameMonth(value: string | null, target: Date): boolean {
  if (!value) return false;
  const targetMonth = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
  return String(value).slice(0, 7) === targetMonth;
}

function isTransferMethod(value: string | null): boolean {
  return ['transfer', 'bank_transfer', 'chuyen_khoan', 'chuyển khoản'].includes(
    String(value || '').toLowerCase(),
  );
}

export function buildPaymentSummary(payments: Payment[]): PaymentSummary {
  const currentMonth = new Date();
  const summary: PaymentSummary = {
    totalRevenue: 0,
    monthRevenue: 0,
    transferRevenue: 0,
    pendingCount: 0,
  };

  payments.forEach((payment) => {
    const status = String(payment.payment_status || '').toLowerCase();
    const amount = Number(payment.total_amount || 0);

    if (status === 'pending') summary.pendingCount += 1;
    if (status !== 'completed') return;

    summary.totalRevenue += amount;
    if (isSameMonth(payment.start_date, currentMonth)) summary.monthRevenue += amount;
    if (isTransferMethod(payment.payment_method)) summary.transferRevenue += amount;
  });

  return summary;
}
