import { Test, TestingModule } from '@nestjs/testing';
import { AutomationService } from './automation.service';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';

describe('AutomationService', () => {
  let service: AutomationService;

  const mockPrisma = {
    workflowExecution: { update: jest.fn() },
    automatedTask: { create: jest.fn() },
    taskReminder: { create: jest.fn() },
    eventLog: { create: jest.fn() },
  };

  const mockQueue = { addJob: jest.fn() };
  const mockAudit = { log: jest.fn() };
  const mockNotification = { send: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QueueService, useValue: mockQueue },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
    jest.clearAllMocks();
  });

  it('should handle execution with CREATE_TASK action', async () => {
    mockPrisma.automatedTask.create.mockResolvedValue({ id: 'task-1' });

    await service.handleExecutionStarted({
      executionId: 'ex-1',
      workflowId: 'wf-1',
      actions: [{
        type: 'CREATE_TASK',
        targetModule: 'HEALTH',
        orderIndex: 0,
        configJson: {
          title: 'Sprawdź FCR',
          priority: 'HIGH',
          assignedTo: 'user-1',
        },
        delayMinutes: 0,
        retryCount: 3,
      }],
      payload: { fcr: 2.5 },
    });

    expect(mockPrisma.automatedTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Sprawdź FCR',
          priority: 'HIGH',
        }),
      }),
    );
    expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
    );
  });

  it('should interpolate template variables', () => {
    const result = (service as any).interpolateTemplate(
      'Temperatura: {{temperature}}°C',
      { temperature: 35 },
    );
    expect(result).toBe('Temperatura: 35°C');
  });
});
