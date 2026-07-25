import { IsString, MinLength } from 'class-validator';

export class VerifyProfileDto {
  @IsString()
  @MinLength(10, { message: 'Access token Facebook không hợp lệ.' })
  accessToken: string;
}
