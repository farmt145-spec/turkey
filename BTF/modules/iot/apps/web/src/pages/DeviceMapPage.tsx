import React from 'react';
import { FarmDeviceMap } from '../components/maps/FarmDeviceMap';
export const DeviceMapPage: React.FC = () => (
  <div className="space-y-6"><h1 className="text-2xl font-bold text-gray-900">Mapa urządzeń</h1><FarmDeviceMap /></div>
);
