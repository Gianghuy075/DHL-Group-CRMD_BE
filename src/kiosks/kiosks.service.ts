import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { KiosksRepository } from './kiosks.repository';
import { Kiosk } from './entities/kiosk.entity';
import { BusinessType } from './entities/business-type.entity';
import { ListKiosksQuery } from './dto/list-kiosks.query';
import { CreateKioskDto } from './dto/create-kiosk.dto';
import { UpdateKioskDto } from './dto/update-kiosk.dto';
import { PurchaseKioskDto } from './dto/purchase-kiosk.dto';
import { WalletService } from '../wallet/wallet.service';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class KiosksService {
  constructor(
    private readonly kiosks: KiosksRepository,
    private readonly dataSource: DataSource,
    private readonly wallet: WalletService,
    @InjectRepository(BusinessType)
    private readonly businessTypeRepo: Repository<BusinessType>,
  ) {}

  /**
   * A logged-in customer buys a kiosk package paid from their wallet balance.
   * Debits the wallet and creates the kiosk atomically.
   */
  async purchaseFromWallet(customerId: string, dto: PurchaseKioskDto) {
    const bt = await this.businessTypeRepo.findOne({ where: { id: dto.businessTypeId } });
    if (!bt) throw new NotFoundException('Không tìm thấy gói dịch vụ.');

    const pricePerMonth = Number(bt.price_per_month);
    const total = pricePerMonth * dto.months;
    if (total <= 0) {
      throw new BadRequestException('Gói dịch vụ chưa có giá hợp lệ.');
    }

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + dto.months);
    const toDate = (d: Date) => d.toISOString().slice(0, 10);

    return this.dataSource.transaction(async (manager) => {
      await this.wallet.debit(
        manager,
        customerId,
        total,
        `Mua gói kiosk "${bt.name ?? ''}" x${dto.months} tháng`,
      );

      const kiosk = await manager.save(
        manager.create(Kiosk, {
          customer_id: customerId,
          business_type_id: bt.id,
          facebook_name: dto.facebookName?.trim() || null,
          facebook_link: dto.facebookLink?.trim() || null,
          start_date: toDate(start),
          end_date: toDate(end),
          status: 'active',
          total_paid: total,
        }),
      );

      return { success: true, kiosk, totalPaid: total };
    });
  }

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
