import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VaccinationService } from './vaccination.service';
import { UserRole } from '@prisma/client';

@ApiTags('Vaccinations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vaccinations')
export class VaccinationController {
  constructor(private readonly service: VaccinationService) {}

  @Version('1')
  @Get()
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'List vaccinations with filters' })
  findAll(@Query('flockId') flockId?: string) {
    return this.service.findAll(flockId);
  }

  @Version('1')
  @Post()
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Create vaccination schedule' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Version('1')
  @Patch(':id')
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Update vaccination status' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }
}
