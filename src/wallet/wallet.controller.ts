import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { WalletService } from './wallet.service';
import { TopupDto } from './dto/topup.dto';
import { DevCreditDto } from './dto/dev-credit.dto';
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

  // Voids a pending deposit on PayOS when the user closes/leaves the QR screen.
  @Post('cancel/:orderCode')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('orderCode', ParseIntPipe) orderCode: number,
  ) {
    return this.wallet.cancelDeposit(user.id, orderCode);
  }

  // DEV ONLY: simulate a paid deposit (no real transfer). Blocked outside dev.
  @Post('dev/credit')
  devCredit(@CurrentUser() user: AuthUser, @Body() dto: DevCreditDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Chức năng chỉ dùng khi phát triển.');
    }
    return this.wallet.devCredit(user.id, dto.amount);
  }

  // PayOS calls this server-to-server; no user token, verified by signature.
  // PayOS's webhook verifier expects an exact 200 (Nest defaults POST to 201).
  @Public()
  @HttpCode(200)
  @Post('payos-webhook')
  webhook(@Body() body: PayosWebhookDto) {
    return this.wallet.handleWebhook(body);
  }
}
