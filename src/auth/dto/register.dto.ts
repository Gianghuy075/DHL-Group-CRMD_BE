import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  // Letters, digits, dot, underscore, hyphen; 3–30 chars.
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,30}$/, {
    message: 'Tên đăng nhập 3–30 ký tự, chỉ gồm chữ, số, dấu . _ -',
  })
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự.' })
  @MaxLength(72)
  password: string;
}
