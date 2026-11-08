with open('Api.gs', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('ACTION_REGISTRY = Object.freeze({')
end_idx = text.find('});', idx)
print(text[idx:end_idx+3])
