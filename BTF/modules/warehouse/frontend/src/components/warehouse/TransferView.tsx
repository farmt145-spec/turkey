import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, CheckCircle } from 'lucide-react';

const transferTypes = [
  { value: 'WAREHOUSE_TO_WAREHOUSE', label: 'Magazyn → Magazyn' },
  { value: 'SILO_TO_SILO', label: 'Silos → Silos' },
  { value: 'FARM_TO_FARM', label: 'Ferma → Ferma' },
  { value: 'BROODER_TO_HOUSE', label: 'Odchowalnia → Kurnik' },
  { value: 'HOUSE_TO_HOUSE', label: 'Kurnik → Kurnik' },
  { value: 'HOUSE_TO_SALE', label: 'Kurnik → Sprzedaż' },
  { value: 'HOUSE_TO_DISPOSAL', label: 'Kurnik → Utylizacja' },
];

export const TransferView: React.FC = () => {
  const [type, setType] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 0, unit: 'kg' }]);
  const [submitted, setSubmitted] = useState(false);

  const addItem = () => setItems([...items, { productId: '', quantity: 0, unit: 'kg' }]);
  const updateItem = (i: number, field: string, value: any) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  };

  const handleSubmit = async () => {
    await fetch('/api/warehouse/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, items }),
    });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Transfer jednym kliknięciem</h1>

      <Card>
        <CardHeader><CardTitle>Typ transferu</CardTitle></CardHeader>
        <CardContent>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz typ transferu" />
            </SelectTrigger>
            <SelectContent>
              {transferTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pozycje</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-3 gap-3">
              <div>
                <Label>Produkt ID</Label>
                <Input value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} />
              </div>
              <div>
                <Label>Ilość</Label>
                <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
              </div>
              <div>
                <Label>Jednostka</Label>
                <Input value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addItem}>+ Dodaj pozycję</Button>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleSubmit} disabled={!type || items.some((i) => !i.productId || i.quantity <= 0)}>
        {submitted ? <><CheckCircle className="mr-2 h-4 w-4" /> Utworzono transfer</> : <><ArrowRightLeft className="mr-2 h-4 w-4" /> Utwórz transfer</>}
      </Button>
    </div>
  );
};
