'use client';
import { useState } from 'react';

export default function SellerCapturePage() {
  const [hinglishText, setHinglishText] = useState('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => setImageBase64((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  };

  const handleExtract = async () => {
    setLoading(true);
    const res = await fetch('/api/bills', {
      method: 'POST',
      body: JSON.stringify({ action: 'parse', imageBase64, mimeType, hinglishText }),
    });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  };

  const handleSave = async () => {
    await fetch('/api/bills', {
      method: 'POST',
      body: JSON.stringify({
        action: 'save',
        shopId: 'shop_1',
        customerId: 'cust_1',
        imageBase64,
        hinglishText,
        items,
      }),
    });
    alert('Saved! Share buyer link: /ledger/demo-rahul-token');
    setItems([]);
    setHinglishText('');
    setImageBase64('');
  };

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">Sharma General Store — Quick Khata</h1>
      <div className="p-3 bg-gray-100 rounded text-sm">Customer: <strong>Rahul Verma</strong></div>

      <label className="block border-2 border-dashed p-4 rounded text-center cursor-pointer">
        <span>📷 Snap / Upload Parchi Photo</span>
        <input type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
      </label>

      <textarea
        placeholder="Or dictate/type Hinglish: 2kg aata 90, 1L amul doodh 66, 500g cheeni 24"
        value={hinglishText}
        onChange={(e) => setHinglishText(e.target.value)}
        className="w-full border rounded p-2 text-sm"
        rows={2}
      />

      <button onClick={handleExtract} disabled={loading} className="w-full bg-black text-white py-2 rounded">
        {loading ? 'Reading Slip...' : 'Extract Items with AI'}
      </button>

      {items.length > 0 && (
        <div className="border rounded p-3 space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex justify-between text-sm border-b pb-1">
              <span>{it.item_name} ({it.quantity})</span>
              <strong>₹{it.amount}</strong>
            </div>
          ))}
          <button onClick={handleSave} className="w-full bg-green-600 text-white py-2 rounded mt-2">
            Confirm & Send to Customer
          </button>
        </div>
      )}
    </main>
  );
}
