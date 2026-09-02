import React, { useState, useEffect } from 'react';
import { FeedApi } from '../../services/feed.api';
import { Recipe, NutritionalStandard, GenerateRecipeRequest } from '../../types/feed.types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import './RecipeGenerator.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#4ECDC4', '#45B7D1'];

export const RecipeGenerator: React.FC = () => {
  const [standards, setStandards] = useState<NutritionalStandard[]>([]);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [priority, setPriority] = useState<string>('BALANCED');
  const [maxCost, setMaxCost] = useState<number | undefined>(undefined);
  const [showExplanations, setShowExplanations] = useState(true);

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    try {
      const result = await FeedApi.getStandards();
      setStandards(result);
    } catch (err) {
      console.error('Błąd ładowania norm:', err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedStandard) return;

    const standard = standards.find(s => s.id === selectedStandard);
    if (!standard) return;

    setLoading(true);
    try {
      const request: GenerateRecipeRequest = {
        gender: standard.gender,
        productionType: standard.productionType,
        ageDays: Math.floor((standard.ageFromDays + standard.ageToDays) / 2),
        phase: standard.phase,
        priority,
        maxCostPerTon: maxCost,
      };

      const recipe = await FeedApi.generateRecipe(request);
      setGeneratedRecipe(recipe);
    } catch (err) {
      alert('Błąd generowania receptury: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  const pieData = generatedRecipe?.ingredients.map(ing => ({
    name: ing.rawMaterial.name,
    value: ing.percentage,
    cost: ing.costPerTon,
  })) || [];

  return (
    <div className="recipe-generator">
      <header>
        <h1>🧠 Inteligentny Generator Receptur AI</h1>
        <p className="subtitle">Wybierz parametry, a system wygeneruje optymalną recepturę z pełnym uzasadnieniem AI.</p>
      </header>

      <div className="generator-form">
        <div className="form-group">
          <label>Norma żywieniowa</label>
          <select value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)}>
            <option value="">Wybierz normę...</option>
            {standards.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.gender}, {s.phase}, {s.ageFromDays}-{s.ageToDays} dni)
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Priorytet optymalizacji</label>
          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="BALANCED">Zbalansowany (koszt + wydajność + zdrowie)</option>
            <option value="COST">Minimalny koszt</option>
            <option value="FCR">Minimalny FCR</option>
            <option value="ADG">Maksymalny ADG</option>
            <option value="EPEF">Maksymalny EPEF</option>
            <option value="HEALTH">Zdrowie i dobrostan</option>
          </select>
        </div>

        <div className="form-group">
          <label>Maksymalny koszt (PLN/tona) — opcjonalnie</label>
          <input 
            type="number" 
            value={maxCost || ''} 
            onChange={e => setMaxCost(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="np. 1800"
          />
        </div>

        <button 
          className="generate-btn" 
          onClick={handleGenerate} 
          disabled={loading || !selectedStandard}
        >
          {loading ? 'Generowanie AI...' : '⚡ Generuj Recepturę AI'}
        </button>
      </div>

      {generatedRecipe && (
        <div className="recipe-result">
          <div className="recipe-header">
            <h2>{generatedRecipe.name}</h2>
            <div className="recipe-badges">
              <span className={`badge validation-${generatedRecipe.validationStatus.toLowerCase()}`}>
                {generatedRecipe.validationStatus === 'VALID' ? '✅ Zwalidowana' : '⚠️ Wymaga uwagi'}
              </span>
              {generatedRecipe.aiConfidence && (
                <span className="badge ai-confidence">
                  🤖 Pewność AI: {Math.round(generatedRecipe.aiConfidence * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Ostrzeżenia eksperckie */}
          {generatedRecipe.warnings && generatedRecipe.warnings.length > 0 && (
            <div className="expert-warnings">
              <h3>⚠️ Ostrzeżenia eksperckie</h3>
              {generatedRecipe.warnings.map((warning, idx) => (
                <div key={idx} className={`warning-card severity-${warning.severity}`}>
                  <h4>{warning.parameter}</h4>
                  <p>{warning.message}</p>
                  <div className="consequences">
                    <strong>Konsekwencje:</strong>
                    <ul>
                      {warning.consequences.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Składniki i wyjaśnienia AI */}
          <div className="recipe-content">
            <div className="ingredients-section">
              <h3>🧪 Składniki receptury</h3>
              <div className="ingredients-table">
                <div className="table-header">
                  <span>Surowiec</span>
                  <span>%</span>
                  <span>kg/tona</span>
                  <span>Koszt (PLN/tona)</span>
                  <span>Udział w koszcie</span>
                </div>
                {generatedRecipe.ingredients.map(ing => (
                  <div key={ing.id} className="table-row">
                    <span className="material-name">{ing.rawMaterial.name}</span>
                    <span className="percentage">{ing.percentage.toFixed(2)}%</span>
                    <span>{ing.quantityKg.toFixed(1)}</span>
                    <span>{ing.costPerTon.toFixed(2)}</span>
                    <span>{((ing.costPerTon / generatedRecipe.costPerTon) * 100).toFixed(1)}%</span>
                  </div>
                ))}
                <div className="table-footer">
                  <span><strong>RAZEM</strong></span>
                  <span><strong>100%</strong></span>
                  <span><strong>1000 kg</strong></span>
                  <span><strong>{generatedRecipe.costPerTon.toFixed(2)} PLN</strong></span>
                  <span><strong>100%</strong></span>
                </div>
              </div>

              {/* Wykres kołowy składników */}
              <div className="chart-container">
                <h4>Struktura receptury</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Wyjaśnienia AI */}
            {showExplanations && (
              <div className="ai-explanations">
                <h3>🤖 Wyjaśnienia decyzji AI</h3>
                {generatedRecipe.ingredients.map(ing => (
                  ing.aiExplanation && (
                    <div key={ing.id} className="explanation-card">
                      <h4>{ing.rawMaterial.name} ({ing.percentage.toFixed(2)}%)</h4>
                      <div className="explanation-text">
                        {ing.aiExplanation.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>

                      {ing.aiImpact && (
                        <div className="impact-grid">
                          <div className="impact-item">
                            <span className="impact-label">FCR</span>
                            <span className={`impact-value ${ing.aiImpact.fcr < 0 ? 'positive' : 'negative'}`}>
                              {ing.aiImpact.fcr > 0 ? '+' : ''}{ing.aiImpact.fcr.toFixed(3)}
                            </span>
                          </div>
                          <div className="impact-item">
                            <span className="impact-label">ADG</span>
                            <span className={`impact-value ${ing.aiImpact.adg > 0 ? 'positive' : 'negative'}`}>
                              {ing.aiImpact.adg > 0 ? '+' : ''}{ing.aiImpact.adg.toFixed(3)} g/d
                            </span>
                          </div>
                          <div className="impact-item">
                            <span className="impact-label">Jelita</span>
                            <span className={`impact-value ${ing.aiImpact.gutHealth > 0 ? 'positive' : 'negative'}`}>
                              {ing.aiImpact.gutHealth > 0 ? '+' : ''}{ing.aiImpact.gutHealth.toFixed(3)}
                            </span>
                          </div>
                          <div className="impact-item">
                            <span className="impact-label">Odporność</span>
                            <span className={`impact-value ${ing.aiImpact.immunity > 0 ? 'positive' : 'negative'}`}>
                              {ing.aiImpact.immunity > 0 ? '+' : ''}{ing.aiImpact.immunity.toFixed(3)}
                            </span>
                          </div>
                          <div className="impact-item">
                            <span className="impact-label">Ściółka</span>
                            <span className={`impact-value ${ing.aiImpact.litterQuality > 0 ? 'positive' : 'negative'}`}>
                              {ing.aiImpact.litterQuality > 0 ? '+' : ''}{ing.aiImpact.litterQuality.toFixed(3)}
                            </span>
                          </div>
                          <div className="impact-item">
                            <span className="impact-label">Nogi</span>
                            <span className={`impact-value ${ing.aiImpact.legQuality > 0 ? 'positive' : 'negative'}`}>
                              {ing.aiImpact.legQuality > 0 ? '+' : ''}{ing.aiImpact.legQuality.toFixed(3)}
                            </span>
                          </div>
                          <div className="impact-item">
                            <span className="impact-label">Woda</span>
                            <span className={`impact-value ${ing.aiImpact.waterConsumption < 0 ? 'positive' : 'negative'}`}>
                              {ing.aiImpact.waterConsumption > 0 ? '+' : ''}{ing.aiImpact.waterConsumption.toFixed(3)}%
                            </span>
                          </div>
                          <div className="impact-item">
                            <span className="impact-label">Koszt</span>
                            <span className="impact-value cost">
                              {ing.aiImpact.costImpact.toFixed(2)} PLN/t
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Wartości odżywcze */}
          <div className="nutrition-summary">
            <h3>📊 Wartości odżywcze obliczone</h3>
            <div className="nutrition-grid">
              {Object.entries(generatedRecipe.calculatedNutrition)
                .filter(([key]) => !key.includes('Meq'))
                .slice(0, 20)
                .map(([key, value]) => (
                <div key={key} className="nutrition-item">
                  <span className="nutrition-label">{key}</span>
                  <span className="nutrition-value">{typeof value === 'number' ? value.toFixed(3) : value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ekonomika */}
          <div className="economics-section">
            <h3>💰 Analiza ekonomiczna</h3>
            <div className="economics-grid">
              <div className="economics-card">
                <span className="economics-label">Koszt tony paszy</span>
                <span className="economics-value">{generatedRecipe.costPerTon.toFixed(2)} PLN</span>
              </div>
              <div className="economics-card">
                <span className="economics-label">Koszt kg paszy</span>
                <span className="economics-value">{generatedRecipe.costPerKg.toFixed(4)} PLN</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
