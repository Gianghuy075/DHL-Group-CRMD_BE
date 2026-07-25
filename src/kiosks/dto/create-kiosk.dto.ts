import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateKioskDto {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsString() facebook_name?: string;
  @IsOptional() @IsString() facebook_id?: string;
  @IsOptional() @IsString() facebook_link?: string;
  @IsOptional() @IsString() facebook_group_link?: string;
  @IsOptional() @IsUUID() category_id?: string;
  @IsOptional() @IsUUID() business_type_id?: string;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsBoolean() auto_approve?: boolean;
  @IsOptional() @IsString() note?: string;
}
