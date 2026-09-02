import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiEngineService } from './ai-engine.service';

@ApiTags('AI Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiEngineController {
  constructor(private readonly aiService: AiEngineService) {}

  @Get('predictions/:farmId') @ApiOperation({ summary: 'Get AI predictions for farm' })
  getPredictions(@Param('farmId', ParseUUIDPipe) farmId: string) { return this.aiService.getRecommendations(farmId); }

  @Get('anomaly/:deviceId') @ApiOperation({ summary: 'Run anomaly detection on device' })
  async detectAnomaly(@Param('deviceId', ParseUUIDPipe) deviceId: string) {
    return { message: 'Use telemetry ingestion for real-time anomaly detection' };
  }
}
