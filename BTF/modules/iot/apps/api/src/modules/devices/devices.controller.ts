import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceFilterDto } from './dto/device-filter.dto';
import { TelemetryBatchDto } from './dto/telemetry-batch.dto';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post() @Roles('ADMIN', 'MANAGER', 'TECHNICIAN')
  @ApiOperation({ summary: 'Create new device' })
  @ApiResponse({ status: 201, description: 'Device created successfully' })
  create(@Body() dto: CreateDeviceDto) { return this.devicesService.create(dto); }

  @Get() @ApiOperation({ summary: 'List all devices with filters' })
  findAll(@Query() filters: DeviceFilterDto) { return this.devicesService.findAll(filters); }

  @Get(':id') @ApiOperation({ summary: 'Get device by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.devicesService.findOne(id); }

  @Get(':id/telemetry') @ApiOperation({ summary: 'Get device telemetry history' })
  getTelemetry(@Param('id', ParseUUIDPipe) id: string, @Query('from') from: string, @Query('to') to: string, @Query('limit') limit?: number) {
    return this.devicesService.getTelemetry(id, new Date(from), new Date(to), limit);
  }

  @Post(':id/telemetry') @Roles('ADMIN', 'MANAGER', 'TECHNICIAN', 'OPERATOR')
  @HttpCode(HttpStatus.ACCEPTED) @ApiOperation({ summary: 'Ingest telemetry batch' })
  ingestTelemetry(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TelemetryBatchDto) {
    return this.devicesService.ingestTelemetry(id, dto);
  }

  @Patch(':id') @Roles('ADMIN', 'MANAGER', 'TECHNICIAN')
  @ApiOperation({ summary: 'Update device' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeviceDto) { return this.devicesService.update(id, dto); }

  @Delete(':id') @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ summary: 'Delete device' })
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.devicesService.remove(id); }

  @Post(':id/calibrate') @Roles('TECHNICIAN', 'ADMIN')
  @ApiOperation({ summary: 'Calibrate device' })
  calibrate(@Param('id', ParseUUIDPipe) id: string, @Body() calibrationData: Record<string, any>) {
    return this.devicesService.calibrate(id, calibrationData);
  }

  @Post(':id/command') @Roles('ADMIN', 'MANAGER', 'TECHNICIAN')
  @ApiOperation({ summary: 'Send command to device' })
  sendCommand(@Param('id', ParseUUIDPipe) id: string, @Body() command: { type: string; params: Record<string, any> }) {
    return this.devicesService.sendCommand(id, command);
  }
}
