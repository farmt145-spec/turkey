import { Controller, Get, Param, UseGuards, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RiskScoreService } from './risk-score.service';
import { UserRole } from '@prisma/client';

@ApiTags('Risk Scores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('risk-scores')
export class RiskScoreController {
  constructor(private readonly service: RiskScoreService) {}

  @Version('1')
  @Get(':flockId/latest')
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'Get latest risk score for flock' })
  getLatest(@Param('flockId') flockId: string) {
    return this.service.calculateRiskScore(flockId);
  }
}
