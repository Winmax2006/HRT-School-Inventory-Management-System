with open('tests/p8_backend_sheets_architecture_test.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """        if (!CANONICAL_DIRECTIONS.includes(entry.transaction_type)) {
            throw new Error(`INVALID_DIRECTION: Direction '${entry.transaction_type}' is not a valid canonical direction`);
        }
        if (entry.transaction_type === 'ADJUST') {
            throw new Error(`AMBIGUOUS_ADJUST: ADJUST must specify ADJUST_PLUS or ADJUST_MINUS`);
        }"""

new_block = """        if (entry.transaction_type === 'ADJUST') {
            throw new Error(`AMBIGUOUS_ADJUST: ADJUST must specify ADJUST_PLUS or ADJUST_MINUS`);
        }
        if (!CANONICAL_DIRECTIONS.includes(entry.transaction_type)) {
            throw new Error(`INVALID_DIRECTION: Direction '${entry.transaction_type}' is not a valid canonical direction`);
        }"""

text = text.replace(old_block, new_block)
with open('tests/p8_backend_sheets_architecture_test.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated check order in p8 test suite")
