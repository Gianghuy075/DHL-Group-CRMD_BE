import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  // Letters, digits, dot, underscore, hyphen; 3–40 chars.
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,40}$/, {
    message: 'Username 3–40 ký tự, chỉ gồm chữ, số, dấu . _ -',
  })
  username: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự.' })
  @MaxLength(72)
  password: string;
}
