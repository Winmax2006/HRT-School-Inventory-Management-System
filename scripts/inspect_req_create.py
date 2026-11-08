with open('Write.gs', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('function apiCreateMultiItemRequisition')
if idx != -1:
    print(text[idx:idx+2500])
else:
    idx2 = text.find('apiCreateRequisition')
    if idx2 != -1:
        print(text[idx2:idx2+2500])
