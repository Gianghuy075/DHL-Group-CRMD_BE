import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RenewKioskDto {
  @IsUUID() kioskId: string;
  @IsOptional() @IsInt() @Min(1) months?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsString() discountReason?: string;
  @IsOptional() @IsString() note?: string;
}
