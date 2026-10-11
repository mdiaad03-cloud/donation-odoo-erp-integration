# Donation Call-Center & Odoo ERP Integration API

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933.svg?logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000.svg?logo=express)](https://expressjs.com/)
[![Pattern](https://img.shields.io/badge/Pattern-Transactional%20Outbox%20%26%20Inbox-FF6F00.svg)](https://microservices.io/patterns/data/transactional-outbox.html)
[![Odoo](https://img.shields.io/badge/ERP-Odoo%20Integration-714B67.svg)](https://www.odoo.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise integration bridge connecting donation call-center operations with **Odoo ERP**. Engineered by **Mohamed Diaa El-Din Samy** using the **Transactional Outbox** and **Integration Inbox** architectural patterns to guarantee zero data loss, strict idempotency, and financial consistency.

---

## 🌟 Architectural Highlights

1. **Transactional Outbox (Call Center Side)**:
   - When donation calls, donors, or receipts are committed to the call-center database, an event record is atomically generated in the `outbox` table within the same database transaction.
   - Eliminates distributed two-phase commit overhead and ensures events are never lost if external network connections fail.

2. **Batched Polling & Handshake Protocol**:
   - The integration consumer polls pending outbox events (`GET /api/v1/outbox/poll?batch_size=50`).
   - In-flight events are locked with leases.
   - Upon successful processing into Odoo, explicit acknowledgement (`POST /api/v1/outbox/ack`) transitions events to `ACKNOWLEDGED`.

3. **Integration Inbox & Strict Idempotency (Odoo Side)**:
   - Deduplicates incoming event streams using persistent `event_id` keys.
   - Duplicate events received during network retries or timeouts are identified immediately and returned without creating phantom financial records.

4. **Multi-Receipt Bank Deposit Atomic Allocation**:
   - Manages lump-sum bank deposit allocations (e.g., cash collected across 50 call-center receipts deposited in one bank slip).
   - Enforces mathematical balance checks (`sum(receipts) === deposit_amount`) before committing, generating unified Odoo bank statement reconciliation lines.

---

## 🔄 End-to-End Sequence Flow

```
[Call Center Operator] 
         │ (Record Donation Receipt)
         ▼
[Call Center DB (ACID)]
   ├── Receipts Table  ─── (Committed)
   └── Outbox Table    ─── (Event Logged: PENDING)
         │
         │ GET /api/v1/outbox/poll (Batch 50)
         ▼
[Integration Consumer]
   ├── Event Lease Marked: IN_FLIGHT
   │
   ▼ POST /api/v1/inbox/process
[Odoo Integration Inbox]
   ├── Idempotency Check (Duplicate Filter)
   ├── Sync / Create res.partner
   ├── Create account.move (Donation Entry)
   └── Mark Inbox: SUCCESS
         │
         │ POST /api/v1/outbox/ack [event_ids]
         ▼
[Call Center Outbox] ─── (Status: ACKNOWLEDGED)
```

---

## 📡 REST API Reference

### 1. Health Check
- **`GET /api/v1/health`**
- Response: `200 OK`

### 2. Poll Outbox Events
- **`GET /api/v1/outbox/poll?batch_size=50`**
- Returns next batch of pending events and transitions their state to `IN_FLIGHT`.

### 3. Acknowledge Processed Events
- **`POST /api/v1/outbox/ack`**
- Payload:
  ```json
  {
    "event_ids": ["evt_4f89d3...", "evt_8b12c4..."]
  }
  ```

### 4. Process Inbox Batch
- **`POST /api/v1/inbox/process`**
- Enforces deduplication and creates corresponding Odoo partners and accounting entries.

### 5. Multi-Receipt Bank Deposit Allocation
- **`POST /api/v1/deposits/allocate`**
- Payload:
  ```json
  {
    "deposit_id": "DEP-2026-NBE-042",
    "deposit_amount": 15000,
    "receipt_ids": ["RCPT-101", "RCPT-102", "RCPT-103"],
    "bank_name": "National Bank of Egypt (NBE)"
  }
  ```
- Rejects requests where receipt sum ≠ deposit amount with `422 Unprocessable Entity`.

---

## 🧪 Automated Testing

Run the included automated integration test suite:

```bash
npm test
```

Test results:
```
🧪 Starting Integration Engine Automated Tests...

✅ Test 1 Passed: Initial store seeded correctly
✅ Test 2 Passed: Outbox polling correctly transitions events to IN_FLIGHT
✅ Test 3 Passed: Inbox processes event and posts to Odoo partner & donation move
✅ Test 4 Passed: Inbox enforces idempotency against duplicate delivery
✅ Test 5 Passed: Outbox acknowledged and closed loop
✅ Test 6 Passed: Deposit allocation strictly rejects mismatched financial totals (422)
✅ Test 7 Passed: Valid deposit allocated atomically with Odoo bank statement line

🎉 ALL 7 INTEGRATION TESTS PASSED SUCCESSFULLY!
```

---

## 👨‍💻 Author

**Mohamed Diaa El-Din Samy**
- Third-Year Computer Science / Information Systems Student, Badr University in Assiut
- Portfolio: [mdiaad03-cloud.github.io/portfolio-](https://mdiaad03-cloud.github.io/portfolio-/)
- GitHub: [@mdiaad03-cloud](https://github.com/mdiaad03-cloud)
- LinkedIn: [linkedin.com/in/mohamed-diaa-dev](https://www.linkedin.com/in/mohamed-diaa-dev/)
