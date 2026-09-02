import React from 'react';
import { DeviceConfigurator } from '../components/devices/DeviceConfigurator';
export const DevicesPage: React.FC = () => (
  <div className="space-y-6"><h1 className="text-2xl font-bold text-gray-900">Urządzenia</h1><DeviceConfigurator /></div>
);
