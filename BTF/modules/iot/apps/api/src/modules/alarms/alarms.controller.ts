import { Controller, Get, Post, Param, ParseUUIDPipe, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AlarmsService } from './alarms.service';
import { AlarmSeverity } from '@prisma/client';

@ApiTags('Alarms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alarms')
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Get(':farmId') @ApiOperation({ summary: 'Get alarms for farm' })
  getAlarms(@Param('farmId', ParseUUIDPipe) farmId: string, @Query() filters: any) {
    return this.alarmsService.getAlarms(farmId, filters);
  }

  @Post(':alarmId/acknowledge') @Roles('ADMIN', 'MANAGER', 'TECHNICIAN', 'OPERATOR')
  @ApiOperation({ summary: 'Acknowledge alarm' })
  acknowledge(@Param('alarmId', ParseUUIDPipe) alarmId: string, @Body() body: { comment?: string }) {
    return this.alarmsService.acknowledgeAlarm(alarmId, 'user-id', body.comment);
  }

  @Post(':alarmId/resolve') @Roles('ADMIN', 'MANAGER', 'TECHNICIAN')
  @ApiOperation({ summary: 'Resolve alarm' })
  resolve(@Param('alarmId', ParseUUIDPipe) alarmId: string) {
    return this.alarmsService.resolveAlarm(alarmId);
  }

  @Get(':farmId/stats') @ApiOperation({ summary: 'Get alarm statistics' })
  getStats(@Param('farmId', ParseUUIDPipe) farmId: string, @Query('period') period: string) {
    return this.alarmsService.getAlarmStats(farmId, (period || '24h') as any);
  }
}
