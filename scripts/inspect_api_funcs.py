with open('Api.gs', 'r', encoding='utf-8') as f:
    text = f.read()

import re
funcs = re.findall(r'function\s+([a-zA-Z0-9_]+)', text)
print(f"Total functions in Api.gs: {len(funcs)}")
for fn in funcs[:30]:
    print(" ", fn)
