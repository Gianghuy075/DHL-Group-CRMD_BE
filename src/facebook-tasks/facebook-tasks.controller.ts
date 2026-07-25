import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { FacebookTasksService } from './facebook-tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { AdminGuard } from '../auth/admin.guard';

@Controller('facebook-tasks')
export class FacebookTasksController {
  constructor(private readonly tasks: FacebookTasksService) {}

  // Marketplace of tasks this worker can pick up.
  @Get()
  listMarketplace(
    @CurrentUser() user: AuthUser,
    @Query('taskType') taskType?: string,
  ) {
    return this.tasks.listMarketplace(user.id, taskType || undefined);
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthUser) {
    return this.tasks.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasks.createTask(user.id, dto);
  }

  @Post(':id/submit')
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitTaskDto,
  ) {
    return this.tasks.submitTaskWork(id, user.id, dto.proofImageUrl);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasks.cancelTask(id, user.id);
  }

  // ---- Admin-only review endpoints ----

  @Get('submissions/pending')
  @UseGuards(AdminGuard)
  listPending() {
    return this.tasks.listPendingSubmissions();
  }

  @Post('submissions/:id/approve')
  @UseGuards(AdminGuard)
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.approveSubmission(id);
  }

  @Post('submissions/:id/reject')
  @UseGuards(AdminGuard)
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.rejectSubmission(id);
  }
}
