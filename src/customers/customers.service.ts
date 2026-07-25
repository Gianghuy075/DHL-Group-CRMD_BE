import { Injectable, NotFoundException } from '@nestjs/common';

import { Customer } from './entities/customer.entity';
import { CustomersRepository } from './customers.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FacebookVerificationDto } from './dto/facebook-verification.dto';
import { ListCustomersQuery } from './dto/list-customers.query';

@Injectable()
export class CustomersService {
  constructor(private readonly customers: CustomersRepository) {}

  async list(query: ListCustomersQuery): Promise<{ data: Customer[]; count: number }> {
    const {
      searchTerm = '',
      status = '',
      kioskState = '',
      sortColumn = 'created_at',
      sortAscending = false,
      page = 1,
      pageSize = 25,
    } = query;

    // Narrow by kiosk state first (mirrors the FE's two-step lookup).
    const customerIds = await this.customers.findCustomerIdsByKioskState(kioskState);
    if (customerIds && customerIds.length === 0) {
      return { data: [], count: 0 };
    }

    const [data, count] = await this.customers.findAndCount({
      searchTerm,
      status,
      customerIds,
      sortColumn,
      sortAscending,
      page,
      pageSize,
    });
    return { data, count };
  }

  async getById(id: string): Promise<{ data: Customer }> {
    return { data: await this.getOrFail(id) };
  }

  async create(dto: CreateCustomerDto): Promise<{ data: Customer }> {
    const saved = await this.customers.create(dto as Partial<Customer>);
    return { data: saved };
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<{ data: Customer }> {
    const customer = await this.getOrFail(id);
    Object.assign(customer, dto);
    return { data: await this.customers.save(customer) };
  }

  async updateFacebookVerification(
    id: string,
    dto: FacebookVerificationDto,
  ): Promise<{ data: Customer }> {
    const customer = await this.getOrFail(id);
    customer.facebook_verified = dto.verified ?? true;
    customer.facebook_verified_at = new Date();
    customer.friend_count = dto.friendCount ?? 0;
    customer.follower_count = dto.followerCount ?? 0;
    customer.is_public_profile = dto.isPublic ?? true;
    if (dto.facebookId) {
      customer.facebook_id = dto.facebookId;
    }
    if (dto.facebookName) {
      customer.facebook_name = dto.facebookName;
    }
    return { data: await this.customers.save(customer) };
  }

  private async getOrFail(id: string): Promise<Customer> {
    const customer = await this.customers.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }
}
