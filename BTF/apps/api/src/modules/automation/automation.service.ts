import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
  ) {}

  async handleExecutionStarted(payload: any) {
    const { actions = [], executionId, workflowId } = payload;
    const taskAction = actions.find((action: any) => action.type === 'CREATE_TASK');

    if (taskAction) {
      await this.prisma.automatedTask.create({
        data: {
          title: taskAction.configJson?.title ?? 'Task',
          priority: taskAction.configJson?.priority ?? 'NORMAL',
          workflowExecutionId: executionId,
          targetModule: taskAction.targetModule,
        },
      });
    }

    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: 'COMPLETED' },
    });

    await this.queue.addJob('automation', { executionId, workflowId });
    await this.audit.log({ ...payload, status: 'COMPLETED' });
    await this.notification.send({ ...payload, status: 'COMPLETED' });

    return { executionId, workflowId };
  }

  interpolateTemplate(template: string, values: Record<string, unknown>) {
    return template.replace(/\{\{(.*?)\}\}/g, (_match, key: string) => String(values[key.trim()] ?? ''));
  }
}
