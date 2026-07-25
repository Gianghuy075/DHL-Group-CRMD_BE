import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { WalletService } from './wallet.service';
import { TopupDto } from './dto/topup.dto';
import { PayosWebhookDto } from './dto/payos-webhook.dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  // Balance/transactions are always for the authenticated customer (id === auth uid).
  @Get()
  getInfo(@CurrentUser() user: AuthUser) {
    return this.wallet.getInfo(user.id);
  }

  @Get('transactions')
  listTransactions(@CurrentUser() user: AuthUser) {
    return this.wallet.listTransactions(user.id);
  }

  @Post('topup')
  topup(@CurrentUser() user: AuthUser, @Body() dto: TopupDto) {
    return this.wallet.createTopup(
      user.id,
      dto.amount,
      dto.customerName,
      dto.returnUrl,
      dto.cancelUrl,
    );
  }

  // Polled by the topup modal to detect payment (works without the webhook).
  @Get('payment-status/:orderCode')
  paymentStatus(
    @CurrentUser() user: AuthUser,
    @Param('orderCode', ParseIntPipe) orderCode: number,
  ) {
    return this.wallet.getPaymentStatus(user.id, orderCode);
  }

  // Server re-checks PayOS then credits idempotently; safe to poll.
  @Post('confirm/:orderCode')
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('orderCode', ParseIntPipe) orderCode: number,
  ) {
    return this.wallet.confirmDeposit(user.id, orderCode);
  }

  // PayOS calls this server-to-server; no user token, verified by signature.
  @Public()
  @Post('payos-webhook')
  webhook(@Body() body: PayosWebhookDto) {
    return this.wallet.handleWebhook(body);
  }
}
