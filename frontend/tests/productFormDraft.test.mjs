import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createProductForm, hasProductDraft, readProductDraft,
    saveProductDraft, clearProductDraft
} from '../src/modules/shared/utils/productFormDraft.js';

const adminKey = 'sands_admin_add_product_form';
const sellerKey = 'sands_seller_add_product_form';
const storageFixture = () => {
    const entries = new Map();
    return {
        getItem: key => entries.get(key) ?? null,
        setItem: (key, value) => entries.set(key, value),
        removeItem: key => entries.delete(key)
    };
};

test('a fresh or previously autosaved empty form has no restored-draft notice', () => {
    const storage = storageFixture();
    const initial = createProductForm();
    initial.variants[0].id = 123;
    assert.equal(hasProductDraft(initial), false);
    storage.setItem(adminKey, JSON.stringify(initial));
    assert.equal(readProductDraft(storage, adminKey).restored, false);
    saveProductDraft(storage, adminKey, initial);
    assert.equal(storage.getItem(adminKey), null);
});

test('unfinished product and variant details survive leaving and reopening the form', () => {
    const storage = storageFixture();
    const draft = createProductForm();
    draft.name = 'Ribbon Belle';
    Object.assign(draft.variants[0], { name: 'Classic Silver', weight: '1.9', size: '5', stock: 1 });
    saveProductDraft(storage, adminKey, draft);
    const restored = readProductDraft(storage, adminKey);
    assert.equal(restored.restored, true);
    assert.deepEqual(restored.formData, draft);
});

test('start fresh and successful creation clear only the current editor draft', () => {
    const storage = storageFixture();
    const draft = { ...createProductForm(), name: 'Unfinished product' };
    saveProductDraft(storage, adminKey, draft);
    saveProductDraft(storage, sellerKey, draft);
    assert.equal(clearProductDraft(storage, adminKey), true);
    assert.equal(readProductDraft(storage, adminKey).restored, false);
    assert.equal(readProductDraft(storage, adminKey).formData.name, '');
    assert.equal(readProductDraft(storage, sellerKey).restored, true);
});

test('missing, corrupt, and structurally invalid drafts fall back to fresh defaults', () => {
    const storage = storageFixture();
    for (const value of ['null', 'not json', '[]', '42', '{"variants":null}', '{"variants":[]}', '{"variants":[null]}']) {
        storage.setItem(adminKey, value);
        const result = readProductDraft(storage, adminKey);
        assert.equal(result.restored, false, value);
        assert.equal(result.formData.name, '', value);
        assert.equal(result.formData.variants[0].name, 'Standard', value);
    }
});

test('browser storage failures do not prevent using or submitting the live form', () => {
    const blocked = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('quota exceeded'); },
        removeItem() { throw new Error('blocked'); }
    };
    assert.equal(readProductDraft(blocked, adminKey).restored, false);
    assert.doesNotThrow(() => saveProductDraft(blocked, adminKey, { ...createProductForm(), name: 'Ring' }));
    assert.equal(clearProductDraft(blocked, adminKey), false);
    assert.equal(readProductDraft(null, adminKey).restored, false);
});

test('each new form has independent nested defaults', () => {
    const first = createProductForm();
    first.variants[0].serialCodes.push('UNIT-1');
    first.seo.title = 'Old title';
    const next = createProductForm();
    assert.deepEqual(next.variants[0].serialCodes, []);
    assert.equal(next.seo.title, '');
});
