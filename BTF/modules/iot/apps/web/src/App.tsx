import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { DeviceMapPage } from './pages/DeviceMapPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { DevicesPage } from './pages/DevicesPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 mt-16">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/map" element={<DeviceMapPage />} />
              <Route path="/digital-twin" element={<DigitalTwinPage />} />
              <Route path="/ai" element={<div className="text-gray-900">AI Engine Page</div>} />
              <Route path="/alarms" element={<div className="text-gray-900">Alarms Page</div>} />
              <Route path="/reports" element={<div className="text-gray-900">Reports Page</div>} />
              <Route path="/settings" element={<div className="text-gray-900">Settings Page</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};
