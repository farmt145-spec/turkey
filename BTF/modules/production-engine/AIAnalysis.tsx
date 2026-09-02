import React, { useState, useEffect } from 'react';
import { AIAnalysis, Alert, DailyLog } from '../types';
import { dailyLogApi } from '../api/client';
import './AIAnalysis.css';

interface AIAnalysisProps {
  batchId: string;
  dayNumber: number;
}

export const AIAnalysisPanel: React.FC<AIAnalysisProps> = ({ batchId, dayNumber }) => {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, [batchId, dayNumber]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const { data } = await dailyLogApi.getByDay(batchId, dayNumber);
      setDailyLog(data);
      setAnalysis(data.aiAnalysis);
    } catch (error) {
      console.error('Failed to load AI analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="ai-loading">Analiza AI w toku...</div>;
  if (!analysis) return <div className="ai-empty">Brak analizy AI dla tego dnia</div>;

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#dc2626';
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'LOW': return '#10b981';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#f97316';
      case 'CRITICAL': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getRiskLabel = (risk: string): string => {
    switch (risk) {
      case 'LOW': return 'Niskie';
      case 'MEDIUM': return 'Średnie';
      case 'HIGH': return 'Wysokie';
      case 'CRITICAL': return 'Krytyczne';
      default: return risk;
    }
  };

  return (
    <div className="ai-analysis-container">
      <div className="ai-header">
        <h2>🤖 AI Daily Analysis</h2>
        <span className="ai-day">Dzień {dayNumber}</span>
      </div>

      <div className="ai-scores">
        <div className="score-main">
          <div className="score-circle" style={{ borderColor: getScoreColor(analysis.dayScore) }}>
            <span className="score-value" style={{ color: getScoreColor(analysis.dayScore) }}>
              {analysis.dayScore}
            </span>
            <span className="score-label">Ocena dnia</span>
          </div>
        </div>

        <div className="score-details">
          <ScoreBar label="Temperatura" score={analysis.tempScore || 0} />
          <ScoreBar label="Woda" score={analysis.waterScore || 0} />
          <ScoreBar label="Pasza" score={analysis.feedScore || 0} />
          <ScoreBar label="Wilgotność" score={analysis.humidityScore || 0} />
          <ScoreBar label="CO₂" score={analysis.co2Score || 0} />
          <ScoreBar label="NH₃" score={analysis.nh3Score || 0} />
        </div>

        <div className="risk-badge" style={{ backgroundColor: `${getRiskColor(analysis.riskLevel)}15`, color: getRiskColor(analysis.riskLevel) }}>
          <span className="risk-label-text">Poziom ryzyka:</span>
          <strong>{getRiskLabel(analysis.riskLevel)}</strong>
        </div>
      </div>

      {analysis.detectedIssues.length > 0 && (
        <div className="ai-section">
          <h3>⚠️ Wykryte Problemy</h3>
          <div className="issues-list">
            {analysis.detectedIssues.map((issue, idx) => (
              <div key={idx} className={`issue-card ${issue.severity.toLowerCase()}`}>
                <div className="issue-header">
                  <span className="issue-type">{issue.type}</span>
                  <span className={`issue-severity ${issue.severity.toLowerCase()}`}>{issue.severity}</span>
                </div>
                <p className="issue-desc">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.possibleCauses.length > 0 && (
        <div className="ai-section">
          <h3>🔍 Możliwe Przyczyny</h3>
          <ul className="causes-list">
            {analysis.possibleCauses.map((cause, idx) => (
              <li key={idx}>{cause}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommendations.length > 0 && (
        <div className="ai-section">
          <h3>💡 Rekomendacje Działań</h3>
          <div className="recommendations-list">
            {analysis.recommendations.map((rec, idx) => (
              <div key={idx} className="recommendation-card">
                <span className="rec-number">{idx + 1}</span>
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.forecast7Days.length > 0 && (
        <div className="ai-section">
          <h3>📊 Prognoza 7-dniowa</h3>
          <div className="forecast-table-container">
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Dzień</th>
                  <th>Przewidywana masa</th>
                  <th>Przewidywana śmiertelność</th>
                  <th>Przewidywany FCR</th>
                </tr>
              </thead>
              <tbody>
                {analysis.forecast7Days.map((day, idx) => (
                  <tr key={idx}>
                    <td>{day.day}</td>
                    <td>{day.predictedWeight}g</td>
                    <td>{day.predictedMortality} szt.</td>
                    <td>{day.predictedFCR}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#dc2626';

  return (
    <div className="score-bar-item">
      <div className="score-bar-header">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-value" style={{ color }}>{score}/100</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};
