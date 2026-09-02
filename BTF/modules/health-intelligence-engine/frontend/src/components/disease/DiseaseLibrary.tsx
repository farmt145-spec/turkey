import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { BookOpen, Search, Microscope, TrendingDown, TrendingUp } from 'lucide-react';

export const DiseaseLibrary: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedDisease, setSelectedDisease] = useState<any>(null);

  const { data: diseases } = useQuery({
    queryKey: ['diseases'],
    queryFn: () => api.get('/diseases').then(r => r.data)
  });

  const filtered = diseases?.filter((d: any) => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.symptoms?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900">Biblioteka Chorób Indyków</h2>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj choroby lub objawu..."
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filtered?.map((d: any) => (
            <button
              key={d.id}
              onClick={() => setSelectedDisease(d)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                selectedDisease?.id === d.id 
                  ? 'bg-indigo-50 border-indigo-300' 
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <h4 className="font-medium text-slate-900">{d.name}</h4>
              {d.nameLatin && <p className="text-xs text-slate-500 italic">{d.nameLatin}</p>}
            </button>
          ))}
        </div>

        {selectedDisease ? (
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{selectedDisease.name}</h3>
              {selectedDisease.nameLatin && (
                <p className="text-slate-500 italic">{selectedDisease.nameLatin}</p>
              )}
            </div>

            <div className="prose prose-slate max-w-none">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Microscope className="w-5 h-5 text-indigo-600" /> Opis
              </h4>
              <p className="text-slate-600">{selectedDisease.description}</p>

              <h4 className="text-lg font-semibold mt-4">Objawy kliniczne</h4>
              <ul className="list-disc list-inside text-slate-600">
                {selectedDisease.symptoms?.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>

              <h4 className="text-lg font-semibold mt-4">Diagnostyka</h4>
              <p className="text-slate-600">{selectedDisease.diagnosis || 'Brak danych'}</p>

              <h4 className="text-lg font-semibold mt-4">Profilaktyka</h4>
              <p className="text-slate-600">{selectedDisease.prevention || 'Brak danych'}</p>

              <h4 className="text-lg font-semibold mt-4">Leczenie</h4>
              <p className="text-slate-600">{selectedDisease.treatment || 'Brak danych'}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Wpływ na FCR</span>
                </div>
                <p className="text-2xl font-bold text-red-800">+{selectedDisease.fcrImpact || 0}%</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2 text-amber-700 mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">Wpływ na ADG</span>
                </div>
                <p className="text-2xl font-bold text-amber-800">-{selectedDisease.adgImpact || 0}%</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-center gap-2 text-orange-700 mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">Wpływ na EPEF</span>
                </div>
                <p className="text-2xl font-bold text-orange-800">-{selectedDisease.epefImpact || 0}%</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center text-slate-400">
            <p>Wybierz chorobę z listy, aby zobaczyć szczegóły</p>
          </div>
        )}
      </div>
    </div>
  );
};
