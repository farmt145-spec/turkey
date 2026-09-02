import React, { useEffect, useState } from 'react';
import { aiApi } from '../../api/ai';
import { Brain, AlertTriangle, Wrench, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Prediction { id: string; type: string; confidence: number; recommendation: string; buildingId?: string; deviceId?: string; createdAt: string; }

const PREDICTION_ICONS: Record<string, React.ElementType> = {
  'ANOMALY_DETECTION': AlertTriangle, 'DEVICE_FAILURE': Wrench, 'FEED_SHORTAGE': TrendingDown,
  'FAN_FAILURE': Wrench, 'WATER_CONSUMPTION_ANOMALY': AlertTriangle, 'ENERGY_CONSUMPTION_ANOMALY': AlertTriangle,
  'CLIMATE_FCR_IMPACT': TrendingUp, 'CLIMATE_MORTALITY_IMPACT': AlertTriangle, 'CLIMATE_ADG_IMPACT': TrendingUp,
  'MAINTENANCE_RECOMMENDATION': Wrench,
};

const PREDICTION_LABELS: Record<string, string> = {
  'ANOMALY_DETECTION': 'Wykryto anomalię', 'DEVICE_FAILURE': 'Przewidywana awaria', 'FEED_SHORTAGE': 'Brak paszy',
  'FAN_FAILURE': 'Awaria wentylatora', 'WATER_CONSUMPTION_ANOMALY': 'Anomalia zużycia wody',
  'ENERGY_CONSUMPTION_ANOMALY': 'Anomalia zużycia energii', 'CLIMATE_FCR_IMPACT': 'Wpływ klimatu na FCR',
  'CLIMATE_MORTALITY_IMPACT': 'Wpływ klimatu na śmiertelność', 'CLIMATE_ADG_IMPACT': 'Wpływ klimatu na ADG',
  'MAINTENANCE_RECOMMENDATION': 'Zalecenie konserwacji',
};

export const AIPredictionsPanel: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPredictions = async () => {
    setLoading(true);
    try { const data = await aiApi.getPredictions('farm-1'); setPredictions(data); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { loadPredictions(); const interval = setInterval(loadPredictions, 300000); return () => clearInterval(interval); }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center"><Brain className="w-5 h-5 text-purple-600 mr-2" /><h3 className="text-lg font-semibold text-gray-900">Prognozy AI</h3></div>
        <button onClick={loadPredictions} disabled={loading} className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50">{loading ? 'Odświeżanie...' : 'Odśwież'}</button>
      </div>
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {predictions.length === 0 && <div className="p-8 text-center text-gray-500"><Brain className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p>Brak aktywnych prognoz AI</p></div>}
        {predictions.map((p) => {
          const Icon = PREDICTION_ICONS[p.type] || Minus;
          const confidenceColor = p.confidence > 0.9 ? 'text-red-600' : p.confidence > 0.7 ? 'text-orange-600' : 'text-yellow-600';
          return (
            <div key={p.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${p.confidence > 0.8 ? 'bg-red-50' : 'bg-yellow-50'}`}>
                  <Icon className={`w-5 h-5 ${p.confidence > 0.8 ? 'text-red-600' : 'text-yellow-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{PREDICTION_LABELS[p.type] || p.type}</h4>
                    <span className={`text-sm font-semibold ${confidenceColor}`}>{(p.confidence * 100).toFixed(0)}% pewności</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{p.recommendation}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-400">
                    <span>{new Date(p.createdAt).toLocaleString('pl-PL')}</span>
                    {p.buildingId && <span className="ml-2">• Budynek: {p.buildingId}</span>}
                    {p.deviceId && <span className="ml-2">• Urządzenie: {p.deviceId}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
