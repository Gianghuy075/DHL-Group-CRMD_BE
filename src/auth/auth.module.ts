import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { SupabaseJwtGuard } from './supabase-jwt.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: SupabaseJwtGuard,
    },
  ],
})
export class AuthModule {}
