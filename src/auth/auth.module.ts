import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SupabaseJwtGuard } from './supabase-jwt.guard';
import { AdminGuard } from './admin.guard';
import { RolesService } from './roles.service';
import { UserRole } from './entities/user-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole])],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SupabaseJwtGuard,
    },
    RolesService,
    AdminGuard,
  ],
  exports: [RolesService, AdminGuard],
})
export class AuthModule {}
