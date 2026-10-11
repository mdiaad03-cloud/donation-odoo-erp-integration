/**
 * Deposit Allocation Controller
 * Manages atomic allocation of lump-sum bank deposits across multiple donation receipts
 * Ensures financial balance, non-duplication, and audit reconciliation
 */
const store = require('../models/store');
const odooClient = require('../services/odooXmlRpcClient');

exports.allocateDeposit = async (req, res) => {
  const { deposit_id, deposit_amount, receipt_ids, bank_name, deposit_date } = req.body;

  if (!deposit_id || !deposit_amount || !Array.isArray(receipt_ids) || receipt_ids.length === 0) {
    return res.status(400).json({
      error: 'Missing required fields: deposit_id, deposit_amount, receipt_ids (array)'
    });
  }

  // 1. Verify existence and eligibility of receipts
  let calculatedSum = 0;
  const receiptsToAllocate = [];

  for (const rcptId of receipt_ids) {
    const rcpt = store.receipts.get(rcptId);
    if (!rcpt) {
      return res.status(404).json({ error: `Receipt not found: ${rcptId}` });
    }
    if (rcpt.allocatedDepositId) {
      return res.status(409).json({
        error: `Receipt ${rcptId} is already allocated to deposit ${rcpt.allocatedDepositId}`
      });
    }
    calculatedSum += rcpt.amount;
    receiptsToAllocate.push(rcpt);
  }

  // 2. Strict Financial Consistency Check
  if (calculatedSum !== deposit_amount) {
    return res.status(422).json({
      error: `Sum of receipts (${calculatedSum} EGP) does not match total deposit amount (${deposit_amount} EGP). Allocation aborted.`
    });
  }

  // 3. Atomically perform allocation
  receiptsToAllocate.forEach(rcpt => {
    rcpt.allocatedDepositId = deposit_id;
    rcpt.status = 'DEPOSITED';
  });

  const record = {
    deposit_id,
    deposit_amount,
    bank_name: bank_name || 'National Bank of Egypt (NBE)',
    deposit_date: deposit_date || new Date().toISOString(),
    receipt_count: receipt_ids.length,
    receipt_ids,
    allocated_at: new Date().toISOString()
  };

  store.bankDeposits.set(deposit_id, record);
  store.allocations.push(record);

  // 4. Trigger Odoo Bank Statement Reconciliation Line
  const odooRecon = await odooClient.createBankStatementLine({
    depositId: deposit_id,
    amount: deposit_amount,
    receiptIds: receipt_ids
  });

  return res.status(200).json({
    message: 'Deposit atomically allocated across receipts successfully',
    allocation: record,
    odooReconciliation: odooRecon
  });
};

exports.getDepositSummary = (req, res) => {
  return res.json({
    totalDeposits: store.bankDeposits.size,
    deposits: Array.from(store.bankDeposits.values()),
    receiptsStatus: Array.from(store.receipts.values())
  });
};
