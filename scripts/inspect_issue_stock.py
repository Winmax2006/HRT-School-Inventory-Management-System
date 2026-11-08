with open('Write.gs', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('function apiIssueStock')
if idx != -1:
    print(text[idx:idx+2500])
