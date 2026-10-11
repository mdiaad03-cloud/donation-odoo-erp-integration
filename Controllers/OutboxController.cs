using Microsoft.AspNetCore.Mvc;
using DonationOdooIntegration.Models;
using DonationOdooIntegration.Services;

namespace DonationOdooIntegration.Controllers;

[ApiController]
[Route("api/v1/outbox")]
public class OutboxController : ControllerBase
{
    private readonly IIntegrationEngine _engine;

    public OutboxController(IIntegrationEngine engine)
    {
        _engine = engine;
    }

    [HttpPost("events")]
    public ActionResult<OutboxEvent> CreateEvent([FromBody] CreateOutboxEventRequest request)
    {
        var evt = _engine.CreateOutboxEvent(request);
        return CreatedAtAction(nameof(PollEvents), new { id = evt.EventId }, evt);
    }

    [HttpGet("poll")]
    public ActionResult<object> PollEvents([FromQuery] int batchSize = 50)
    {
        var events = _engine.PollOutboxEvents(batchSize);
        return Ok(new { count = events.Count, events });
    }

    [HttpPost("ack")]
    public ActionResult<object> AcknowledgeEvents([FromBody] AcknowledgeEventsRequest request)
    {
        var count = _engine.AcknowledgeEvents(request.EventIds);
        return Ok(new { message = "Events acknowledged successfully", acknowledgedCount = count });
    }
}
