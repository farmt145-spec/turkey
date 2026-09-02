import React from 'react';
import { DigitalTwinViewer } from '../components/digital-twin/DigitalTwinViewer';
export const DigitalTwinPage: React.FC = () => (
  <div className="space-y-6"><h1 className="text-2xl font-bold text-gray-900">Digital Twin</h1><DigitalTwinViewer /></div>
);
