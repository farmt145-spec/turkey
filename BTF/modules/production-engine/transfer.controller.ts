import { Controller, Post, Get, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransferService } from './transfer.service';
import { CreateTransferDto } from './dto/transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditInterceptor } from '../audit/audit.interceptor';

@ApiTags('Transfers - Transfer ptaków')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @Roles(UserRole.FARM_MANAGER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ 
    summary: 'Transfer ptaków między kurnikami/fermami',
    description: 'Obsługuje transfer wewnątrz fermy, między fermami oraz między firmami'
  })
  async create(@Body() dto: CreateTransferDto) {
    return this.transferService.create(dto);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Historia transferów rzutu' })
  async findByBatch(@Param('batchId') batchId: string) {
    return this.transferService.findByBatch(batchId);
  }

  @Get('farm/:farmId')
  @ApiOperation({ summary: 'Transfery dla fermy' })
  async findByFarm(@Param('farmId') farmId: string) {
    return this.transferService.findByFarm(farmId);
  }
}
