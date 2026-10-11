namespace DonationOdooIntegration.Models;

public class DepositAllocationRequest
{
    public required string DepositId { get; set; }
    public decimal DepositAmount { get; set; }
    public required List<string> ReceiptIds { get; set; }
    public string BankName { get; set; } = "National Bank of Egypt (NBE)";
    public DateTime? DepositDate { get; set; }
}

public class DepositAllocationResult
{
    public string DepositId { get; set; } = string.Empty;
    public decimal DepositAmount { get; set; }
    public string BankName { get; set; } = string.Empty;
    public int ReceiptCount { get; set; }
    public List<string> ReceiptIds { get; set; } = new();
    public DateTime AllocatedAt { get; set; } = DateTime.UtcNow;
    public string OdooStatementLineId { get; set; } = string.Empty;
    public string Status { get; set; } = "Reconciled";
}
