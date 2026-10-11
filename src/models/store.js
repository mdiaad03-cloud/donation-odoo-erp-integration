/**
 * In-Memory Database Store for Call Center & Odoo ERP databases
 * Simulates persistence, transactional outbox logging, and inbox processing
 */
const crypto = require('crypto');

class DatabaseStore {
  constructor() {
    this.reset();
  }

  reset() {
    // Call Center System Database
    this.donors = new Map();
    this.calls = new Map();
    this.receipts = new Map();
    this.outbox = [];

    // Odoo ERP Database
    this.odooPartners = new Map();
    this.odooDonations = new Map();
    this.inbox = [];
    this.bankDeposits = new Map();
    this.allocations = [];
    this.deadLetterQueue = [];

    this._seed();
  }

  _seed() {
    // Initial sample donor and receipt
    const donorId = 'DON-1001';
    this.donors.set(donorId, {
      id: donorId,
      name: 'Ahmed Hassan',
      phone: '+201012345678',
      email: 'ahmed.hassan@example.com',
      totalDonations: 15000,
      createdAt: new Date().toISOString()
    });

    const receiptId = 'RCPT-2026-001';
    this.receipts.set(receiptId, {
      id: receiptId,
      donorId,
      amount: 5000,
      currency: 'EGP',
      campaign: 'Winter Warmth 2026',
      status: 'COLLECTED',
      allocatedDepositId: null,
      createdAt: new Date().toISOString()
    });

    // Seed outbox event
    this.outbox.push({
      event_id: 'evt_' + crypto.randomUUID(),
      aggregate_type: 'DONATION_RECEIPT',
      aggregate_id: receiptId,
      event_type: 'RECEIPT_COLLECTED',
      payload: {
        receiptId,
        donorId,
        donorName: 'Ahmed Hassan',
        amount: 5000,
        currency: 'EGP',
        campaign: 'Winter Warmth 2026'
      },
      status: 'PENDING',
      attempts: 0,
      created_at: new Date().toISOString(),
      dispatched_at: null
    });
  }
}

module.exports = new DatabaseStore();
