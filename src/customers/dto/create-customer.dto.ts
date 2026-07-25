import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Mirrors the FE's CUSTOMER_MUTABLE_FIELDS (all optional — FE sends a subset).
export class CreateCustomerDto {
  @IsOptional() @IsString() facebook_name?: string;
  @IsOptional() @IsString() facebook_id?: string;
  @IsOptional() @IsString() facebook_link?: string;
  @IsOptional() @IsString() facebook_group_link?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsBoolean() facebook_verified?: boolean;
  @IsOptional() @IsString() facebook_verified_at?: string;
  @IsOptional() @IsInt() @Min(0) friend_count?: number;
  @IsOptional() @IsInt() @Min(0) follower_count?: number;
  @IsOptional() @IsBoolean() is_public_profile?: boolean;
}
