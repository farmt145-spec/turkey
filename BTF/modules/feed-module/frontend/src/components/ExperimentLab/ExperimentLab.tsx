import React, { useState } from 'react';
import { FeedApi } from '../../services/feed.api';
import { Recipe } from '../../types/feed.types';
import './ExperimentLab.css';

interface ExperimentLabProps {
  recipe: Recipe;
}

export const ExperimentLab: React.FC<ExperimentLabProps> = ({ recipe }) => {
  const [experiments, setExperiments] = useState<Array<any>>([]);
  const [currentExperiment, setCurrentExperiment] = useState<{
    name: string;
    changes: Array<{ materialId: string; action: string; value?: number }>;
  }>({ name: '', changes: [] });
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const addChange = () => {
    setCurrentExperiment(prev => ({
      ...prev,
      changes: [...prev.changes, { materialId: '', action: 'ADJUST' }],
    }));
  };

  const updateChange = (index: number, field: string, value: any) => {
    setCurrentExperiment(prev => ({
      ...prev,
      changes: prev.changes.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  const removeChange = (index: number) => {
    setCurrentExperiment(prev => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index),
    }));
  };

  const runExperiment = async () => {
    if (!currentExperiment.name || currentExperiment.changes.length === 0) return;
    setLoading(true);
    try {
      const result = await FeedApi.createExperiment({
        recipeId: recipe.id,
        name: currentExperiment.name,
        changes: currentExperiment.changes,
      });
      setExperiments(prev => [result, ...prev]);
      setSelectedResult(result);
      setCurrentExperiment({ name: '', changes: [] });
    } catch (err) {
      alert('Błąd eksperymentu: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="experiment-lab">
      <header>
        <h2>🧪 Wirtualny Eksperyment — "Co będzie jeśli..."</h2>
        <p className="subtitle">Testuj scenariusze bez ryzyka. Zobacz natychmiastowy wpływ na produkcję.</p>
      </header>

      <div className="experiment-builder">
        <div className="experiment-form">
          <input
            type="text"
            placeholder="Nazwa eksperymentu (np. Usunięcie śruty sojowej)"
            value={currentExperiment.name}
            onChange={e => setCurrentExperiment(prev => ({ ...prev, name: e.target.value }))}
            className="experiment-name-input"
          />

          <div className="changes-list">
            {currentExperiment.changes.map((change, idx) => (
              <div key={idx} className="change-row">
                <select
                  value={change.materialId}
                  onChange={e => updateChange(idx, 'materialId', e.target.value)}
                >
                  <option value="">Wybierz składnik...</option>
                  {recipe.ingredients.map(ing => (
                    <option key={ing.rawMaterial.id} value={ing.rawMaterial.id}>
                      {ing.rawMaterial.name} (obecnie {ing.percentage}%)
                    </option>
                  ))}
                </select>

                <select
                  value={change.action}
                  onChange={e => updateChange(idx, 'action', e.target.value)}
                >
                  <option value="ADJUST">Dostosuj %</option>
                  <option value="REMOVE">Usuń</option>
                </select>

                {change.action === 'ADJUST' && (
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Nowa wartość %"
                    value={change.value || ''}
                    onChange={e => updateChange(idx, 'value', Number(e.target.value))}
                  />
                )}

                <button className="remove-change" onClick={() => removeChange(idx)}>×</button>
              </div>
            ))}
          </div>

          <div className="experiment-actions">
            <button className="add-change-btn" onClick={addChange}>+ Dodaj zmianę</button>
            <button 
              className="run-experiment-btn" 
              onClick={runExperiment}
              disabled={loading || !currentExperiment.name || currentExperiment.changes.length === 0}
            >
              {loading ? 'Symulowanie...' : '🔬 Uruchom symulację'}
            </button>
          </div>
        </div>
      </div>

      {selectedResult && (
        <div className="experiment-result">
          <h3>📊 Wyniki: {selectedResult.name}</h3>

          {/* Ryzyko */}
          <div className={`risk-banner level-${selectedResult.riskAssessment.level.toLowerCase()}`}>
            <span className="risk-label">Poziom ryzyka: {selectedResult.riskAssessment.level}</span>
            <div className="risk-factors">
              {selectedResult.riskAssessment.factors.map((f: string, i: number) => (
                <span key={i} className="risk-factor">⚠️ {f}</span>
              ))}
            </div>
          </div>

          {/* Zmiany */}
          <div className="changes-summary">
            <h4>Wprowadzone zmiany:</h4>
            {selectedResult.changes.map((change: any, idx: number) => (
              <div key={idx} className="change-summary">
                <span className="change-material">{change.materialName}</span>
                <span className="change-action">{change.action === 'REMOVE' ? 'Usunięto' : 'Dostosowano'}</span>
                {change.oldValue !== undefined && (
                  <span className="change-values">{change.oldValue.toFixed(2)}% → {change.newValue?.toFixed(2) || 0}%</span>
                )}
              </div>
            ))}
          </div>

          {/* Wpływ produkcyjny */}
          <div className="production-impact">
            <h4>Wpływ na produkcję:</h4>
            <div className="impact-cards">
              <ImpactCard 
                title="FCR" 
                base={selectedResult.productionImpact.fcr.base}
                simulated={selectedResult.productionImpact.fcr.simulated}
                change={selectedResult.productionImpact.fcr.change}
                unit=""
                lowerIsBetter
              />
              <ImpactCard 
                title="ADG" 
                base={selectedResult.productionImpact.adg.base}
                simulated={selectedResult.productionImpact.adg.simulated}
                change={selectedResult.productionImpact.adg.change}
                unit=" g/dzień"
              />
              <ImpactCard 
                title="Koszt" 
                base={selectedResult.productionImpact.cost.base}
                simulated={selectedResult.productionImpact.cost.simulated}
                change={selectedResult.productionImpact.cost.change}
                unit=" PLN/tona"
                lowerIsBetter
              />
              <ImpactCard 
                title="Zdrowie" 
                base={selectedResult.productionImpact.health.base}
                simulated={selectedResult.productionImpact.health.simulated}
                change={selectedResult.productionImpact.health.change}
                unit="/10"
              />
              <ImpactCard 
                title="Pobór paszy" 
                base={selectedResult.productionImpact.feedIntake.base}
                simulated={selectedResult.productionImpact.feedIntake.simulated}
                change={selectedResult.productionImpact.feedIntake.change}
                unit="%"
                lowerIsBetter
              />
              <ImpactCard 
                title="Pobór wody" 
                base={selectedResult.productionImpact.waterConsumption.base}
                simulated={selectedResult.productionImpact.waterConsumption.simulated}
                change={selectedResult.productionImpact.waterConsumption.change}
                unit="%"
                lowerIsBetter
              />
            </div>
          </div>

          {/* Zmiany odżywcze */}
          <div className="nutrition-comparison">
            <h4>Zmiany wartości odżywczych:</h4>
            <div className="nutrition-table">
              <div className="table-header">
                <span>Parametr</span>
                <span>Obecnie</span>
                <span>Po zmianie</span>
                <span>Różnica</span>
                <span>Status</span>
              </div>
              {selectedResult.nutritionComparison.map((item: any, idx: number) => (
                <div key={idx} className={`table-row ${!item.isWithinStandard ? 'out-of-range' : ''}`}>
                  <span>{item.parameter}</span>
                  <span>{item.baseValue.toFixed(3)} {item.unit}</span>
                  <span>{item.simulatedValue.toFixed(3)} {item.unit}</span>
                  <span className={item.change > 0 ? 'positive' : 'negative'}>
                    {item.change > 0 ? '+' : ''}{item.change.toFixed(3)}
                  </span>
                  <span className={`status ${item.isWithinStandard ? 'ok' : 'warning'}`}>
                    {item.isWithinStandard ? '✓ W normie' : '⚠️ Poza normą'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rekomendacje */}
          {selectedResult.riskAssessment.recommendations.length > 0 && (
            <div className="recommendations">
              <h4>💡 Rekomendacje eksperta:</h4>
              <ul>
                {selectedResult.riskAssessment.recommendations.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Historia eksperymentów */}
      {experiments.length > 0 && (
        <div className="experiments-history">
          <h3>📜 Historia eksperymentów</h3>
          {experiments.map((exp, idx) => (
            <div 
              key={exp.scenarioId} 
              className={`history-item ${selectedResult?.scenarioId === exp.scenarioId ? 'active' : ''}`}
              onClick={() => setSelectedResult(exp)}
            >
              <span className="history-name">{exp.name}</span>
              <span className={`history-risk ${exp.riskAssessment.level.toLowerCase()}`}>{exp.riskAssessment.level}</span>
              <span className="history-date">{new Date().toLocaleDateString('pl-PL')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ImpactCard: React.FC<{
  title: string;
  base: number;
  simulated: number;
  change: number;
  unit: string;
  lowerIsBetter?: boolean;
}> = ({ title, base, simulated, change, unit, lowerIsBetter }) => {
  const isPositive = lowerIsBetter ? change < 0 : change > 0;

  return (
    <div className={`impact-result-card ${isPositive ? 'positive' : 'negative'}`}>
      <span className="impact-title">{title}</span>
      <div className="impact-values">
        <span className="base-value">{base.toFixed(2)}</span>
        <span className="arrow">→</span>
        <span className="simulated-value">{simulated.toFixed(2)}{unit}</span>
      </div>
      <span className={`impact-change ${isPositive ? 'good' : 'bad'}`}>
        {change > 0 ? '+' : ''}{change.toFixed(2)}{unit}
      </span>
    </div>
  );
};
