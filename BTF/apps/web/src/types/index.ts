export interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  executions?: WorkflowExecution[];
}

export interface WorkflowTrigger {
  id: string;
  type: 'THRESHOLD' | 'SCHEDULE' | 'EVENT' | 'MANUAL' | 'AI_PREDICTION';
  sourceModule: SourceModule;
  condition: TriggerCondition;
  metadata?: Record<string, unknown>;
}

export interface TriggerCondition {
  field: string;
  operator: 'GT' | 'LT' | 'EQ' | 'NEQ' | 'GTE' | 'LTE' | 'IN' | 'CONTAINS';
  value: number | string | boolean | number[];
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  targetModule: SourceModule;
  config: Record<string, unknown>;
  delayMinutes: number;
  retryCount: number;
  orderIndex: number;
}

export type SourceModule =
  | 'PRODUCTION' | 'FEEDING' | 'HEALTH' | 'ECONOMY'
  | 'IOT' | 'WAREHOUSE' | 'REPORTS' | 'AI'
  | 'DIGITAL_TWIN' | 'INTEGRATION' | 'SYSTEM';

export type ActionType =
  | 'CREATE_TASK' | 'SEND_NOTIFICATION' | 'CREATE_ALERT'
  | 'CREATE_SERVICE_TICKET' | 'LOG_ENTRY' | 'AUDIT_ENTRY'
  | 'CALL_WEBHOOK' | 'UPDATE_ENTITY' | 'GENERATE_REPORT';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'RETRYING';
  triggeredBy?: Record<string, unknown>;
  resultJson?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  durationMs?: number;
}

export interface AutomatedTask {
  id: string;
  type: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
  dueDate?: string;
  sourceModule: SourceModule;
  createdAt: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  failCount: number;
}

export interface EventLog {
  id: string;
  eventType: string;
  sourceModule: SourceModule;
  payload: Record<string, unknown>;
  correlationId: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DEAD_LETTER';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  sentAt?: string;
  createdAt: string;
}

export interface AiSuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  isAccepted?: boolean;
  createdAt: string;
}

export interface DashboardStats {
  activeWorkflows: number;
  totalExecutionsToday: number;
  successRate: number;
  avgResponseTime: number;
  pendingTasks: number;
  unreadNotifications: number;
  activeSchedules: number;
  failedEvents: number;
}

export interface ModuleNode {
  id: number;
  label: string;
  module: SourceModule;
}

export interface ModuleLink {
  source: number;
  target: number;
  eventType: string;
}

export interface ExecutionHistoryPoint {
  date: string;
  total: number;
  success: number;
  failed: number;
}
