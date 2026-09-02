import React, { useState, useEffect } from 'react';
import { DashboardKPIs, Batch, Alert, AIForecast } from '../types';
import { batchApi } from '../api/client';
import './Dashboard.css';

interface DashboardProps {
  farmId?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ farmId }) => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [farmId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params = farmId ? { farmId } : {};
      const { data: batchesData } = await batchApi.getAll(params);
      setBatches(batchesData);

      // Calculate KPIs
      const activeBatches = batchesData.filter((b: Batch) => b.status === 'ACTIVE');
      const totalBirds = activeBatches.reduce((sum: number, b: Batch) => sum + b.currentCount, 0);
      const avgAge = activeBatches.length > 0 
        ? activeBatches.reduce((sum: number, b: Batch) => sum + b.currentAgeDays, 0) / activeBatches.length 
        : 0;

      const logs = activeBatches.map((b: Batch) => b.latestDailyLog).filter(Boolean);
      const avgFCR = logs.length > 0 
        ? logs.reduce((sum: number, l: any) => sum + (l.fcr || 0), 0) / logs.length 
        : 0;
      const avgADG = logs.length > 0 
        ? logs.reduce((sum: number, l: any) => sum + (l.adgGrams || 0), 0) / logs.length 
        : 0;
      const avgEPEF = logs.length > 0 
        ? logs.reduce((sum: number, l: any) => sum + (l.epef || 0), 0) / logs.length 
        : 0;

      const totalMortality = activeBatches.reduce((sum: number, b: Batch) => 
        sum + (b.initialCount - b.currentCount), 0);
      const mortalityRate = totalBirds > 0 ? (totalMortality / (totalBirds + totalMortality)) * 100 : 0;

      const totalFeed = logs.reduce((sum: number, l: any) => sum + (l.feedConsumedKg || 0), 0);
      const totalWater = logs.reduce((sum: number, l: any) => sum + (l.waterConsumedL || 0), 0);

      const allAlerts = activeBatches.flatMap((b: Batch) => b.alerts || []);
      setAlerts(allAlerts);
      const activeAlerts = allAlerts.filter((a: Alert) => !a.isResolved).length;
      const criticalAlerts = allAlerts.filter((a: Alert) => a.severity === 'CRITICAL' && !a.isResolved).length;

      const forecasts = activeBatches.map((b: Batch) => b.aiForecast).filter(Boolean);
      const predictedRevenue = forecasts.reduce((sum: number, f: AIForecast) => sum + (f?.predictedRevenue || 0), 0);
      const predictedProfit = forecasts.reduce((sum: number, f: AIForecast) => sum + (f?.predictedProfit || 0), 0);

      const aiScore = logs.length > 0 
        ? Math.round(logs.reduce((sum: number, l: any) => sum + (l.aiScore || 75), 0) / logs.length) 
        : 75;
      const riskScore = Math.min(100, criticalAlerts * 25 + activeAlerts * 5);

      setKpis({
        totalBirds,
        activeBatches: activeBatches.length,
        avgAge: Math.round(avgAge),
        avgFCR: parseFloat(avgFCR.toFixed(3)),
        avgADG: parseFloat(avgADG.toFixed(2)),
        avgEPEF: parseFloat(avgEPEF.toFixed(2)),
        totalMortality,
        mortalityRate: parseFloat(mortalityRate.toFixed(2)),
        totalFeedConsumed: Math.round(totalFeed),
        totalWaterConsumed: Math.round(totalWater),
        activeAlerts,
        criticalAlerts,
        predictedRevenue: Math.round(predictedRevenue),
        predictedProfit: Math.round(predictedProfit),
        aiScore,
        riskScore
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="dashboard-loading">Ładowanie dashboardu...</div>;
  if (!kpis) return <div className="dashboard-empty">Brak danych</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard Rzutu</h1>
        <div className="dashboard-meta">
          <span className="meta-item">
            <span className="meta-label">Aktywne rzuty:</span>
            <span className="meta-value">{kpis.activeBatches}</span>
          </span>
          <span className="meta-item">
            <span className="meta-label">Całkowita liczba ptaków:</span>
            <span className="meta-value">{kpis.totalBirds.toLocaleString()}</span>
          </span>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard 
          title="Liczba ptaków" 
          value={kpis.totalBirds.toLocaleString()} 
          subtitle={`Średni wiek: ${kpis.avgAge} dni`}
          icon="🦃"
          color="#3b82f6"
        />
        <KPICard 
          title="FCR" 
          value={kpis.avgFCR.toString()} 
          subtitle="Feed Conversion Ratio"
          icon="📊"
          color="#8b5cf6"
          trend={kpis.avgFCR < 2.5 ? 'good' : kpis.avgFCR < 3.5 ? 'warning' : 'bad'}
        />
        <KPICard 
          title="ADG" 
          value={`${kpis.avgADG}g`} 
          subtitle="Average Daily Gain"
          icon="📈"
          color="#10b981"
        />
        <KPICard 
          title="EPEF" 
          value={kpis.avgEPEF.toString()} 
          subtitle="European Production Efficiency Factor"
          icon="⭐"
          color="#f59e0b"
        />
        <KPICard 
          title="Śmiertelność" 
          value={`${kpis.mortalityRate}%`} 
          subtitle={`${kpis.totalMortality} szt. łącznie`}
          icon="⚠️"
          color={kpis.mortalityRate > 5 ? '#dc2626' : kpis.mortalityRate > 3 ? '#f59e0b' : '#10b981'}
        />
        <KPICard 
          title="Zużycie paszy" 
          value={`${kpis.totalFeedConsumed.toLocaleString()} kg`} 
          subtitle="Dzisiaj"
          icon="🌾"
          color="#06b6d4"
        />
        <KPICard 
          title="Zużycie wody" 
          value={`${kpis.totalWaterConsumed.toLocaleString()} L`} 
          subtitle="Dzisiaj"
          icon="💧"
          color="#0ea5e9"
        />
        <KPICard 
          title="Koszt produkcji" 
          value={`${(kpis.totalFeedConsumed * 1.8).toLocaleString()} PLN`} 
          subtitle="Szacunkowy"
          icon="💰"
          color="#ef4444"
        />
      </div>

      <div className="dashboard-row">
        <div className="dashboard-section">
          <h3>Status Systemu</h3>
          <div className="status-grid">
            <StatusCard 
              title="Zdrowie" 
              score={100 - kpis.mortalityRate * 10} 
              status={kpis.mortalityRate > 5 ? 'critical' : kpis.mortalityRate > 3 ? 'warning' : 'good'}
            />
            <StatusCard 
              title="Środowisko" 
              score={85} 
              status="good"
            />
            <StatusCard 
              title="Żywienie" 
              score={kpis.avgFCR < 2.5 ? 90 : kpis.avgFCR < 3.5 ? 70 : 50} 
              status={kpis.avgFCR < 3.5 ? 'good' : 'warning'}
            />
            <StatusCard 
              title="AI Score" 
              score={kpis.aiScore} 
              status={kpis.aiScore > 80 ? 'good' : kpis.aiScore > 60 ? 'warning' : 'critical'}
            />
            <StatusCard 
              title="Risk Score" 
              score={100 - kpis.riskScore} 
              status={kpis.riskScore > 50 ? 'critical' : kpis.riskScore > 25 ? 'warning' : 'good'}
              inverted
            />
          </div>
        </div>

        <div className="dashboard-section">
          <h3>Prognoza Końca Rzutu</h3>
          <div className="forecast-cards">
            <ForecastCard 
              label="Przewidywany przychód" 
              value={`${kpis.predictedRevenue.toLocaleString()} PLN`}
              icon="💵"
            />
            <ForecastCard 
              label="Przewidywany zysk" 
              value={`${kpis.predictedProfit.toLocaleString()} PLN`}
              icon="📈"
              positive={kpis.predictedProfit > 0}
            />
            <ForecastCard 
              label="Marża" 
              value={`${kpis.predictedProfit > 0 && kpis.predictedRevenue > 0 ? ((kpis.predictedProfit / kpis.predictedRevenue) * 100).toFixed(1) : 0}%`}
              icon="📊"
            />
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="dashboard-section alerts-section">
          <h3>🔔 Aktywne Alerty ({alerts.filter(a => !a.isResolved).length})</h3>
          <div className="alerts-list">
            {alerts.filter(a => !a.isResolved).slice(0, 5).map(alert => (
              <div key={alert.id} className={`alert-card ${alert.severity.toLowerCase()}`}>
                <div className="alert-header">
                  <span className="alert-type">{alert.type}</span>
                  <span className={`alert-badge ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                </div>
                <p className="alert-title">{alert.title}</p>
                <p className="alert-desc">{alert.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-section">
        <h3>Aktywne Rzuty</h3>
        <table className="batches-table">
          <thead>
            <tr>
              <th>Numer</th>
              <th>Kurnik</th>
              <th>Wiek</th>
              <th>Liczba</th>
              <th>Masa</th>
              <th>FCR</th>
              <th>ADG</th>
              <th>Status</th>
              <th>Alerty</th>
            </tr>
          </thead>
          <tbody>
            {batches.filter((b: Batch) => b.status === 'ACTIVE').map((batch: Batch) => (
              <tr key={batch.id}>
                <td><strong>{batch.batchNumber}</strong></td>
                <td>{batch.sector.house.name}</td>
                <td>{batch.currentAgeDays} dni</td>
                <td>{batch.currentCount.toLocaleString()}</td>
                <td>{batch.currentAvgWeight || batch.avgWeightGrams}g</td>
                <td>{batch.latestDailyLog?.fcr || '-'}</td>
                <td>{batch.latestDailyLog?.adgGrams || '-'}</td>
                <td>
                  <span className={`status-badge ${batch.status.toLowerCase()}`}>
                    {batch.status}
                  </span>
                </td>
                <td>
                  {batch.activeAlertsCount > 0 ? (
                    <span className="alert-count">{batch.activeAlertsCount}</span>
                  ) : (
                    <span className="no-alerts">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KPICard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  trend?: 'good' | 'warning' | 'bad';
}> = ({ title, value, subtitle, icon, color, trend }) => (
  <div className="kpi-card" style={{ borderTopColor: color }}>
    <div className="kpi-header">
      <span className="kpi-icon" style={{ backgroundColor: `${color}15`, color }}>{icon}</span>
      {trend && (
        <span className={`kpi-trend ${trend}`}>
          {trend === 'good' ? '✓' : trend === 'warning' ? '!' : '✗'}
        </span>
      )}
    </div>
    <div className="kpi-value" style={{ color }}>{value}</div>
    <div className="kpi-title">{title}</div>
    <div className="kpi-subtitle">{subtitle}</div>
  </div>
);

const StatusCard: React.FC<{
  title: string;
  score: number;
  status: 'good' | 'warning' | 'critical';
  inverted?: boolean;
}> = ({ title, score, status, inverted }) => {
  const displayScore = inverted ? 100 - score : score;
  const colors = {
    good: '#10b981',
    warning: '#f59e0b',
    critical: '#dc2626'
  };

  return (
    <div className="status-card">
      <div className="status-info">
        <span className="status-title">{title}</span>
        <span className="status-score" style={{ color: colors[status] }}>{Math.round(displayScore)}/100</span>
      </div>
      <div className="status-bar">
        <div 
          className="status-fill" 
          style={{ 
            width: `${displayScore}%`, 
            backgroundColor: colors[status] 
          }}
        />
      </div>
    </div>
  );
};

const ForecastCard: React.FC<{
  label: string;
  value: string;
  icon: string;
  positive?: boolean;
}> = ({ label, value, icon, positive }) => (
  <div className="forecast-card">
    <span className="forecast-icon">{icon}</span>
    <div className="forecast-info">
      <span className="forecast-label">{label}</span>
      <span className={`forecast-value ${positive === true ? 'positive' : positive === false ? 'negative' : ''}`}>
        {value}
      </span>
    </div>
  </div>
);
