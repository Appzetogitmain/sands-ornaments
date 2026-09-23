import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    Save,
    Plus,
    Trash2,
    RefreshCcw,
    Percent,
    AlertTriangle,
    Calculator,
    CheckCircle2,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import adminCommissionService, {
    formatINR,
    formatTierLabel,
    pickTierLocal,
} from '../services/adminCommissionService';

const blankRow = { minAmount: 0, maxAmount: 0, commission: 0 };

const cloneTiers = (rows) =>
    (rows || []).map((r) => ({
        minAmount: Number(r.minAmount) || 0,
        maxAmount: r.maxAmount === null || r.maxAmount === undefined ? null : Number(r.maxAmount),
        commission: Number(r.commission) || 0,
    }));

const validateClientSide = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return 'Add at least one tier row';
    let prevMax = -1;
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const min = Number(r.minAmount);
        const max = r.maxAmount === null || r.maxAmount === '' || r.maxAmount === undefined ? null : Number(r.maxAmount);
        const com = Number(r.commission);

        if (!Number.isFinite(min) || min < 0) return `Row ${i + 1}: Min amount must be ≥ 0`;
        if (max !== null && (!Number.isFinite(max) || max < min)) return `Row ${i + 1}: Max amount must be ≥ Min`;
        if (!Number.isFinite(com) || com < 0) return `Row ${i + 1}: Commission must be ≥ 0`;
        if (i > 0 && min !== prevMax + 1) {
            return `Row ${i + 1}: Min must equal previous Max + 1 (expected ${prevMax + 1})`;
        }
        if (max === null && i !== rows.length - 1) {
            return `Row ${i + 1}: Only the last row may have an open-ended Max`;
        }
        prevMax = max === null ? Infinity : max;
    }
    return null;
};

const CommissionTiersPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [tiers, setTiers] = useState([]);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [usingDefaults, setUsingDefaults] = useState(false);
    const [previewAmount, setPreviewAmount] = useState(3500);

    const load = async () => {
        setLoading(true);
        const res = await adminCommissionService.getTiers();
        if (res?.success) {
            const data = res.data || {};
            setEnabled(data.enabled !== false);
            setTiers(cloneTiers(data.tiers));
            setUpdatedAt(data.updatedAt || null);
            setUsingDefaults(!!data.usingDefaults);
        } else {
            toast.error(res?.message || 'Failed to load commission tiers');
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const previewTier = useMemo(() => pickTierLocal(previewAmount, tiers), [previewAmount, tiers]);

    const handleRowChange = (index, key, value) => {
        const next = [...tiers];
        const row = { ...next[index] };
        if (key === 'maxAmount' && (value === '' || value === null)) {
            row.maxAmount = null;
        } else {
            row[key] = value === '' ? '' : Number(value);
        }
        next[index] = row;
        setTiers(next);
    };

    const handleAddRow = () => {
        if (tiers.length === 0) {
            setTiers([{ ...blankRow, minAmount: 1, maxAmount: 1000, commission: 50 }]);
            return;
        }
        const last = tiers[tiers.length - 1];
        const newMin = last.maxAmount === null ? Number(last.minAmount) + 1 : Number(last.maxAmount) + 1;
        const updated = [...tiers];
        // If the previous last row had maxAmount=null, give it a finite max so the new row makes sense
        if (last.maxAmount === null) {
            updated[updated.length - 1] = { ...last, maxAmount: Number(last.minAmount) };
        }
        updated.push({ minAmount: newMin, maxAmount: null, commission: 0 });
        setTiers(updated);
    };

    const handleRemoveRow = (index) => {
        if (tiers.length <= 1) {
            toast.error('At least one tier is required');
            return;
        }
        const next = tiers.filter((_, i) => i !== index);
        // Ensure the last row stays open-ended
        if (next.length > 0) {
            next[next.length - 1] = { ...next[next.length - 1], maxAmount: null };
        }
        setTiers(next);
    };

    const handleSave = async () => {
        const err = validateClientSide(tiers);
        if (err) {
            toast.error(err);
            return;
        }
        setSaving(true);
        const res = await adminCommissionService.updateTiers(cloneTiers(tiers));
        if (res?.success) {
            toast.success('Commission tiers saved');
            await load();
        } else {
            toast.error(res?.message || 'Failed to save commission tiers');
        }
        setSaving(false);
    };

    const handleRestoreDefaults = async () => {
        if (!window.confirm('Replace current tiers with the default chart values?')) return;
        setSaving(true);
        const res = await adminCommissionService.restoreDefaults();
        if (res?.success) {
            toast.success('Default tiers restored');
            await load();
        } else {
            toast.error(res?.message || 'Failed to restore defaults');
        }
        setSaving(false);
    };

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 pb-20">
            <PageHeader
                title="Commission Tiers"
                subtitle="Per-seller platform commission charged on every online order"
            />

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Status</p>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-3xl font-black mt-3 text-emerald-600">
                            Enabled
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            New orders accrue platform commission per the tiers below.
                        </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Platform Commission Active</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Tier Source</p>
                        <Percent className="w-5 h-5 text-[#3E2723]" />
                    </div>
                    <p className="text-3xl font-black text-gray-900 mt-3">
                        {usingDefaults ? 'Default' : 'Custom'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        {usingDefaults
                            ? 'Using the built-in default chart. Edit and save to customize.'
                            : `Last updated ${updatedAt ? new Date(updatedAt).toLocaleString() : '—'}.`}
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Live Preview</p>
                        <Calculator className="w-5 h-5 text-[#3E2723]" />
                    </div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3 block">If seller subtotal is</label>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-lg font-bold text-gray-500">₹</span>
                        <input
                            type="number"
                            value={previewAmount}
                            onChange={(e) => setPreviewAmount(e.target.value)}
                            min={0}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                        />
                    </div>
                    <p className="text-sm text-gray-500 mt-3">
                        {previewTier
                            ? <>Commission = <span className="font-black text-gray-900">{formatINR(previewTier.commission)}</span> ({formatTierLabel(previewTier)})</>
                            : <span className="text-gray-400">No matching tier</span>}
                    </p>
                </div>
            </div>

            {/* Tier editor */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div>
                        <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">Tier Table</h3>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
                            Per-seller, per-order, upper-inclusive boundaries
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRestoreDefaults}
                            disabled={saving || loading}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-[11px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCcw className="w-3.5 h-3.5" />
                            Restore Defaults
                        </button>
                        <button
                            onClick={handleAddRow}
                            disabled={saving || loading}
                            className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-widest hover:bg-emerald-100 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Tier
                        </button>
                    </div>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3 w-12">#</th>
                                    <th className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Min Amount (₹)</th>
                                    <th className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Max Amount (₹)</th>
                                    <th className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Commission (₹)</th>
                                    <th className="pb-3 w-16"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tiers.map((row, idx) => {
                                    const isLast = idx === tiers.length - 1;
                                    return (
                                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                                            <td className="py-3 text-sm font-bold text-gray-500">{idx + 1}</td>
                                            <td className="py-3 pr-3">
                                                <input
                                                    type="number"
                                                    value={row.minAmount}
                                                    onChange={(e) => handleRowChange(idx, 'minAmount', e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                                                />
                                            </td>
                                            <td className="py-3 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={row.maxAmount === null ? '' : row.maxAmount}
                                                        onChange={(e) => handleRowChange(idx, 'maxAmount', e.target.value)}
                                                        disabled={isLast}
                                                        placeholder={isLast ? 'Open-ended (∞)' : ''}
                                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:border-[#3E2723]/40 disabled:bg-gray-100 disabled:text-gray-400"
                                                    />
                                                    {isLast && <span className="text-xs text-gray-400 font-bold">∞</span>}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <input
                                                    type="number"
                                                    value={row.commission}
                                                    onChange={(e) => handleRowChange(idx, 'commission', e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                                                />
                                            </td>
                                            <td className="py-3 text-right">
                                                <button
                                                    onClick={() => handleRemoveRow(idx)}
                                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                                                    title="Remove row"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-amber-900 space-y-1">
                        <p>
                            Boundaries are <strong>upper-inclusive</strong>: an amount of ₹5,000 falls in the “₹1,001 – ₹5,000” row, ₹5,001 in the next row.
                        </p>
                        <p>
                            Tier rows must be <strong>contiguous</strong> (no gaps) and <strong>ascending</strong>. The last row’s max can be left empty to cover anything above it.
                        </p>
                        <p>
                            Saving here only affects <strong>new orders</strong>. Historical ledger entries keep the rates they were stamped with at creation.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col md:flex-row gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#3E2723] text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving…' : 'Save Tier Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommissionTiersPage;
