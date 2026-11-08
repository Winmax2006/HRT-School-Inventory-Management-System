/**
 * ReportService.gs - Official Comptroller General's Department Reports (พ.ด. ๑-๗)
 * Layer: Domain Service Layer
 * Standard: Thai Government Procurement Compliance (ระเบียบกระทรวงการคลังฯ)
 */

const ReportService = (function() {
  function generatePd1Daily(targetDate) {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const txs = Repository.findAll(
      Schema.TABLES.TRANSACTIONS,
      t => String(t.date).startsWith(dateStr)
    );

    return {
      report_code: 'พ.ด. ๑',
      report_title: 'ใบเบิกพัสดุประจำวัน',
      date: dateStr,
      generated_at: new Date().toISOString(),
      total_transactions: txs.length,
      records: txs
    };
  }

  function generatePd2Requisition(reqId) {
    const req = RequisitionService.getRequisitionById(reqId);
    return {
      report_code: 'พ.ด. ๒',
      report_title: 'ใบเบิกพัสดุและอนุมัติจ่าย',
      requisition: req,
      generated_at: new Date().toISOString(),
      signers: {
        requester: req.requester_name,
        approver: req.approved_by,
        issuer: req.issued_by
      }
    };
  }

  function generatePd3StockCard(itemCode, fiscalYear) {
    const item = ItemService.getItemByCode(itemCode);
    const year = String(fiscalYear || IdService.getBuddhistYear());
    const allLedger = LedgerService.getLedgerEntriesForItem(itemCode);

    const yearEntries = allLedger.filter(e => !fiscalYear || e.fiscal_year === year);

    return {
      report_code: 'พ.ด. ๓',
      report_title: 'บัตรบัญชีคุมพัสดุ (Stock Card)',
      fiscal_year: year,
      item: {
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category,
        unit: item.unit,
        unit_price: item.unit_price,
        location: item.warehouse || 'ห้องพัสดุกลาง',
        min_stock: item.min_stock,
        current_stock: item.current_stock
      },
      transactions: yearEntries,
      generated_at: new Date().toISOString()
    };
  }

  function generatePd4Monthly(month, fiscalYear) {
    const m = month || new Date().getMonth() + 1;
    const y = fiscalYear || IdService.getBuddhistYear();
    const allTxs = Repository.findAll(Schema.TABLES.TRANSACTIONS);

    return {
      report_code: 'พ.ด. ๔',
      report_title: 'รายงานการรับจ่ายพัสดุประจำเดือน',
      month: m,
      fiscal_year: y,
      total_items_handled: allTxs.length,
      transactions: allTxs,
      generated_at: new Date().toISOString()
    };
  }

  function generatePd5YearEndSummary(fiscalYear) {
    const year = String(fiscalYear || IdService.getBuddhistYear());
    const items = ItemService.getAllItems();
    let totalValuation = 0;

    items.forEach(i => {
      totalValuation += Number(i.total_value) || 0;
    });

    return {
      report_code: 'พ.ด. ๕',
      report_title: 'รายงานผลการตรวจสอบพัสดุประจำปี',
      fiscal_year: year,
      total_unique_items: items.length,
      total_inventory_value: Math.round(totalValuation * 100) / 100,
      generated_at: new Date().toISOString()
    };
  }

  function generatePd6CategoryAudit(fiscalYear) {
    const year = String(fiscalYear || IdService.getBuddhistYear());
    const items = ItemService.getAllItems();
    const categories = {};

    items.forEach(item => {
      const cat = item.category || 'อื่นๆ';
      if (!categories[cat]) {
        categories[cat] = { count: 0, total_value: 0 };
      }
      categories[cat].count += 1;
      categories[cat].total_value += Number(item.total_value) || 0;
    });

    return {
      report_code: 'พ.ด. ๖',
      report_title: 'รายงานการตรวจสอบพัสดุจำแนกตามประเภท',
      fiscal_year: year,
      categories,
      generated_at: new Date().toISOString()
    };
  }

  function generatePd7AllItemsAudit(fiscalYear) {
    const year = String(fiscalYear || IdService.getBuddhistYear());
    const items = ItemService.getAllItems();

    return {
      report_code: 'พ.ด. ๗',
      report_title: 'บัญชีรายละเอียดการตรวจสอบพัสดุสิ้นปี',
      fiscal_year: year,
      items,
      generated_at: new Date().toISOString()
    };
  }

  return {
    generatePd1Daily,
    generatePd2Requisition,
    generatePd3StockCard,
    generatePd4Monthly,
    generatePd5YearEndSummary,
    generatePd6CategoryAudit,
    generatePd7AllItemsAudit
  };
})();
