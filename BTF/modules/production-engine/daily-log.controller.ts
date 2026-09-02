import { Controller, Post, Get, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DailyLogService } from './daily-log.service';
import { CreateDailyLogDto, DailyLogWithAIResponseDto } from './dto/daily-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditInterceptor } from '../audit/audit.interceptor';

@ApiTags('Daily Logs - Dziennik produkcji')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('daily-logs')
export class DailyLogController {
  constructor(private readonly dailyLogService: DailyLogService) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.HOUSE_SUPERVISOR, UserRole.VETERINARIAN, UserRole.FARM_MANAGER)
  @ApiOperation({ 
    summary: 'Zapis dnia produkcyjnego + automatyczna analiza AI',
    description: 'Po zapisaniu dziennika system automatycznie uruchamia AI Daily Analysis'
  })
  async create(@Body() dto: CreateDailyLogDto): Promise<DailyLogWithAIResponseDto> {
    return this.dailyLogService.create(dto);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Historia dziennika dla rzutu' })
  async findByBatch(@Param('batchId') batchId: string) {
    return this.dailyLogService.findByBatch(batchId);
  }

  @Get('batch/:batchId/day/:dayNumber')
  @ApiOperation({ summary: 'Szczegóły dnia z analizą AI' })
  async findByDay(
    @Param('batchId') batchId: string,
    @Param('dayNumber') dayNumber: number
  ): Promise<DailyLogWithAIResponseDto> {
    return this.dailyLogService.findByDay(batchId, +dayNumber);
  }
}
