import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FacebookTask } from './entities/facebook-task.entity';
import { TaskSubmission } from './entities/task-submission.entity';
import { FacebookTasksController } from './facebook-tasks.controller';
import { FacebookTasksService } from './facebook-tasks.service';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FacebookTask, TaskSubmission]),
    WalletModule,
    AuthModule,
  ],
  controllers: [FacebookTasksController],
  providers: [FacebookTasksService],
})
export class FacebookTasksModule {}
