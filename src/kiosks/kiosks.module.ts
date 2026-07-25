import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Kiosk } from './entities/kiosk.entity';
import { Category } from './entities/category.entity';
import { BusinessType } from './entities/business-type.entity';
import { KiosksController } from './kiosks.controller';
import { KiosksService } from './kiosks.service';
import { KiosksRepository } from './kiosks.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Kiosk, Category, BusinessType])],
  controllers: [KiosksController],
  providers: [KiosksService, KiosksRepository],
  exports: [KiosksService, KiosksRepository],
})
export class KiosksModule {}
