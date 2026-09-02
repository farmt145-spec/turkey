import React, { useState } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { Device, BuildingMap, ZoneMap } from '../../types';
import { Thermometer, Droplets, Wind, Zap, Flame, Box, Activity, Camera, DoorOpen, Battery } from 'lucide-react';

const categoryIcons: Record<string, React.ElementType> = {
  TEMPERATURE_SENSOR: Thermometer, HUMIDITY_SENSOR: Droplets, CO2_SENSOR: Wind, NH3_SENSOR: Wind, H2S_SENSOR: Wind,
  AIRFLOW_SENSOR: Wind, ENERGY_METER: Zap, GAS_METER: Flame, WATER_METER: Droplets, FEED_SCALE: Box,
  FEED_SILO_LEVEL: Box, FEED_AUTO: Box, AI_CAMERA: Camera, DOOR_SENSOR: DoorOpen, GENERATOR: Zap,
  UPS: Battery, FIRE_ALARM: Flame, CLIMATE_CONTROLLER: Activity,
};

const statusColors: Record<string, string> = {
  ONLINE: 'bg-green-500', OFFLINE: 'bg-gray-400', WARNING: 'bg-yellow-500', ERROR: 'bg-red-500',
  MAINTENANCE: 'bg-blue-500', CALIBRATING: 'bg-purple-500',
};

const DeviceNode: React.FC<{ device: Device; onClick: (d: Device) => void; x: number; y: number }> = ({ device, onClick, x, y }) => {
  const Icon = categoryIcons[device.category] || Activity;
  const colorClass = statusColors[device.status] || 'bg-gray-400';
  return (
    <g transform={`translate(${x}, ${y})`} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onClick(device)}>
      <circle r="16" className={`${colorClass} opacity-20`} /><circle r="8" className={colorClass} />
      <foreignObject x="-10" y="-32" width="20" height="20"><div className="flex items-center justify-center"><Icon className="w-4 h-4 text-gray-700" /></div></foreignObject>
      <text y="24" textAnchor="middle" className="text-xs fill-gray-700 font-medium" style={{ fontSize: '10px' }}>{device.name}</text>
      {device.lastTelemetry?.value !== undefined && <text y="36" textAnchor="middle" className="text-xs fill-gray-500" style={{ fontSize: '9px' }}>{typeof device.lastTelemetry.value === 'number' ? `${device.lastTelemetry.value.toFixed(1)} ${device.lastTelemetry.unit || ''}` : '—'}</text>}
    </g>
  );
};

export const FarmDeviceMap: React.FC = () => {
  const deviceMap = useDashboardStore((state) => state.deviceMap);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!deviceMap || deviceMap.length === 0) return (
    <div className="bg-white rounded-xl p-8 border border-gray-100 text-center"><p className="text-gray-500">Brak danych mapy urządzeń</p></div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Mapa urządzeń</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1" /> Online</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-1" /> Warning</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1" /> Error</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-gray-400 mr-1" /> Offline</span>
        </div>
      </div>
      <div className="relative overflow-hidden cursor-move" style={{ height: '600px' }}
        onWheel={(e) => { e.preventDefault(); setScale(Math.min(Math.max(scale + e.deltaY * -0.001, 0.5), 3)); }}
        onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }}
        onMouseMove={(e) => { if (!isDragging) return; setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
        onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
        <svg width="100%" height="100%" viewBox={`${-pan.x} ${-pan.y} ${1200 / scale} ${800 / scale}`} className="bg-gray-50">
          {deviceMap.map((building) => (
            <g key={building.id}>
              <rect x={building.position?.x || 50} y={building.position?.y || 50} width={building.layout?.width || 300} height={building.layout?.height || 200} rx="8" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2" />
              <text x={(building.position?.x || 50) + 10} y={(building.position?.y || 50) + 20} className="text-sm font-bold fill-gray-800">{building.name}</text>
              {building.zones.map((zone, zIdx) => (
                <g key={zone.id}>
                  <rect x={(zone.position?.x || 0) + (building.position?.x || 50)} y={(zone.position?.y || 0) + (building.position?.y || 50)} width="120" height="80" rx="4" fill="#fff" stroke="#d1d5db" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={(zone.position?.x || 0) + (building.position?.x || 50) + 5} y={(zone.position?.y || 0) + (building.position?.y || 50) + 15} className="text-xs fill-gray-600">{zone.name}</text>
                  {zone.devices.map((device, idx) => (
                    <DeviceNode key={device.id} device={device} onClick={setSelectedDevice}
                      x={(zone.position?.x || 0) + (building.position?.x || 50) + 30 + (idx % 3) * 35}
                      y={(zone.position?.y || 0) + (building.position?.y || 50) + 40 + Math.floor(idx / 3) * 35} />
                  ))}
                </g>
              ))}
              {building.unzonedDevices.map((device, idx) => (
                <DeviceNode key={device.id} device={device} onClick={setSelectedDevice}
                  x={(building.position?.x || 50) + 150 + (idx % 4) * 40}
                  y={(building.position?.y || 50) + 120 + Math.floor(idx / 4) * 40} />
              ))}
            </g>
          ))}
        </svg>
      </div>
      {selectedDevice && (
        <div className="absolute bottom-4 right-4 w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">{selectedDevice.name}</h4>
            <button onClick={() => setSelectedDevice(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Typ:</span><span className="font-medium">{selectedDevice.typeName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedDevice.status === 'ONLINE' ? 'bg-green-100 text-green-800' : selectedDevice.status === 'ERROR' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{selectedDevice.status}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ostatni kontakt:</span><span className="font-medium">{selectedDevice.lastSeen ? new Date(selectedDevice.lastSeen).toLocaleString('pl-PL') : 'Nigdy'}</span></div>
            {selectedDevice.lastTelemetry && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Ostatni odczyt</p>
                <p className="text-lg font-semibold text-gray-900">{typeof selectedDevice.lastTelemetry.value === 'number' ? `${selectedDevice.lastTelemetry.value.toFixed(2)} ${selectedDevice.lastTelemetry.unit || ''}` : JSON.stringify(selectedDevice.lastTelemetry.value)}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(selectedDevice.lastTelemetry.timestamp).toLocaleString('pl-PL')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
