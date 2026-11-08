/**
 * FiscalYearService.gs - Fiscal Year Lifecycle & Balance Rollover Service
 * Layer: Domain Service Layer
 * Standard: Thai Government Fiscal Calendar (1 Oct - 30 Sep) & Immutable Rollover
 */

const FiscalYearService = (function() {
  function getCurrentFiscalYear(date) {
    const d = date || new Date();
    const month = d.getMonth() + 1; // 1-12
    const year = d.getFullYear() + 543;
    // In Thailand, fiscal year begins in October (month 10)
    return month >= 10 ? year + 1 : year;
  }

  function closeFiscalYear(yearToClose, snapshotNote = '') {
    const user = Auth.requireAuthenticated();
    RBAC.checkPermission(user.role, PermissionRegistry.ACTIONS.FISCAL_YEAR_CLOSE);

    const closingYear = String(yearToClose || getCurrentFiscalYear());
    const newYear = String(Number(closingYear) + 1);

    // 1. Run discrepancy check
    const audit = LedgerService.checkDiscrepancies();
    if (audit.has_discrepancy) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.CONFLICT,
        `Cannot close fiscal year ${closingYear}: ${audit.discrepancies.length} inventory discrepancy(ies) detected. Reconcile stock before rollover.`,
        { discrepancies: audit.discrepancies }
      );
    }

    const allItems = Repository.findAll(Schema.TABLES.MASTER_ITEMS);
    const rolloverRecords = [];
    const timestamp = new Date().toISOString();

    allItems.forEach((item, idx) => {
      const closingStock = Number(item.current_stock) || 0;
      const unitCost = Number(item.unit_price) || 0;

      // Create opening balance entry for new year
      const openingEntry = LedgerService.recordMovement({
        item_id: item.item_id,
        item_code: item.item_code,
        transaction_id: `TX-ROLLOVER-${newYear}-${IdService.padZero(idx + 1, 4)}`,
        transaction_type: 'ยอดยกมา',
        qty_in: closingStock,
        qty_out: 0,
        unit_cost: unitCost,
        fiscal_year: newYear,
        actor_user_id: user.user_id,
        reference_type: 'YEAR_END_CLOSE',
        reference_id: `FY-CLOSE-${closingYear}`,
        note: `ยอดยกมาจากปีงบประมาณ ${closingYear} ${snapshotNote ? '(' + snapshotNote + ')' : ''}`
      });

      rolloverRecords.push({
        item_code: item.item_code,
        carried_over_qty: closingStock,
        ledger_id: openingEntry.ledger_id
      });
    });

    if (typeof AuditService !== 'undefined') {
      try {
        AuditService.logAction({
          action: 'FISCAL_YEAR_CLOSE',
          module: 'FISCAL_YEAR',
          entityType: 'FISCAL_YEAR',
          entityId: closingYear,
          newValue: { closed_year: closingYear, new_year: newYear, total_items_rolled: allItems.length }
        });
      } catch (e) {}
    }

    return {
      closed_year: closingYear,
      new_year: newYear,
      closed_at: timestamp,
      items_rolled_over: rolloverRecords.length,
      rolloverRecords
    };
  }

  return {
    getCurrentFiscalYear,
    closeFiscalYear
  };
})();
