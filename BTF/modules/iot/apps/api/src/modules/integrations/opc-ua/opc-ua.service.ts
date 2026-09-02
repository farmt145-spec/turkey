import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OpcUaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpcUaService.name);
  constructor(private readonly prisma: PrismaService) {}
  async onModuleInit() { /* initialize OPC-UA connections */ }
  async onModuleDestroy() { /* cleanup */ }
}
