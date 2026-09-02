import React from 'react';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { FarmSelector } from '../common/FarmSelector';

export const Header: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-30">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-gray-800">Panel IoT</h2>
      </div>
      <div className="flex items-center space-x-4">
        <FarmSelector />
        <NotificationCenter />
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">OP</div>
      </div>
    </header>
  );
};
