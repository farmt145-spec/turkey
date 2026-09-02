import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, AlertTriangle, Package } from 'lucide-react';

export const InventoryView: React.FC<{ warehouseId?: string }> = ({ warehouseId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');

  useEffect(() => {
    const q = warehouseId ? `?warehouseId=${warehouseId}` : '';
    fetch(`/api/warehouse/inventory${q}`)
      .then((r) => r.json())
      .then((d) => setItems(d));
  }, [warehouseId]);

  const filtered = items.filter((item) => {
    const matchesSearch = item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.productSku.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || item.isLowStock;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Stan magazynowy</h1>
        <div className="flex gap-2">
          <button className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-black text-white' : 'border'}`}
            onClick={() => setFilter('all')}>Wszystkie</button>
          <button className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'low' ? 'bg-red-600 text-white' : 'border'}`}
            onClick={() => setFilter('low')}>Niski stan</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Szukaj produktu lub SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <Card key={item.productId + item.warehouseId} className={item.isLowStock ? 'border-red-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.productSku}</p>
                </div>
                {item.isLowStock && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Niski stan</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                <div><span className="text-muted-foreground">Dostępne:</span> <strong>{item.available.toLocaleString('pl-PL')}</strong></div>
                <div><span className="text-muted-foreground">Zarezerwowane:</span> {item.reserved.toLocaleString('pl-PL')}</div>
                <div><span className="text-muted-foreground">Koszt jedn.:</span> {item.unitCost.toFixed(2)} PLN</div>
                <div><span className="text-muted-foreground">Wartość:</span> {item.totalValue.toLocaleString('pl-PL')} PLN</div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Magazyn: {item.warehouseName} | Punkt zamówienia: {item.reorderPoint}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
