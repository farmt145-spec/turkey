import React, { useState, useEffect } from 'react';
import { FeedApi } from '../../services/feed.api';
import './ExpertCard.css';

interface ExpertCardProps {
  materialId: string;
  onClose: () => void;
}

export const ExpertCard: React.FC<ExpertCardProps> = ({ materialId, onClose }) => {
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'impacts' | 'risks' | 'interactions' | 'knowledge'>('overview');

  useEffect(() => {
    loadCard();
  }, [materialId]);

  const loadCard = async () => {
    try {
      const result = await FeedApi.getIngredientExpertCard(materialId);
      setCard(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="expert-card-modal"><div className="loading">Ładowanie karty eksperckiej...</div></div>;
  if (!card) return null;

  const { material, profile, impacts, risks, interactions, knowledge } = card;

  return (
    <div className="expert-card-modal" onClick={onClose}>
      <div className="expert-card-content" onClick={e => e.stopPropagation()}>
        <header className="expert-card-header">
          <h2>🔬 {material.name}</h2>
          <span className="material-category">{material.category}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </header>

        <nav className="expert-tabs">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Przegląd</button>
          <button className={activeTab === 'impacts' ? 'active' : ''} onClick={() => setActiveTab('impacts')}>Wpływy</button>
          <button className={activeTab === 'risks' ? 'active' : ''} onClick={() => setActiveTab('risks')}>Ryzyka</button>
          <button className={activeTab === 'interactions' ? 'active' : ''} onClick={() => setActiveTab('interactions')}>Interakcje</button>
          <button className={activeTab === 'knowledge' ? 'active' : ''} onClick={() => setActiveTab('knowledge')}>Wiedza</button>
        </nav>

        <div className="expert-card-body">
          {activeTab === 'overview' && (
            <div className="tab-overview">
              <section className="expert-section">
                <h3>Opis</h3>
                <p>{profile.description}</p>
              </section>
              <section className="expert-section">
                <h3>Wartość biologiczna</h3>
                <p>{profile.biologicalValue}</p>
              </section>
              <section className="expert-section">
                <h3>Strawność</h3>
                <p>{profile.digestibility}</p>
              </section>
              {profile.microbiomeImpact && (
                <section className="expert-section">
                  <h3>Wpływ na mikrobiom</h3>
                  <p>{profile.microbiomeImpact}</p>
                  {profile.prebioticEffect && <span className="prebiotic-badge">✨ Efekt prebiotyczny</span>}
                </section>
              )}
              <div className="nutrition-quick-facts">
                <div className="quick-fact">
                  <span className="fact-label">ME</span>
                  <span className="fact-value">{material.meTurkey} kcal/kg</span>
                </div>
                <div className="quick-fact">
                  <span className="fact-label">Białko</span>
                  <span className="fact-value">{material.crudeProtein}%</span>
                </div>
                <div className="quick-fact">
                  <span className="fact-label">Lizyna</span>
                  <span className="fact-value">{material.lysine}%</span>
                </div>
                <div className="quick-fact">
                  <span className="fact-label">Włókno</span>
                  <span className="fact-value">{material.crudeFiber}%</span>
                </div>
                <div className="quick-fact">
                  <span className="fact-label">Sód</span>
                  <span className="fact-value">{material.sodium}%</span>
                </div>
                <div className="quick-fact">
                  <span className="fact-label">Koszt</span>
                  <span className="fact-value">{material.costPerTon} PLN/t</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'impacts' && (
            <div className="tab-impacts">
              <h3>Wpływ na produkcję (skala -5 do +5)</h3>
              <div className="impacts-grid">
                {Object.entries(impacts).map(([key, value]: [string, any]) => (
                  <div key={key} className={`impact-card score-${value.score > 0 ? 'positive' : value.score < 0 ? 'negative' : 'neutral'}`}>
                    <div className="impact-score">{value.score > 0 ? '+' : ''}{value.score}</div>
                    <div className="impact-name">{translateImpactName(key)}</div>
                    <div className="impact-explanation">{value.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'risks' && (
            <div className="tab-risks">
              <section className="expert-section risk-section">
                <h3>⚠️ Ryzyko przedawkowania</h3>
                <p>{risks.overdoseRisk}</p>
                {risks.overdoseSymptoms.length > 0 && (
                  <div className="symptoms-list">
                    <h4>Objawy przedawkowania:</h4>
                    <ul>{risks.overdoseSymptoms.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
              </section>
              <section className="expert-section risk-section">
                <h3>📉 Objawy niedoboru</h3>
                {risks.deficiencySymptoms.length > 0 ? (
                  <ul>{risks.deficiencySymptoms.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                ) : <p>Brak zdefiniowanych objawów niedoboru.</p>}
              </section>
              <section className="expert-section">
                <h3>📏 Zalecany udział</h3>
                <div className="range-display">
                  <div className="range-bar">
                    <div className="range-optimal" style={{ left: `${risks.recommendedMin}%`, width: `${risks.recommendedMax - risks.recommendedMin}%` }} />
                    <div className="range-marker" style={{ left: `${material.maxInclusion}%` }} title={`Maksymalny: ${material.maxInclusion}%`} />
                  </div>
                  <div className="range-labels">
                    <span>Min: {risks.recommendedMin}%</span>
                    <span>Max: {risks.recommendedMax}%</span>
                    <span>Limit: {material.maxInclusion}%</span>
                  </div>
                </div>
                {risks.optimalRange && <p className="optimal-note">{risks.optimalRange}</p>}
              </section>
            </div>
          )}

          {activeTab === 'interactions' && (
            <div className="tab-interactions">
              <h3>⚗️ Interakcje z innymi składnikami</h3>
              {interactions.length === 0 ? (
                <p>Brak zdefiniowanych interakcji.</p>
              ) : (
                interactions.map((interaction: any, idx: number) => (
                  <div key={idx} className={`interaction-card severity-${interaction.severity.toLowerCase()}`}>
                    <div className="interaction-header">
                      <span className="interaction-material">{interaction.materialName}</span>
                      <span className={`interaction-type ${interaction.interactionType.toLowerCase()}`}>{interaction.interactionType}</span>
                      <span className={`interaction-severity ${interaction.severity.toLowerCase()}`}>{interaction.severity}</span>
                    </div>
                    <p className="interaction-desc">{interaction.description}</p>
                    <div className="interaction-recommendation">
                      <strong>Rekomendacja:</strong> {interaction.recommendation}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="tab-knowledge">
              <h3>📚 Baza wiedzy</h3>
              {knowledge.length === 0 ? (
                <p>Brak wpisów w bibliotece wiedzy.</p>
              ) : (
                knowledge.map((entry: any, idx: number) => (
                  <div key={idx} className="knowledge-entry">
                    <div className="knowledge-header">
                      <span className="knowledge-type">{entry.type}</span>
                      <span className="knowledge-source">{entry.source} {entry.year && `(${entry.year})`}</span>
                      {entry.isPeerReviewed && <span className="peer-reviewed">✓ Recenzowany</span>}
                    </div>
                    <h4>{entry.title}</h4>
                    <p className="knowledge-summary">{entry.summary}</p>
                    {entry.keyFindings.length > 0 && (
                      <div className="key-findings">
                        <strong>Kluczowe wnioski:</strong>
                        <ul>{entry.keyFindings.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function translateImpactName(key: string): string {
  const map: Record<string, string> = {
    fcr: 'FCR', adg: 'ADG', epef: 'EPEF', gutHealth: 'Zdrowie jelit',
    immunity: 'Odporność', litterQuality: 'Jakość ściółki', waterConsumption: 'Pobór wody',
    legHealth: 'Zdrowie nóg', carcassQuality: 'Jakość tuszki',
  };
  return map[key] || key;
}
