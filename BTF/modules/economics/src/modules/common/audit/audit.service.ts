import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditLogEntry {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: entry.oldValue || null,
        newValue: entry.newValue,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      },
    });
  }

  async getLogs(userId?: string, entityType?: string, limit = 100): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(entityType ? { entityType } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
