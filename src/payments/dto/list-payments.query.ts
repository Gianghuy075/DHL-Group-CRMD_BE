import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export const PAYMENT_SORTABLE_COLUMNS = [
  'created_at',
  'updated_at',
  'start_date',
  'end_date',
  'total_amount',
  'months',
  'payment_status',
  'payment_method',
] as const;

export class ListPaymentsQuery {
  @IsOptional() @IsString() searchTerm?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsUUID() businessTypeId?: string;
  @IsOptional() @IsUUID() customerId?: string;

  @IsOptional() @IsIn(PAYMENT_SORTABLE_COLUMNS as unknown as string[]) sortColumn?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  sortAscending?: boolean;

  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) pageSize?: number;
}
