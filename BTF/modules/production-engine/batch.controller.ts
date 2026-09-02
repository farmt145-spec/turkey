import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BatchService } from './batch.service';
import { CreateBatchDto, UpdateBatchDto, BatchResponseDto } from './dto/batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditInterceptor } from '../audit/audit.interceptor';

@ApiTags('Batches - Rzuty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('batches')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.FARM_MANAGER, UserRole.HOUSE_SUPERVISOR)
  @ApiOperation({ summary: 'Przyjęcie piskląt - utworzenie nowego rzutu' })
  async create(@Body() dto: CreateBatchDto): Promise<BatchResponseDto> {
    return this.batchService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista rzutów z filtrowaniem' })
  @ApiQuery({ name: 'farmId', required: false })
  @ApiQuery({ name: 'houseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'genetics', required: false })
  async findAll(
    @Query('farmId') farmId?: string,
    @Query('houseId') houseId?: string,
    @Query('status') status?: string,
    @Query('genetics') genetics?: string,
  ): Promise<BatchResponseDto[]> {
    return this.batchService.findAll({ farmId, houseId, status, genetics });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Szczegóły rzutu z pełną historią' })
  async findOne(@Param('id') id: string): Promise<BatchResponseDto> {
    return this.batchService.findOne(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Oś czasu rzutu - wszystkie zdarzenia' })
  async getTimeline(@Param('id') id: string) {
    return this.batchService.getTimeline(id);
  }

  @Get(':id/traceability')
  @ApiOperation({ summary: 'Pełna identyfikowalność partii' })
  async getTraceability(@Param('id') id: string) {
    return this.batchService.getTraceability(id);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.FARM_MANAGER, UserRole.HOUSE_SUPERVISOR)
  @ApiOperation({ summary: 'Aktualizacja rzutu' })
  async update(@Param('id') id: string, @Body() dto: UpdateBatchDto): Promise<BatchResponseDto> {
    return this.batchService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Usunięcie rzutu (tylko admin)' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.batchService.remove(id);
  }

  @Post(':id/split')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Podział rzutu na wiele kurników' })
  async splitBatch(
    @Param('id') id: string,
    @Body() splits: Array<{ sectorId: string; count: number; avgWeight: number }>
  ) {
    return this.batchService.splitBatch(id, splits);
  }

  @Post(':id/merge')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Połączenie rzutów' })
  async mergeBatches(
    @Body() dto: { sourceBatchIds: string[]; targetSectorId: string }
  ) {
    return this.batchService.mergeBatches(dto.sourceBatchIds, dto.targetSectorId);
  }
}
