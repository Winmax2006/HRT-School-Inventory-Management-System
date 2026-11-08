/**
 * ItemApi.gs - Inventory Item API Handlers
 * Layer: API Layer
 * Standard: Envelope Wrapped, RBAC Enforced
 */

const ItemApi = (function() {
  function apiGetItems(params, requestId) {
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.ITEM_VIEW);
      const items = ItemService.getAllItems(params || {});
      return ErrorService.formatSuccess(items, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiGetItemDetail(itemCode, requestId) {
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.ITEM_VIEW);
      const item = ItemService.getItemByCode(itemCode);
      return ErrorService.formatSuccess(item, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiCreateItem(payload, requestId) {
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.ITEM_CREATE);
      const created = ItemService.createItem(payload);
      return ErrorService.formatSuccess(created, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiUpdateItem(payload, requestId) {
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.ITEM_UPDATE);
      if (!payload || !payload.item_code) {
        throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'item_code is required');
      }
      const updated = ItemService.updateItem(payload.item_code, payload);
      return ErrorService.formatSuccess(updated, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  return {
    apiGetItems,
    apiGetItemDetail,
    apiCreateItem,
    apiUpdateItem
  };
})();
