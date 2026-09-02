import { Controller, Get, Post, Query, Param, UseGuards, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WithdrawalService } from './withdrawal.service';
import { UserRole } from '@prisma/client';

@ApiTags('Withdrawal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('withdrawals')
export class WithdrawalController {
  constructor(private readonly service: WithdrawalService) {}

  @Version('1')
  @Get()
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'List withdrawal periods' })
  findAll(@Query('flockId') flockId?: string) {
    return this.service.findAll(flockId);
  }

  @Version('1')
  @Post('calculate/:treatmentId')
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Calculate withdrawal for treatment' })
  calculate(@Param('treatmentId') treatmentId: string) {
    return this.service.calculateWithdrawal(treatmentId);
  }
}
