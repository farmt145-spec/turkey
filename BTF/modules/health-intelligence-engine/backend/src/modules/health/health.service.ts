import { Injectable, NotFoundException } from '@nestjs/common';
import { HealthRepository } from './health.repository';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { HealthQueryDto } from './dto/health-query.dto';
import { AuditService } from '../audit/audit.service';
import { HealthRecord } from '@prisma/client';

@Injectable()
export class HealthService {
  constructor(
    private readonly repository: HealthRepository,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateHealthRecordDto, userId: string): Promise<HealthRecord> {
    const record = await this.repository.create(dto, userId);

    await this.auditService.log({
      action: 'CREATE',
      entity: 'HealthRecord',
      entityId: record.id,
      newValue: record,
      userId
    });

    return record;
  }

  async findAll(query: HealthQueryDto): Promise<HealthRecord[]> {
    return this.repository.findAll(query);
  }

  async findOne(id: string): Promise<HealthRecord> {
    const record = await this.repository.findOne(id);
    if (!record) throw new NotFoundException('Health record not found');
    return record;
  }

  async update(id: string, dto: Partial<CreateHealthRecordDto>, userId: string): Promise<HealthRecord> {
    const existing = await this.findOne(id);
    const updated = await this.repository.update(id, dto);

    await this.auditService.log({
      action: 'UPDATE',
      entity: 'HealthRecord',
      entityId: id,
      oldValue: existing,
      newValue: updated,
      userId
    });

    return updated;
  }

  async remove(id: string, userId: string): Promise<HealthRecord> {
    const existing = await this.findOne(id);
    const deleted = await this.repository.delete(id);

    await this.auditService.log({
      action: 'DELETE',
      entity: 'HealthRecord',
      entityId: id,
      oldValue: existing,
      userId
    });

    return deleted;
  }
}
