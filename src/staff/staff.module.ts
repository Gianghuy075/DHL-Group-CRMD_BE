import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { UserRole } from '../auth/entities/user-role.entity';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole]), AuthModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
