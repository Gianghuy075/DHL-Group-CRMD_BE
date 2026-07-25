import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class PurchaseKioskDto {
  @IsUUID()
  businessTypeId: string;

  @IsInt()
  @Min(1)
  @Max(36)
  months: number;

  // Optional Facebook name/link shown on the kiosk.
  @IsOptional()
  @IsString()
  facebookName?: string;

  @IsOptional()
  @IsString()
  facebookLink?: string;
}
