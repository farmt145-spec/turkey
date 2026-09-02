import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, ArrowRight, MapPin } from 'lucide-react';

export const TraceabilityView: React.FC = () => {
  const [lotId, setLotId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    const res = await fetch('/api/warehouse/lots/traceability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lotId }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Traceability — pełna identyfikowalność</h1>

      <div className="flex gap-2">
        <Input placeholder="Wpisz ID partii..." value={lotId} onChange={(e) => setLotId(e.target.value)} />
        <Button onClick={search} disabled={loading || !lotId}>
          <Search className="h-4 w-4 mr-2" /> {loading ? 'Szukam...' : 'Śledź'}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Partia {result.lotNumber}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Produkt:</span> <strong>{result.productName}</strong></div>
                <div><span className="text-muted-foreground">Dostawca:</span> <strong>{result.supplierName}</strong></div>
                <div><span className="text-muted-foreground">Data produkcji:</span> {new Date(result.productionDate).toLocaleDateString('pl-PL')}</div>
                <div><span className="text-muted-foreground">Termin ważności:</span> {new Date(result.expiryDate).toLocaleDateString('pl-PL')}</div>
                <div><span className="text-muted-foreground">Ilość początkowa:</span> {result.initialQuantity.toLocaleString('pl-PL')} kg</div>
                <div><span className="text-muted-foreground">Pozostało:</span> {result.remainingQuantity.toLocaleString('pl-PL')} kg</div>
                <div className="col-span-2"><span className="text-muted-foreground">Destynacja końcowa:</span> <Badge>{result.finalDestination}</Badge></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historia ruchów</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.movements.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Package className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">{m.subtype} — {m.quantity.toLocaleString('pl-PL')} kg</p>
                      <p className="text-xs text-muted-foreground">{new Date(m.date).toLocaleString('pl-PL')}</p>
                    </div>
                    {m.batchId && <Badge variant="outline">Rzut: {m.batchId.slice(0, 8)}</Badge>}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {result.batchesFed.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Wykorzystane w produkcji</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.batchesFed.map((b: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <MapPin className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Rzut {b.batchNumber}</p>
                        <p className="text-sm text-muted-foreground">{b.houseName} — zużyto {b.totalConsumed.toLocaleString('pl-PL')} kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
