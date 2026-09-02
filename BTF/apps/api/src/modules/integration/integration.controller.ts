import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IntegrationService } from './integration.service';
import { SourceModule } from '../../shared/enums/source-module.enum';

class RegisterIntegrationDto {
  sourceModule: SourceModule;
  targetModule: SourceModule;
  eventType: string;
  handlerUrl?: string;
  authToken?: string;
}

@ApiTags('Integration')
@Controller('integrations')
export class IntegrationController {
  constructor(private readonly service: IntegrationService) {}

  @Post()
  @ApiOperation({ summary: 'Zarejestruj integrację międzymodułową' })
  register(@Body() dto: RegisterIntegrationDto) {
    return this.service.registerIntegration(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista integracji' })
  findAll(@Query('sourceModule') sourceModule?: SourceModule) {
    return this.service.getIntegrations(sourceModule);
  }
}
