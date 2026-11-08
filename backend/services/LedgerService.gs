/**
 * LedgerService.gs - Immutable Double-Entry Ledger Engine & Audit Verification
 * Layer: Domain Service Layer
 * Standard: Append-Only Single Source of Truth (SSOT), Zero In-Place Edits
 */

const LedgerService = (function() {
  function getLedgerEntriesForItem(itemCode) {
    if (!itemCode) return [];
    const cleanCode = String(itemCode).trim().toUpperCase();
    return Repository.findAll(
      Schema.TABLES.STOCK_LEDGER,
      entry => String(entry.item_code).toUpperCase() === cleanCode
    );
  }

  function getLatestBalance(itemCode) {
    const entries = getLedgerEntriesForItem(itemCode);
    if (!entries || entries.length === 0) return 0;
    // Return balance_after of last entry
    const lastEntry = entries[entries.length - 1];
    return Number(lastEntry.balance_after) || 0;
  }

  function recordMovement(entry) {
    const clean = ValidationService.sanitizeObject(entry);
    ValidationService.validateRequired(clean, ['item_code', 'transaction_type']);

    const cleanCode = String(clean.item_code).trim().toUpperCase();
    const qtyIn = Number(clean.qty_in) || 0;
    const qtyOut = Number(clean.qty_out) || 0;

    if (qtyIn < 0 || qtyOut < 0) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.VALIDATION_ERROR,
        'Ledger quantities cannot be negative'
      );
    }
    if (qtyIn === 0 && qtyOut === 0) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.VALIDATION_ERROR,
        'Ledger entry must have either qty_in > 0 or qty_out > 0'
      );
    }

    const previousBalance = getLatestBalance(cleanCode);
    const expectedBalance = previousBalance + qtyIn - qtyOut;

    if (expectedBalance < 0) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.INSUFFICIENT_STOCK,
        `Ledger Invariant Violation: Stock balance cannot drop below zero for item "${cleanCode}". Current: ${previousBalance}, Attempted deduction: ${qtyOut}`
      );
    }

    const currentYear = clean.fiscal_year || IdService.getBuddhistYear();
    const ledgerCount = Repository.count(Schema.TABLES.STOCK_LEDGER) + 1;
    const ledgerId = clean.ledger_id || IdService.generateLedgerId(ledgerCount, currentYear);

    const record = {
      ledger_id: ledgerId,
      item_id: clean.item_id || `ITM-${cleanCode}`,
      item_code: cleanCode,
      transaction_id: clean.transaction_id || `TX-${Date.now()}`,
      transaction_type: clean.transaction_type,
      qty_in: qtyIn,
      qty_out: qtyOut,
      unit_cost: Number(clean.unit_cost) || 0,
      balance_after: expectedBalance,
      fiscal_year: String(currentYear),
      actor_user_id: clean.actor_user_id || 'SYSTEM',
      created_at: clean.created_at || new Date().toISOString(),
      reference_type: clean.reference_type || 'GENERAL',
      reference_id: clean.reference_id || '',
      note: clean.note || ''
    };

    return Repository.insert(Schema.TABLES.STOCK_LEDGER, record);
  }

  function recalculateItemBalance(itemCode) {
    const entries = getLedgerEntriesForItem(itemCode);
    let runningBalance = 0;

    entries.forEach(entry => {
      const inVal = Number(entry.qty_in) || 0;
      const outVal = Number(entry.qty_out) || 0;
      runningBalance += inVal - outVal;
    });

    return runningBalance;
  }

  function checkDiscrepancies() {
    const allItems = Repository.findAll(Schema.TABLES.MASTER_ITEMS);
    const discrepancies = [];

    allItems.forEach(item => {
      const masterStock = Number(item.current_stock) || 0;
      const ledgerBalance = recalculateItemBalance(item.item_code);

      if (masterStock !== ledgerBalance) {
        discrepancies.push({
          item_code: item.item_code,
          item_name: item.item_name,
          master_stock: masterStock,
          ledger_balance: ledgerBalance,
          discrepancy: masterStock - ledgerBalance
        });
      }
    });

    return {
      audited_at: new Date().toISOString(),
      total_items_checked: allItems.length,
      has_discrepancy: discrepancies.length > 0,
      discrepancies
    };
  }

  return {
    getLedgerEntriesForItem,
    getLatestBalance,
    recordMovement,
    recalculateItemBalance,
    checkDiscrepancies
  };
})();
