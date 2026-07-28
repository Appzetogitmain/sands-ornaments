import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Calendar, Settings, ShieldCheck, Info, CheckCircle2 } from 'lucide-react';
import { adminService } from '../services/adminService';
import PageHeader from '../components/common/PageHeader';
import { FormSection, Input, Select, TextArea } from '../components/common/FormControls';
import toast from 'react-hot-toast';

const CouponFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const ALL_CATEGORIES = categories || [];
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        code: '',
        type: 'flat',
        value: '',
        minOrderValue: '',
        maxDiscount: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        usageLimit: '',
        perUserLimit: 1,
        active: true,
        userEligibility: 'all',
        description: '',
        // New Fields
        applicabilityType: 'all', // 'all', 'category', 'product'
        targetItems: [] // Array of IDs or Names
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [{ products: adminProducts }, adminCategories] = await Promise.all([
                    adminService.getProducts({ limit: 100 }),
                    adminService.getCategories()
                ]);

                const normalizedProducts = (adminProducts || []).map(p => ({
                    id: p._id || p.id,
                    name: p.name,
                    image: p.images?.[0] || '',
                    category: p.categories?.[0]?.name || 'Uncategorized'
                }));

                setProducts(normalizedProducts);
                setCategories(adminCategories || []);

                if (isEdit && id) {
                    const coupon = await adminService.getCouponById(id);
                    if (coupon) {
                        const isNewUser = coupon.applicabilityType === 'new_user' || coupon.userEligibility === 'new';
                        setFormData({
                            code: coupon.code || '',
                            type: coupon.type || 'flat',
                            value: coupon.value ?? '',
                            minOrderValue: coupon.minOrderValue ?? 0,
                            maxDiscount: coupon.maxDiscount ?? '',
                            validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : '',
                            validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '',
                            usageLimit: coupon.usageLimit ?? '',
                            perUserLimit: coupon.perUserLimit ?? 1,
                            active: coupon.active !== false,
                            userEligibility: isNewUser ? 'new' : (coupon.userEligibility || 'all'),
                            description: coupon.description || '',
                            applicabilityType: isNewUser ? 'all' : (coupon.applicabilityType || 'all'),
                            targetItems: coupon.applicableCategories || coupon.applicableProducts || []
                        });
                    }
                }
            } catch (err) {
                toast.error("Failed to load coupon data");
            }
        };
        loadData();
    }, [id, isEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (['value', 'minOrderValue', 'maxDiscount', 'usageLimit', 'perUserLimit'].includes(name)) {
            if (value !== '' && Number(value) < 0) return;
        }
        setFormData(prev => ({
            ...prev,
            [name]: name === 'code'
                ? String(value).toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                : (type === 'checkbox' ? checked : value)
        }));
    };

    const toggleTargetItem = (itemValue) => {
        setFormData(prev => {
            const current = prev.targetItems || [];
            if (current.includes(itemValue)) {
                return { ...prev, targetItems: current.filter(i => i !== itemValue) };
            } else {
                return { ...prev, targetItems: [...current, itemValue] };
            }
        });
    };

    const validateForm = () => {
        const nextErrors = {};
        if (!formData.code.trim()) nextErrors.code = 'Coupon code is required';
        if (!formData.validFrom) nextErrors.validFrom = 'Start date is required';
        if (!formData.validUntil) nextErrors.validUntil = 'Expiry date is required';
        if (formData.validFrom && formData.validUntil && new Date(formData.validUntil) <= new Date(formData.validFrom)) {
            nextErrors.validUntil = 'Expiry must be after the start date';
        }
        if (formData.type !== 'free_shipping' && (formData.value === '' || Number(formData.value) <= 0)) {
            nextErrors.value = 'Discount value must be greater than 0';
        }
        if (formData.type === 'percentage' && Number(formData.value) > 100) {
            nextErrors.value = 'Percentage discount cannot exceed 100';
        }
        if (Number(formData.value || 0) < 0) {
            nextErrors.value = 'Discount value cannot be negative';
        }
        if (Number(formData.minOrderValue || 0) < 0) {
            nextErrors.minOrderValue = 'Minimum order cannot be negative';
        }
        if (formData.type === 'percentage' && formData.maxDiscount !== '' && Number(formData.maxDiscount) < 0) {
            nextErrors.maxDiscount = 'Max discount cannot be negative';
        }
        if (formData.usageLimit !== '' && Number(formData.usageLimit) < 1) {
            nextErrors.usageLimit = 'Usage limit must be at least 1';
        }
        if (formData.usageLimit !== '' && Number(formData.usageLimit) < 0) {
            nextErrors.usageLimit = 'Total limit cannot be negative';
        }
        if (Number(formData.perUserLimit || 0) < 1) {
            nextErrors.perUserLimit = 'Per-user limit must be at least 1';
        }
        if (Number(formData.perUserLimit || 0) < 0) {
            nextErrors.perUserLimit = 'User limit cannot be negative';
        }
        if (formData.userEligibility !== 'new' && formData.applicabilityType === 'category' && formData.targetItems.length === 0) {
            nextErrors.targetItems = 'Select at least one category';
        }
        if (formData.userEligibility !== 'new' && formData.applicabilityType === 'product' && formData.targetItems.length === 0) {
            nextErrors.targetItems = 'Select at least one product';
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error('Please fix the highlighted coupon fields');
            return;
        }

        // Map targetItems to specific backend fields
        const payload = {
            code: formData.code.toUpperCase(),
            type: formData.type,
            value: formData.type === 'free_shipping' ? 0 : Number(formData.value),
            minOrderValue: Number(formData.minOrderValue) || 0,
            maxDiscount: formData.type === 'percentage' ? (Number(formData.maxDiscount) || null) : null,
            validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
            validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
            usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
            perUserLimit: Number(formData.perUserLimit) || 1,
            active: formData.active,
            userEligibility: formData.userEligibility,
            description: formData.description,
            applicabilityType: formData.applicabilityType,
            // Map targetItems based on applicabilityType
            applicableCategories: formData.applicabilityType === 'category' ? formData.targetItems : [],
            applicableProducts: formData.applicabilityType === 'product' ? formData.targetItems : []
        };

        try {
            const result = isEdit
                ? await adminService.updateCoupon(id, payload)
                : await adminService.createCoupon(payload);
            if (result?.success === false) {
                toast.error(result?.message || "Failed to save coupon");
                return;
            }
            toast.success(isEdit ? "Coupon updated" : "Coupon created");
            navigate('/admin/coupons');
        } catch (err) {
            toast.error("Failed to save coupon");
        }
    };

    const handleSaveAction = {
        label: isEdit ? 'Update Coupon' : 'Deploy Coupon',
        icon: <Save size={16} />,
        onClick: handleSave
    };

    return (
        <div className="space-y-10 pb-20 text-left animate-in fade-in duration-500">
            <PageHeader
                title={isEdit ? 'Configure Coupon' : 'New Promo Campaign'}
                subtitle={isEdit ? `Modifying settings for ${formData.code}` : 'Design a new high-conversion discount code'}
                backPath="/admin/coupons"
                action={handleSaveAction}
            />

            <form className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Core Logic */}
                <div className="lg:col-span-8 space-y-6">
                    {/* 1. Core Settings */}
                    <FormSection title="Core Settings" icon={<Info size={18} className="text-gray-400" />}>
                        <div className="space-y-5">
                            <div className="flex flex-col gap-1.5">
                                <Input
                                    label="Promotional Code"
                                    helperText="The unique code customers type at checkout to get the discount."
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    error={errors.code}
                                    placeholder="e.g., WELCOME50"
                                />
                                <div className="text-right">
                                    <button
                                        type="button"
                                        className="text-xs font-semibold text-[#3E2723] hover:underline"
                                        onClick={() => setFormData({ ...formData, code: `SALE${Math.floor(Math.random() * 900) + 100}` })}
                                    >
                                        Auto-Generate
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Select
                                    label="Discount Type"
                                    helperText="Select flat discount, percentage-based discount, or free shipping."
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'flat', label: 'Flat Amount (INR)' },
                                        { value: 'percentage', label: 'Percentage (%)' },
                                        { value: 'free_shipping', label: 'Free Shipping' }
                                    ]}
                                />
                                <Input
                                    label="Discount Value"
                                    helperText="Enter the discount size (e.g., 500 for flat ₹500 discount, or 10 for 10% percentage)."
                                    type="number"
                                    name="value"
                                    value={formData.value}
                                    onChange={handleChange}
                                    error={errors.value}
                                    disabled={formData.type === 'free_shipping'}
                                    placeholder={formData.type === 'percentage' ? 'e.g., 20' : 'e.g., 500'}
                                    min={0}
                                />
                            </div>

                            <TextArea
                                    label="Campaign Description"
                                    helperText="Describe this coupon campaign. This is shown to customers."
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Explain the offer to customers..."
                            />
                        </div>
                    </FormSection>

                    {/* 2. Coupon Scope (Unified) */}
                    <FormSection title="Coupon Scope" icon={<ShieldCheck size={18} className="text-gray-400" />}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs text-gray-500">Define where this coupon applies.</span>
                            {formData.targetItems.length > 0 && (
                                <span className="text-[10px] font-bold text-white bg-[#3E2723] px-2 py-1 rounded">
                                    {formData.targetItems.length} items selected
                                </span>
                            )}
                        </div>

                        <div className="space-y-6">
                            {/* Scope Tabs */}
                            <div className="flex p-1 bg-gray-100 rounded-lg space-x-1 overflow-x-auto">
                                {[
                                    { id: 'all', label: 'All Orders' },
                                    { id: 'new_user', label: 'New Users' },
                                    { id: 'category', label: 'Category' },
                                    { id: 'product', label: 'Product' }
                                ].map(scope => {
                                    const isActive = (scope.id === 'new_user' && formData.userEligibility === 'new') ||
                                        (scope.id !== 'new_user' && formData.applicabilityType === scope.id && formData.userEligibility !== 'new');

                                    return (
                                        <button
                                            key={scope.id}
                                            type="button"
                                            onClick={() => {
                                                if (scope.id === 'new_user') {
                                                    setFormData({ ...formData, applicabilityType: 'all', userEligibility: 'new', targetItems: [] });
                                                } else {
                                                    setFormData({ ...formData, applicabilityType: scope.id, userEligibility: 'all', targetItems: [] });
                                                }
                                            }}
                                            className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${isActive
                                                ? 'bg-white text-[#3E2723] shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {scope.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Scope Content */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden min-h-[150px] max-h-[400px] overflow-y-auto p-4 bg-gray-50">
                                {formData.userEligibility === 'new' && (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-2">
                                        <div className="w-12 h-12 bg-[#3E2723]/10 rounded-full flex items-center justify-center text-[#3E2723] mb-2">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <p className="text-sm font-bold text-gray-800">New Users Only</p>
                                        <p className="text-xs text-gray-500 max-w-xs">This coupon will only work for customers placing their first order.</p>
                                    </div>
                                )}

                                {formData.applicabilityType === 'all' && formData.userEligibility !== 'new' && (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-2">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <p className="text-sm font-bold text-gray-800">Entire Order</p>
                                        <p className="text-xs text-gray-500 max-w-xs">This coupon applies to the total cart value for all users.</p>
                                    </div>
                                )}

                                {formData.applicabilityType === 'category' && formData.userEligibility !== 'new' && (
                                    <div className="space-y-2">
                                        {ALL_CATEGORIES.map(cat => {
                                            const catId = cat._id || cat.id;
                                            return (
                                                <label key={catId} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-[#3E2723]/30 transition-all">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.targetItems.includes(catId) ? 'bg-[#3E2723] border-[#3E2723]' : 'border-gray-300'}`}>
                                                        {formData.targetItems.includes(catId) && <CheckCircle2 size={12} className="text-white" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={formData.targetItems.includes(catId)}
                                                        onChange={() => toggleTargetItem(catId)}
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {formData.applicabilityType === 'product' && formData.userEligibility !== 'new' && (
                                    <div className="space-y-2">
                                        {(products || []).length > 0 ? (products || []).map(p => (
                                            <label key={p.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-[#3E2723]/30 transition-all">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${formData.targetItems.includes(p.id) ? 'bg-[#3E2723] border-[#3E2723]' : 'border-gray-300'}`}>
                                                    {formData.targetItems.includes(p.id) && <CheckCircle2 size={12} className="text-white" />}
                                                </div>
                                                <img src={p.image} className="w-8 h-8 object-contain mix-blend-multiply" alt="" />
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={formData.targetItems.includes(p.id)}
                                                    onChange={() => toggleTargetItem(p.id)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold text-gray-800 truncate">{p.name}</div>
                                                    <div className="text-[10px] text-gray-500">{p.id} - {p.category}</div>
                                                </div>
                                            </label>
                                        )) : (
                                            <div className="text-center p-4 text-sm text-gray-400">No products found.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {errors.targetItems && (
                                <p className="text-[10px] text-red-500 font-bold">{errors.targetItems}</p>
                            )}
                        </div>
                    </FormSection>
                </div>

                {/* Right: Validity & Targets */}
                <div className="lg:col-span-4 space-y-6">
                    <FormSection title="Validity Period" icon={<Calendar size={18} className="text-gray-400" />}>
                        <div className="space-y-4">
                            <Input
                                label="Start Date"
                                helperText="The date when this coupon goes active."
                                type="date"
                                name="validFrom"
                                value={formData.validFrom}
                                onChange={handleChange}
                                error={errors.validFrom}
                            />
                            <Input
                                label="Expiry Date"
                                helperText="The date when this coupon expires."
                                type="date"
                                name="validUntil"
                                value={formData.validUntil}
                                onChange={handleChange}
                                error={errors.validUntil}
                                min={formData.validFrom || new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </FormSection>

                    {/* Usage Restraints */}
                    <FormSection title="Limits & Caps" icon={<Settings size={18} className="text-gray-400" />}>
                        <div className="space-y-4">
                            <Input
                                label="Min Order (INR)"
                                helperText="Minimum purchase value of applicable items required to use this coupon."
                                type="number"
                                name="minOrderValue"
                                value={formData.minOrderValue}
                                onChange={handleChange}
                                error={errors.minOrderValue}
                                min={0}
                            />
                            <Input
                                label="Max Discount (INR)"
                                helperText="Max discount cap (only applies to Percentage type)."
                                type="number"
                                name="maxDiscount"
                                value={formData.maxDiscount}
                                onChange={handleChange}
                                error={errors.maxDiscount}
                                disabled={formData.type !== 'percentage'}
                                min={0}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Total Limit"
                                    helperText="Max overall coupon usages site-wide."
                                    type="number"
                                    name="usageLimit"
                                    value={formData.usageLimit}
                                    onChange={handleChange}
                                    error={errors.usageLimit}
                                    min={0}
                                />
                                <Input
                                    label="User Limit"
                                    helperText="Max coupon usages per customer."
                                    type="number"
                                    name="perUserLimit"
                                    value={formData.perUserLimit}
                                    onChange={handleChange}
                                    error={errors.perUserLimit}
                                    min={0}
                                />
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 my-6"></div>

                        <div className="flex items-center justify-between p-1">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Coupon Active</span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, active: !formData.active })}
                                className={`w-11 h-6 rounded-full transition-all relative ${formData.active ? 'bg-[#3E2723]' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.active ? 'right-1' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </FormSection>
                </div>
            </form>
        </div>
    );
};

export default CouponFormPage;
