import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards, Version, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TreatmentService } from './treatment.service';
import { UserRole } from '@prisma/client';

@ApiTags('Treatments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('treatments')
export class TreatmentController {
  constructor(private readonly service: TreatmentService) {}

  @Version('1')
  @Get()
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'List treatments' })
  findAll(@Query('flockId') flockId?: string) {
    return this.service.findAll(flockId);
  }

  @Version('1')
  @Post()
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Create treatment record' })
  create(@Body() dto: any, @Request() req) {
    return this.service.create(dto, req.user.userId);
  }

  @Version('1')
  @Patch(':id')
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Update treatment' })
  update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.service.update(id, dto, req.user.userId);
  }

  @Version('1')
  @Delete(':id')
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Delete treatment' })
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, req.user.userId);
  }
}
