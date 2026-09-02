import { Module } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';

@Module({
  controllers: [WithdrawalController],
  providers: [WithdrawalService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
