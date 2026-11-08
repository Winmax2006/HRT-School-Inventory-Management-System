/**
 * DashboardApi.gs - Analytics, Metrics & Official Report API Handlers
 * Layer: API Layer
 * Standard: Envelope Wrapped, Aggregated Performance Queries
 */

const DashboardApi = (function() {
  function apiGetDashboardMetrics(filters = {}, requestId) {
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.DASHBOARD_VIEW);

      const items = ItemService.getAllItems(filters);
      const requisitions = Repository.findAll(Schema.TABLES.REQUISITIONS);

      let totalValuation = 0;
      let lowStockCount = 0;
      let criticalCount = 0;
      let outOfStockCount = 0;
      const categoryDistribution = {};

      items.forEach(item => {
        const val = Number(item.total_value) || 0;
        totalValuation += val;

        if (item.stock_health === 'LOW') lowStockCount++;
        else if (item.stock_health === 'CRITICAL') criticalCount++;
        else if (item.stock_health === 'OUT_OF_STOCK') outOfStockCount++;

        const cat = item.category || 'อื่นๆ';
        if (!categoryDistribution[cat]) {
          categoryDistribution[cat] = { count: 0, value: 0 };
        }
        categoryDistribution[cat].count++;
        categoryDistribution[cat].value += val;
      });

      const reqStatusCounts = {
        PENDING: 0,
        APPROVED: 0,
        ISSUED: 0,
        REJECTED: 0
      };

      requisitions.forEach(r => {
        const s = String(r.status || 'PENDING').toUpperCase();
        if (reqStatusCounts[s] !== undefined) {
          reqStatusCounts[s]++;
        }
      });

      const metrics = {
        total_items: items.length,
        total_inventory_value: Math.round(totalValuation * 100) / 100,
        low_stock_count: lowStockCount,
        critical_count: criticalCount,
        out_of_stock_count: outOfStockCount,
        category_distribution: categoryDistribution,
        requisition_counts: reqStatusCounts,
        current_fiscal_year: FiscalYearService.getCurrentFiscalYear()
      };

      return ErrorService.formatSuccess(metrics, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiGetPdReport(reportType, params = {}, requestId) {
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.REPORTS_GENERATE);

      const type = String(reportType || '').toUpperCase().trim();
      let result = null;

      switch (type) {
        case 'PD1':
        case 'PD-1':
          result = ReportService.generatePd1Daily(params.date);
          break;
        case 'PD2':
        case 'PD-2':
          if (!params.requisition_id) {
            throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'requisition_id is required for พ.ด. ๒');
          }
          result = ReportService.generatePd2Requisition(params.requisition_id);
          break;
        case 'PD3':
        case 'PD-3':
          if (!params.item_code) {
            throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'item_code is required for พ.ด. ๓');
          }
          result = ReportService.generatePd3StockCard(params.item_code, params.fiscal_year);
          break;
        case 'PD4':
        case 'PD-4':
          result = ReportService.generatePd4Monthly(params.month, params.fiscal_year);
          break;
        case 'PD5':
        case 'PD-5':
          result = ReportService.generatePd5YearEndSummary(params.fiscal_year);
          break;
        case 'PD6':
        case 'PD-6':
          result = ReportService.generatePd6CategoryAudit(params.fiscal_year);
          break;
        case 'PD7':
        case 'PD-7':
          result = ReportService.generatePd7AllItemsAudit(params.fiscal_year);
          break;
        default:
          throw ErrorService.createError(
            ErrorService.ERROR_CODES.VALIDATION_ERROR,
            `Unknown report type "${reportType}". Supported types: PD1, PD2, PD3, PD4, PD5, PD6, PD7`
          );
      }

      return ErrorService.formatSuccess(result, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiCloseFiscalYear(payload, requestId) {
    try {
      const year = payload ? payload.fiscal_year : undefined;
      const note = payload ? payload.note : '';
      const result = FiscalYearService.closeFiscalYear(year, note);
      return ErrorService.formatSuccess(result, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  return {
    apiGetDashboardMetrics,
    apiGetPdReport,
    apiCloseFiscalYear
  };
})();
