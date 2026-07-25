import { Body, Controller, Post } from '@nestjs/common';

import { FacebookService } from './facebook.service';
import { VerifyProfileDto } from './dto/verify-profile.dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

@Controller('facebook')
export class FacebookController {
  constructor(private readonly facebook: FacebookService) {}

  // Public: verify a profile during registration (before an account exists).
  // Returns the Graph-verified profile without persisting anything.
  @Public()
  @Post('verify-profile-preview')
  previewProfile(@Body() dto: VerifyProfileDto) {
    return this.facebook.previewProfile(dto.accessToken);
  }

  // Verifies the authenticated customer's own Facebook profile from their token.
  @Post('verify-profile')
  verifyProfile(@CurrentUser() user: AuthUser, @Body() dto: VerifyProfileDto) {
    return this.facebook.verifyProfile(user.id, dto.accessToken);
  }
}
