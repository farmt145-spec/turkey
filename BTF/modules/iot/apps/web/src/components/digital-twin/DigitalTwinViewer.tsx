import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Box, Cylinder, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { DeviceTwinState, BuildingTwinState, ZoneTwinState } from '../../types';

const TwinDevice: React.FC<{ device: DeviceTwinState; position: [number, number, number] }> = ({ device, position }) => {
  const [hovered, setHovered] = useState(false);
  const getColor = () => {
    if (device.isStale) return '#9ca3af';
    switch (device.status) { case 'ONLINE': return '#10b981'; case 'WARNING': return '#f59e0b'; case 'ERROR': return '#ef4444'; case 'MAINTENANCE': return '#3b82f6'; default: return '#6b7280'; }
  };
  const getGeometry = () => {
    switch (device.category) {
      case 'TEMPERATURE_SENSOR': case 'HUMIDITY_SENSOR': case 'CO2_SENSOR': case 'NH3_SENSOR': case 'H2S_SENSOR': return <Sphere args={[0.3, 16, 16]} />;
      case 'CLIMATE_CONTROLLER': case 'GENERATOR': case 'UPS': return <Box args={[0.6, 0.8, 0.6]} />;
      case 'FEED_SILO_LEVEL': case 'FEED_SCALE': return <Cylinder args={[0.4, 0.4, 0.8, 16]} />;
      default: return <Box args={[0.4, 0.4, 0.4]} />;
    }
  };
  return (
    <group position={position}>
      <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        {getGeometry()}<meshStandardMaterial color={getColor()} />
      </mesh>
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 whitespace-nowrap">
            <p className="font-semibold text-sm text-gray-900">{device.name}</p>
            <p className="text-xs text-gray-500">{device.typeName}</p>
            {device.lastTelemetry && <p className="text-sm font-medium text-blue-600 mt-1">{typeof device.lastTelemetry.value === 'number' ? `${device.lastTelemetry.value.toFixed(1)} ${device.lastTelemetry.unit || ''}` : '—'}</p>}
            <p className={`text-xs mt-1 ${device.status === 'ONLINE' ? 'text-green-600' : 'text-red-600'}`}>{device.status} {device.isStale && '(stale)'}</p>
          </div>
        </Html>
      )}
    </group>
  );
};

const TwinBuilding: React.FC<{ building: BuildingTwinState; offset: [number, number, number] }> = ({ building, offset }) => {
  return (
    <group position={offset}>
      <mesh position={[0, 1.5, 0]}><boxGeometry args={[8, 3, 12]} /><meshStandardMaterial color="#f3f4f6" transparent opacity={0.3} /></mesh>
      <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(8, 3, 12)]} /><lineBasicMaterial color="#9ca3af" /></lineSegments>
      <Text position={[0, 3.2, 0]} fontSize={0.4} color="#1f2937" anchorX="center" anchorY="middle">{building.name}</Text>
      {building.climate && (
        <Html position={[-3, 2.5, 0]} transform>
          <div className="bg-white/90 backdrop-blur px-2 py-1 rounded text-xs border border-gray-200">
            <div className="font-semibold text-gray-700">Klimat</div>
            <div className="text-gray-600">T: {building.climate.avgTemperature?.toFixed(1)}°C</div>
            <div className="text-gray-600">H: {building.climate.avgHumidity?.toFixed(1)}%</div>
            <div className="text-gray-600">CO₂: {building.climate.avgCO2?.toFixed(0)}ppm</div>
          </div>
        </Html>
      )}
      {building.zones.map((zone, zIdx) => (
        <group key={zone.id} position={[zIdx * 2.5 - 2, 0, 0]}>
          <mesh position={[0, 0.1, 0]}><boxGeometry args={[2, 0.2, 3]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
          <Text position={[0, 0.4, 1.6]} fontSize={0.2} color="#6b7280">{zone.name}</Text>
          {zone.devices.map((device, dIdx) => (
            <TwinDevice key={device.id} device={device} position={[Math.sin(dIdx * 0.8) * 0.6, 0.5, Math.cos(dIdx * 0.8) * 0.6]} />
          ))}
        </group>
      ))}
      {building.unzonedDevices.map((device, dIdx) => (
        <TwinDevice key={device.id} device={device} position={[3.5, 0.5, dIdx * 0.8 - 2]} />
      ))}
    </group>
  );
};

const Scene: React.FC<{ state: any }> = ({ state }) => {
  return (
    <>
      <ambientLight intensity={0.6} /><directionalLight position={[10, 10, 5]} intensity={1} /><pointLight position={[-10, -10, -10]} intensity={0.5} />
      <gridHelper args={[50, 50, '#e5e7eb', '#f3f4f6']} />
      {state?.buildings?.map((building: BuildingTwinState, idx: number) => (
        <TwinBuilding key={building.id} building={building} offset={[idx * 10 - 5, 0, 0]} />
      ))}
      <OrbitControls enablePan enableZoom enableRotate maxPolarAngle={Math.PI / 2.2} minDistance={5} maxDistance={50} />
    </>
  );
};

export const DigitalTwinViewer: React.FC = () => {
  const [digitalTwin, setDigitalTwin] = useState<any>(null);
  const farmId = 'farm-1'; // placeholder
  useEffect(() => {
    fetch(`/api/v1/dashboard/${farmId}/digital-twin`).then(r => r.json()).then(setDigitalTwin).catch(console.error);
  }, [farmId]);
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Digital Twin 3D</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1" /> Online</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-1" /> Warning</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1" /> Error</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-gray-400 mr-1" /> Stale</span>
        </div>
      </div>
      <div style={{ height: '600px' }}><Canvas shadows><Scene state={digitalTwin} /></Canvas></div>
    </div>
  );
};
