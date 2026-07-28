import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
    Download, CheckCircle2 as SuccessIcon, Copy, QrCode, Barcode as BarcodeIcon, 
    Loader2, Plus, Upload, X, Trash2, Sparkles, ImagePlus, ExternalLink, 
    FileText, CheckCircle2, IndianRupee, Scale, Tag, Box, Zap, Coins, 
    Calculator, Layers, Search, Truck, Info, ChevronRight, LayoutDashboard,
    ArrowLeft, Eye
} from 'lucide-react';
import Barcode from 'react-barcode';
import PageHeader from '../../admin/components/common/PageHeader';
import { FormSection, Input, Select, TextArea } from '../../admin/components/common/FormControls';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { downloadImage, downloadSvgNode, downloadTextFile } from '../../../utils/downloadUtils';
import familyVideoFrame from '@/assets/products/family/videoframe_23898.png';

// Tab Components
import ProductGeneralTab from './product-editor/ProductGeneralTab';
import ProductVariantsTab from './product-editor/ProductVariantsTab';
import ProductMediaTab from './product-editor/ProductMediaTab';
import ProductAdvancedTab from './product-editor/ProductAdvancedTab';

// Utilities
import { 
    roundCurrency, 
    IMAGE_PREVIEW_RE, 
    ENHANCEMENT_PROMPT,
    normalizeSerialCodes,
    getAvailableSerialCodes,
    getPricingForVariant,
    syncVariantSerialQuantity
} from '../utils/productEditorUtils';

