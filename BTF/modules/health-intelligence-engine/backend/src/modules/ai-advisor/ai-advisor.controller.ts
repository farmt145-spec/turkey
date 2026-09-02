import { Controller, Post, Body, UseGuards, Version, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AIAdvisorService } from './ai-advisor.service';
import { AIAdvisorRequestDto } from './dto/ai-advisor-request.dto';
import { UserRole } from '@prisma/client';

@ApiTags('AI Advisor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-advisor')
export class AIAdvisorController {
  constructor(private readonly service: AIAdvisorService) {}

  @Version('1')
  @Post('analyze')
  @Roles(UserRole.VETERINARIAN, UserRole.FARM_MANAGER)
  @ApiOperation({ summary: 'Analyze symptoms with AI Disease Advisor' })
  analyze(@Body() dto: AIAdvisorRequestDto, @Request() req) {
    return this.service.analyze(dto, req.user.userId);
  }
}
