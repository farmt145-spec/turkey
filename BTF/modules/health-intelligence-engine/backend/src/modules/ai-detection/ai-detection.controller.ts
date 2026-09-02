import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AIDetectionService } from './ai-detection.service';
import { UserRole } from '@prisma/client';

@ApiTags('AI Detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-detection')
export class AIDetectionController {
  constructor(private readonly service: AIDetectionService) {}

  @Version('1')
  @Get('alerts')
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'Get all anomaly alerts' })
  getAlerts() {
    return this.service.analyzeAllActiveFlocks();
  }
}
