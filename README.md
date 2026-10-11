# Donation Call-Center & Odoo ERP Integration API (.NET 10)

[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4.svg?logo=dotnet)](https://dotnet.microsoft.com/)
[![C#](https://img.shields.io/badge/Language-C%23%2012-blue.svg)](https://learn.microsoft.com/en-us/dotnet/csharp/)
[![ASP.NET Core](https://img.shields.io/badge/Framework-ASP.NET%20Core%20Web%20API-512BD4.svg)](https://learn.microsoft.com/aspnet/core)
[![Pattern](https://img.shields.io/badge/Architecture-Transactional%20Outbox%20%26%20Inbox-FF6F00.svg)](https://microservices.io/patterns/data/transactional-outbox.html)
[![Odoo](https://img.shields.io/badge/ERP-Odoo%20Integration-714B67.svg)](https://www.odoo.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise integration bridge connecting donation call-center systems with **Odoo ERP**. Engineered in **C# / ASP.NET Core 10 Web API** by **Mohamed Diaa El-Din Samy** using the **Transactional Outbox** and **Integration Inbox** architectural patterns to guarantee zero data loss, strict idempotency, and financial consistency.

---

## 🌟 Architectural Overview

```
[Call Center Operator] 
         │ (Record Donation Receipt)
         ▼
[Call Center DB (SQL Server / ACID)]
   ├── Receipts Table  ─── (Committed)
   └── Outbox Table    ─── (Event Logged: Pending)
         │
         │ GET /api/v1/outbox/poll?batchSize=50
         ▼
[Integration Consumer (.NET Web API)]
   ├── Event Lease Marked: InFlight
   │
   ▼ POST /api/v1/inbox/process
[Odoo Integration Inbox]
   ├── Idempotency Check (Duplicate Filter)
   ├── Sync / Create res.partner
   ├── Post account.move (Donation Entry)
   └── Mark Inbox: Success
         │
         │ POST /api/v1/outbox/ack [EventIds]
         ▼
[Call Center Outbox] ─── (Status: Acknowledged)
```

1. **Transactional Outbox (.NET / SQL Server)**:
   - When donation records are written in the Call Center database, integration events are logged in the `Outbox` table within the same ACID database transaction.
   - Eliminates distributed two-phase commit overhead and guarantees events are never lost even during power outages or network severed states.

2. **Batched Polling & Leased Handshake Protocol**:
   - The integration consumer polls pending outbox events (`GET /api/v1/outbox/poll?batchSize=50`).
   - In-flight events receive automated lease locks to prevent concurrent worker duplication.
   - Explicit acknowledgments (`POST /api/v1/outbox/ack`) commit and close the transaction lifecycle.

3. **Integration Inbox & Strict Idempotency (Odoo Side)**:
   - Deduplicates incoming event streams using persistent `EventId` hashes.
   - Duplicate events received during network retries or timeouts are identified immediately and returned without creating phantom financial entries.

4. **Multi-Receipt Bank Deposit Atomic Allocation Engine**:
   - Manages lump-sum bank deposit allocations (e.g., cash collected across multiple call-center receipts deposited in one bank slip).
   - Enforces mathematical balance checks (`sum(receipts) == depositAmount`) before committing, generating unified Odoo bank statement reconciliation lines.

---

## 📡 REST API Reference

- **Swagger UI**: `/swagger`
- **Health / Info**: `GET /`

### 1. Poll Outbox Events
- **`GET /api/v1/outbox/poll?batchSize=50`**
- Returns next batch of pending events and transitions their state to `InFlight`.

### 2. Acknowledge Processed Events
- **`POST /api/v1/outbox/ack`**
- Payload:
  ```json
  {
    "eventIds": ["f47ac10b-58cc-4372-a567-0e02b2c3d479"]
  }
  ```

### 3. Process Inbox Batch
- **`POST /api/v1/inbox/process`**
- Enforces deduplication and creates corresponding Odoo partners and accounting entries.

### 4. Multi-Receipt Bank Deposit Allocation
- **`POST /api/v1/deposits/allocate`**
- Payload:
  ```json
  {
    "depositId": "DEP-2026-NBE-042",
    "depositAmount": 15000,
    "receiptIds": ["RCPT-2026-001", "RCPT-2026-002", "RCPT-2026-003"],
    "bankName": "National Bank of Egypt (NBE)"
  }
  ```
- Rejects requests where receipt sum ≠ deposit amount with `422 Unprocessable Entity`.

---

## 🚀 Getting Started

### Prerequisites
- [.NET SDK 10.0](https://dotnet.microsoft.com/)

### Build and Run
```bash
git clone https://github.com/mdiaad03-cloud/donation-odoo-erp-integration.git
cd donation-odoo-erp-integration
dotnet build
dotnet run
```
Open `http://localhost:5000/swagger` in your browser.

---

## 👨‍💻 Author

**Mohamed Diaa El-Din Samy**
- Third-Year Computer Science / Information Systems Student, Badr University in Assiut
- Portfolio: [mdiaad03-cloud.github.io/portfolio-](https://mdiaad03-cloud.github.io/portfolio-/)
- GitHub: [@mdiaad03-cloud](https://github.com/mdiaad03-cloud)
- LinkedIn: [linkedin.com/in/mohamed-diaa-dev](https://www.linkedin.com/in/mohamed-diaa-dev/)
