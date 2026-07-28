import React, { useEffect, useMemo, useState } from 'react';
import { Save, Coins, RefreshCcw } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { adminService } from '../services/adminService';
import toast from 'react-hot-toast';

const INITIAL_RATES = {
  gold10g: {
    k14: 0,
    k18: 0,
    k22: 0,
    k24: 0
  },
  silver10g: {
    sterling925: 0,
    silverOther: 0
  }
};

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

const normalizeRatesFromApi = (rates = {}) => ({
  gold10g: {
    k14: Number(rates.gold10g?.k14) || 0,
    k18: Number(rates.gold10g?.k18) || 0,
    k22: Number(rates.gold10g?.k22) || 0,
    k24: Number(rates.gold10g?.k24) || 0
  },
  silver10g: {
    sterling925: Number(rates.silver10g?.sterling925) || 0,
    silverOther: Number(rates.silver10g?.silverOther) || 0
  }
});

const toPerGram = (value) => (Number(value || 0) / 10);
const toPerMilligram = (value) => toPerGram(value) / 1000;

const MetalPricing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [metalRates, setMetalRates] = useState(INITIAL_RATES);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await adminService.getMetalPricing();
      setMetalRates(normalizeRatesFromApi(res.metalRates || {}));
      setProductCount(Number(res.adminProductCount) || 0);
      setUpdatedAt(res.updatedAt || null);
      setLoading(false);
    };
    load();
  }, []);

  const updateRate = (section, field, value) => {
    const numericValue = value === '' ? '' : Number(value);
    setMetalRates((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: numericValue
      }
    }));
  };

  const handleSave = async () => {
    const allRates = [
      ...Object.values(metalRates.gold10g || {}),
      ...Object.values(metalRates.silver10g || {})
    ];
    if (allRates.some((value) => Number(value) < 0)) {
      toast.error('Metal rates cannot be negative');
      return;
    }

    setSaving(true);
    const payload = {
      metalRates: {
        gold10g: {
          k14: Number(metalRates.gold10g?.k14) || 0,
          k18: Number(metalRates.gold10g?.k18) || 0,
          k22: Number(metalRates.gold10g?.k22) || 0,
          k24: Number(metalRates.gold10g?.k24) || 0
        },
        silver10g: {
          sterling925: Number(metalRates.silver10g?.sterling925) || 0,
          silverOther: Number(metalRates.silver10g?.silverOther) || 0
        }
      }
    };

    const res = await adminService.updateMetalPricing(payload);
    if (res.success) {
      toast.success('Metal pricing updated');
      const refresh = await adminService.getMetalPricing();
      setMetalRates(normalizeRatesFromApi(refresh.metalRates || {}));
      setProductCount(Number(refresh.adminProductCount) || 0);
      setUpdatedAt(refresh.updatedAt || null);
    } else {
      toast.error(res.message || 'Failed to update metal pricing');
    }
    setSaving(false);
  };

  const cards = useMemo(() => ([
    {
      title: 'Admin-Owned Products',
      value: productCount,
      note: 'Only these products are repriced when admin metal rates change.',
      icon: Coins
    },
    {
      title: 'Last Updated',
      value: updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Not set',
      note: 'The latest time admin metal rates were saved.',
      icon: RefreshCcw
    }
  ]), [productCount, updatedAt]);

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 pb-20">
      <PageHeader title="Metal Pricing" subtitle="Update admin gold and silver rates for admin-owned products only" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium  tracking-wide text-gray-400">{card.title}</p>
              <card.icon className="w-5 h-5 text-[#3E2723]" />
            </div>
            <p className="text-3xl font-medium text-gray-900 mt-3">{card.value}</p>
            <p className="text-sm text-gray-500 mt-2">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-6">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
          Set admin metal pricing per 10 grams. These rates apply only to admin-owned products. Seller products continue using seller-specific metal rates from the seller module. Global GST is managed separately in Tax Settings, and final product prices still include making charge, hidden charge, GST, and optional payment gateway charge based on each product configuration.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-800  tracking-wide">Gold Rates (Per 10g)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400  tracking-wide">14 Karat</label>
                <input
                  type="number"
                  value={metalRates.gold10g?.k14}
                  onChange={(e) => updateRate('gold10g', 'k14', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-[11px] text-gray-500">Per gram: {formatCurrency(toPerGram(metalRates.gold10g?.k14))}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400  tracking-wide">18 Karat</label>
                <input
                  type="number"
                  value={metalRates.gold10g?.k18}
                  onChange={(e) => updateRate('gold10g', 'k18', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-[11px] text-gray-500">Per gram: {formatCurrency(toPerGram(metalRates.gold10g?.k18))}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400  tracking-wide">22 Karat</label>
                <input
                  type="number"
                  value={metalRates.gold10g?.k22}
                  onChange={(e) => updateRate('gold10g', 'k22', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-[11px] text-gray-500">Per gram: {formatCurrency(toPerGram(metalRates.gold10g?.k22))}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400  tracking-wide">24 Karat</label>
                <input
                  type="number"
                  value={metalRates.gold10g?.k24}
                  onChange={(e) => updateRate('gold10g', 'k24', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-[11px] text-gray-500">Per gram: {formatCurrency(toPerGram(metalRates.gold10g?.k24))}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-800  tracking-wide">Silver Rates (Per 10g)</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400  tracking-wide">925 Sterling Silver</label>
                <input
                  type="number"
                  value={metalRates.silver10g?.sterling925}
                  onChange={(e) => updateRate('silver10g', 'sterling925', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-[11px] text-gray-500">Per gram: {formatCurrency(toPerGram(metalRates.silver10g?.sterling925))}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400  tracking-wide">Silver (All Other)</label>
                <input
                  type="number"
                  value={metalRates.silver10g?.silverOther}
                  onChange={(e) => updateRate('silver10g', 'silverOther', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-[11px] text-gray-500">Per gram: {formatCurrency(toPerGram(metalRates.silver10g?.silverOther))}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600">
          Per milligram values are derived automatically from the per-10g rates: for example, 10g / 10 / 1000.
          Current example: 18K per milligram is {formatCurrency(toPerMilligram(metalRates.gold10g?.k18))}.
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full md:w-auto px-6 py-2 rounded-xl bg-[#3E2723] text-white text-xs font-medium  tracking-wide flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Metal Pricing'}
        </button>
      </div>
    </div>
  );
};

export default MetalPricing;

