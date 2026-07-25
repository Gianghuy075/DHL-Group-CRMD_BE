import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export const KIOSK_SORTABLE_COLUMNS = [
  'created_at',
  'updated_at',
  'facebook_name',
  'facebook_id',
  'status',
  'start_date',
  'end_date',
  'total_paid',
] as const;

export class ListKiosksQuery {
  @IsOptional() @IsString() searchTerm?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() businessTypeId?: string;
  @IsOptional() @IsUUID() customerId?: string;

  @IsOptional() @IsIn(KIOSK_SORTABLE_COLUMNS as unknown as string[]) sortColumn?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  sortAscending?: boolean;

  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) pageSize?: number;
}
