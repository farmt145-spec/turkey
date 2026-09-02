import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class EventBusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly queue: QueueService,
  ) {}

  async publishEvent(topic: string, source: string, payload: unknown) {
    const event = await this.prisma.eventLog.create({
      data: {
        topic,
        source,
        payload,
      },
    });

    await this.workflowService.executeByTrigger(source, topic, payload);
    await this.queue.addJob('event-dispatch', { topic, source, payload });

    return event;
  }
}
