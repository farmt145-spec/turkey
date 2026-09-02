import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrisma = {
    workflow: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workflowTrigger: { deleteMany: jest.fn(), create: jest.fn() },
    workflowAction: { deleteMany: jest.fn(), create: jest.fn() },
    workflowExecution: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create workflow with triggers and actions', async () => {
      const dto = {
        name: 'Temp Alarm',
        triggers: [{
          type: 'THRESHOLD',
          sourceModule: 'IOT',
          condition: { field: 'temperature', operator: 'GT', value: 30 },
        }],
        actions: [{
          type: 'SEND_NOTIFICATION',
          targetModule: 'SYSTEM',
          config: { title: 'Alarm!' },
          orderIndex: 0,
        }],
      };

      mockPrisma.workflow.create.mockResolvedValue({ id: 'wf-1', ...dto });

      const result = await service.create(dto as any);
      expect(result.id).toBe('wf-1');
      expect(mockPrisma.workflow.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workflow.created', expect.any(Object));
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return workflow with relations', async () => {
      const wf = { id: 'wf-1', name: 'Test', triggers: [], actions: [], executions: [] };
      mockPrisma.workflow.findUnique.mockResolvedValue(wf);
      const result = await service.findOne('wf-1');
      expect(result).toEqual(wf);
    });
  });

  describe('executeByTrigger', () => {
    it('should execute workflows matching threshold condition GT', async () => {
      const workflows = [{
        id: 'wf-1',
        priority: 5,
        triggers: [{
          conditionJson: { field: 'temperature', operator: 'GT', value: 30 },
        }],
        actions: [],
      }];
      mockPrisma.workflow.findMany.mockResolvedValue(workflows);
      mockPrisma.workflowExecution.create.mockResolvedValue({ id: 'ex-1' });

      const result = await service.executeByTrigger('IOT', 'temperature_alert', { temperature: 35 });
      expect(result).toHaveLength(1);
      expect(mockPrisma.workflowExecution.create).toHaveBeenCalled();
    });

    it('should not execute if condition does not match', async () => {
      const workflows = [{
        id: 'wf-1',
        priority: 5,
        triggers: [{
          conditionJson: { field: 'temperature', operator: 'GT', value: 30 },
        }],
        actions: [],
      }];
      mockPrisma.workflow.findMany.mockResolvedValue(workflows);

      const result = await service.executeByTrigger('IOT', 'temperature_alert', { temperature: 25 });
      expect(result).toHaveLength(0);
    });
  });
});
