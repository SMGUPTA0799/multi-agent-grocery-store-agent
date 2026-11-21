import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export default async function BuyerLedgerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const customer: any = db.prepare(`SELECT * FROM customers WHERE magic_token = ?`).get(token);
  if (!customer) return <div className="p-6">Invalid ledger link.</div>;

  const shop: any = db.prepare(`SELECT * FROM shops WHERE id = ?`).get(customer.shop_id);
  const bills: any[] = db.prepare(`SELECT * FROM bills WHERE customer_id = ? ORDER BY created_at DESC`).all(customer.id);
  const items: any[] = db.prepare(`SELECT * FROM bill_items WHERE is_active = 1`).all();

  const totalDue = items
    .filter((i) => bills.some((b) => b.id === i.bill_id) && !i.is_disputed)
    .reduce((sum, i) => sum + i.amount, 0);

  async function flagItem(formData: FormData) {
    'use server';
    const itemId = formData.get('itemId') as string;
    const billId = formData.get('billId') as string;
    db.prepare(`UPDATE bill_items SET is_disputed = 1, dispute_note = 'Flagged by buyer' WHERE id = ?`).run(itemId);
    db.prepare(`UPDATE bills SET status = 'disputed' WHERE id = ?`).run(billId);
    revalidatePath(`/ledger/${token}`);
  }

  const upiLink = `upi://pay?pa=${shop.upi_id}&pn=${encodeURIComponent(shop.name)}&am=${totalDue}&cu=INR`;

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      <header className="border-b pb-4">
        <h1 className="text-xl font-bold">{shop.name}</h1>
        <p className="text-sm text-gray-600">Monthly Khata for {customer.name}</p>
        <div className="mt-3 flex items-center justify-between bg-green-50 p-3 rounded">
          <div>
            <span className="text-xs text-gray-500 block">Verified Balance</span>
            <span className="text-2xl font-bold">₹{totalDue}</span>
          </div>
          <a href={upiLink} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium">
            Pay via UPI
          </a>
        </div>
      </header>

      {bills.map((bill) => (
        <section key={bill.id} className="border rounded p-4 space-y-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{new Date(bill.created_at).toLocaleDateString('en-IN')}</span>
            <span className="uppercase font-semibold">{bill.status}</span>
          </div>

          {bill.proof_image_base64 && (
            <img
              src={`data:image/jpeg;base64,${bill.proof_image_base64}`}
              alt="Original Parchi Proof"
              className="w-full h-36 object-cover rounded border"
            />
          )}

          <div className="divide-y">
            {items.filter((i) => i.bill_id === bill.id).map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between text-sm">
                <div className={item.is_disputed ? 'line-through text-red-600' : ''}>
                  <span>{item.item_name}</span> <span className="text-gray-500">({item.quantity})</span>
                </div>
                <div className="flex items-center gap-3">
                  <strong>₹{item.amount}</strong>
                  {!item.is_disputed ? (
                    <form action={flagItem}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="billId" value={bill.id} />
                      <button className="text-xs text-amber-700 underline">Flag</button>
                    </form>
                  ) : (
                    <span className="text-xs text-red-600 font-medium">Disputed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
