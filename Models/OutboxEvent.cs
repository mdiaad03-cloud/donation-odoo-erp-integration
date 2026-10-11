namespace DonationOdooIntegration.Models;

public enum OutboxStatus
{
    Pending,
    InFlight,
    Acknowledged,
    Failed
}

public class OutboxEvent
{
    public Guid EventId { get; set; } = Guid.NewGuid();
    public string AggregateType { get; set; } = string.Empty;
    public string AggregateId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public OutboxStatus Status { get; set; } = OutboxStatus.Pending;
    public int Attempts { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DispatchedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
}

public class CreateOutboxEventRequest
{
    public required string AggregateType { get; set; }
    public required string AggregateId { get; set; }
    public required string EventType { get; set; }
    public required string Payload { get; set; }
}

public class AcknowledgeEventsRequest
{
    public required List<Guid> EventIds { get; set; }
}
