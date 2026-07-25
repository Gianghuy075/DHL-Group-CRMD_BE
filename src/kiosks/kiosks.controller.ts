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

import { KiosksService } from './kiosks.service';
import { ListKiosksQuery } from './dto/list-kiosks.query';
import { CreateKioskDto } from './dto/create-kiosk.dto';
import { UpdateKioskDto } from './dto/update-kiosk.dto';
import { SetStatusDto } from './dto/set-status.dto';

@Controller('kiosks')
export class KiosksController {
  constructor(private readonly kiosksService: KiosksService) {}

  @Get()
  list(@Query() query: ListKiosksQuery) {
    return this.kiosksService.list(query);
  }

  // Declared before ':id' so the static prefix wins the route match.
  @Get('by-customer/:customerId')
  listByCustomer(@Param('customerId', ParseUUIDPipe) customerId: string) {
    return this.kiosksService.listByCustomer(customerId);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.kiosksService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateKioskDto) {
    return this.kiosksService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateKioskDto) {
    return this.kiosksService.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetStatusDto,
  ) {
    return this.kiosksService.setStatus(id, dto.status);
  }
}
