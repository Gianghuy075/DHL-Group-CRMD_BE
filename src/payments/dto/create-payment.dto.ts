import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsUUID() kiosk_id?: string;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
  @IsOptional() @IsInt() @Min(1) months?: number;
  @IsOptional() @IsNumber() @Min(0) price_per_month?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsString() discount_reason?: string;
  @IsOptional() @IsNumber() @Min(0) total_amount?: number;
  @IsOptional() @IsString() payment_method?: string;
  @IsOptional() @IsString() payment_status?: string;
  @IsOptional() @IsString() note?: string;
}
