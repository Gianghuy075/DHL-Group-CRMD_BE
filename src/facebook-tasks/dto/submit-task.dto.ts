import { IsOptional, IsString } from 'class-validator';

export class SubmitTaskDto {
  @IsOptional()
  @IsString()
  proofImageUrl?: string;
}
