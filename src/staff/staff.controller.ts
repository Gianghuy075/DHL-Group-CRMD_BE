import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetActiveDto } from './dto/set-active.dto';

// Admin-only staff (reviewer) management. The global JwtAuthGuard authenticates;
// StaffService.assertAdmin enforces the admin-only rule per request.
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.staff.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStaffDto) {
    return this.staff.create(user.id, dto);
  }

  @Patch(':userId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staff.update(user.id, userId, dto);
  }

  @Patch(':userId/password')
  resetPassword(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.staff.resetPassword(user.id, userId, dto);
  }

  @Patch(':userId/active')
  setActive(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: SetActiveDto,
  ) {
    return this.staff.setActive(user.id, userId, dto);
  }

  @Delete(':userId')
  remove(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.staff.remove(user.id, userId);
  }
}
