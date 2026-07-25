import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Kiosk } from './entities/kiosk.entity';
import { KIOSK_SORTABLE_COLUMNS } from './dto/list-kiosks.query';

const EXPIRING_WINDOW_DAYS = 30;

export interface KioskListFilters {
  searchTerm?: string;
  status?: string;
  businessTypeId?: string;
  customerId?: string;
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
export class KiosksRepository {
  constructor(
    @InjectRepository(Kiosk)
    private readonly repo: Repository<Kiosk>,
  ) {}

  private baseQuery(): SelectQueryBuilder<Kiosk> {
    return this.repo
      .createQueryBuilder('k')
      .leftJoinAndSelect('k.customers', 'customers')
      .leftJoinAndSelect('k.categories', 'categories')
      .leftJoinAndSelect('k.business_types', 'business_types');
  }

  async findAndCount(f: KioskListFilters): Promise<[Kiosk[], number]> {
    const qb = this.baseQuery();

    if (f.customerId) {
      qb.andWhere('k.customer_id = :customerId', { customerId: f.customerId });
    }

    const search = normalizeSearchTerm(f.searchTerm ?? '');
    if (search) {
      qb.andWhere(
        `(k.facebook_id ILIKE :pattern OR k.facebook_name ILIKE :pattern
          OR k.status ILIKE :pattern OR business_types.name ILIKE :pattern)`,
        { pattern: `%${search}%` },
      );
    }

    this.applyStatusFilter(qb, f.status ?? '');

    if (f.businessTypeId) {
      qb.andWhere('k.business_type_id = :btId', { btId: f.businessTypeId });
    }

    const orderColumn = KIOSK_SORTABLE_COLUMNS.includes(f.sortColumn as never)
      ? f.sortColumn
      : 'created_at';
    qb.orderBy(`k.${orderColumn}`, f.sortAscending ? 'ASC' : 'DESC');
    qb.skip((f.page - 1) * f.pageSize).take(f.pageSize);

    return qb.getManyAndCount();
  }

  findById(id: string): Promise<Kiosk | null> {
    return this.baseQuery().where('k.id = :id', { id }).getOne();
  }

  findByCustomer(customerId: string): Promise<Kiosk[]> {
    return this.baseQuery()
      .where('k.customer_id = :customerId', { customerId })
      .orderBy('k.facebook_name', 'ASC')
      .getMany();
  }

  /** Plain row without relations — for update/save round-trips. */
  findRawById(id: string): Promise<Kiosk | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<Kiosk>): Promise<Kiosk> {
    return this.repo.save(this.repo.create(data));
  }

  save(kiosk: Kiosk): Promise<Kiosk> {
    return this.repo.save(kiosk);
  }

  private applyStatusFilter(qb: SelectQueryBuilder<Kiosk>, status: string): void {
    if (!status) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDate = today.toISOString().slice(0, 10);

    if (status === 'expired') {
      qb.andWhere('(k.status = :expired OR k.end_date < :today)', {
        expired: 'expired',
        today: todayDate,
      });
      return;
    }

    if (status !== 'warning') {
      qb.andWhere('k.status = :status', { status });
      return;
    }

    const warningEnd = new Date(today);
    warningEnd.setDate(today.getDate() + EXPIRING_WINDOW_DAYS);
    qb.andWhere(
      `k.status IN (:...warnStatuses) AND k.end_date >= :today AND k.end_date <= :warnEnd`,
      {
        warnStatuses: ['active', 'warning'],
        today: todayDate,
        warnEnd: warningEnd.toISOString().slice(0, 10),
      },
    );
  }
}
