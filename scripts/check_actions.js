const fs = require('fs');
const apiContent = fs.readFileSync('Api.gs', 'utf8');
const actions = ['apiResolveQr', 'apiCreateRequisition', 'apiConfirmReceipt', 'apiCancelRequisition', 'apiGetItems', 'apiGetRequisitions', 'apiGetCurrentUser'];
actions.forEach(action => {
  const inRegistry = apiContent.includes("'" + action + "':");
  console.log(action, inRegistry ? 'FOUND in ACTION_REGISTRY' : 'MISSING in ACTION_REGISTRY');
});
