/**
 * Odoo XML-RPC / JSON-RPC Client Simulator
 * In production, connects to Odoo via xmlrpc or jsonrpc protocols
 */
const store = require('../models/store');

class OdooXmlRpcClient {
  async searchReadPartner(phone) {
    for (const [id, partner] of store.odooPartners.entries()) {
      if (partner.phone === phone) return partner;
    }
    return null;
  }

  async createPartner({ name, phone, email }) {
    const id = 'odoo_partner_' + (store.odooPartners.size + 1);
    const partner = { id, name, phone, email, createdAt: new Date().toISOString() };
    store.odooPartners.set(id, partner);
    return partner;
  }

  async createDonationEntry({ receiptId, odooPartnerId, amount, campaign }) {
    const id = 'odoo_move_' + (store.odooDonations.size + 1);
    const entry = {
      id,
      receiptId,
      partnerId: odooPartnerId,
      amount,
      campaign,
      journal: 'Donations Journal (Bank / Cash)',
      state: 'posted',
      postedAt: new Date().toISOString()
    };
    store.odooDonations.set(id, entry);
    return entry;
  }

  async createBankStatementLine({ depositId, amount, receiptIds }) {
    return {
      statementLineId: 'odoo_stmt_' + Date.now(),
      depositId,
      amount,
      reconciledReceipts: receiptIds,
      status: 'reconciled'
    };
  }
}

module.exports = new OdooXmlRpcClient();
