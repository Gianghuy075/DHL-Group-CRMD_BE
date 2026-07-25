import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { buildTypeOrmOptions } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { CustomersModule } from './customers/customers.module';
import { KiosksModule } from './kiosks/kiosks.module';
import { PaymentsModule } from './payments/payments.module';
import { WalletModule } from './wallet/wallet.module';
import { FacebookTasksModule } from './facebook-tasks/facebook-tasks.module';
import { FacebookModule } from './facebook/facebook.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
    }),
    AuthModule,
    HealthModule,
    CustomersModule,
    KiosksModule,
    PaymentsModule,
    WalletModule,
    FacebookTasksModule,
    FacebookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
