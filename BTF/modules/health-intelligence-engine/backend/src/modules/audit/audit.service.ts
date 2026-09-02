import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditLogData {
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldValue: data.oldValue,
        newValue: data.newValue,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
      }
    });
  }
}
