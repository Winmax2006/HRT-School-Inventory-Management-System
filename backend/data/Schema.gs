/**
 * Schema.gs - Central Database Schema Definition & Serialization
 * Layer: Data Layer
 * Standard: Double-Entry Compliant & Typed Object Serialization
 */

const Schema = (function() {
  const TABLES = {
    MASTER_ITEMS: 'Master_Items',
    STOCK_LEDGER: 'Stock_Ledger',
    TRANSACTIONS: 'Transactions',
    REQUISITIONS: 'Requisitions',
    REQUISITION_ITEMS: 'Requisition_Items',
    USERS: 'Users',
    AUDIT_TRAIL: 'Audit_Trail',
    SETTINGS: 'Settings'
  };

  const DEFINITIONS = {
    [TABLES.MASTER_ITEMS]: {
      primaryKey: 'item_code',
      columns: [
        'item_id',
        'item_code',
        'item_name',
        'category',
        'warehouse',
        'unit',
        'unit_price',
        'min_stock',
        'rop',
        'current_stock',
        'supplier',
        'status',
        'updated_at'
      ],
      types: {
        item_id: 'string',
        item_code: 'string',
        item_name: 'string',
        category: 'string',
        warehouse: 'string',
        unit: 'string',
        unit_price: 'number',
        min_stock: 'number',
        rop: 'number',
        current_stock: 'number',
        supplier: 'string',
        status: 'string',
        updated_at: 'string'
      }
    },

    [TABLES.STOCK_LEDGER]: {
      primaryKey: 'ledger_id',
      columns: [
        'ledger_id',
        'item_id',
        'item_code',
        'transaction_id',
        'transaction_type',
        'qty_in',
        'qty_out',
        'unit_cost',
        'balance_after',
        'fiscal_year',
        'actor_user_id',
        'created_at',
        'reference_type',
        'reference_id',
        'note'
      ],
      types: {
        ledger_id: 'string',
        item_id: 'string',
        item_code: 'string',
        transaction_id: 'string',
        transaction_type: 'string',
        qty_in: 'number',
        qty_out: 'number',
        unit_cost: 'number',
        balance_after: 'number',
        fiscal_year: 'string',
        actor_user_id: 'string',
        created_at: 'string',
        reference_type: 'string',
        reference_id: 'string',
        note: 'string'
      }
    },

    [TABLES.TRANSACTIONS]: {
      primaryKey: 'transaction_id',
      columns: [
        'transaction_id',
        'doc_no',
        'type',
        'date',
        'teacher',
        'department',
        'item_code',
        'quantity',
        'status'
      ],
      types: {
        transaction_id: 'string',
        doc_no: 'string',
        type: 'string',
        date: 'string',
        teacher: 'string',
        department: 'string',
        item_code: 'string',
        quantity: 'number',
        status: 'string'
      }
    },

    [TABLES.REQUISITIONS]: {
      primaryKey: 'requisition_id',
      columns: [
        'requisition_id',
        'doc_no',
        'fiscal_year',
        'requester_id',
        'requester_name',
        'department',
        'purpose',
        'status',
        'urgency',
        'total_items',
        'total_cost',
        'created_at',
        'approved_by',
        'approved_at',
        'issued_by',
        'issued_at',
        'rejected_by',
        'rejected_at',
        'reject_reason'
      ],
      types: {
        requisition_id: 'string',
        doc_no: 'string',
        fiscal_year: 'string',
        requester_id: 'string',
        requester_name: 'string',
        department: 'string',
        purpose: 'string',
        status: 'string',
        urgency: 'string',
        total_items: 'number',
        total_cost: 'number',
        created_at: 'string',
        approved_by: 'string',
        approved_at: 'string',
        issued_by: 'string',
        issued_at: 'string',
        rejected_by: 'string',
        rejected_at: 'string',
        reject_reason: 'string'
      }
    },

    [TABLES.REQUISITION_ITEMS]: {
      primaryKey: 'item_line_id',
      columns: [
        'item_line_id',
        'requisition_id',
        'item_id',
        'item_code',
        'item_name',
        'unit',
        'quantity_requested',
        'quantity_approved',
        'quantity_issued',
        'unit_cost',
        'total_cost',
        'status'
      ],
      types: {
        item_line_id: 'string',
        requisition_id: 'string',
        item_id: 'string',
        item_code: 'string',
        item_name: 'string',
        unit: 'string',
        quantity_requested: 'number',
        quantity_approved: 'number',
        quantity_issued: 'number',
        unit_cost: 'number',
        total_cost: 'number',
        status: 'string'
      }
    },

    [TABLES.USERS]: {
      primaryKey: 'user_id',
      columns: [
        'user_id',
        'email',
        'name',
        'role',
        'department',
        'status',
        'created_at'
      ],
      types: {
        user_id: 'string',
        email: 'string',
        name: 'string',
        role: 'string',
        department: 'string',
        status: 'string',
        created_at: 'string'
      }
    },

    [TABLES.AUDIT_TRAIL]: {
      primaryKey: 'audit_id',
      columns: [
        'audit_id',
        'timestamp',
        'actor_user_id',
        'actor_email',
        'action',
        'module',
        'entity_type',
        'entity_id',
        'old_value',
        'new_value',
        'status',
        'request_id',
        'integrity_hash'
      ],
      types: {
        audit_id: 'string',
        timestamp: 'string',
        actor_user_id: 'string',
        actor_email: 'string',
        action: 'string',
        module: 'string',
        entity_type: 'string',
        entity_id: 'string',
        old_value: 'string',
        new_value: 'string',
        status: 'string',
        request_id: 'string',
        integrity_hash: 'string'
      }
    },

    [TABLES.SETTINGS]: {
      primaryKey: 'key',
      columns: ['key', 'value', 'description', 'updated_at'],
      types: {
        key: 'string',
        value: 'string',
        description: 'string',
        updated_at: 'string'
      }
    }
  };

  function getHeaders(tableName) {
    const def = DEFINITIONS[tableName];
    if (!def) throw new Error(`Schema not defined for table: ${tableName}`);
    return [...def.columns];
  }

  function getPrimaryKey(tableName) {
    const def = DEFINITIONS[tableName];
    if (!def) throw new Error(`Schema not defined for table: ${tableName}`);
    return def.primaryKey;
  }

  function castValue(val, type) {
    if (val === null || val === undefined || val === '') {
      return type === 'number' ? 0 : '';
    }
    if (type === 'number') {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    }
    if (type === 'string') {
      return String(val).trim();
    }
    return val;
  }

  function mapRowToObject(tableName, rowValues, headers) {
    const def = DEFINITIONS[tableName];
    const actualHeaders = headers && headers.length ? headers : (def ? def.columns : []);
    const obj = {};

    actualHeaders.forEach((colName, idx) => {
      const cleanCol = String(colName || '').trim().toLowerCase();
      const rawVal = rowValues[idx];
      const targetType = def && def.types && def.types[cleanCol] ? def.types[cleanCol] : 'string';
      obj[cleanCol] = castValue(rawVal, targetType);
    });

    return obj;
  }

  function mapObjectToRow(tableName, obj, headers) {
    const def = DEFINITIONS[tableName];
    const targetHeaders = headers && headers.length ? headers : getHeaders(tableName);

    return targetHeaders.map(colName => {
      const cleanCol = String(colName || '').trim().toLowerCase();
      const rawVal = obj[cleanCol] !== undefined ? obj[cleanCol] : obj[colName];
      const targetType = def && def.types && def.types[cleanCol] ? def.types[cleanCol] : 'string';
      return castValue(rawVal, targetType);
    });
  }

  return {
    TABLES,
    DEFINITIONS,
    getHeaders,
    getPrimaryKey,
    castValue,
    mapRowToObject,
    mapObjectToRow
  };
})();
