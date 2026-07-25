import { IsNumber, Min } from 'class-validator';

// Dev-only fake deposit — allows small amounts (e.g. 2.000 đ) for testing.
export class DevCreditDto {
  @IsNumber()
  @Min(1)
  amount: number;
}
