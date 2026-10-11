/**
 * Inbox Controller
 * Implements Integration Inbox pattern inside the Odoo ERP integration consumer
 * Enforces idempotent processing and dead-letter routing
 */
const store = require('../models/store');
const odooClient = require('../services/odooXmlRpcClient');

exports.processInbox = async (req, res) => {
  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events must be a non-empty array' });
  }

  const processedEventIds = [];
  const errors = [];

  for (const event of events) {
    // 1. Idempotency Check: verify if already present in Inbox
    const existing = store.inbox.find(item => item.event_id === event.event_id);
    if (existing) {
      if (existing.status === 'SUCCESS') {
        // Already processed successfully, safe to re-acknowledge
        processedEventIds.push(event.event_id);
        continue;
      }
    }

    // Record in Inbox as PROCESSING
    const inboxItem = {
      event_id: event.event_id,
      aggregate_type: event.aggregate_type,
      aggregate_id: event.aggregate_id,
      event_type: event.event_type,
      received_at: new Date().toISOString(),
      status: 'PROCESSING',
      error: null
    };
    store.inbox.push(inboxItem);

    try {
      // 2. Business Execution based on event_type
      if (event.event_type === 'RECEIPT_COLLECTED') {
        const payload = event.payload;
        
        // Find or create partner in Odoo
        let partner = await odooClient.searchReadPartner(payload.phone);
        if (!partner) {
          partner = await odooClient.createPartner({
            name: payload.donorName,
            phone: payload.phone || '+201000000000',
            email: payload.email || (payload.donorId + '@donors.org')
          });
        }

        // Post financial donation entry in Odoo
        await odooClient.createDonationEntry({
          receiptId: payload.receiptId,
          odooPartnerId: partner.id,
          amount: payload.amount,
          campaign: payload.campaign
        });

        inboxItem.status = 'SUCCESS';
        inboxItem.processed_at = new Date().toISOString();
        processedEventIds.push(event.event_id);
      } else {
        throw new Error('Unsupported event_type: ' + event.event_type);
      }
    } catch (err) {
      inboxItem.status = 'FAILED';
      inboxItem.error = err.message;
      store.deadLetterQueue.push({ event, error: err.message, failedAt: new Date().toISOString() });
      errors.push({ event_id: event.event_id, error: err.message });
    }
  }

  return res.json({
    message: 'Inbox batch processing complete',
    acknowledgedCount: processedEventIds.length,
    processedEventIds,
    errors
  });
};

exports.getInboxHistory = (req, res) => {
  return res.json({
    total: store.inbox.length,
    inbox: store.inbox,
    deadLetterQueue: store.deadLetterQueue
  });
};
