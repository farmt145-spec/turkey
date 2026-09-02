import { useQuery, useMutation, useQueryClient } from 'react-query';
import { aiApi } from '@/api/client';
import { AiSuggestion } from '@/types';
import { BrainCircuit, CheckCircle2, XCircle, Sparkles, TrendingUp } from 'lucide-react';

export default function AISuggestions() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery('aiSuggestions', () => aiApi.getSuggestions('pending'));

  const acceptMutation = useMutation(
    ({ id, userId }: { id: string; userId: string }) => aiApi.accept(id, userId),
    {
      onSuccess: () => queryClient.invalidateQueries('aiSuggestions'),
    }
  );

  const suggestions: AiSuggestion[] = (data as any) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Workflow Assistant</h2>
        <p className="text-gray-500 mt-1">
          Sztuczna inteligencja analizuje historię gospodarstwa i proponuje nowe reguły automatyzacji
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <p className="text-gray-400">Analizowanie danych...</p>
          ) : suggestions.length === 0 ? (
            <div className="card text-center py-12">
              <BrainCircuit size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Brak oczekujących sugestii</p>
              <p className="text-sm text-gray-400 mt-2">
                AI stale monitoruje dane i powiadomi Cię, gdy wykryje wzorzec.
              </p>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div key={suggestion.id} className="card border-l-4 border-purple-500">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Pewność: {(suggestion.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => acceptMutation.mutate({ id: suggestion.id, userId: 'user-1' })}
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <CheckCircle2 size={16} /> Akceptuj
                    </button>
                    <button className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                      <XCircle size={16} /> Odrzuć
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{suggestion.description}</p>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <TrendingUp size={14} />
                  <span>Na podstawie analizy ostatnich danych historycznych</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Jak działa AI Assistant?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                Analizuje dane telemetryczne z IoT
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                Wykrywa korelacje między zdarzeniami
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                Proponuje reguły JEŻELI → TO
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
                Zatwierdzasz lub odrzucasz sugestię
              </li>
            </ul>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-turkey-50">
            <h3 className="font-semibold text-gray-900 mb-2">Przykładowa sugestia</h3>
            <p className="text-sm text-gray-600 italic">
              „W ostatnich trzech rzutach wzrost poboru wody poprzedzał pogorszenie FCR. 
              Proponuję utworzyć automatyczny alarm przy wzroście poboru wody o ponad 10%."
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-[87%] bg-purple-500 rounded-full" />
              </div>
              <span className="text-xs font-medium text-purple-700">87% pewności</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
