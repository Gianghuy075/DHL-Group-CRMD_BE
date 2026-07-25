import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Customer } from './entities/customer.entity';
import { SORTABLE_COLUMNS } from './dto/list-customers.query';

const EXPIRING_WINDOW_DAYS = 30;

export interface CustomerListFilters {
  searchTerm?: string;
  status?: string;
  /** Pre-resolved customer ids from a kiosk-state filter, or null when unfiltered. */
  customerIds?: string[] | null;
  sortColumn: string;
  sortAscending: boolean;
  page: number;
  pageSize: number;
}

/**
 * Data-access layer for customers. Owns every TypeORM/SQL detail so the service
 * stays about business rules and response shaping.
 */
@Injectable()
export class CustomersRepository {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  async findAndCount(f: CustomerListFilters): Promise<[Customer[], number]> {
    const qb = this.repo.createQueryBuilder('c');

    if (f.searchTerm) {
      qb.andWhere(
        '(c.phone ILIKE :pattern OR c.facebook_id ILIKE :pattern OR c.facebook_name ILIKE :pattern)',
        { pattern: `%${f.searchTerm}%` },
      );
    }
    if (f.status) {
      qb.andWhere('c.status = :status', { status: f.status });
    }
    if (f.customerIds) {
      qb.andWhere('c.id IN (:...ids)', { ids: f.customerIds });
    }

    const orderColumn = SORTABLE_COLUMNS.includes(f.sortColumn as never)
      ? f.sortColumn
      : 'created_at';
    qb.orderBy(`c.${orderColumn}`, f.sortAscending ? 'ASC' : 'DESC');
    qb.skip((f.page - 1) * f.pageSize).take(f.pageSize);

    return qb.getManyAndCount();
  }

  findById(id: string): Promise<Customer | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<Customer>): Promise<Customer> {
    return this.repo.save(this.repo.create(data));
  }

  save(customer: Customer): Promise<Customer> {
    return this.repo.save(customer);
  }

  /**
   * Distinct customer_ids whose kiosks match the given state, or null when no
   * kiosk filtering is requested. Raw SQL is schema-qualified because it does
   * not inherit the entity schema and the pooler's default search_path is public.
   */
  async findCustomerIdsByKioskState(kioskState: string): Promise<string[] | null> {
    if (!kioskState) return null;

    const schema =
      (this.repo.manager.connection.options as { schema?: string }).schema ??
      'public';
    const kiosksTable = `"${schema}"."kiosks"`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDate = today.toISOString().slice(0, 10);

    let rows: Array<{ customer_id: string | null }>;
    if (kioskState === 'expired') {
      rows = await this.repo.manager.query(
        `SELECT customer_id FROM ${kiosksTable}
         WHERE status = 'expired' OR end_date < $1`,
        [todayDate],
      );
    } else if (kioskState === 'warning') {
      const warningEnd = new Date(today);
      warningEnd.setDate(today.getDate() + EXPIRING_WINDOW_DAYS);
      rows = await this.repo.manager.query(
        `SELECT customer_id FROM ${kiosksTable}
         WHERE status IN ('active','warning') AND end_date >= $1 AND end_date <= $2`,
        [todayDate, warningEnd.toISOString().slice(0, 10)],
      );
    } else {
      return null;
    }

    return [
      ...new Set(rows.map((r) => r.customer_id).filter((v): v is string => Boolean(v))),
    ];
  }
}
