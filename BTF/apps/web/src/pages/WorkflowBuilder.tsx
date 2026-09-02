import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Save, Play, Trash2, Copy } from 'lucide-react';
import { workflowApi } from '@/api/client';
import { Workflow, TriggerCondition, ActionType } from '@/types';
import { useWorkflowStore } from '@/store/workflowStore';

export default function WorkflowBuilder() {
  const queryClient = useQueryClient();
  const { workflows, setWorkflows } = useWorkflowStore();
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { isLoading } = useQuery('workflows', () => workflowApi.getAll({ limit: 100 }), {
    onSuccess: (data: any) => setWorkflows(data.data),
  });

  const createMutation = useMutation(workflowApi.create, {
    onSuccess: () => queryClient.invalidateQueries('workflows'),
  });

  const deleteMutation = useMutation((id: string) => workflowApi.delete(id), {
    onSuccess: () => queryClient.invalidateQueries('workflows'),
  });

  const executeMutation = useMutation(
    ({ id, payload }: { id: string; payload?: unknown }) => workflowApi.execute(id, payload),
    {
      onSuccess: () => queryClient.invalidateQueries('workflows'),
    }
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const loadWorkflowIntoBuilder = (wf: Workflow) => {
    setSelectedWorkflow(wf);
    setIsEditing(true);
    const flowNodes: Node[] = [
      {
        id: 'trigger',
        type: 'input',
        position: { x: 250, y: 50 },
        data: { label: `Trigger: ${wf.triggers[0]?.type || 'NONE'}` },
      },
      ...wf.actions.map((a, i) => ({
        id: `action-${i}`,
        position: { x: 250, y: 150 + i * 100 },
        data: { label: `${a.type} → ${a.targetModule}` },
      })),
    ];
    const flowEdges: Edge[] = wf.actions.map((_, i) => ({
      id: `e-${i}`,
      source: i === 0 ? 'trigger' : `action-${i - 1}`,
      target: `action-${i}`,
    }));
    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  const handleCreate = () => {
    const newWorkflow = {
      name: 'Nowy Workflow',
      triggers: [{
        type: 'THRESHOLD',
        sourceModule: 'IOT',
        condition: { field: 'temperature', operator: 'GT', value: 30 } as TriggerCondition,
      }],
      actions: [{
        type: 'CREATE_ALERT' as ActionType,
        targetModule: 'SYSTEM',
        config: { title: 'Nowy alarm', channel: 'PUSH', recipient: 'admin' },
        orderIndex: 0,
      }],
    };
    createMutation.mutate(newWorkflow);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kreator Workflow</h2>
          <p className="text-gray-500 mt-1">Twórz i zarządzaj regułami automatyzacji JEŻELI → TO</p>
        </div>
        <button onClick={handleCreate} className="btn-primary gap-2">
          <Plus size={18} /> Nowy Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista workflow */}
        <div className="card lg:col-span-1 h-[600px] overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Zapisane reguły</h3>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-gray-400">Ładowanie...</p>
            ) : (
              workflows.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => loadWorkflowIntoBuilder(wf)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedWorkflow?.id === wf.id
                      ? 'border-turkey-500 bg-turkey-50'
                      : 'border-gray-200 hover:border-turkey-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{wf.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {wf.triggers.length} trigger(s) • {wf.actions.length} action(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          wf.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {wf.isActive ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeMutation.mutate({ id: wf.id });
                      }}
                      className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <Play size={12} /> Uruchom
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(wf.id);
                      }}
                      className="text-xs flex items-center gap-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={12} /> Usuń
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Builder Canvas */}
        <div className="card lg:col-span-2 h-[600px]">
          {isEditing && selectedWorkflow ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  value={selectedWorkflow.name}
                  onChange={(e) =>
                    setSelectedWorkflow({ ...selectedWorkflow, name: e.target.value })
                  }
                  className="text-xl font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-turkey-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs gap-1">
                    <Copy size={14} /> Duplikuj
                  </button>
                  <button className="btn-primary text-xs gap-1">
                    <Save size={14} /> Zapisz
                  </button>
                </div>
              </div>
              <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  fitView
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Trigger</p>
                  <p className="text-sm mt-1">
                    {selectedWorkflow.triggers.map((t) => (
                      <span key={t.id}>
                        {t.sourceModule}: {t.condition.field} {t.condition.operator} {String(t.condition.value)}
                      </span>
                    ))}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Akcje</p>
                  <div className="text-sm mt-1 space-y-1">
                    {selectedWorkflow.actions.map((a) => (
                      <p key={a.id}>
                        {a.orderIndex + 1}. {a.type} → {a.targetModule}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <GitBranchIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>Wybierz workflow z listy lub utwórz nowy</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GitBranchIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}
