import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Customer } from '../customers/entities/customer.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PayosService } from './payos.service';

@Module({
  imports: [TypeOrmModule.forFeature([WalletTransaction, Customer])],
  controllers: [WalletController],
  providers: [WalletService, PayosService],
  exports: [WalletService],
})
export class WalletModule {}
