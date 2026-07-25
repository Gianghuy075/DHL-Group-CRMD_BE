import { IsObject, IsOptional, IsString } from 'class-validator';

// PayOS posts { code, desc, success, data:{...}, signature }. We validate only
// the outer shape; `data` is kept intact for signature verification.
export class PayosWebhookDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  success?: boolean;

  @IsObject()
  data: Record<string, unknown>;

  @IsString()
  signature: string;
}
