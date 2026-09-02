import { 
  Controller, Get, Post, Put, Delete, Body, Query, Param, 
  UseGuards, Request, Version 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { HealthService } from './health.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { HealthQueryDto } from './dto/health-query.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Health Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Version('1')
  @Post()
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Create health record' })
  create(@Body() dto: CreateHealthRecordDto, @Request() req) {
    return this.healthService.create(dto, req.user.userId);
  }

  @Version('1')
  @Get()
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'List health records with filters' })
  @ApiQuery({ type: HealthQueryDto })
  findAll(@Query() query: HealthQueryDto) {
    return this.healthService.findAll(query);
  }

  @Version('1')
  @Get(':id')
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'Get health record by ID' })
  findOne(@Param('id') id: string) {
    return this.healthService.findOne(id);
  }

  @Version('1')
  @Put(':id')
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Update health record' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateHealthRecordDto>, @Request() req) {
    return this.healthService.update(id, dto, req.user.userId);
  }

  @Version('1')
  @Delete(':id')
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Delete health record' })
  remove(@Param('id') id: string, @Request() req) {
    return this.healthService.remove(id, req.user.userId);
  }
}
