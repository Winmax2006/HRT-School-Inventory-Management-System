/**
 * Migration.gs - Database Schema Migrations & Invariant Upgrades
 * Layer: Setup Layer
 * Standard: Safe Versioned Upgrades & Backward-Compatible Sheet Migrations
 */

const Migration = (function() {
  const CURRENT_SCHEMA_VERSION = '2.0.0';

  function getSchemaVersion() {
    const setting = Repository.findById(Schema.TABLES.SETTINGS, 'SCHEMA_VERSION', 'key');
    return setting ? setting.value : '1.0.0';
  }

  function setSchemaVersion(version) {
    const existing = Repository.findById(Schema.TABLES.SETTINGS, 'SCHEMA_VERSION', 'key');
    if (existing) {
      Repository.update(Schema.TABLES.SETTINGS, 'SCHEMA_VERSION', {
        value: version,
        updated_at: new Date().toISOString()
      }, 'key');
    } else {
      Repository.insert(Schema.TABLES.SETTINGS, {
        key: 'SCHEMA_VERSION',
        value: version,
        description: 'Current Database Schema Version',
        updated_at: new Date().toISOString()
      });
    }
  }

  function runMigration() {
    const oldVersion = getSchemaVersion();
    const migratedTables = [];

    // Verify all tables exist and have up-to-date headers
    for (let tKey in Schema.TABLES) {
      const tableName = Schema.TABLES[tKey];
      const rawRows = Database.readAllRows(tableName);

      if (!rawRows || rawRows.length === 0) {
        // Table empty or new, append headers
        const headers = Schema.getHeaders(tableName);
        Database.appendRow(tableName, headers);
        migratedTables.push({ table: tableName, action: 'CREATED_WITH_HEADERS' });
      } else {
        const existingHeaders = rawRows[0].map(h => String(h || '').trim().toLowerCase());
        const expectedHeaders = Schema.getHeaders(tableName);
        const missing = expectedHeaders.filter(eh => !existingHeaders.includes(eh.toLowerCase()));

        if (missing.length > 0) {
          // Headers missing; update header row
          const updatedHeaders = [...existingHeaders, ...missing];
          Database.updateRow(tableName, 1, updatedHeaders);
          migratedTables.push({ table: tableName, action: 'ADDED_COLUMNS', columns: missing });
        }
      }
    }

    setSchemaVersion(CURRENT_SCHEMA_VERSION);

    return {
      success: true,
      previous_version: oldVersion,
      current_version: CURRENT_SCHEMA_VERSION,
      migrated_tables: migratedTables,
      timestamp: new Date().toISOString()
    };
  }

  return {
    getSchemaVersion,
    runMigration
  };
})();
