import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { ListPaymentsQuery } from './dto/list-payments.query';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { RenewKioskDto } from './dto/renew-kiosk.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list(@Query() query: ListPaymentsQuery) {
    return this.paymentsService.list(query);
  }

  // Static routes are declared before ':id' so their prefixes win the match.
  @Get('with-summary')
  listWithSummary(@Query() query: ListPaymentsQuery) {
    return this.paymentsService.listWithSummary(query);
  }

  @Get('summary')
  getSummary(@Query() query: ListPaymentsQuery) {
    return this.paymentsService.getSummary(query);
  }

  @Get('pending')
  listPending() {
    return this.paymentsService.listPending();
  }

  @Get('by-kiosk/:kioskId')
  listByKiosk(@Param('kioskId', ParseUUIDPipe) kioskId: string) {
    return this.paymentsService.listByKiosk(kioskId);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getById(id);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Post('renew')
  renewKiosk(@Body() dto: RenewKioskDto) {
    return this.paymentsService.renewKiosk(dto);
  }

  @Patch(':id')
  updatePending(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.updatePending(id, dto);
  }

  @Post(':id/confirm')
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.confirm(id);
  }

  @Post(':id/cancel')
  cancelRegistration(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.cancelRegistration(id);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.reject(id);
  }
}
