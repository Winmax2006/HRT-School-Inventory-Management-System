const fs = require('fs');
let content = fs.readFileSync('docs/RPC_COMPATIBILITY_MATRIX.md', 'utf8');

const addendum = `
---

## 4. Symbol Collision Elimination & Private Handler Encapsulation (P0 Remediation)

To prevent ambiguous global runtime overwrites and unauthorized client bypasses in Google Apps Script's shared execution context:
1. **Private Handler Suffix (\`_\`)**: All internal business handlers in \`Read.gs\`, \`Write.gs\`, and \`Audit.gs\` were renamed to use the \`hrt<Name>_\` convention (e.g. \`hrtGetItems_\`, \`hrtCreateRequisition_\`, \`hrtGetAuditLogs_\`). This hides them natively from \`google.script.run\`.
2. **Unified Facade Entry Point (\`Code.gs\`)**: \`Code.gs\` alone exposes top-level callable facades, ensuring 100% of incoming client calls traverse \`ApiRouter.routeRequest\` for authentication, permission verification, and idempotency checks.
3. **Safe Multi-Tier Dispatch**: Eliminated \`global[route.handler]\` lookup; replaced with multi-tier resolution (\`typeof route.handler === 'function'\`, \`globalThis[route.handler]\`, and \`global[route.handler]\`), avoiding \`ReferenceError: global is not defined\` in Apps Script V8.
4. **Direct \`api*\` Alias Registration**: Registered 41 \`api*\` aliases in \`ACTION_REGISTRY\` so requests calling \`apiGetItems\`, \`apiCreateRequisition\`, etc., route directly and cleanly without translation failure.
`;

if (!content.includes('Symbol Collision Elimination')) {
  content += addendum;
  fs.writeFileSync('docs/RPC_COMPATIBILITY_MATRIX.md', content, 'utf8');
  console.log('[OK] docs/RPC_COMPATIBILITY_MATRIX.md updated with addendum');
} else {
  console.log('[OK] Already contains addendum');
}
