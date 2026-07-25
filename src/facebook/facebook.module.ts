import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Customer } from '../customers/entities/customer.entity';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  controllers: [FacebookController],
  providers: [FacebookService],
})
export class FacebookModule {}
