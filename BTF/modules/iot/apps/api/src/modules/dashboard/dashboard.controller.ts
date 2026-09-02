import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':farmId/overview') @ApiOperation({ summary: 'Get farm overview dashboard' })
  getOverview(@Param('farmId', ParseUUIDPipe) farmId: string) { return this.dashboardService.getFarmOverview(farmId); }

  @Get(':farmId/map') @ApiOperation({ summary: 'Get device map for farm' })
  getDeviceMap(@Param('farmId', ParseUUIDPipe) farmId: string) { return this.dashboardService.getDeviceMap(farmId); }

  @Get(':farmId/timeseries') @ApiOperation({ summary: 'Get time series data' })
  getTimeSeries(@Param('farmId', ParseUUIDPipe) farmId: string, @Query('metric') metric: string, @Query('range') range: string, @Query('buildingId') buildingId?: string) {
    return this.dashboardService.getTimeSeriesData(farmId, metric, range as any, buildingId);
  }

  @Get(':farmId/devices/status') @ApiOperation({ summary: 'Get device status history' })
  getDeviceStatus(@Param('farmId', ParseUUIDPipe) farmId: string, @Query('hours') hours?: number) {
    return this.dashboardService.getDeviceStatusHistory(farmId, hours || 24);
  }
}
