import React, { useEffect, useMemo, useState } from 'react';
import { Save, Percent, RefreshCcw, Package } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { adminService } from '../services/adminService';
import toast from 'react-hot-toast';

const TaxSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gstRate, setGstRate] = useState(0);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await adminService.getTaxSettings();
      setGstRate(Number(res.gstRate) || 0);
      setTotalProductCount(Number(res.totalProductCount) || 0);
      setUpdatedAt(res.updatedAt || null);
      setLoading(false);
    };
    load();
  }, []);

  const cards = useMemo(() => ([
    {
      title: 'Global GST Percentage',
      value: `${Number(gstRate || 0).toLocaleString()}%`,
      note: 'Applied to the subtotal of metal, making, and diamond price.',
      icon: Percent
    },
    {
      title: 'Products Impacted',
      value: totalProductCount,
      note: 'Every admin and seller product is repriced when GST changes.',
      icon: Package
    },
    {
      title: 'Last Updated',
      value: updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Not set',
      note: 'The latest time global tax settings were saved.',
      icon: RefreshCcw
    }
  ]), [gstRate, totalProductCount, updatedAt]);

  const handleSave = async () => {
    if (Number(gstRate) < 0) {
      toast.error('GST percentage cannot be negative');
      return;
    }
    if (Number(gstRate) > 100) {
      toast.error('GST percentage cannot be greater than 100');
      return;
    }

    setSaving(true);
    const payload = { gstRate: Number(gstRate) || 0 };
    const res = await adminService.updateTaxSettings(payload);

    if (res.success) {
      toast.success('Tax settings updated');
      const refresh = await adminService.getTaxSettings();
      setGstRate(Number(refresh.gstRate) || payload.gstRate);
      setTotalProductCount(Number(refresh.totalProductCount) || 0);
      setUpdatedAt(refresh.updatedAt || null);
    } else {
      toast.error(res.message || 'Failed to update tax settings');
    }

    setSaving(false);
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 pb-20">
      <PageHeader title="Tax Settings" subtitle="Manage the global GST percentage applied across the full catalogue" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium tracking-wide text-gray-400">{card.title}</p>
              <card.icon className="w-5 h-5 text-[#3E2723]" />
            </div>
            <p className="text-3xl font-medium text-gray-900 mt-3">{card.value}</p>
            <p className="text-sm text-gray-500 mt-2">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-6">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
          GST is managed only by admin. When this percentage changes, the system recalculates every product using:
          Metal Price + Making Charge + Hidden Charge, then applies GST on that subtotal. Hidden Charge includes hallmarking and diamond certificate charges. If a product is configured to pass payment gateway charges to the user, that extra 2% is added after GST.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-800 tracking-wide">Global GST</h3>
            <div className="space-y-3">
              <label className="text-[10px] font-medium text-gray-400 tracking-wide">GST Percentage</label>
              <input
                type="number"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3E2723]/40"
                placeholder="0"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Example: if subtotal before GST is Rs 1000 and GST is 3%, the GST amount becomes Rs 30 and the price after GST becomes Rs 1030. Any user-borne payment gateway charge is added after that.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full md:w-auto px-6 py-2 rounded-xl bg-[#3E2723] text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Tax Settings'}
        </button>
      </div>
    </div>
  );
};

export default TaxSettings;
