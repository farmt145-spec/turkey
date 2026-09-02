import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AlertTriangle, Brain, TestTube, Activity } from 'lucide-react';

interface SymptomInput {
  symptoms: string[];
  temperature?: number;
  humidity?: number;
  co2?: number;
  nh3?: number;
  mortalityRate?: number;
  fcr?: number;
}

export const AIAdvisorPanel: React.FC<{ flockId: string }> = ({ flockId }) => {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [envData, setEnvData] = useState<Partial<SymptomInput>>({});

  const analyzeMutation = useMutation({
    mutationFn: (data: SymptomInput) => 
      api.post('/ai-advisor/analyze', { ...data, flockId }).then(r => r.data)
  });

  const addSymptom = () => {
    if (symptomInput.trim() && !symptoms.includes(symptomInput.trim())) {
      setSymptoms([...symptoms, symptomInput.trim()]);
      setSymptomInput('');
    }
  };

  const handleAnalyze = () => {
    analyzeMutation.mutate({ symptoms, ...envData });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-6 h-6 text-indigo-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">AI Disease Advisor</h2>
          <p className="text-sm text-slate-500">Analiza objawów i rekomendacje wspomagające</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Rekomendacje wspomagające decyzję</p>
          <p>Wyniki analizy AI nie zastępują oceny lekarza weterynarii. Zawsze weryfikuj zalecenia klinicznie przed podjęciem decyzji terapeutycznej.</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Objawy kliniczne</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={symptomInput}
            onChange={(e) => setSymptomInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
            placeholder="np. biegunka, apatia, duszności..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={addSymptom}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            Dodaj
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {symptoms.map((s, i) => (
            <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm flex items-center gap-2">
              {s}
              <button onClick={() => setSymptoms(symptoms.filter((_, idx) => idx !== i))} className="hover:text-indigo-900">×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { key: 'temperature', label: 'Temperatura (°C)' },
          { key: 'humidity', label: 'Wilgotność (%)' },
          { key: 'co2', label: 'CO₂ (ppm)' },
          { key: 'nh3', label: 'NH₃ (ppm)' },
          { key: 'mortalityRate', label: 'Śmiertelność (%)' },
          { key: 'fcr', label: 'FCR' }
        ].map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-slate-500 mb-1">{field.label}</label>
            <input
              type="number"
              step="0.1"
              onChange={(e) => setEnvData({ ...envData, [field.key]: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={symptoms.length === 0 || analyzeMutation.isPending}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        {analyzeMutation.isPending ? (
          <>Analizowanie...</>
        ) : (
          <>
            <Brain className="w-5 h-5" />
            Analizuj objawy
          </>
        )}
      </button>

      {analyzeMutation.data && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Wyniki analizy</h3>
          {analyzeMutation.data.map((prediction: any, idx: number) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    prediction.probability > 70 ? 'bg-red-500' : 
                    prediction.probability > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}>
                    {prediction.probability}%
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{prediction.diseaseName}</h4>
                    <p className="text-sm text-slate-500">Prawdopodobieństwo</p>
                  </div>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                  ID: {prediction.diseaseId.slice(0, 8)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Możliwe przyczyny
                  </p>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    {prediction.possibleCauses.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <TestTube className="w-4 h-4" /> Zalecane badania
                  </p>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    {prediction.recommendedTests.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Działania natychmiastowe:</span>{' '}
                  {prediction.immediateActions.join(', ')}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  <span className="font-medium">Wpływ na produkcję:</span>{' '}
                  {prediction.productionImpact}
                </p>
              </div>

              <div className="mt-3 p-2 bg-slate-50 rounded text-xs text-slate-500">
                {prediction.disclaimer}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
