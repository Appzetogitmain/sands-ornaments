export const createProductForm = () => ({
    name: '',
    productCode: '',
    huid: '',
    material: 'Silver',
    description: '',
    specifications: '',
    supplierInfo: '',
    stylingTips: '',
    careTips: '',
    diamondType: 'none',
    categories: [],
    variants: [{
        id: Date.now(),
        name: 'Standard',
        size: '',
        weight: '',
        weightUnit: 'Grams',
        makingCharge: '0',
        hallmarkingCharge: '0',
        diamondCertificateCharge: '0',
        additionalCharge: '0',
        diamondPrice: '0',
        diamondType: 'none',
        mrp: '0',
        price: '',
        stock: 0,
        serialCodes: [],
        hiddenCharge: 0,
        subtotalBeforeTax: 0,
        gstAmount: 0,
        priceAfterTax: 0,
        pgChargePercent: 0,
        pgChargeAmount: 0,
        variantCode: '',
        variantImages: [],
        variantFaqs: [],
        diamondSpecs: {
            carat: '',
            clarity: '',
            color: '',
            cut: '',
            shape: '',
            diamondCount: 0
        }
    }],
    faqs: [],
    seo: { title: '', description: '', keywords: '' },
    logistics: { estimatedShippingDays: 3, certificateUrl: '' },
    deletedImages: [],
    tags: {
        isNewArrival: false,
        isMostGifted: false,
        isNewLaunch: false,
        isTrending: false,
        isPremium: false
    },
    relatedProducts: [],
    weight: '',
    weightUnit: 'Grams',
    paymentGatewayChargeBearer: 'seller',
    videoUrl: '',
    status: 'Active',
    active: true,
    showInNavbar: true,
    showInCollection: true,
    cardLabel: '',
    cardBadge: '',
    audience: ['unisex'],
    silverCategory: '',
    goldCategory: ''
});

// Variant IDs are generated for the UI and do not make an empty form a draft.
const comparableForm = (form) => JSON.stringify(form, (key, value) => {
    if (key === 'id') return undefined;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.fromEntries(Object.keys(value).sort().map(name => [name, value[name]]));
    }
    return value;
});

export const hasProductDraft = (form) => comparableForm(form) !== comparableForm(createProductForm());

export const getProductDraftStorage = () => {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
};

export const readProductDraft = (storage, key) => {
    const initial = createProductForm();
    try {
        const saved = JSON.parse(storage?.getItem(key) || 'null');
        if (saved && typeof saved === 'object' && !Array.isArray(saved)
            && (!('variants' in saved) || (Array.isArray(saved.variants)
                && saved.variants.length > 0 && saved.variants.every(variant => variant && typeof variant === 'object' && !Array.isArray(variant))))) {
            const formData = { ...initial, ...saved };
            return { formData, restored: hasProductDraft(formData) };
        }
    } catch {
        // A corrupt or unavailable browser draft must not prevent adding a product.
    }
    return { formData: initial, restored: false };
};

export const clearProductDraft = (storage, key) => {
    try {
        storage?.removeItem(key);
        return true;
    } catch {
        return false;
    }
};

export const saveProductDraft = (storage, key, form) => {
    try {
        if (hasProductDraft(form)) storage?.setItem(key, JSON.stringify(form));
        else storage?.removeItem(key);
    } catch {
        // Draft storage is optional; product submission still uses the live form.
    }
};
