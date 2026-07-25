import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TopupDto {
  @IsNumber()
  @Min(10000, { message: 'Số tiền nạp tối thiểu là 10.000 đ.' })
  amount: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
