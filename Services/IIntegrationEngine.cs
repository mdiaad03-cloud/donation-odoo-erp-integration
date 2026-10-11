using DonationOdooIntegration.Models;

namespace DonationOdooIntegration.Services;

public interface IIntegrationEngine
{
    // Outbox (Call-Center safe outbound)
    OutboxEvent CreateOutboxEvent(CreateOutboxEventRequest request);
    List<OutboxEvent> PollOutboxEvents(int batchSize);
    int AcknowledgeEvents(List<Guid> eventIds);

    // Inbox (Odoo consumer with idempotency)
    Task<ProcessInboxBatchResponse> ProcessInboxBatchAsync(List<OutboxEvent> events);

    // Bank Deposit Allocation (Multi-receipt financial consistency)
    DepositAllocationResult AllocateDeposit(DepositAllocationRequest request);
}
