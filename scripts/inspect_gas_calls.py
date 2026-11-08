with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'google\.script\.run', text)]
print(f"Total google.script.run matches: {len(matches)}")
for idx in matches[:5]:
    print("--- Match at", idx)
    print(text[max(0, idx-50):min(len(text), idx+200)])
