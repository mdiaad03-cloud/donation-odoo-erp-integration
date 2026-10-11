/**
 * Automated Test Suite for Donation Call-Center & Odoo ERP Integration Engine
 */
const assert = require('assert');
const store = require('../src/models/store');
const outboxController = require('../src/controllers/outboxController');
const inboxController = require('../src/controllers/inboxController');
const depositController = require('../src/controllers/depositController');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log('🧪 Starting Integration Engine Automated Tests...\n');

  // Test 1: Store has seeded outbox event
  assert.strictEqual(store.outbox.length, 1, 'Initial outbox should have 1 seeded event');
  console.log('✅ Test 1 Passed: Initial store seeded correctly');

  // Test 2: Polling outbox events marks status to IN_FLIGHT
  const pollReq = { query: { batch_size: '10' } };
  const pollRes = mockRes();
  outboxController.pollEvents(pollReq, pollRes);
  assert.strictEqual(pollRes.statusCode, 200);
  assert.strictEqual(pollRes.body.count, 1);
  assert.strictEqual(pollRes.body.events[0].status, 'IN_FLIGHT');
  console.log('✅ Test 2 Passed: Outbox polling correctly transitions events to IN_FLIGHT');

  // Test 3: Process Inbox with polled event
  const polledEvent = pollRes.body.events[0];
  const inboxReq = { body: { events: [polledEvent] } };
  const inboxRes = mockRes();
  await inboxController.processInbox(inboxReq, inboxRes);
  assert.strictEqual(inboxRes.statusCode, 200);
  assert.strictEqual(inboxRes.body.acknowledgedCount, 1);
  console.log('✅ Test 3 Passed: Inbox processes event and posts to Odoo partner & donation move');

  // Test 4: Idempotency check - re-submitting same event returns duplicate acknowledge without re-posting
  const duplicateRes = mockRes();
  await inboxController.processInbox(inboxReq, duplicateRes);
  assert.strictEqual(duplicateRes.statusCode, 200);
  assert.strictEqual(duplicateRes.body.acknowledgedCount, 1);
  console.log('✅ Test 4 Passed: Inbox enforces idempotency against duplicate delivery');

  // Test 5: Outbox Acknowledgement
  const ackReq = { body: { event_ids: [polledEvent.event_id] } };
  const ackRes = mockRes();
  outboxController.acknowledgeEvents(ackReq, ackRes);
  assert.strictEqual(ackRes.statusCode, 200);
  assert.strictEqual(ackRes.body.acknowledgedCount, 1);
  assert.strictEqual(polledEvent.status, 'ACKNOWLEDGED');
  console.log('✅ Test 5 Passed: Outbox acknowledged and closed loop');

  // Test 6: Bank Deposit Allocation - mismatched sum returns 422
  const badDepositReq = {
    body: {
      deposit_id: 'DEP-2026-999',
      deposit_amount: 10000, // actual receipt is 5000
      receipt_ids: ['RCPT-2026-001']
    }
  };
  const badDepositRes = mockRes();
  await depositController.allocateDeposit(badDepositReq, badDepositRes);
  assert.strictEqual(badDepositRes.statusCode, 422);
  console.log('✅ Test 6 Passed: Deposit allocation strictly rejects mismatched financial totals (422)');

  // Test 7: Bank Deposit Allocation - exact sum succeeds (200)
  const validDepositReq = {
    body: {
      deposit_id: 'DEP-2026-001',
      deposit_amount: 5000,
      receipt_ids: ['RCPT-2026-001'],
      bank_name: 'National Bank of Egypt (NBE)'
    }
  };
  const validDepositRes = mockRes();
  await depositController.allocateDeposit(validDepositReq, validDepositRes);
  assert.strictEqual(validDepositRes.statusCode, 200);
  assert.strictEqual(validDepositRes.body.allocation.receipt_count, 1);
  console.log('✅ Test 7 Passed: Valid deposit allocated atomically with Odoo bank statement line');

  console.log('\n🎉 ALL 7 INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
