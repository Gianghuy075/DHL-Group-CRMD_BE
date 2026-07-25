import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Customer } from '../customers/entities/customer.entity';

interface GraphMeResponse {
  id?: string;
  name?: string;
  friends?: { summary?: { total_count?: number } };
  error?: { message?: string };
}

/**
 * Real Facebook profile verification via the Graph API. The frontend obtains a
 * short-lived USER access token through Facebook Login and sends it here; the
 * backend calls /me to read the user's own id, name and friend count. This is
 * the only Facebook data the API lets us verify for an arbitrary logged-in user
 * (cross-interaction proof still goes through manual admin review).
 */
@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);
  private readonly graphVersion: string;

  constructor(
    config: ConfigService,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {
    this.graphVersion = config.get<string>('FB_GRAPH_VERSION', 'v19.0');
  }

  /** Calls the Graph API /me endpoint and returns the verified profile only. */
  private async fetchGraphProfile(accessToken: string) {
    if (!accessToken) {
      throw new BadRequestException('Thiếu access token Facebook.');
    }

    const url =
      `https://graph.facebook.com/${this.graphVersion}/me` +
      `?fields=id,name,friends.summary(true)` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    let body: GraphMeResponse;
    try {
      const res = await fetch(url);
      body = (await res.json()) as GraphMeResponse;
    } catch (err) {
      this.logger.error('Graph API request failed', err as Error);
      throw new BadRequestException('Không gọi được Facebook Graph API.');
    }

    if (!body?.id || body.error) {
      throw new BadRequestException(
        body?.error?.message || 'Access token Facebook không hợp lệ hoặc đã hết hạn.',
      );
    }

    return {
      facebookId: body.id,
      facebookName: body.name ?? '',
      friendCount: Number(body.friends?.summary?.total_count ?? 0),
    };
  }

  /**
   * Public: verify a Facebook profile via the Graph API WITHOUT persisting it.
   * Used during registration, before the customer account exists. The verified
   * profile is returned to the client and saved when the account is created.
   */
  async previewProfile(accessToken: string) {
    const profile = await this.fetchGraphProfile(accessToken);
    return {
      success: true,
      verified: true,
      facebookId: profile.facebookId,
      facebookName: profile.facebookName,
      friendCount: profile.friendCount,
    };
  }

  async verifyProfile(customerId: string, accessToken: string) {
    const profile = await this.fetchGraphProfile(accessToken);
    const friendCount = profile.friendCount;

    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new BadRequestException('Không tìm thấy khách hàng.');
    }

    customer.facebook_id = profile.facebookId;
    customer.facebook_name = profile.facebookName || customer.facebook_name;
    customer.friend_count = friendCount;
    customer.is_public_profile = true;
    customer.facebook_verified = true;
    customer.facebook_verified_at = new Date();
    const saved = await this.customerRepo.save(customer);

    return {
      success: true,
      verified: true,
      facebookId: saved.facebook_id,
      facebookName: saved.facebook_name,
      friendCount: saved.friend_count,
      data: saved,
    };
  }
}
