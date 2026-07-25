import { IsString } from 'class-validator';

export class SetStatusDto {
  @IsString() status: string;
}
