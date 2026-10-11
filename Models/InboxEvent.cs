namespace DonationOdooIntegration.Models;

public enum InboxStatus
{
    Processing,
    Success,
    Failed
}

public class InboxEvent
{
    public Guid EventId { get; set; }
    public string AggregateType { get; set; } = string.Empty;
    public string AggregateId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public InboxStatus Status { get; set; } = InboxStatus.Processing;
    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ErrorMessage { get; set; }
}

public class ProcessInboxBatchRequest
{
    public required List<OutboxEvent> Events { get; set; }
}

public class ProcessInboxBatchResponse
{
    public string Message { get; set; } = string.Empty;
    public int AcknowledgedCount { get; set; }
    public List<Guid> ProcessedEventIds { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}
