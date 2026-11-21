import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { parseGroceryInput } from '@/lib/parse-bill';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  // Step 1: Parse photo or Hinglish text without saving yet
  if (action === 'parse') {
    const items = await parseGroceryInput({
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      hinglishText: body.hinglishText,
    });
    return NextResponse.json({ items });
  }

  // Step 2: Commit verified items to the shared ledger
  if (action === 'save') {
    const billId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO bills (id, shop_id, customer_id, proof_image_base64, raw_transcript) VALUES (?, ?, ?, ?, ?)`
    ).run(billId, body.shopId, body.customerId, body.imageBase64 || null, body.hinglishText || null);

    const insertItem = db.prepare(
      `INSERT INTO bill_items (id, bill_id, item_name, quantity, amount) VALUES (?, ?, ?, ?, ?)`
    );
    for (const item of body.items) {
      insertItem.run(crypto.randomUUID(), billId, item.item_name, item.quantity, item.amount);
    }

    return NextResponse.json({ billId, ok: true });
  }

  // Step 3: Buyer flags a specific line item for audit
  if (action === 'dispute') {
    db.prepare(`UPDATE bill_items SET is_disputed = 1, dispute_note = ? WHERE id = ?`).run(
      body.note || 'Item returned / price mismatch',
      body.itemId
    );
    db.prepare(`UPDATE bills SET status = 'disputed' WHERE id = ?`).run(body.billId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
