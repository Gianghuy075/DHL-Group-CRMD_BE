import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const SORTABLE_COLUMNS = [
  'created_at',
  'updated_at',
  'facebook_name',
  'phone',
  'status',
  'total_paid',
  'total_kiosks',
  'wallet_balance',
] as const;

export class ListCustomersQuery {
  @IsOptional() @IsString() searchTerm?: string;

  @IsOptional() @IsString() status?: string;

  @IsOptional() @IsIn(['', 'expired', 'warning']) kioskState?: string;

  @IsOptional() @IsIn(SORTABLE_COLUMNS as unknown as string[]) sortColumn?: string;

  // query string comes in as 'true' | 'false'; normalize to a real boolean
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  sortAscending?: boolean;

  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) page?: number;

  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) pageSize?: number;
}
