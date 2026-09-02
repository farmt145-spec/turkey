import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import WebSocket from 'ws';

@Injectable()
export class WebsocketIntegrationService implements OnModuleDestroy {
  private readonly logger = new Logger(WebsocketIntegrationService.name);
  private sockets: Map<string, WebSocket> = new Map();
  constructor(private readonly prisma: PrismaService) {}
  async connect(integrationId: string) { /* implementation */ }
  onModuleDestroy() { for (const ws of this.sockets.values()) ws.close(); }
}
