import { create } from 'zustand';
import { Workflow } from '@/types';

interface WorkflowState {
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  isLoading: boolean;
  setWorkflows: (workflows: Workflow[]) => void;
  setSelectedWorkflow: (workflow: Workflow | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflows: [],
  selectedWorkflow: null,
  isLoading: false,
  setWorkflows: (workflows) => set({ workflows }),
  setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
  setLoading: (isLoading) => set({ isLoading }),
}));
