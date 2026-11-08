with open('Write.gs', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('apiCreateRequisition')
if idx != -1:
    print(text[idx+2000:idx+4500])
