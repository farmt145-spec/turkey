import React, { useState, useEffect } from 'react';
import { batchApi } from '../api/client';
import './Timeline.css';

interface TimelineProps {
  batchId: string;
}

interface TimelineEvent {
  id: string;
  category: string;
  dayNumber?: number;
  date: string;
  description: string;
  metadata?: any;
  eventType?: string;
  type?: string;
  severity?: string;
  title?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ batchId }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    loadTimeline();
  }, [batchId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const { data } = await batchApi.getTimeline(batchId);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (category: string, eventType?: string, severity?: string): string => {
    if (severity === 'CRITICAL') return '🔴';
    if (severity === 'HIGH') return '🟠';

    switch (category) {
      case 'EVENT':
        switch (eventType) {
          case 'CHICK_RECEIPT': return '🐣';
          case 'WEIGHING': return '⚖️';
          case 'FEED_CHANGE': return '🌾';
          case 'VACCINATION': return '💉';
          case 'TREATMENT': return '💊';
          case 'BREAKDOWN': return '🔧';
          case 'TEMP_CHANGE': return '🌡️';
          case 'TRANSFER': return '🚚';
          case 'SALE': return '💰';
          case 'CLEANING': return '🧹';
          default: return '📌';
        }
      case 'DAILY_LOG': return '📋';
      case 'TRANSFER': return '🚚';
      case 'VACCINATION': return '💉';
      case 'TREATMENT': return '💊';
      case 'WEIGHING': return '⚖️';
      case 'ALERT': return '⚠️';
      default: return '📌';
    }
  };

  const getEventColor = (category: string, severity?: string): string => {
    if (severity === 'CRITICAL') return '#dc2626';
    if (severity === 'HIGH') return '#f59e0b';

    switch (category) {
      case 'EVENT': return '#3b82f6';
      case 'DAILY_LOG': return '#10b981';
      case 'TRANSFER': return '#8b5cf6';
      case 'VACCINATION': return '#06b6d4';
      case 'TREATMENT': return '#ec4899';
      case 'WEIGHING': return '#f59e0b';
      case 'ALERT': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const filteredEvents = filter === 'ALL' 
    ? events 
    : events.filter(e => e.category === filter);

  const filters = [
    { key: 'ALL', label: 'Wszystko', count: events.length },
    { key: 'EVENT', label: 'Zdarzenia', count: events.filter(e => e.category === 'EVENT').length },
    { key: 'DAILY_LOG', label: 'Dziennik', count: events.filter(e => e.category === 'DAILY_LOG').length },
    { key: 'ALERT', label: 'Alerty', count: events.filter(e => e.category === 'ALERT').length },
    { key: 'TRANSFER', label: 'Transfery', count: events.filter(e => e.category === 'TRANSFER').length },
    { key: 'VACCINATION', label: 'Szczepienia', count: events.filter(e => e.category === 'VACCINATION').length },
    { key: 'TREATMENT', label: 'Leczenie', count: events.filter(e => e.category === 'TREATMENT').length },
    { key: 'WEIGHING', label: 'Ważenia', count: events.filter(e => e.category === 'WEIGHING').length },
  ];

  if (loading) return <div className="timeline-loading">Ładowanie osi czasu...</div>;

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h2>Oś Czasu Rzutu</h2>
        <div className="timeline-filters">
          {filters.map(f => (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="filter-count">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-content">
        <div className="timeline-line" />

        {filteredEvents.map((event, index) => (
          <div 
            key={event.id} 
            className={`timeline-item ${index % 2 === 0 ? 'left' : 'right'}`}
          >
            <div className="timeline-dot" style={{ backgroundColor: getEventColor(event.category, event.severity) }}>
              <span className="timeline-icon">{getEventIcon(event.category, event.eventType, event.severity)}</span>
            </div>

            <div className="timeline-card" style={{ borderLeftColor: getEventColor(event.category, event.severity) }}>
              <div className="timeline-card-header">
                <span className="timeline-category">{event.category}</span>
                {event.dayNumber !== undefined && (
                  <span className="timeline-day">Dzień {event.dayNumber}</span>
                )}
                <span className="timeline-date">
                  {new Date(event.date).toLocaleDateString('pl-PL')}
                </span>
              </div>

              <p className="timeline-description">{event.description}</p>

              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="timeline-metadata">
                  {Object.entries(event.metadata).map(([key, value]) => (
                    <span key={key} className="meta-tag">
                      {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
