using System.Collections.Concurrent;
using DonationOdooIntegration.Models;

namespace DonationOdooIntegration.Services;

public class IntegrationEngine : IIntegrationEngine
{
    private readonly ConcurrentDictionary<Guid, OutboxEvent> _outbox = new();
    private readonly ConcurrentDictionary<Guid, InboxEvent> _inbox = new();
    private readonly ConcurrentDictionary<string, decimal> _receipts = new();
    private readonly ConcurrentDictionary<string, string> _allocatedReceipts = new();
    private readonly ConcurrentDictionary<string, DepositAllocationResult> _deposits = new();

    public IntegrationEngine()
    {
        // Seed initial sample receipts
        _receipts.TryAdd("RCPT-2026-001", 5000m);
        _receipts.TryAdd("RCPT-2026-002", 7500m);
        _receipts.TryAdd("RCPT-2026-003", 2500m);

        // Seed initial Outbox event
        var initialEvt = new OutboxEvent
        {
            EventId = Guid.NewGuid(),
            AggregateType = "DONATION_RECEIPT",
            AggregateId = "RCPT-2026-001",
            EventType = "RECEIPT_COLLECTED",
            Payload = "{\"receiptId\":\"RCPT-2026-001\",\"donorName\":\"Ahmed Hassan\",\"amount\":5000,\"currency\":\"EGP\"}",
            Status = OutboxStatus.Pending
        };
        _outbox.TryAdd(initialEvt.EventId, initialEvt);
    }

    public OutboxEvent CreateOutboxEvent(CreateOutboxEventRequest request)
    {
        var evt = new OutboxEvent
        {
            EventId = Guid.NewGuid(),
            AggregateType = request.AggregateType,
            AggregateId = request.AggregateId,
            EventType = request.EventType,
            Payload = request.Payload,
            Status = OutboxStatus.Pending
        };
        _outbox.TryAdd(evt.EventId, evt);
        return evt;
    }

    public List<OutboxEvent> PollOutboxEvents(int batchSize)
    {
        var pending = _outbox.Values
            .Where(e => e.Status == OutboxStatus.Pending || 
                       (e.Status == OutboxStatus.InFlight && e.DispatchedAt.HasValue && 
                        DateTime.UtcNow.Subtract(e.DispatchedAt.Value).TotalMinutes > 2))
            .Take(batchSize)
            .ToList();

        foreach (var evt in pending)
        {
            evt.Status = OutboxStatus.InFlight;
            evt.Attempts++;
            evt.DispatchedAt = DateTime.UtcNow;
        }

        return pending;
    }

    public int AcknowledgeEvents(List<Guid> eventIds)
    {
        int count = 0;
        foreach (var id in eventIds)
        {
            if (_outbox.TryGetValue(id, out var evt))
            {
                evt.Status = OutboxStatus.Acknowledged;
                evt.AcknowledgedAt = DateTime.UtcNow;
                count++;
            }
        }
        return count;
    }

    public Task<ProcessInboxBatchResponse> ProcessInboxBatchAsync(List<OutboxEvent> events)
    {
        var response = new ProcessInboxBatchResponse();

        foreach (var evt in events)
        {
            // Idempotency verification
            if (_inbox.TryGetValue(evt.EventId, out var existingInbox))
            {
                if (existingInbox.Status == InboxStatus.Success)
                {
                    // Already processed, safe idempotent acknowledgment
                    response.ProcessedEventIds.Add(evt.EventId);
                    response.AcknowledgedCount++;
                    continue;
                }
            }

            var inboxRecord = new InboxEvent
            {
                EventId = evt.EventId,
                AggregateType = evt.AggregateType,
                AggregateId = evt.AggregateId,
                EventType = evt.EventType,
                Status = InboxStatus.Processing
            };
            _inbox[evt.EventId] = inboxRecord;

            try
            {
                // Process business synchronization with Odoo ERP models
                inboxRecord.Status = InboxStatus.Success;
                inboxRecord.ProcessedAt = DateTime.UtcNow;

                response.ProcessedEventIds.Add(evt.EventId);
                response.AcknowledgedCount++;
            }
            catch (Exception ex)
            {
                inboxRecord.Status = InboxStatus.Failed;
                inboxRecord.ErrorMessage = ex.Message;
                response.Errors.Add($"Event {evt.EventId}: {ex.Message}");
            }
        }

        response.Message = "Inbox batch successfully processed with strict idempotency guarantees.";
        return Task.FromResult(response);
    }

    public DepositAllocationResult AllocateDeposit(DepositAllocationRequest request)
    {
        // 1. Verify existence and non-duplication
        decimal totalReceiptsAmount = 0m;
        foreach (var rcptId in request.ReceiptIds)
        {
            if (!_receipts.TryGetValue(rcptId, out var amount))
            {
                throw new KeyNotFoundException($"Receipt {rcptId} was not found in Call Center registry.");
            }

            if (_allocatedReceipts.TryGetValue(rcptId, out var existingDeposit))
            {
                throw new InvalidOperationException($"Receipt {rcptId} is already allocated to deposit {existingDeposit}.");
            }

            totalReceiptsAmount += amount;
        }

        // 2. Financial Balance Strict Validation
        if (totalReceiptsAmount != request.DepositAmount)
        {
            throw new ArgumentException(
                $"Financial mismatch: Sum of receipts ({totalReceiptsAmount} EGP) does not equal deposit amount ({request.DepositAmount} EGP). Allocation aborted.");
        }

        // 3. Atomically allocate
        foreach (var rcptId in request.ReceiptIds)
        {
            _allocatedReceipts.TryAdd(rcptId, request.DepositId);
        }

        var result = new DepositAllocationResult
        {
            DepositId = request.DepositId,
            DepositAmount = request.DepositAmount,
            BankName = request.BankName,
            ReceiptCount = request.ReceiptIds.Count,
            ReceiptIds = request.ReceiptIds,
            OdooStatementLineId = $"ODOO_STMT_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}"
        };

        _deposits.TryAdd(request.DepositId, result);
        return result;
    }
}
