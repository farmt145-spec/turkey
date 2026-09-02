import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: any) {
    const workflow = await this.prisma.workflow.create({ data: dto });
    this.eventEmitter.emit('workflow.created', workflow);
    return workflow;
  }

  async findOne(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        triggers: true,
        actions: true,
        executions: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async executeByTrigger(sourceModule: string, eventType: string, payload: unknown) {
    const workflows = await this.prisma.workflow.findMany({
      include: { triggers: true },
    });

    const matched = workflows.filter((workflow: any) => {
      const triggers = workflow.triggers ?? [];
      return triggers.some((trigger: any) => {
        const condition = trigger.conditionJson ?? trigger.condition ?? {};
        if (condition.operator === 'GT') {
          const value = (payload as Record<string, unknown>)?.[condition.field as string];
          return Number(value) > Number(condition.value);
        }
        return true;
      });
    });

    for (const workflow of matched) {
      await this.prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          sourceModule,
          eventType,
          payload,
        },
      });
    }

    return matched;
  }
}
