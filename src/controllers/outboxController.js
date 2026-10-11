/**
 * Outbox Controller
 * Provides transactional outbox event polling and batch acknowledgement
 */
const crypto = require('crypto');
const store = require('../models/store');

exports.createOutboxEvent = (req, res) => {
  const { aggregate_type, aggregate_id, event_type, payload } = req.body;
  if (!aggregate_type || !aggregate_id || !event_type || !payload) {
    return res.status(400).json({ error: 'Missing required fields: aggregate_type, aggregate_id, event_type, payload' });
  }

  const event = {
    event_id: 'evt_' + crypto.randomUUID(),
    aggregate_type,
    aggregate_id,
    event_type,
    payload,
    status: 'PENDING',
    attempts: 0,
    created_at: new Date().toISOString(),
    dispatched_at: null
  };

  store.outbox.push(event);
  return res.status(201).json({ message: 'Event logged in outbox', event });
};

exports.pollEvents = (req, res) => {
  const batchSize = parseInt(req.query.batch_size, 10) || 50;
  
  // Fetch pending or retryable events
  const pendingEvents = store.outbox
    .filter(evt => evt.status === 'PENDING' || (evt.status === 'IN_FLIGHT' && Date.now() - new Date(evt.dispatched_at).getTime() > 60000))
    .slice(0, batchSize);

  // Mark as IN_FLIGHT
  pendingEvents.forEach(evt => {
    evt.status = 'IN_FLIGHT';
    evt.attempts += 1;
    evt.dispatched_at = new Date().toISOString();
  });

  return res.json({
    count: pendingEvents.length,
    events: pendingEvents
  });
};

exports.acknowledgeEvents = (req, res) => {
  const { event_ids } = req.body;
  if (!Array.isArray(event_ids) || event_ids.length === 0) {
    return res.status(400).json({ error: 'event_ids must be a non-empty array' });
  }

  let acknowledgedCount = 0;
  store.outbox.forEach(evt => {
    if (event_ids.includes(evt.event_id)) {
      evt.status = 'ACKNOWLEDGED';
      evt.acknowledged_at = new Date().toISOString();
      acknowledgedCount++;
    }
  });

  return res.json({
    message: 'Events successfully acknowledged and removed from active flight queue',
    acknowledgedCount
  });
};

exports.getOutboxStatus = (req, res) => {
  const summary = {
    total: store.outbox.length,
    pending: store.outbox.filter(e => e.status === 'PENDING').length,
    inFlight: store.outbox.filter(e => e.status === 'IN_FLIGHT').length,
    acknowledged: store.outbox.filter(e => e.status === 'ACKNOWLEDGED').length,
  };
  return res.json(summary);
};
