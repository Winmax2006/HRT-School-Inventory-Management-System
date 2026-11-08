/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: Setup.gs
 * Description: Automated Database Initializer, Schema Enforcer & Seed Service
 * ==============================================================================
 * 
 * Rules:
 * 1. 100% IDEMPOTENT: Can be re-executed safely without data destruction or duplication
 * 2. NO HARDCODED: Spreadsheet ID, URLs, Emails, or mutable Fiscal Years
 * 3. Builds and validates all 15 relational tables with formatting, validation & protections
 */

/**
 * Main Database Setup & Initialization Entrypoint
 * Can be executed from the Apps Script Editor or triggered programmatically
 * @returns {Object} Setup execution report
 */
function setupDatabase() {
  var startTime = Date.now();
  Logger.log('>>> Starting HRT School Inventory Database Setup...');

  var lock = LockService.getScriptLock();
  try {
    // Acquire lock for safe serial execution
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('SETUP_LOCK_FAILED: Another database setup or transaction is currently running. Please try again.');
  }

  var report = {
    success: false,
    spreadsheetId: '',
    spreadsheetName: '',
    sheetsCreated: [],
    sheetsExisting: [],
    columnsAdded: {},
    seedRecordsInserted: {},
    defaultSheetsRemoved: [],
    durationMs: 0,
    timestamp: Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss')
  };

  try {
    // 1. Initialize Script Properties if not already set
    Config.initScriptProperties();

    // 2. Resolve target Spreadsheet dynamically
    var ss = Config.getSpreadsheet();
    report.spreadsheetId = ss.getId();
    report.spreadsheetName = ss.getName();

    var tableKeys = Object.keys(Schema.TABLES);
    var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

    // 3. Iterate through all 15 Table Definitions
    for (var t = 0; t < tableKeys.length; t++) {
      var tableName = tableKeys[t];
      var tableDef = Schema.TABLES[tableName];
      var sheet = ss.getSheetByName(tableName);

      // 3.1 Create Sheet if missing
      if (!sheet) {
        sheet = ss.insertSheet(tableName);
        report.sheetsCreated.push(tableName);
        Logger.log('+ Created Sheet: ' + tableName);
      } else {
        report.sheetsExisting.push(tableName);
      }

      // 3.2 Schema & Header Verification
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var existingHeaders = [];

      if (lastCol > 0) {
        var headerRowValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        existingHeaders = headerRowValues.map(function (h) {
          return String(h).trim();
        });
      }

      var schemaColumns = tableDef.columns;
      var schemaFieldNames = schemaColumns.map(function (c) {
        return c.field;
      });

      // If sheet is completely empty, write all headers
      if (existingHeaders.length === 0 || lastRow === 0) {
        sheet.getRange(1, 1, 1, schemaFieldNames.length).setValues([schemaFieldNames]);
        existingHeaders = schemaFieldNames.slice();
      } else {
        // Schema Evolution / Migration: Append missing columns to the right
        var missingColumns = [];
        for (var c = 0; c < schemaColumns.length; c++) {
          if (existingHeaders.indexOf(schemaColumns[c].field) === -1) {
            missingColumns.push(schemaColumns[c]);
          }
        }

        if (missingColumns.length > 0) {
          var startCol = existingHeaders.length + 1;
          var missingNames = missingColumns.map(function (c) {
            return c.field;
          });
          sheet.getRange(1, startCol, 1, missingNames.length).setValues([missingNames]);
          report.columnsAdded[tableName] = missingNames;
          Logger.log('  -> Added ' + missingNames.length + ' missing columns to ' + tableName);
          // Refresh headers
          existingHeaders = existingHeaders.concat(missingNames);
        }
      }

      // 3.3 Style Row 1 Headers
      var totalCols = existingHeaders.length;
      var headerRange = sheet.getRange(1, 1, 1, totalCols);
      headerRange.setBackground(Config.STYLES.HEADER_BG)
                 .setFontColor(Config.STYLES.HEADER_FG)
                 .setFontFamily(Config.STYLES.HEADER_FONT)
                 .setFontSize(Config.STYLES.HEADER_FONT_SIZE)
                 .setFontWeight('bold')
                 .setHorizontalAlignment('center')
                 .setVerticalAlignment('middle')
                 .setWrap(true);
      sheet.setRowHeight(1, Config.STYLES.HEADER_ROW_HEIGHT);

      // 3.4 Freeze Header Row & Primary Key Column
      sheet.setFrozenRows(1);
      sheet.setFrozenColumns(1);

      // 3.5 Column Formatting, Sizing & Data Validations
      var maxRows = Math.max(sheet.getMaxRows() - 1, 100);

      // Get existing protections to avoid duplicate protection rules
      var existingProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
      var existingProtectedCols = {};
      for (var ep = 0; ep < existingProtections.length; ep++) {
        var desc = existingProtections[ep].getDescription();
        if (desc) existingProtectedCols[desc] = true;
      }

      for (var colIdx = 0; colIdx < schemaColumns.length; colIdx++) {
        var colDef = schemaColumns[colIdx];
        var actualCol = colIdx + 1;

        // Set column width
        if (colDef.width) {
          sheet.setColumnWidth(actualCol, colDef.width);
        }

        // Apply number format to data rows (Row 2 to end)
        var dataColumnRange = sheet.getRange(2, actualCol, maxRows, 1);
        if (colDef.format) {
          dataColumnRange.setNumberFormat(colDef.format);
        }

        // Apply alignment
        if (colDef.align) {
          dataColumnRange.setHorizontalAlignment(colDef.align);
        }

        // Apply Enum Data Validation (Dropdowns)
        if (colDef.validation && colDef.validation.length > 0) {
          var rule = SpreadsheetApp.newDataValidation()
            .requireValueInList(colDef.validation, true)
            .setAllowInvalid(false)
            .setHelpText('เลือกค่าจากรายการที่กำหนด: ' + colDef.validation.join(', '))
            .build();
          dataColumnRange.setDataValidation(rule);
        }

        // Column Protection (Warning-only to prevent accidental manual modifications)
        if (colDef.protected) {
          var protDesc = 'PROT_' + tableName + '_' + colDef.field;
          if (!existingProtectedCols[protDesc]) {
            try {
              var prot = sheet.getRange(1, actualCol, maxRows + 1, 1).protect();
              prot.setDescription(protDesc);
              prot.setWarningOnly(true);
            } catch (errProt) {
              // Ignore if domain policy limits protection modification
            }
          }
        }
      }

      // Special Full Protection for Stock Ledger (Append-Only Ledger)
      if (tableName === Config.SHEET_NAMES.STOCK_LEDGER) {
        var ledgerProtDesc = 'PROT_SHEET_08_STOCK_LEDGER';
        var sheetProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
        var hasSheetProt = false;
        for (var sp = 0; sp < sheetProtections.length; sp++) {
          if (sheetProtections[sp].getDescription() === ledgerProtDesc) {
            hasSheetProt = true;
            break;
          }
        }
        if (!hasSheetProt) {
          try {
            var sProt = sheet.protect().setDescription(ledgerProtDesc);
            sProt.setWarningOnly(true);
          } catch (eProt) {}
        }
      }

      // 3.6 Populate Initial Reference / Seed Data (Idempotent)
      if (tableDef.initialData && tableDef.initialData.length > 0) {
        var currentLastRow = sheet.getLastRow();
        var existingPks = [];

        if (currentLastRow > 1) {
          var pkValues = sheet.getRange(2, 1, currentLastRow - 1, 1).getValues();
          existingPks = pkValues.map(function (r) {
            return String(r[0]).trim();
          });
        }

        var seedsToInsert = [];
        for (var d = 0; d < tableDef.initialData.length; d++) {
          var seedRow = tableDef.initialData[d];
          var seedPk = String(seedRow[0]).trim();

          // Only insert if PK does NOT already exist
          if (existingPks.indexOf(seedPk) === -1) {
            // Fill row to match schema header length
            var rowData = seedRow.slice();
            while (rowData.length < schemaColumns.length - 2) {
              rowData.push('');
            }
            // Append created_at and updated_at
            rowData.push(nowIso);
            rowData.push(nowIso);
            seedsToInsert.push(rowData);
          }
        }

        if (seedsToInsert.length > 0) {
          var insertStartRow = sheet.getLastRow() + 1;
          sheet.getRange(insertStartRow, 1, seedsToInsert.length, schemaColumns.length).setValues(seedsToInsert);
          report.seedRecordsInserted[tableName] = seedsToInsert.length;
          Logger.log('  -> Seeded ' + seedsToInsert.length + ' records into ' + tableName);
        }
      }

      // 3.7 Special Seed: Initial Administrator User in 01_Users
      if (tableName === Config.SHEET_NAMES.USERS) {
        var usersLastRow = sheet.getLastRow();
        var hasAdmin = false;
        if (usersLastRow > 1) {
          var userPks = sheet.getRange(2, 1, usersLastRow - 1, 1).getValues();
          for (var u = 0; u < userPks.length; u++) {
            if (String(userPks[u][0]).trim() === 'USR-001') {
              hasAdmin = true;
              break;
            }
          }
        }

        if (!hasAdmin) {
          var adminEmail = Config.getAdminEmail();
          var adminRow = [
            'USR-001',
            'admin',
            adminEmail,
            'ผู้ดูแลระบบส่วนกลาง (System Administrator)',
            'ADMIN',
            'งานพัสดุและสินทรัพย์',
            'หัวหน้างานพัสดุ',
            'TRUE',
            nowIso,
            nowIso
          ];
          sheet.appendRow(adminRow);
          report.seedRecordsInserted[Config.SHEET_NAMES.USERS] = 1;
          Logger.log('  -> Seeded Default Admin User (USR-001) with email: ' + adminEmail);
        }
      }
    }

    // 4. Clean up default empty sheets (e.g. Sheet1, แผ่นงาน1)
    var allSheets = ss.getSheets();
    if (allSheets.length > 15) {
      for (var sIdx = 0; sIdx < allSheets.length; sIdx++) {
        var curSheet = allSheets[sIdx];
        var sName = curSheet.getName();
        if ((sName === 'Sheet1' || sName === 'แผ่นงาน1') && curSheet.getLastRow() === 0) {
          try {
            ss.deleteSheet(curSheet);
            report.defaultSheetsRemoved.push(sName);
            Logger.log('- Removed empty default sheet: ' + sName);
          } catch (eDel) {}
        }
      }
    }

    // 5. Record Audit Trail into 09_Audit_Log
    try {
      Database.logAudit(
        'CREATE',
        'SYSTEM_SETUP',
        'INIT_PILOT_DB',
        null,
        { sheetsCreated: report.sheetsCreated.length, seeds: report.seedRecordsInserted },
        'USR-001',
        '127.0.0.1',
        'Database setup and schema initialization executed successfully.'
      );
    } catch (eAudit) {
      Logger.log('Audit log skipped during setup: ' + eAudit.message);
    }

    report.success = true;
    report.durationMs = Date.now() - startTime;
    Logger.log('>>> HRT School Inventory Database Setup Completed in ' + report.durationMs + ' ms.');
    return report;

  } catch (err) {
    report.success = false;
    report.error = err.message;
    report.stack = err.stack;
    Logger.log('!!! Setup Error: ' + err.message);
    throw err;
  } finally {
    try {
      lock.releaseLock();
    } catch (errRelease) {}
  }
}

