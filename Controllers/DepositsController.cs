using Microsoft.AspNetCore.Mvc;
using DonationOdooIntegration.Models;
using DonationOdooIntegration.Services;

namespace DonationOdooIntegration.Controllers;

[ApiController]
[Route("api/v1/deposits")]
public class DepositsController : ControllerBase
{
    private readonly IIntegrationEngine _engine;

    public DepositsController(IIntegrationEngine engine)
    {
        _engine = engine;
    }

    [HttpPost("allocate")]
    public ActionResult<DepositAllocationResult> AllocateDeposit([FromBody] DepositAllocationRequest request)
    {
        try
        {
            var result = _engine.AllocateDeposit(request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return UnprocessableEntity(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}
