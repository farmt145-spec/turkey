import React, { useEffect, useState } from 'react';
import { FeedApi } from '../../services/feed.api';
import { DashboardData, AlertItem } from '../../types/feed.types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import './Dashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const FeedDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000); // Odświeżaj co 30s
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await FeedApi.getDashboard();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Błąd ładowania dashboardu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="dashboard-loading">Ładowanie dashboardu żywienia...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!data) return null;

  const criticalAlerts = data.alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY');

  return (
    <div className="feed-dashboard">
      <header className="dashboard-header">
        <h1>🦃 Bloody Turkey Enterprise — Moduł Żywienia</h1>
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-value">{data.totalRecipes}</span>
            <span className="stat-label">Receptury</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{data.activeRecipes}</span>
            <span className="stat-label">Aktywne</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{data.avgFeedCost.toFixed(0)} PLN</span>
            <span className="stat-label">Śr. koszt/tona</span>
          </div>
          <div className="stat-card alert">
            <span className="stat-value">{criticalAlerts.length}</span>
            <span className="stat-label">Krytyczne alarmy</span>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* AI Insights */}
        <section className="dashboard-section ai-insights">
          <h2>🤖 AI Insights</h2>
          <div className="insights-list">
            {data.aiInsights.map(insight => (
              <div key={insight.id} className={`insight-card ${insight.actionable ? 'actionable' : ''}`}>
                <div className="insight-header">
                  <span className="insight-type">{insight.type}</span>
                  <span className="insight-confidence">{Math.round(insight.confidence * 100)}% pewności</span>
                </div>
                <h3>{insight.title}</h3>
                <p>{insight.description}</p>
                {insight.recommendedAction && (
                  <div className="recommended-action">
                    <strong>Rekomendacja:</strong> {insight.recommendedAction}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Trendy produkcyjne */}
        <section className="dashboard-section trends">
          <h2>📈 Trendy Produkcyjne (30 dni)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.productionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="fcr" stroke="#8884d8" name="FCR" />
              <Line yAxisId="right" type="monotone" dataKey="adg" stroke="#82ca9d" name="ADG (g/d)" />
              <Line yAxisId="right" type="monotone" dataKey="mortality" stroke="#ff7300" name="Śmiertelność (%)" />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Alarmy */}
        <section className="dashboard-section alerts">
          <h2>🚨 Aktywne Alarmy</h2>
          <div className="alerts-list">
            {data.alerts.length === 0 ? (
              <p className="no-alerts">Brak aktywnych alarmów ✅</p>
            ) : (
              data.alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            )}
          </div>
        </section>

        {/* Magazyn */}
        <section className="dashboard-section inventory">
          <h2>📦 Stan Magazynowy</h2>
          <div className="inventory-list">
            {data.inventory.map(item => (
              <div key={item.materialId} className={`inventory-item ${item.status}`}>
                <span className="material-name">{item.materialName}</span>
                <div className="inventory-bar">
                  <div 
                    className="inventory-fill" 
                    style={{ width: `${Math.min(100, (item.quantityKg / Math.max(item.minLevel, 1)) * 100)}%` }}
                  />
                </div>
                <span className="inventory-value">{item.quantityKg.toFixed(0)} kg</span>
                {item.status !== 'ok' && (
                  <span className={`inventory-badge ${item.status}`}>
                    {item.status === 'critical' ? 'KRYTYCZNY' : 'NISKI'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const AlertCard: React.FC<{ alert: AlertItem }> = ({ alert }) => {
  const severityClass = alert.severity.toLowerCase();

  return (
    <div className={`alert-card ${severityClass}`}>
      <div className="alert-header">
        <span className={`alert-severity ${severityClass}`}>{alert.severity}</span>
        <span className="alert-type">{alert.type}</span>
        <span className="alert-date">{new Date(alert.createdAt).toLocaleDateString('pl-PL')}</span>
      </div>
      <h3>{alert.title}</h3>
      <p className="alert-message">{alert.message}</p>

      {alert.consequences.length > 0 && (
        <div className="alert-consequences">
          <strong>Możliwe konsekwencje:</strong>
          <ul>
            {alert.consequences.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {alert.recommendations.length > 0 && (
        <div className="alert-recommendations">
          <strong>Zalecenia:</strong>
          <ul>
            {alert.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div className="alert-actions">
        <button onClick={() => FeedApi.acknowledgeAlert(alert.id)}>Potwierdź</button>
        <button onClick={() => FeedApi.resolveAlert(alert.id)}>Rozwiąż</button>
      </div>
    </div>
  );
};
