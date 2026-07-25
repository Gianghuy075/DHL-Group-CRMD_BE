import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateStaffDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,40}$/, {
    message: 'Username 3–40 ký tự, chỉ gồm chữ, số, dấu . _ -',
  })
  username: string;
}