/**
 * Health check & diagnostic function for Database Schema
 * Validates that all 15 sheets exist and match expected column definitions
 * @returns {Object} Diagnostics result
 */
function checkDatabaseHealth() {
  var ss = Config.getSpreadsheet();
  var tableKeys = Object.keys(Schema.TABLES);
  var diagnostics = {
    spreadsheetId: ss.getId(),
    activeFiscalYear: Config.getActiveFiscalYear(),
    adminEmail: Config.getAdminEmail(),
    allSheetsPresent: true,
    sheetStatuses: {}
  };

  for (var i = 0; i < tableKeys.length; i++) {
    var tableName = tableKeys[i];
    var sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      diagnostics.allSheetsPresent = false;
      diagnostics.sheetStatuses[tableName] = { exists: false, error: 'Sheet Missing' };
    } else {
      var expectedCols = Schema.TABLES[tableName].columns.length;
      var actualCols = sheet.getLastColumn();
      var actualRows = sheet.getLastRow();
      diagnostics.sheetStatuses[tableName] = {
        exists: true,
        expectedColumns: expectedCols,
        actualColumns: actualCols,
        totalRows: actualRows,
        dataRows: Math.max(actualRows - 1, 0),
        isSchemaMatch: expectedCols === actualCols
      };
    }
  }

  Logger.log('Database Health Status: ' + JSON.stringify(diagnostics, null, 2));
  return diagnostics;
}
