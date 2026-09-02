import { create } from 'zustand';
import { DashboardStats, ExecutionHistoryPoint, ModuleNode, ModuleLink } from '@/types';

interface DashboardState {
  stats: DashboardStats | null;
  history: ExecutionHistoryPoint[];
  moduleMap: { nodes: ModuleNode[]; links: ModuleLink[] } | null;
  setStats: (stats: DashboardStats) => void;
  setHistory: (history: ExecutionHistoryPoint[]) => void;
  setModuleMap: (map: { nodes: ModuleNode[]; links: ModuleLink[] }) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  history: [],
  moduleMap: null,
  setStats: (stats) => set({ stats }),
  setHistory: (history) => set({ history }),
  setModuleMap: (moduleMap) => set({ moduleMap }),
}));
