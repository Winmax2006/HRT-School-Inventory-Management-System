with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('new ApiServiceCore')
if idx != -1:
    print(text[idx-50:idx+200])
