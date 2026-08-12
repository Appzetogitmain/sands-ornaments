import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeIndianRupee, Hash, User, Phone, CreditCard, XCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { sellerDirectSaleService } from '../services/sellerDirectSaleService';

const SellerDirectSaleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [sale, setSale] = useState(null);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await sellerDirectSaleService.detail(id);
        if (!res?.success) throw new Error(res?.message || 'Failed to load');
        setSale(res.data?.directSale || res.directSale);
      } catch (err) {
        toast.error(err?.message || 'Failed to load direct sale');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading && !sale) {
    return <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Loading...</div>;
  }

  if (!sale) {
    return <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Not found</div>;
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #direct-sale-receipt, #direct-sale-receipt * { visibility: visible !important; }
          #direct-sale-receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none !important; border: 0 !important; }
          .direct-sale-no-print { display: none !important; }
          .direct-sale-print-title { display: block !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>
      <div id="direct-sale-receipt" className="space-y-8 font-sans animate-in fade-in duration-500">
      <div className="direct-sale-print-title hidden pb-5 border-b border-gray-200">
        <p className="text-xs font-bold tracking-[0.2em] text-[#8D6E63] uppercase">Sands Jewels Marketplace</p>
        <h1 className="mt-2 text-2xl font-black text-gray-900 uppercase tracking-tight">Direct Sale Receipt</h1>
      </div>
      <div className="flex items-center justify-between gap-4 direct-sale-no-print">
        <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/seller/direct-sales')}
          className="p-2.5 hover:bg-white rounded-xl border border-gray-100 shadow-sm transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">DIRECT SALES RECEIPT</p>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Transaction Detail</h1>
        </div>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-[#3E2723] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-2"
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 p-1 overflow-hidden">
              {sale.productImage ? (
                <img src={sale.productImage} alt="" className="w-full h-full object-contain mix-blend-multiply" />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-lg" />
              )}
            </div>
            <div>
              <p className="text-xs font-black text-gray-900">{sale.productName}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sale.variantName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
            <p className="text-sm font-black text-emerald-600 uppercase">{sale.status}</p>
          </div>
        </div>

        {sale.status === 'completed' && (
          <div className="flex justify-end">
            <button
              onClick={async () => {
                const reason = window.prompt('Reason for void/refund? (optional)', 'Customer cancelled');
                setVoiding(true);
                try {
                  const res = await sellerDirectSaleService.voidSale(sale._id, reason || '');
                  if (!res?.success) throw new Error(res?.message || 'Failed to void');
                  toast.success('Sale voided and stock restored');
                  setSale(res.data?.directSale || res.directSale || sale);
                } catch (err) {
                  toast.error(err?.message || 'Failed to void sale');
                } finally {
                  setVoiding(false);
                }
              }}
              disabled={voiding}
              className="px-4 py-2 bg-white border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <XCircle size={14} /> {voiding ? 'Voiding...' : 'Void / Refund'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Hash size={14} /> Serial Code
            </p>
            <p className="text-sm font-black text-gray-900 font-mono">{sale.serialCode}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <BadgeIndianRupee size={14} /> Amount
            </p>
            <p className="text-sm font-black text-gray-900">₹{Number(sale.amount || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={14} /> Payment
            </p>
            <p className="text-sm font-black text-gray-900 uppercase">{sale.paymentMethod}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
            <p className="text-sm font-black text-gray-900">
              {new Date(sale.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-gray-100 space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <User size={14} /> Customer
            </p>
            <p className="text-sm font-black text-gray-900">{sale.customerName || 'Walk-in'}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-gray-100 space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Phone size={14} /> Phone
            </p>
            <p className="text-sm font-black text-gray-900">{sale.customerPhone || '-'}</p>
          </div>
        </div>

        {sale.note ? (
          <div className="p-4 rounded-xl bg-white border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Note</p>
            <p className="text-sm font-bold text-gray-800 mt-1">{sale.note}</p>
          </div>
        ) : null}
      </div>
      </div>
    </>
  );
};

export default SellerDirectSaleDetail;
