import { Controller, Get, Post, Body, Param, UseGuards, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DiseaseLibraryService } from './disease-library.service';
import { UserRole } from '@prisma/client';

@ApiTags('Disease Library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('diseases')
export class DiseaseLibraryController {
  constructor(private readonly service: DiseaseLibraryService) {}

  @Version('1')
  @Get()
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'List all diseases' })
  findAll() {
    return this.service.findAll();
  }

  @Version('1')
  @Get(':id')
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'Get disease by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Version('1')
  @Post()
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add new disease (admin/vet only)' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }
}
