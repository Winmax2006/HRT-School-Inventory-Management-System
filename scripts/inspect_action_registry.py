with open('Api.gs', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('ACTION_REGISTRY')
if idx != -1:
    print(text[idx:idx+2500])
