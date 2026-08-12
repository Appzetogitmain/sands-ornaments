import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { sellerOrderService } from '../services/sellerOrderService';

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

const addressLines = (address = {}) => [
    address.flatNo || address.address,
    address.area,
    address.city,
    address.district,
    address.state,
    address.pincode,
].filter(Boolean);

const SellerInvoice = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let isCurrent = true;

        const loadInvoice = async () => {
            setLoading(true);
            setLoadError('');
            try {
                let data;
                try {
                    data = await sellerOrderService.getSellerInvoice(id);
                } catch (err) {
                    if (err.response?.status !== 404) throw err;
                    data = await sellerOrderService.issueSellerInvoice(id);
                }
                if (isCurrent) setInvoice(data);
            } catch (err) {
                const message = err.response?.data?.message || 'Unable to prepare this seller invoice.';
                if (isCurrent) setLoadError(message);
                toast.error(message);
            } finally {
                if (isCurrent) setLoading(false);
            }
        };

        loadInvoice();
        return () => { isCurrent = false; };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[50vh] grid place-items-center text-gray-500">
                <div className="flex items-center gap-3 text-sm font-bold"><Loader2 className="animate-spin" /> Preparing seller invoice…</div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="max-w-2xl mx-auto rounded-2xl border border-red-100 bg-white p-8 text-center space-y-5">
                <FileText className="mx-auto text-red-400" size={40} />
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Invoice unavailable</h1>
                    <p className="mt-2 text-sm text-gray-500">{loadError || 'This invoice could not be loaded.'}</p>
                </div>
                <button onClick={() => navigate(`/seller/order-details/${id}`)} className="px-5 py-2.5 rounded-xl bg-[#3E2723] text-white text-sm font-bold">
                    Back to order
                </button>
            </div>
        );
    }

    const sellerAddress = addressLines(invoice.seller?.address).join(', ');
    const customerAddress = addressLines(invoice.customer?.address).join(', ');

    return (
        <>
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #seller-invoice, #seller-invoice * { visibility: visible !important; }
                    #seller-invoice { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none !important; border: 0 !important; }
                    .invoice-no-print { display: none !important; }
                    #seller-invoice .invoice-table-wrap { overflow: visible !important; }
                    #seller-invoice .invoice-items-table { min-width: 0 !important; table-layout: fixed; }
                    #seller-invoice .invoice-items-table th,
                    #seller-invoice .invoice-items-table td { overflow-wrap: anywhere; word-break: break-word; }
                    @page { size: A4; margin: 14mm; }
                }
            `}</style>

            <div className="invoice-no-print flex flex-wrap items-center justify-between gap-3 mb-6">
                <button onClick={() => navigate(`/seller/order-details/${id}`)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50">
                    <ArrowLeft size={16} /> Back to order
                </button>
                <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3E2723] text-white text-sm font-bold hover:bg-[#2D1B18]">
                    <Printer size={16} /> Print / Save PDF
                </button>
            </div>

            <article id="seller-invoice" className="max-w-4xl mx-auto bg-white border border-gray-200 shadow-sm rounded-2xl p-6 sm:p-10 text-gray-900">
                <header className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-gray-200">
                    <div>
                        <p className="text-xs font-bold tracking-[0.2em] text-[#8D6E63] uppercase">Sands Jewels Marketplace</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight">Seller Invoice</h1>
                        <p className="mt-1 text-sm text-gray-500">Commercial invoice for the seller-owned items in this marketplace order.</p>
                    </div>
                    <div className="sm:text-right text-sm">
                        <p className="font-mono font-bold text-[#3E2723]">{invoice.invoiceNumber}</p>
                        <p className="mt-1 text-gray-500">Issued {new Date(invoice.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className="mt-1 text-gray-500">Order #{invoice.order?.orderNumber}</p>
                    </div>
                </header>

                <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-7 text-sm">
                    <div>
                        <h2 className="text-xs font-bold tracking-wider uppercase text-gray-500">Sold by</h2>
                        <p className="mt-2 font-bold text-base">{invoice.seller?.shopName}</p>
                        {invoice.seller?.contactName && <p>{invoice.seller.contactName}</p>}
                        {sellerAddress && <p className="mt-1 text-gray-600">{sellerAddress}</p>}
                        {invoice.seller?.gstNumber && <p className="mt-2">GSTIN: <span className="font-medium">{invoice.seller.gstNumber}</span></p>}
                        {invoice.seller?.email && <p className="text-gray-600">{invoice.seller.email}</p>}
                        {invoice.seller?.phone && <p className="text-gray-600">{invoice.seller.phone}</p>}
                    </div>
                    <div>
                        <h2 className="text-xs font-bold tracking-wider uppercase text-gray-500">Bill to / Ship to</h2>
                        <p className="mt-2 font-bold text-base">{invoice.customer?.name || 'Customer'}</p>
                        {customerAddress && <p className="mt-1 text-gray-600">{customerAddress}</p>}
                        {invoice.customer?.email && <p className="mt-2 text-gray-600">{invoice.customer.email}</p>}
                        {invoice.customer?.phone && <p className="text-gray-600">{invoice.customer.phone}</p>}
                    </div>
                </section>

                <section className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="invoice-table-wrap">
                        <table className="invoice-items-table w-full table-fixed text-sm">
                            <thead className="bg-[#FDFBF7] text-xs uppercase tracking-wider text-gray-500">
                                <tr>
                                    <th className="w-[32%] px-3 sm:px-4 py-3 text-left">Item</th>
                                    <th className="w-[26%] px-3 sm:px-4 py-3 text-left">SKU</th>
                                    <th className="w-[10%] px-2 sm:px-4 py-3 text-right">Qty</th>
                                    <th className="w-[16%] px-2 sm:px-4 py-3 text-right">Rate</th>
                                    <th className="w-[16%] px-2 sm:px-4 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoice.items || []).map((item, index) => (
                                    <tr key={`${item.sku}-${index}`} className="border-t border-gray-100">
                                        <td className="px-3 sm:px-4 py-3 font-medium break-words">{item.name}{item.giftWrap && <span className="block mt-1 text-xs font-normal text-[#8D6E63]">Gift wrap included</span>}</td>
                                        <td className="px-3 sm:px-4 py-3 text-gray-500 break-all">{item.sku || '—'}</td>
                                        <td className="px-2 sm:px-4 py-3 text-right">{item.quantity}</td>
                                        <td className="px-2 sm:px-4 py-3 text-right break-words">{formatMoney(item.unitPrice)}</td>
                                        <td className="px-2 sm:px-4 py-3 text-right font-medium break-words">{formatMoney(item.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="mt-6 flex justify-end">
                    <div className="w-full sm:w-80 space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Item subtotal</span><span>{formatMoney(invoice.totals?.itemSubtotal)}</span></div>
                        {Number(invoice.totals?.giftWrapCharge || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Gift wrap</span><span>{formatMoney(invoice.totals.giftWrapCharge)}</span></div>}
                        {Number(invoice.totals?.couponDiscount || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Marketplace discount</span><span>− {formatMoney(invoice.totals.couponDiscount)}</span></div>}
                        <div className="flex justify-between border-t border-gray-300 pt-3 text-base font-bold"><span>Invoice total</span><span>{formatMoney(invoice.totals?.invoiceTotal)}</span></div>
                    </div>
                </section>

                <footer className="mt-8 border-t border-gray-200 pt-5 text-xs leading-5 text-gray-500">
                    <p>This is a computer-generated seller invoice.</p>
                </footer>
            </article>
        </>
    );
};

export default SellerInvoice;
