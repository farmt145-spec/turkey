import React, { useState, useEffect } from 'react';
import { House, Batch, Alert } from '../types';
import { farmApi } from '../api/client';
import './DigitalTwin.css';

interface HouseWithBatch extends House {
  batch?: Batch;
  alerts?: Alert[];
  metrics?: {
    birdCount: number;
    age: number;
    weight: number;
    fcr: number;
    adg: number;
    temp: number;
    humidity: number;
    recipe: string;
  };
}

interface DigitalTwinProps {
  farmId: string;
  onHouseClick?: (house: HouseWithBatch) => void;
}

export const DigitalTwin: React.FC<DigitalTwinProps> = ({ farmId, onHouseClick }) => {
  const [houses, setHouses] = useState<HouseWithBatch[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<HouseWithBatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFarmData();
  }, [farmId]);

  const loadFarmData = async () => {
    try {
      setLoading(true);
      const { data: housesData } = await farmApi.getHouses(farmId);

      // Enrich with batch data
      const enrichedHouses = await Promise.all(
        housesData.map(async (house: House) => {
          const { data: sectors } = await farmApi.getSectors(house.id);
          const activeSector = sectors.find((s: any) => s.batches?.length > 0);
          const batch = activeSector?.batches?.[0];

          return {
            ...house,
            batch,
            alerts: batch?.alerts || [],
            metrics: batch ? {
              birdCount: batch.currentCount,
              age: batch.currentAgeDays,
              weight: batch.currentAvgWeight || batch.avgWeightGrams,
              fcr: batch.latestDailyLog?.fcr || 0,
              adg: batch.latestDailyLog?.adgGrams || 0,
              temp: 22.5,
              humidity: 65,
              recipe: 'Grower Premium'
            } : undefined
          };
        })
      );

      setHouses(enrichedHouses);
    } catch (error) {
      console.error('Failed to load farm data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHouseColor = (house: HouseWithBatch): string => {
    if (!house.batch) return '#9ca3af'; // gray - empty

    const criticalAlerts = house.alerts?.filter(a => a.severity === 'CRITICAL').length || 0;
    const highAlerts = house.alerts?.filter(a => a.severity === 'HIGH').length || 0;

    if (criticalAlerts > 0) return '#dc2626'; // red
    if (highAlerts > 0) return '#f59e0b'; // yellow
    return '#16a34a'; // green
  };

  const getStatusText = (house: HouseWithBatch): string => {
    if (!house.batch) return 'Pusty';
    const critical = house.alerts?.filter(a => a.severity === 'CRITICAL').length || 0;
    const high = house.alerts?.filter(a => a.severity === 'HIGH').length || 0;
    if (critical > 0) return 'Krytyczny';
    if (high > 0) return 'Wymaga uwagi';
    return 'W normie';
  };

  if (loading) return <div className="dt-loading">Ładowanie mapy fermy...</div>;

  return (
    <div className="digital-twin-container">
      <div className="dt-header">
        <h2>Digital Twin Fermy</h2>
        <div className="dt-legend">
          <span className="legend-item"><span className="dot green" /> W normie</span>
          <span className="legend-item"><span className="dot yellow" /> Wymaga uwagi</span>
          <span className="legend-item"><span className="dot red" /> Krytyczny</span>
          <span className="legend-item"><span className="dot gray" /> Pusty</span>
        </div>
      </div>

      <div className="dt-map">
        {houses.map((house) => (
          <div
            key={house.id}
            className={`dt-house ${selectedHouse?.id === house.id ? 'selected' : ''}`}
            style={{
              left: `${house.coordinates?.x || 0}%`,
              top: `${house.coordinates?.y || 0}%`,
              width: `${house.coordinates?.width || 20}%`,
              height: `${house.coordinates?.height || 15}%`,
              borderColor: getHouseColor(house),
              backgroundColor: `${getHouseColor(house)}15`
            }}
            onClick={() => {
              setSelectedHouse(house);
              onHouseClick?.(house);
            }}
          >
            <div className="house-header">
              <span className="house-name">{house.name}</span>
              <span 
                className="house-status-dot" 
                style={{ backgroundColor: getHouseColor(house) }}
              />
            </div>

            {house.batch && (
              <div className="house-metrics">
                <div className="metric">
                  <span className="metric-label">Ptaki</span>
                  <span className="metric-value">{house.metrics?.birdCount.toLocaleString()}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Wiek</span>
                  <span className="metric-value">{house.metrics?.age} dni</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Masa</span>
                  <span className="metric-value">{house.metrics?.weight}g</span>
                </div>
                <div className="metric">
                  <span className="metric-label">FCR</span>
                  <span className="metric-value">{house.metrics?.fcr}</span>
                </div>
              </div>
            )}

            {!house.batch && (
              <div className="house-empty">Brak rzutu</div>
            )}
          </div>
        ))}
      </div>

      {selectedHouse && (
        <div className="dt-panel">
          <div className="panel-header">
            <h3>{selectedHouse.name}</h3>
            <button className="close-btn" onClick={() => setSelectedHouse(null)}>×</button>
          </div>

          <div className="panel-status" style={{ color: getHouseColor(selectedHouse) }}>
            {getStatusText(selectedHouse)}
          </div>

          {selectedHouse.batch && selectedHouse.metrics && (
            <div className="panel-details">
              <div className="detail-row">
                <span>Rzut:</span>
                <strong>{selectedHouse.batch.batchNumber}</strong>
              </div>
              <div className="detail-row">
                <span>Genetyka:</span>
                <strong>{selectedHouse.batch.genetics}</strong>
              </div>
              <div className="detail-row">
                <span>Liczba ptaków:</span>
                <strong>{selectedHouse.metrics.birdCount.toLocaleString()}</strong>
              </div>
              <div className="detail-row">
                <span>Wiek:</span>
                <strong>{selectedHouse.metrics.age} dni</strong>
              </div>
              <div className="detail-row">
                <span>Średnia masa:</span>
                <strong>{selectedHouse.metrics.weight}g</strong>
              </div>
              <div className="detail-row">
                <span>FCR:</span>
                <strong>{selectedHouse.metrics.fcr}</strong>
              </div>
              <div className="detail-row">
                <span>ADG:</span>
                <strong>{selectedHouse.metrics.adg}g/dzień</strong>
              </div>
              <div className="detail-row">
                <span>Temperatura:</span>
                <strong>{selectedHouse.metrics.temp}°C</strong>
              </div>
              <div className="detail-row">
                <span>Wilgotność:</span>
                <strong>{selectedHouse.metrics.humidity}%</strong>
              </div>
              <div className="detail-row">
                <span>Receptura:</span>
                <strong>{selectedHouse.metrics.recipe}</strong>
              </div>

              {selectedHouse.alerts && selectedHouse.alerts.length > 0 && (
                <div className="panel-alerts">
                  <h4>Alerty</h4>
                  {selectedHouse.alerts.map(alert => (
                    <div key={alert.id} className={`alert-item ${alert.severity.toLowerCase()}`}>
                      <strong>{alert.title}</strong>
                      <p>{alert.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
