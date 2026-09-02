import React, { useState, useEffect } from 'react';
import { devicesApi } from '../../api/devices';
import { Device, DeviceCategory } from '../../types';
import { Plus, Save, Trash2, Settings, Wifi, Server } from 'lucide-react';

const DEVICE_CATEGORIES: { value: DeviceCategory; label: string }[] = [
  { value: 'CLIMATE_CONTROLLER', label: 'Sterownik klimatu' },
  { value: 'TEMPERATURE_SENSOR', label: 'Czujnik temperatury' },
  { value: 'HUMIDITY_SENSOR', label: 'Czujnik wilgotności' },
  { value: 'CO2_SENSOR', label: 'Czujnik CO₂' },
  { value: 'NH3_SENSOR', label: 'Czujnik NH₃' },
  { value: 'H2S_SENSOR', label: 'Czujnik H₂S' },
  { value: 'AIRFLOW_SENSOR', label: 'Czujnik przepływu powietrza' },
  { value: 'ENERGY_METER', label: 'Licznik energii' },
  { value: 'GAS_METER', label: 'Licznik gazu' },
  { value: 'WATER_METER', label: 'Licznik wody' },
  { value: 'FEED_SCALE', label: 'Waga paszowa' },
  { value: 'FEED_SILO_LEVEL', label: 'Poziom paszy w silosie' },
  { value: 'FEED_AUTO', label: 'Automat paszowy' },
  { value: 'DRINKER', label: 'Poidło' },
  { value: 'AI_CAMERA', label: 'Kamera AI' },
  { value: 'BIRD_SCALE', label: 'Waga ptaków' },
  { value: 'MORTALITY_COUNTER', label: 'Licznik padnięć' },
  { value: 'DOOR_SENSOR', label: 'Czujnik drzwi' },
  { value: 'GENERATOR', label: 'Agregat prądotwórczy' },
  { value: 'UPS', label: 'UPS' },
  { value: 'FIRE_ALARM', label: 'Alarm pożarowy' },
  { value: 'DISINFECTION_SYSTEM', label: 'System dezynfekcji' },
];

export const DeviceConfigurator: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadDevices = async () => {
    try { const data = await devicesApi.getAll({ farmId: 'farm-1' }); setDevices(data); } catch (e) { console.error(e); }
  };

  useEffect(() => { loadDevices(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to urządzenie?')) return;
    await devicesApi.delete(id); loadDevices();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Konfigurator urządzeń</h3>
        <button onClick={() => { setIsCreating(true); setIsEditing(false); setSelectedDevice(null); }} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center text-sm">
          <Plus className="w-4 h-4 mr-2" />Dodaj urządzenie
        </button>
      </div>
      {(isCreating || isEditing) && (
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h4 className="text-md font-semibold text-gray-800 mb-4">{isCreating ? 'Nowe urządzenie' : 'Edycja urządzenia'}</h4>
          <DeviceForm device={selectedDevice || undefined} onSave={() => { setIsCreating(false); setIsEditing(false); loadDevices(); }} onCancel={() => { setIsCreating(false); setIsEditing(false); }} />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr><th className="px-6 py-3">Nazwa</th><th className="px-6 py-3">Kategoria</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">IP / Modbus / MQTT</th><th className="px-6 py-3">Ostatni kontakt</th><th className="px-6 py-3 text-right">Akcje</th></tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{device.name}</td>
                <td className="px-6 py-4 text-gray-600">{device.typeName}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${device.status === 'ONLINE' ? 'bg-green-100 text-green-800' : device.status === 'OFFLINE' ? 'bg-gray-100 text-gray-800' : device.status === 'ERROR' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{device.status}</span></td>
                <td className="px-6 py-4 text-gray-500 text-xs">{device.ipAddress && <div>IP: {device.ipAddress}</div>}{device.modbusAddress !== undefined && <div>Modbus: {device.modbusAddress}</div>}{device.mqttTopic && <div>MQTT: {device.mqttTopic}</div>}</td>
                <td className="px-6 py-4 text-gray-500">{device.lastSeen ? new Date(device.lastSeen).toLocaleString('pl-PL') : 'Nigdy'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setSelectedDevice(device); setIsEditing(true); setIsCreating(false); }} className="text-blue-600 hover:text-blue-800 mr-3"><Settings className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(device.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DeviceForm: React.FC<{ device?: Device; onSave: () => void; onCancel: () => void }> = ({ device, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Device>>({
    farmId: 'farm-1', name: device?.name || '', category: device?.category || 'TEMPERATURE_SENSOR',
    ipAddress: device?.ipAddress || '', modbusAddress: device?.modbusAddress, mqttTopic: device?.mqttTopic || '',
    positionX: device?.position?.x, positionY: device?.position?.y, positionZ: device?.position?.z,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { if (device) await devicesApi.update(device.id, formData); else await devicesApi.create(formData); onSave(); }
    catch (err: any) { alert('Błąd zapisu: ' + err.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nazwa</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as DeviceCategory })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">{DEVICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label><div className="relative"><Wifi className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="text" placeholder="192.168.1.100" value={formData.ipAddress || ''} onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Modbus Address</label><div className="relative"><Server className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="number" placeholder="1" value={formData.modbusAddress || ''} onChange={(e) => setFormData({ ...formData, modbusAddress: Number(e.target.value) })} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">MQTT Topic</label><input type="text" placeholder="farm/building1/temp" value={formData.mqttTopic || ''} onChange={(e) => setFormData({ ...formData, mqttTopic: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Pozycja X</label><input type="number" step="0.1" value={formData.positionX || ''} onChange={(e) => setFormData({ ...formData, positionX: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Pozycja Y</label><input type="number" step="0.1" value={formData.positionY || ''} onChange={(e) => setFormData({ ...formData, positionY: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Pozycja Z</label><input type="number" step="0.1" value={formData.positionZ || ''} onChange={(e) => setFormData({ ...formData, positionZ: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Anuluj</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"><Save className="w-4 h-4 mr-2" />{loading ? 'Zapisywanie...' : 'Zapisz'}</button>
      </div>
    </form>
  );
};