const SharedProductEditor = ({
    productApi,
    metalPricingApi,
    backPath = '/seller/products',
    categoryApi,
    editorMode = 'seller'
}) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isAdminMode = editorMode === 'admin';
    const storageKey = editorMode === 'admin' ? 'sands_admin_add_product_form' : 'sands_seller_add_product_form';

    const isViewMode = location.pathname.includes('/view/');
    const isEditMode = Boolean(id) && !isViewMode;

    // Navigation Tabs State
    const [activeTab, setActiveTab] = useState('general'); // general, variants, media, advanced

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(isEditMode || isViewMode);
    const [imageFiles, setImageFiles] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);
    const [variantImageFiles, setVariantImageFiles] = useState({});
    const [variantImagePreviews, setVariantImagePreviews] = useState({});
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreview, setVideoPreview] = useState('');
    const [removeVideo, setRemoveVideo] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [expandedVariant, setExpandedVariant] = useState(null);
    const [liveErrors, setLiveErrors] = useState({});
    const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdProductData, setCreatedProductData] = useState(null);
    const [gstRate, setGstRate] = useState(3);
    const [metalRates, setMetalRates] = useState({ gold: 0, silver: 0, platinum: 0 });
    const [sellerProfile, setSellerProfile] = useState(null);
    
    const serialBarcodeRefs = useRef({});
    
    // AI Enhancement States
    const [enhancingIndex, setEnhancingIndex] = useState(null);
    const [showEnhanceModal, setShowEnhanceModal] = useState(false);
    const [enhancedIndices, setEnhancedIndices] = useState(new Set());

    const [formData, setFormData] = useState(() => {
        const initial = {
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
        };

        if (typeof window !== 'undefined' && !Boolean(id)) {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object') {
                        return { ...initial, ...parsed };
                    }
                } catch (e) {
                    console.error("Failed to parse saved product form", e);
                }
            }
        }
        return initial;
    });

    useEffect(() => {
        if (!isEditMode && !isViewMode) {
            localStorage.setItem(storageKey, JSON.stringify(formData));
        }
    }, [formData, isEditMode, isViewMode, storageKey]);

    useEffect(() => {
        const newErrors = {};
        
        // 1. Name
        if (!formData.name) {
            newErrors.name = "Name is required";
        }

        // 2. HUID (Optional - no validation logic required here)

        // 3. Category
        if (!formData.categories?.[0]?.category) {
            newErrors.categories = "Category is required.";
        }



        // 5. Logistics - Shipping Days
        if (formData.logistics?.estimatedShippingDays !== undefined && formData.logistics?.estimatedShippingDays !== '') {
            const days = parseInt(formData.logistics.estimatedShippingDays);
            if (isNaN(days) || days <= 0) {
                newErrors.estimatedShippingDays = "Estimated shipping days must be a positive number";
            }
        }

        // 6. Variants
        if (formData.variants) {
            formData.variants.forEach((v, i) => {
                if (!v.name) {
                    newErrors[`variant_${v.id}_name`] = "Variant name required";
                    newErrors[`variant_${i}_name`] = "Variant name required";
                }
                
                if (v.weight === undefined || v.weight === '') {
                    newErrors[`variant_${v.id}_weight`] = "Weight required";
                    newErrors[`variant_${i}_weight`] = "Weight required";
                } else {
                    const vw = parseFloat(v.weight);
                    if (isNaN(vw) || vw <= 0) {
                        newErrors[`variant_${v.id}_weight`] = "Weight must be a positive number";
                        newErrors[`variant_${i}_weight`] = "Weight must be a positive number";
                    }
                }

                // Numeric charges checks
                const numericFields = [
                    { name: 'makingCharge', label: 'Making charge' },
                    { name: 'hallmarkingCharge', label: 'Hallmarking charge' },
                    { name: 'diamondPrice', label: 'Diamond / Stones price' },
                    { name: 'diamondCertificateCharge', label: 'Certificate charge' },
                    { name: 'additionalCharge', label: 'Additional charge' }
                ];
                numericFields.forEach(field => {
                    if (v[field.name] !== undefined && v[field.name] !== '') {
                        const val = parseFloat(v[field.name]);
                        if (isNaN(val) || val < 0) {
                            newErrors[`variant_${v.id}_${field.name}`] = `${field.label} cannot be negative`;
                            newErrors[`variant_${i}_${field.name}`] = `${field.label} cannot be negative`;
                        }
                    }
                });

                if (v.diamondSpecs?.diamondCount !== undefined && v.diamondSpecs?.diamondCount !== '') {
                    const count = parseInt(v.diamondSpecs.diamondCount, 10);
                    if (isNaN(count) || count < 0) {
                        newErrors[`variant_${v.id}_diamondCount`] = "Diamond count cannot be negative";
                        newErrors[`variant_${i}_diamondCount`] = "Diamond count cannot be negative";
                    }
                }
            });
        }

        setLiveErrors(newErrors);
    }, [formData]);

    const combinedErrors = useMemo(() => {
        if (!hasTriedSubmit) return {};
        return {
            ...errors,
            ...liveErrors
        };
    }, [errors, liveErrors, hasTriedSubmit]);

    const setSerialBarcodeRef = (key, node) => {
        if (node) {
            serialBarcodeRefs.current[key] = node;
        } else {
            delete serialBarcodeRefs.current[key];
        }
    };

    const handleDownloadSerialBarcode = (serialCode) => {
        const container = serialBarcodeRefs.current[serialCode];
        const svgNode = container?.querySelector?.('svg');
        if (!svgNode) {
            toast.error('Barcode preview is not ready yet');
            return;
        }
        downloadSvgNode(svgNode, `serial-${serialCode}.svg`);
    };

    const handleDownloadAllSerialBarcodes = (variant) => {
        const codes = (variant.serialCodes || []).map(c => c.code);
        if (codes.length === 0) return;

        // Create a printable window
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Popup blocker prevented opening the print window. Please allow popups for this site.");
            return;
        }

        // Gather all SVGs from the DOM
        let svgItemsHtml = '';
        codes.forEach(code => {
            const container = serialBarcodeRefs.current[code];
            const svgNode = container?.querySelector?.('svg');
            if (svgNode) {
                const serializer = new XMLSerializer();
                const svgMarkup = serializer.serializeToString(svgNode);
                svgItemsHtml += `
                    <div class="barcode-card">
                        <div class="barcode-svg">${svgMarkup}</div>
                        <div class="barcode-code">${code}</div>
                    </div>
                `;
            }
        });

        if (!svgItemsHtml) {
            toast.error("Barcodes are not loaded in the view yet. Please make sure the variant section is expanded first.");
            printWindow.close();
            return;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>Print Barcodes - ${variant.name || 'variant'}</title>
                <style>
                    body {
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        margin: 0;
                        padding: 30px;
                        background: white;
                        color: black;
                        -webkit-print-color-adjust: exact;
                    }
                    .grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                        gap: 20px;
                    }
                    .barcode-card {
                        border: 1px solid #eaeaea;
                        border-radius: 16px;
                        padding: 20px;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        page-break-inside: avoid;
                        background: #fff;
                    }
                    .barcode-svg svg {
                        width: 140px;
                        height: auto;
                    }
                    .barcode-code {
                        font-size: 11px;
                        font-weight: 700;
                        font-family: monospace;
                        margin-top: 10px;
                        letter-spacing: 1px;
                        color: #333;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                        .grid {
                            grid-template-columns: repeat(3, 1fr);
                            gap: 15px;
                        }
                        .barcode-card {
                            border: 1px solid #ccc;
                            box-shadow: none;
                        }
                    }
                </style>
            </head>
            <body>
                <h3 style="margin-top: 0; margin-bottom: 25px; text-transform: uppercase; font-size: 12px; font-weight: 900; letter-spacing: 2px; border-bottom: 2px solid #000; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span>Barcodes Batch - ${variant.name || 'variant'}</span>
                    <span style="color: #666; font-size: 10px;">${codes.length} Units</span>
                </h3>
                <div class="grid">
                    ${svgItemsHtml}
                </div>
                <script>
                    // Add a tiny delay to ensure SVGs are completely rendered before print dialog opens
                    setTimeout(() => {
                        window.print();
                    }, 500);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const resolvedProductApi = productApi;
    const resolvedMetalPricingApi = metalPricingApi;
    const isFamilyVideoFrameProduct = id === '69ef0e442cf9c0c98d8aab52';
    const familyVideoFramePreview = !removeVideo && isEditMode && isFamilyVideoFrameProduct && !videoPreview && !formData.videoUrl
        ? familyVideoFrame
        : '';
    const resolvedVideoPreview = videoPreview || formData.videoUrl || familyVideoFramePreview;
    const isImageVideoPreview = Boolean(resolvedVideoPreview) && (
        IMAGE_PREVIEW_RE.test(resolvedVideoPreview) || 
        /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(String(resolvedVideoPreview))
    );

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const categoryResult = await (categoryApi ? categoryApi() : Promise.resolve([]));
                const list = Array.isArray(categoryResult)
                    ? categoryResult
                    : (categoryResult?.data?.data?.categories || categoryResult?.data?.categories || []);
                setCategories(list.filter(cat => cat.isActive !== false));
            } catch (err) {
                toast.error("Failed to load categories");
            }
        };
        loadCategories();
    }, [categoryApi]);

    useEffect(() => {
        const loadPricing = async () => {
            try {
                if (!resolvedMetalPricingApi?.getMetalPricing) return;
                const res = await resolvedMetalPricingApi.getMetalPricing();
                if (res?.metalRates) {
                    setMetalRates(prev => ({
                        ...prev,
                        ...res.metalRates
                    }));
                }
                if (res?.gstRate !== undefined && res?.gstRate !== null) {
                    setGstRate(Number(res.gstRate) || 0);
                }
            } catch (err) {
                // silent fallback
            }
        };
        loadPricing();
    }, []);

    useEffect(() => {
        if (editorMode === 'seller') {
            api.get('/seller/profile/me')
                .then(res => {
                    const profile = res.data?.data?.seller || res.data?.seller;
                    if (profile) setSellerProfile(profile);
                })
                .catch(err => console.error("Failed to load profile", err));
        }
    }, [editorMode]);

    useEffect(() => {
        if (editorMode === 'seller' && sellerProfile && !isEditMode && !isViewMode) {
            const hasGold = !!sellerProfile.bisNumberGold;
            const hasSilver = !!sellerProfile.bisNumberSilver;
            if (!hasSilver && hasGold && formData.material === 'Silver') {
                setFormData(prev => ({ ...prev, material: 'Gold' }));
            } else if (!hasGold && hasSilver && formData.material === 'Gold') {
                setFormData(prev => ({ ...prev, material: 'Silver' }));
            }
        }
    }, [sellerProfile, editorMode, isEditMode, isViewMode, formData.material]);

    useEffect(() => {
        if (!expandedVariant && formData.variants?.[0]?.id) {
            setExpandedVariant(formData.variants[0].id);
        }
    }, [formData.variants, expandedVariant]);

    useEffect(() => {
        const loadProduct = async () => {
            if (!isEditMode && !isViewMode) {
                setLoading(false);
                return;
            }
            try {
                if (!resolvedProductApi?.getProduct) return;
                const data = await resolvedProductApi.getProduct(id);
                if (data) {
                    const normalizedCategories = (data.categories || []).map(c => ({
                        category: typeof c === 'object' ? (c._id || c.name || '') : c
                    }));
                    
                    const {
                        _id, id: legacyId, image, sellerId, sku, rating, reviewCount,
                        createdAt, updatedAt, __v, slug, brand, status, active,
                        showInNavbar, showInCollection, ...restData
                    } = data;

                    const mappedVariants = data.variants?.map((v, index) => {
                        const serialCodes = normalizeSerialCodes(v.serialCodes || []);
                        const prefix = String(data.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4) || 'ITEM';
                        const availableCount = serialCodes.filter(code => (code.status || 'AVAILABLE') === 'AVAILABLE').length;
                        const desiredCount = availableCount || Number(v.stock) || 0;
                        const ensured = serialCodes.length > 0
                            ? { serialCodes, stock: availableCount }
                            : syncVariantSerialQuantity({ serialCodes: [] }, index, desiredCount, prefix);

                        return { 
                            ...v, 
                            id: v._id || Math.random(),
                            weight: v.weight ?? data.weight ?? '',
                            weightUnit: v.weightUnit || data.weightUnit || 'Grams',
                            makingCharge: (v.makingCharge || 0).toString(),
                            hallmarkingCharge: (v.hallmarkingCharge || 0).toString(),
                            diamondCertificateCharge: (
                                v.diamondCertificateCharge !== undefined && v.diamondCertificateCharge !== null
                                    ? v.diamondCertificateCharge
                                    : 0
                            ).toString(),
                            additionalCharge: (v.additionalCharge || 0).toString(),
                            diamondPrice: (v.diamondPrice || 0).toString(),
                            diamondType: v.diamondType || data.diamondType || 'none',
                            serialCodes: ensured.serialCodes,
                            stock: ensured.stock,
                            variantImages: Array.isArray(v.variantImages) ? v.variantImages : [],
                            variantFaqs: Array.isArray(v.variantFaqs) ? v.variantFaqs : [],
                            diamondSpecs: {
                                carat: v.diamondSpecs?.carat || '',
                                clarity: v.diamondSpecs?.clarity || '',
                                color: v.diamondSpecs?.color || '',
                                cut: v.diamondSpecs?.cut || '',
                                shape: v.diamondSpecs?.shape || '',
                                diamondCount: v.diamondSpecs?.diamondCount || 0
                            }
                        };
                    }) || [];

                    setFormData(prev => ({
                        ...prev,
                        ...restData,
                        material: data.material || data.metal || 'Silver',
                        audience: Array.isArray(data.audience) && data.audience.length > 0 ? data.audience : ['unisex'],
                        weight: data.weight || '',
                        weightUnit: data.weightUnit || 'Grams',
                        paymentGatewayChargeBearer: data.paymentGatewayChargeBearer || 'seller',
                        diamondType: data.diamondType || 'none',
                        categories: normalizedCategories.slice(0, 1),
                        variants: mappedVariants.length > 0 ? mappedVariants : prev.variants,
                        faqs: data.faqs || [],
                        seo: data.seo || { title: '', description: '', keywords: '' },
                        logistics: data.logistics || { estimatedShippingDays: 3, certificateUrl: '' },
                        careTips: data.careTips || '',
                        stylingTips: data.stylingTips || '',
                        supplierInfo: data.supplierInfo || '',
                        specifications: data.specifications || '',
                        tags: data.tags || { isNewArrival: false, isMostGifted: false, isNewLaunch: false, isTrending: false, isPremium: false },
                        relatedProducts: data.relatedProducts || [],
                        videoUrl: data.videoUrl || '',
                        isSerialized: true
                    }));

                    if (mappedVariants.length > 0) {
                        setExpandedVariant(mappedVariants[0].id);
                    }

                    if (data.images) setPreviewImages(data.images);
                    setVideoPreview(data.videoUrl || '');
                    setLoading(false);
                }
            } catch (err) {
                toast.error("Failed to load product");
                setLoading(false);
            }
        };
        loadProduct();
    }, [id]);

    // Handlers
    const handleVideoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setVideoFile(file);
        setRemoveVideo(false);
        setVideoPreview(URL.createObjectURL(file));
    };

    const handleRemoveVideo = () => {
        setVideoFile(null);
        setVideoPreview('');
        setRemoveVideo(true);
        setFormData(prev => ({ ...prev, videoUrl: '' }));
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const newFiles = files.slice(0, 5 - imageFiles.length);
        const previews = newFiles.map(file => URL.createObjectURL(file));
        setImageFiles(prev => [...prev, ...newFiles]);
        setPreviewImages(prev => [...prev, ...previews].slice(0, 5));
    };

    const handleHoverImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (previewImages.length >= 5) {
            toast.error('You can upload up to 5 images.');
            return;
        }
        const preview = URL.createObjectURL(file);
        setImageFiles(prev => [...prev, file]);
        setPreviewImages(prev => [...prev, preview].slice(0, 5));
    };

    const handleRemoveImage = (index) => {
        const removedImage = previewImages[index];
        const newPreviewImages = previewImages.filter((_, i) => i !== index);

        const updates = { deletedImages: [...formData.deletedImages] };
        if (typeof removedImage === 'string' && !removedImage.startsWith('blob:')) {
            updates.deletedImages.push(removedImage);
        } else if (removedImage?.startsWith('blob:')) {
            const newFileIndex = previewImages.slice(0, index).filter(img => img.startsWith('blob:')).length;
            setImageFiles(prev => prev.filter((_, i) => i !== newFileIndex));
        }

        setFormData(prev => ({ ...prev, deletedImages: updates.deletedImages }));
        setPreviewImages(newPreviewImages);
    };

    const handleVariantChange = (vid, field, value) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(v => {
                if (v.id === vid) {
                    const updated = { ...v, [field]: value };
                    
                    if (['makingCharge', 'hallmarkingCharge', 'diamondCertificateCharge', 'additionalCharge', 'diamondPrice', 'weight', 'weightUnit'].includes(field)) {
                        const pricing = getPricingForVariant(updated, prev, metalRates, gstRate);
                        updated.mrp = pricing.finalPrice.toString();
                        updated.price = pricing.finalPrice.toString();
                        updated.metalPrice = pricing.metalPrice;
                        updated.hiddenCharge = pricing.hiddenCharge;
                        updated.subtotalBeforeTax = pricing.subtotalBeforeTax;
                        updated.gstAmount = pricing.gstValue;
                        updated.priceAfterTax = pricing.priceAfterTax;
                        updated.pgChargePercent = pricing.pgChargePercent;
                        updated.pgChargeAmount = pricing.pgChargeAmount;
                        updated.gst = pricing.gstValue;
                        updated.finalPrice = pricing.finalPrice;
                    }
                    return updated;
                }
                return v;
            })
        }));
    };

    const handleDiamondSpecChange = (vid, field, value) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(v => {
                if (v.id === vid) {
                    return {
                        ...v,
                        diamondSpecs: {
                            ...(v.diamondSpecs || {}),
                            [field]: value
                        }
                    };
                }
                return v;
            })
        }));
    };

    const addVariant = () => {
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, { 
                id: Date.now(), 
                name: '', 
                size: '', 
                weight: prev.weight || '',
                weightUnit: prev.weightUnit || 'Grams',
                makingCharge: '0', 
                hallmarkingCharge: '0',
                diamondCertificateCharge: '0',
                additionalCharge: '0',
                diamondPrice: '0', 
                diamondType: prev.diamondType || 'none',
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
            }]
        }));
    };

    const removeVariant = (id) => {
        if (formData.variants.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter(v => v.id !== id)
        }));
    };

    const updateVariantSerialQuantity = (id, desiredCount) => {
        const count = Math.max(0, parseInt(desiredCount || 0, 10));
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map((v, index) => {
                if (v.id !== id) return v;
                const prefix = String(prev.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4) || 'ITEM';
                return syncVariantSerialQuantity(v, index, count, prefix);
            })
        }));
    };

    const handleVariantImageUpload = (variantId, filesList) => {
        const files = Array.from(filesList || []);
        if (!variantId || files.length === 0) return;

        const previews = files.map((file) => URL.createObjectURL(file));
        setVariantImageFiles((prev) => ({
            ...prev,
            [variantId]: [...(prev[variantId] || []), ...files]
        }));
        setVariantImagePreviews((prev) => ({
            ...prev,
            [variantId]: [...(prev[variantId] || []), ...previews]
        }));
    };

    const handleRemoveVariantUpload = (variantId, previewIndex) => {
        if (!variantId || previewIndex < 0) return;
        setVariantImageFiles((prev) => ({
            ...prev,
            [variantId]: (prev[variantId] || []).filter((_, index) => index !== previewIndex)
        }));
        setVariantImagePreviews((prev) => ({
            ...prev,
            [variantId]: (prev[variantId] || []).filter((_, index) => index !== previewIndex)
        }));
    };

    const handleRemoveSavedVariantImage = (variantId, imageUrl) => {
        if (!variantId || !imageUrl) return;
        setFormData((prev) => ({
            ...prev,
            variants: prev.variants.map((variant) => {
                if (variant.id !== variantId) return variant;
                return {
                    ...variant,
                    variantImages: Array.isArray(variant.variantImages)
                        ? variant.variantImages.filter((img) => img !== imageUrl)
                        : []
                };
            })
        }));
    };

    const addVariantFaq = (variantId) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(v => {
                if (v.id !== variantId) return v;
                const current = Array.isArray(v.variantFaqs) ? v.variantFaqs : [];
                return { ...v, variantFaqs: [...current, { question: '', answer: '' }] };
            })
        }));
    };

    const removeVariantFaq = (variantId, faqIndex) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(v => {
                if (v.id !== variantId) return v;
                const current = Array.isArray(v.variantFaqs) ? v.variantFaqs : [];
                return { ...v, variantFaqs: current.filter((_, i) => i !== faqIndex) };
            })
        }));
    };

    const handleVariantFaqChange = (variantId, faqIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(v => {
                if (v.id !== variantId) return v;
                const current = Array.isArray(v.variantFaqs) ? v.variantFaqs : [];
                const next = current.map((faq, i) => i === faqIndex ? { ...faq, [field]: value } : faq);
                return { ...v, variantFaqs: next };
            })
        }));
    };

    const clearVariantFaqOverride = (variantId) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(variant => (
                variant.id === variantId ? { ...variant, variantFaqs: [] } : variant
            ))
        }));
    };

    const addFaq = () => {
        setFormData(prev => ({
            ...prev,
            faqs: [...prev.faqs, { question: '', answer: '' }]
        }));
    };

    const removeFaq = (index) => {
        setFormData(prev => ({
            ...prev,
            faqs: prev.faqs.filter((_, i) => i !== index)
        }));
    };

    const handleFaqChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            faqs: prev.faqs.map((faq, i) => i === index ? { ...faq, [field]: value } : faq)
        }));
    };

    const handleEnhancedUpload = (e) => {
        const file = e.target.files[0];
        if (!file || enhancingIndex === null) return;
        
        const preview = URL.createObjectURL(file);
        
        setPreviewImages(prev => {
            const newPreviews = [...prev];
            newPreviews[enhancingIndex] = preview;
            return newPreviews;
        });

        const isNewFile = previewImages[enhancingIndex]?.startsWith('blob:');
        if (isNewFile) {
            const newFileIndex = previewImages.slice(0, enhancingIndex).filter(img => img.startsWith('blob:')).length;
            setImageFiles(prev => {
                const newFiles = [...prev];
                newFiles[newFileIndex] = file;
                return newFiles;
            });
        } else {
            setImageFiles(prev => [...prev, file]);
        }
        
        setEnhancedIndices(prev => new Set(prev).add(enhancingIndex));
        setShowEnhanceModal(false);
        setEnhancingIndex(null);
        toast.success("✅ Image enhanced successfully");
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name) {
            newErrors.name = "Product Name is required";
        } else if (!/^[a-zA-Z0-9 ]+$/.test(formData.name)) {
            newErrors.name = "Product Name must contain only alphanumeric characters and spaces";
        }
        if (!formData.categories?.[0]?.category) newErrors.categories = "Category is required";
        
        const strippedDesc = (formData.description || '').replace(/<[^>]*>/g, '').trim();
        if (!strippedDesc) newErrors.description = "Product Description is required";
        
        formData.variants.forEach((v, i) => {
            const varLabel = v.name ? `Variant "${v.name}"` : `Variant #${i + 1}`;
            if (!v.name) newErrors[`variant_${i}_name`] = `${varLabel}: Name is required`;
            if (!v.weight) newErrors[`variant_${i}_weight`] = `${varLabel}: Weight is required`;
        });

        const combined = { ...liveErrors, ...newErrors };
        setErrors(combined);
        return combined;
    };

    const handleSubmit = async () => {
        setHasTriedSubmit(true);
        const newErrors = validateForm();
        const errorList = Object.values(newErrors);
        
        if (errorList.length > 0) {
            // Display custom error toast
            toast.error(
                <div className="text-left font-sans">
                    <p className="font-bold text-sm text-red-700">Validation Error</p>
                    <ul className="list-disc pl-4 mt-2 text-xs text-gray-700 space-y-1">
                        {errorList.map((err, idx) => (
                            <li key={idx}>{err}</li>
                        ))}
                    </ul>
                </div>,
                { duration: 6000 }
            );

            // Determine redirect behavior
            const hasGeneralErrors = ['name', 'huid', 'categories', 'description'].some(k => k in newErrors);
            if (hasGeneralErrors) {
                setActiveTab('general');
            } else {
                // Find first variant error
                const firstVarErrIdx = formData.variants.findIndex((v, i) => 
                    `variant_${i}_name` in newErrors || `variant_${i}_weight` in newErrors
                );
                if (firstVarErrIdx !== -1) {
                    setActiveTab('variants');
                    setExpandedVariant(formData.variants[firstVarErrIdx].id);
                }
            }
            return;
        }

        setIsSaving(true);
        try {
            const productForm = new FormData();
            
            // Clean payload
            const payload = { ...formData };
            if (payload.logistics) {
                payload.logistics = {
                    ...payload.logistics,
                    estimatedShippingDays: (payload.logistics.estimatedShippingDays === '' || payload.logistics.estimatedShippingDays === undefined || payload.logistics.estimatedShippingDays === null)
                        ? 3
                        : parseInt(payload.logistics.estimatedShippingDays)
                };
            }
            const cleanVariants = payload.variants.map(v => {
                const { id: _, ...rest } = v;
                return rest;
            });
            const categoryIds = (payload.categories || [])
                .map((entry) => {
                    if (!entry) return '';
                    if (typeof entry === 'string') return entry;
                    return entry.category || entry._id || entry.id || '';
                })
                .filter(Boolean)
                .slice(0, 1);

            productForm.append('name', payload.name);
            productForm.append('productCode', payload.productCode);
            productForm.append('huid', payload.huid);
            productForm.append('material', payload.material);
            productForm.append('description', payload.description);
            productForm.append('specifications', payload.specifications || '');
            productForm.append('supplierInfo', payload.supplierInfo || '');
            productForm.append('stylingTips', payload.stylingTips || '');
            productForm.append('careTips', payload.careTips || '');
            const primaryVariant = payload.variants[0] || {};
            productForm.append('diamondType', primaryVariant.diamondType || 'none');
            productForm.append('categories', JSON.stringify(categoryIds));
            productForm.append('audience', JSON.stringify(payload.audience || ['unisex']));
            productForm.append('weight', primaryVariant.weight || '');
            productForm.append('weightUnit', primaryVariant.weightUnit || 'Grams');
            productForm.append('paymentGatewayChargeBearer', payload.paymentGatewayChargeBearer || 'seller');
            productForm.append('silverCategory', payload.silverCategory || '');
            productForm.append('goldCategory', payload.goldCategory || '');
            productForm.append('cardLabel', payload.cardLabel || '');
            productForm.append('cardBadge', payload.cardBadge || '');
            productForm.append('status', payload.status || 'Active');
            productForm.append('showInNavbar', (payload.showInNavbar ?? true).toString());
            productForm.append('showInCollection', (payload.showInCollection ?? true).toString());
            productForm.append('active', (payload.active ?? true).toString());
            productForm.append('isSerialized', 'true');
            productForm.append('variants', JSON.stringify(cleanVariants));
            productForm.append('faqs', JSON.stringify(payload.faqs));
            productForm.append('tags', JSON.stringify(payload.tags));
            productForm.append('seo', JSON.stringify(payload.seo));
            productForm.append('logistics', JSON.stringify(payload.logistics));
            productForm.append('relatedProducts', JSON.stringify(payload.relatedProducts));
            productForm.append('deletedImages', JSON.stringify(payload.deletedImages));
            productForm.append('removeVideo', removeVideo.toString());

            imageFiles.forEach(file => productForm.append('images', file));
            if (videoFile) productForm.append('video', videoFile);

            // Variant image files
            payload.variants.forEach((variant, index) => {
                const key = variant.id;
                (variantImageFiles[key] || []).forEach(file => {
                    productForm.append(`variantImages_${index}`, file);
                });
            });

            let response;
            if (isEditMode) {
                response = await resolvedProductApi.updateProduct(id, productForm);
            } else {
                response = await resolvedProductApi.createProduct(productForm);
            }

            if (response) {
                toast.success(isEditMode ? "Product updated successfully" : "Product created successfully");
                if (!isEditMode) {
                    localStorage.removeItem(storageKey);
                }
                setCreatedProductData(response.data?.data || response.data || response);
                setShowSuccessModal(true);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save product");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur-md">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-[#3E2723]/10 border-t-[#3E2723] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LayoutDashboard className="text-[#3E2723] animate-pulse" size={24} />
                    </div>
                </div>
                <p className="mt-6 text-[10px] font-black text-[#3E2723] uppercase tracking-[0.3em] animate-pulse">Initializing Protocol...</p>
            </div>
        );
    }

    const tabItems = [
        { id: 'general', label: 'General Info', icon: LayoutDashboard },
        { id: 'variants', label: 'Variants & Stock', icon: Layers },
        { id: 'media', label: 'Media Gallery', icon: ImagePlus },
        { id: 'advanced', label: 'Advanced Specs', icon: Zap },
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF7]/50 pb-20">
            {/* Premium Header Container */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-100 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate(backPath)}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 hover:text-[#3E2723] hover:bg-white transition-all shadow-sm group"
                            >
                                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-light text-gray-800 tracking-wide flex items-center gap-3">
                                    {isEditMode ? 'Edit Product' : (isViewMode ? 'View Product' : 'New Product')}
                                    {isEditMode && <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium tracking-wide">{formData.productCode || 'GEN-001'}</span>}
                                </h1>
                                <p className="text-sm font-light text-gray-500 mt-1">
                                    {isAdminMode ? 'Admin Product Management' : 'Seller Product Management'}
                                </p>
                            </div>
                        </div>

                        {/* Top Navigation Tabs */}
                        <div className="flex items-center p-1.5 bg-gray-50 rounded-xl border border-gray-100 overflow-x-auto no-scrollbar">
                            {tabItems.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                        activeTab === tab.id 
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-100' 
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                                    }`}
                                >
                                    <tab.icon size={16} className={activeTab === tab.id ? 'text-gray-700' : 'text-gray-400'} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {!isViewMode && (
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving || (editorMode === 'seller' && sellerProfile && !sellerProfile.bisNumberGold && !sellerProfile.bisNumberSilver && !isEditMode && !isViewMode)}
                                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <SuccessIcon size={16} />}
                                {isEditMode ? 'Update Product' : 'Save Product'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-8">
                {editorMode === 'seller' && sellerProfile && !sellerProfile.bisNumberGold && !sellerProfile.bisNumberSilver && !isEditMode && !isViewMode ? (
                    <div className="bg-white rounded-[2rem] border border-red-100 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm space-y-6">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500">
                            <Info size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">BIS Credentials Required</h3>
                            <p className="text-sm text-gray-500 leading-relaxed font-normal">
                                You must update either your <strong>BIS Hallmark License Number for Gold</strong> or <strong>Silver</strong> in your profile settings before you can list products.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/seller/profile')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            Go to Profile Settings <ExternalLink size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {/* Active Tab Component */}
                        {activeTab === 'general' && (
                            <ProductGeneralTab 
                                formData={formData} 
                                setFormData={setFormData} 
                                errors={combinedErrors} 
                                isViewMode={isViewMode} 
                                categories={categories}
                                handleCategoryChange={(val) => setFormData(prev => ({ ...prev, categories: [{ category: val }] }))}
                                createdProductData={createdProductData}
                                sellerProfile={sellerProfile}
                                editorMode={editorMode}
                            />
                        )}

                        {activeTab === 'variants' && (
                            <ProductVariantsTab 
                                formData={formData} 
                                setFormData={setFormData} 
                                errors={combinedErrors} 
                                isViewMode={isViewMode} 
                                metalRates={metalRates} 
                                gstRate={gstRate}
                                handleVariantChange={handleVariantChange}
                                handleDiamondSpecChange={handleDiamondSpecChange}
                                addVariant={addVariant}
                                removeVariant={removeVariant}
                                updateVariantSerialQuantity={updateVariantSerialQuantity}
                                handleDownloadAllSerialBarcodes={handleDownloadAllSerialBarcodes}
                                handleDownloadSerialBarcode={handleDownloadSerialBarcode}
                                setSerialBarcodeRef={setSerialBarcodeRef}
                                handleVariantImageUpload={handleVariantImageUpload}
                                handleRemoveVariantUpload={handleRemoveVariantUpload}
                                variantImagePreviews={variantImagePreviews}
                                handleRemoveSavedVariantImage={handleRemoveSavedVariantImage}
                                addVariantFaq={addVariantFaq}
                                removeVariantFaq={removeVariantFaq}
                                handleVariantFaqChange={handleVariantFaqChange}
                                clearVariantFaqOverride={clearVariantFaqOverride}
                                expandedVariant={expandedVariant}
                                setExpandedVariant={setExpandedVariant}
                            />
                        )}

                        {activeTab === 'media' && (
                            <ProductMediaTab 
                                formData={formData} 
                                setFormData={setFormData} 
                                isViewMode={isViewMode} 
                                previewImages={previewImages}
                                handleImageUpload={handleImageUpload}
                                handleHoverImageUpload={handleHoverImageUpload}
                                handleRemoveImage={handleRemoveImage}
                                handleVideoUpload={handleVideoUpload}
                                handleRemoveVideo={handleRemoveVideo}
                                resolvedVideoPreview={resolvedVideoPreview}
                                isImageVideoPreview={isImageVideoPreview}
                                removeVideo={removeVideo}
                                enhancingIndex={enhancingIndex}
                                setEnhancingIndex={setEnhancingIndex}
                                showEnhanceModal={showEnhanceModal}
                                setShowEnhanceModal={setShowEnhanceModal}
                                enhancedIndices={enhancedIndices}
                                handleEnhancedUpload={handleEnhancedUpload}
                            />
                        )}

                        {activeTab === 'advanced' && (
                            <ProductAdvancedTab 
                                formData={formData} 
                                setFormData={setFormData} 
                                errors={combinedErrors}
                                isViewMode={isViewMode} 
                                addFaq={addFaq} 
                                removeFaq={removeFaq} 
                                handleFaqChange={handleFaqChange} 
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0c0c0c]/90 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-3xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-500 flex flex-col md:flex-row">
                        <div className="md:w-1/2 bg-[#3E2723] p-6 sm:p-12 flex flex-col justify-between relative">
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 mb-8">
                                    <SuccessIcon className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-4xl font-black text-white uppercase tracking-tight leading-tight mb-4">
                                    Manifest <br/> Successfully <br/> Committed
                                </h3>
                                <p className="text-amber-200/60 text-[10px] font-black uppercase tracking-[0.3em]">Identity Matrix Synchronized</p>
                            </div>
                            
                            <div className="relative z-10 mt-12 p-8 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10">
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">Unique Identity Artifact</p>
                                <span className="text-4xl font-mono font-black text-amber-400 tracking-tighter">
                                    {createdProductData?.productCode || 'REGISTERED'}
                                </span>
                            </div>
                        </div>

                        <div className="md:w-1/2 p-6 sm:p-12 flex flex-col justify-between bg-white">
                            <div className="space-y-10">
                                <div>
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Master Specification</p>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight uppercase line-clamp-2">{formData.name}</h2>
                                </div>

                                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col items-center gap-6">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Visual Signature (Barcode)</p>
                                    <div className="w-full flex justify-center bg-white p-6 rounded-2xl border border-gray-100 shadow-inner">
                                        <Barcode 
                                            value={createdProductData?.productCode || 'REGISTERED'} 
                                            width={1.5} 
                                            height={50} 
                                            fontSize={12}
                                            background="#ffffff"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mt-12">
                                <button 
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        if (isAdminMode) navigate('/admin/products/new');
                                        else window.location.reload();
                                    }}
                                    className="w-full py-5 bg-[#3E2723] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-[#3E2723]/20 hover:bg-black transition-all flex items-center justify-center gap-3"
                                >
                                    <Plus size={16} /> Register Another Artifact
                                </button>
                                <button 
                                    onClick={() => navigate(backPath)}
                                    className="w-full py-4 text-gray-400 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:text-[#3E2723] transition-all"
                                >
                                    Return to Repository
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SharedProductEditor;
