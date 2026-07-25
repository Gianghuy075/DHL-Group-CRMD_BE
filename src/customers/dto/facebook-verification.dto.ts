import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

// Matches the camelCase body the FE's FacebookVerificationModal sends.
export class FacebookVerificationDto {
  @IsOptional() @IsBoolean() verified?: boolean;
  @IsOptional() @IsInt() @Min(0) friendCount?: number;
  @IsOptional() @IsInt() @Min(0) followerCount?: number;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() facebookId?: string;
  @IsOptional() @IsString() facebookName?: string;
}
