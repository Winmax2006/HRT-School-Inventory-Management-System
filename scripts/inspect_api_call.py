with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('google.script.run')
print('Has google.script.run:', idx != -1)
idx2 = text.find('ApiService')
print('Has ApiService:', idx2 != -1)
idx3 = text.find('callApi')
print('Has callApi:', idx3 != -1)
