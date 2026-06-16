const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

async function getAllTokens() {
  const snapshot = await db.collection('fcm_tokens').get();
  return snapshot.docs.map(d => d.data().token).filter(Boolean);
}

async function kirimKeSemuaDevice(title, body, data = {}) {
  const tokens = await getAllTokens();
  if (tokens.length === 0) return;
  const message = {
    notification: { title, body },
    data: { ...data },
    tokens,
    android: { priority: 'high' },
    webpush: { headers: { Urgency: 'high' } },
  };
  const response = await getMessaging().sendEachForMulticast(message);
  console.log(`Terkirim: ${response.successCount}, Gagal: ${response.failureCount}`);
}

exports.notifOrderBaru = onDocumentCreated(
  { document: 'transactions/{docId}', region: 'asia-southeast1' },
  async (event) => {
    const order = event.data?.data();
    if (!order) return;
    const nama = order.nama || order.customerNama || 'Pelanggan';
    const status = order.status_order || order.status || 'Waiting List';
    await kirimKeSemuaDevice('🆕 Order Baru Masuk!', `${nama} — ${status}`, { type: 'order_baru' });
  }
);

exports.notifStatusBerubah = onDocumentUpdated(
  { document: 'transactions/{docId}', region: 'asia-southeast1' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    const statusBefore = before.status_order || before.status;
    const statusAfter = after.status_order || after.status;
    if (statusBefore === statusAfter) return;
    const nama = after.nama || after.customerNama || 'Pelanggan';
    await kirimKeSemuaDevice(
      '🔔 Status Order Berubah',
      `${nama}: ${statusBefore} → ${statusAfter}`,
      { type: 'status_update' }
    );
  }
);
