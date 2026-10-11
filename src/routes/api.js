const express = require('express');
const router = express.Router();

const outboxController = require('../controllers/outboxController');
const inboxController = require('../controllers/inboxController');
const depositController = require('../controllers/depositController');

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Donation Call-Center <-> Odoo ERP Integration Engine',
    timestamp: new Date().toISOString()
  });
});

// Outbox Endpoints (Calls Team safe outbound)
router.post('/outbox/events', outboxController.createOutboxEvent);
router.get('/outbox/poll', outboxController.pollEvents);
router.post('/outbox/ack', outboxController.acknowledgeEvents);
router.get('/outbox/status', outboxController.getOutboxStatus);

// Inbox Endpoints (Odoo consumer)
router.post('/inbox/process', inboxController.processInbox);
router.get('/inbox/history', inboxController.getInboxHistory);

// Bank Deposit Allocation Endpoints
router.post('/deposits/allocate', depositController.allocateDeposit);
router.get('/deposits/summary', depositController.getDepositSummary);

module.exports = router;
