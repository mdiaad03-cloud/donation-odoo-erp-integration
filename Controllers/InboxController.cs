using Microsoft.AspNetCore.Mvc;
using DonationOdooIntegration.Models;
using DonationOdooIntegration.Services;

namespace DonationOdooIntegration.Controllers;

[ApiController]
[Route("api/v1/inbox")]
public class InboxController : ControllerBase
{
    private readonly IIntegrationEngine _engine;

    public InboxController(IIntegrationEngine engine)
    {
        _engine = engine;
    }

    [HttpPost("process")]
    public async Task<ActionResult<ProcessInboxBatchResponse>> ProcessBatch([FromBody] ProcessInboxBatchRequest request)
    {
        var result = await _engine.ProcessInboxBatchAsync(request.Events);
        return Ok(result);
    }
}
