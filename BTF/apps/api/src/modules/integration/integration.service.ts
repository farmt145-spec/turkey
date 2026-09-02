import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SourceModule } from '../../shared/enums/source-module.enum';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async registerIntegration(data: {
    sourceModule: SourceModule;
    targetModule: SourceModule;
    eventType: string;
    handlerUrl?: string;
    authToken?: string;
  }) {
    return this.prisma.moduleIntegration.create({
      data: {
        sourceModule: data.sourceModule,
        targetModule: data.targetModule,
        eventType: data.eventType,
        handlerUrl: data.handlerUrl,
        authToken: data.authToken,
      },
    });
  }

  async getIntegrations(sourceModule?: SourceModule) {
    return this.prisma.moduleIntegration.findMany({
      where: sourceModule ? { sourceModule } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async forwardEvent(integrationId: string, payload: any) {
    const integration = await this.prisma.moduleIntegration.findUnique({
      where: { id: integrationId },
    });
    if (!integration || !integration.handlerUrl) return;

    // W produkcji: wykonaj HTTP request do target module
    this.eventEmitter.emit('integration.forward', {
      integrationId,
      url: integration.handlerUrl,
      payload,
    });
  }
}
