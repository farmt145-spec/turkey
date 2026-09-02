import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class RestApiService {
  private readonly logger = new Logger(RestApiService.name);
  private clients: Map<string, AxiosInstance> = new Map();
  constructor(private readonly prisma: PrismaService) {}
  @Cron(CronExpression.EVERY_MINUTE)
  async pollRestApis() { /* implementation */ }
}
