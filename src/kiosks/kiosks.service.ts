import { Injectable, NotFoundException } from '@nestjs/common';

import { KiosksRepository } from './kiosks.repository';
import { Kiosk } from './entities/kiosk.entity';
import { ListKiosksQuery } from './dto/list-kiosks.query';
import { CreateKioskDto } from './dto/create-kiosk.dto';
import { UpdateKioskDto } from './dto/update-kiosk.dto';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class KiosksService {
  constructor(private readonly kiosks: KiosksRepository) {}

  async list(query: ListKiosksQuery): Promise<{ data: Kiosk[]; count: number }> {
    const [data, count] = await this.kiosks.findAndCount({
      searchTerm: query.searchTerm,
      status: query.status,
      businessTypeId: query.businessTypeId,
      customerId: query.customerId,
      sortColumn: query.sortColumn ?? 'created_at',
      sortAscending: query.sortAscending ?? false,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
    });
    return { data, count };
  }

  async listByCustomer(customerId: string): Promise<{ data: Kiosk[] }> {
    const data = await this.kiosks.findByCustomer(customerId);
    return { data };
  }

  async getById(id: string): Promise<{ data: Kiosk }> {
    return { data: await this.getOrFail(id) };
  }

  async create(dto: CreateKioskDto): Promise<{ data: Kiosk }> {
    const data = await this.kiosks.create(dto);
    return { data };
  }

  async update(id: string, dto: UpdateKioskDto): Promise<{ data: Kiosk }> {
    const kiosk = await this.getRawOrFail(id);
    const data = await this.kiosks.save(Object.assign(kiosk, dto));
    return { data };
  }

  async setStatus(id: string, status: string): Promise<{ data: Kiosk }> {
    const kiosk = await this.getRawOrFail(id);
    kiosk.status = status;
    const data = await this.kiosks.save(kiosk);
    return { data };
  }

  private async getOrFail(id: string): Promise<Kiosk> {
    const kiosk = await this.kiosks.findById(id);
    if (!kiosk) throw new NotFoundException(`Kiosk ${id} not found`);
    return kiosk;
  }

  private async getRawOrFail(id: string): Promise<Kiosk> {
    const kiosk = await this.kiosks.findRawById(id);
    if (!kiosk) throw new NotFoundException(`Kiosk ${id} not found`);
    return kiosk;
  }
}
