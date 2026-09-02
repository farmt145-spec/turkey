import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from './event-bus.service';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { QueueService } from '../queue/queue.service';

describe('EventBusService', () => {
  let service: EventBusService;

  const mockPrisma = {
    eventLog: { create: jest.fn(), update: jest.fn() },
    moduleIntegration: { findMany: jest.fn() },
  };

  const mockWorkflow = { executeByTrigger: jest.fn() };
  const mockQueue = { addJob: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowService, useValue: mockWorkflow },
        { provide: QueueService, useValue: mockQueue },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
    jest.clearAllMocks();
  });

  it('should publish event and dispatch to workflows', async () => {
    mockPrisma.eventLog.create.mockResolvedValue({ id: 'evt-1' });
    mockWorkflow.executeByTrigger.mockResolvedValue([]);
    mockPrisma.moduleIntegration.findMany.mockResolvedValue([]);

    const result = await service.publishEvent('iot.temperature', 'IOT', { value: 35 });
    expect(result.id).toBe('evt-1');
    expect(mockQueue.addJob).toHaveBeenCalledWith('event-dispatch', expect.any(Object));
  });
});
