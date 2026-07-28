import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, User, CreditCard, ShieldCheck, FileText, CheckCircle, XCircle, Package, ShoppingBag, IndianRupee, Boxes } from 'lucide-react';
import { adminService } from '../services/adminService';
import toast from 'react-hot-toast';
import CommissionBreakdownCard from '../components/CommissionBreakdownCard';

const AdminSellerDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [seller, setSeller] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [recentProducts, setRecentProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSeller = async () => {
        setLoading(true);
        try {
            const data = await adminService.getSellerDetails(id);
            setSeller(data?.seller || null);
            setMetrics(data?.metrics || null);
            setRecentProducts(data?.recentProducts || []);
        } catch (err) {
            console.error("Seller load failed");
            toast.error("Failed to load seller");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeller();
    }, [id]);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const handleAction = async (status, reason = null) => {
        const response = await adminService.updateSellerStatus(id, status, reason);
        if (response?.success) {
            if (status === 'REJECTED') setShowRejectModal(false);
            toast.success(response.message || `Seller ${status.toLowerCase()}`);
            fetchSeller();
        } else {
            toast.error(response?.message || "Failed to update seller");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">Loading Seller Profile...</div>;
    if (!seller) return <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">Seller not found.</div>;

    const sectionTitleClasses = "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2";
    const infoLabelClasses = "text-[9px] font-black text-gray-400 uppercase tracking-widest";
    const infoValueClasses = "text-sm font-bold text-gray-900 mt-1 uppercase";
    const cardClasses = "bg-white rounded-2xl border border-gray-100 p-8 shadow-sm";

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/admin/sellers')}
                        className="p-2.5 hover:bg-white rounded-xl border border-gray-100 shadow-sm transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">SELLER DETAILS</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">VERIFICATION WORKFLOW - ID: {seller._id ? String(seller._id).slice(-8).toUpperCase() : ''}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={() => navigate(`/admin/products?sellerId=${seller._id}`)}
                        className="bg-white text-gray-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                        View Products
                    </button>
                    {seller.status === 'PENDING' && (
                        <>
                            <button 
                                onClick={() => setShowRejectModal(true)}
                                className="bg-red-50 text-red-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2"
                            >
                                <XCircle size={18} /> Reject
                            </button>
                            <button 
                                onClick={() => handleAction('APPROVED')}
                                className="bg-[#3E2723] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#3E2723]/20 hover:bg-[#2D1B18] transition-all flex items-center gap-2"
                            >
                                <CheckCircle size={18} /> Approve Application
                            </button>
                        </>
                    )}
                    {seller.status === 'REJECTED' && (
                        <>
                            <div className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border flex items-center gap-2 bg-red-50 text-red-600 border-red-100">
                                <XCircle size={18} />
                                Status: {seller.status}
                            </div>
                            <button 
                                onClick={() => handleAction('APPROVED')}
                                className="bg-[#3E2723] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#3E2723]/20 hover:bg-[#2D1B18] transition-all flex items-center gap-2"
                            >
                                <CheckCircle size={18} /> Approve Application
                            </button>
                        </>
                    )}
                    {seller.status === 'APPROVED' && (
                        <>
                            <div className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border flex items-center gap-2 bg-emerald-50 text-emerald-600 border-emerald-100">
                                <CheckCircle size={18} />
                                Status: {seller.status}
                            </div>
                            <button 
                                onClick={() => {
                                    setRejectReason('');
                                    setShowRejectModal(true);
                                }}
                                className="bg-red-50 text-red-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2"
                            >
                                <XCircle size={18} /> Reject / Suspend
                            </button>
                        </>
                    )}
                </div>
            </div>

            {seller.duplicateMatches && seller.duplicateMatches.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col gap-3">
                    <h3 className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-2">
                        ⚠️ Duplicate Accounts Flagged
                    </h3>
                    <p className="text-xs text-rose-700 font-medium leading-relaxed">
                        This seller account shares registration details (GST, PAN, or Bank Account) with the following registered seller(s):
                    </p>
                    <div className="space-y-2">
                        {seller.duplicateMatches.map((other, idx) => (
                            <div key={idx} className="bg-white/80 border border-rose-200/50 rounded-xl p-3 flex items-center justify-between text-xs">
                                <div>
                                    <p className="font-bold text-gray-900">{other.fullName} ({other.shopName})</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{other.email}</p>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                    {other.reasons.map((r, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">REJECT APPLICATION</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Please provide a reason for the rejection</p>
                        
                        <textarea 
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-red-200 transition-all min-h-[120px]"
                            placeholder="REASON FOR REJECTION..."
                        />
                        
                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 py-3 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleAction('REJECTED', rejectReason)}
                                disabled={!rejectReason.trim()}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {seller.status === 'REJECTED' && seller.rejectionReason && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <XCircle size={16} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">REJECTION NOTICE</h4>
                    </div>
                    <p className="text-xs font-bold text-red-900 uppercase tracking-widest leading-relaxed">"{seller.rejectionReason}"</p>
                </div>
            )}

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Products</p>
                    <div className="flex items-center justify-between">
                        <p className="text-3xl font-black text-gray-900">{metrics?.productCount || 0}</p>
                        <Package className="text-gray-300" size={24} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Inventory Units</p>
                    <div className="flex items-center justify-between">
                        <p className="text-3xl font-black text-gray-900">{metrics?.stockUnits || 0}</p>
                        <Boxes className="text-gray-300" size={24} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Orders</p>
                    <div className="flex items-center justify-between">
                        <p className="text-3xl font-black text-gray-900">{metrics?.orderCount || 0}</p>
                        <ShoppingBag className="text-gray-300" size={24} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Revenue</p>
                    <div className="flex items-center justify-between">
                        <p className="text-3xl font-black text-gray-900">{(metrics?.totalRevenue || 0).toLocaleString()}</p>
                        <IndianRupee className="text-gray-300" size={24} />
                    </div>
                </div>
            </div>

            <CommissionBreakdownCard sellerId={id} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Personal & Bank */}
                <div className="lg:col-span-1 space-y-8">
                    <div className={cardClasses}>
                        <h3 className={sectionTitleClasses}>
                            <User size={14} className="text-[#3E2723]" /> Seller Information
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <p className={infoLabelClasses}>Full Name</p>
                                <p className={infoValueClasses}>{seller.fullName}</p>
                            </div>
                            <div>
                                <p className={infoLabelClasses}>Mobile Number</p>
                                <p className={infoValueClasses}>{seller.mobileNumber}</p>
                            </div>
                            <div>
                                <p className={infoLabelClasses}>Email Address</p>
                                <p className={infoValueClasses}>{seller.email}</p>
                            </div>
                            <div>
                                <p className={infoLabelClasses}>Date of Birth</p>
                                <p className={infoValueClasses}>{seller.dob ? new Date(seller.dob).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className={cardClasses}>
                        <h3 className={sectionTitleClasses}>
                            <CreditCard size={14} className="text-[#3E2723]" /> Bank Details
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <p className={infoLabelClasses}>Bank Name</p>
                                <p className={infoValueClasses}>{seller.bankAccount?.bankName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className={infoLabelClasses}>Branch Name</p>
                                <p className={infoValueClasses}>{seller.bankAccount?.branchName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className={infoLabelClasses}>Account Number</p>
                                <p className={infoValueClasses}>{seller.bankAccount?.accountNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className={infoLabelClasses}>IFSC Code</p>
                                <p className={infoValueClasses}>{seller.bankAccount?.ifscCode || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Shop & Verification */}
                <div className="lg:col-span-2 space-y-8">
                    <div className={cardClasses}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                                <h3 className={sectionTitleClasses}>
                                    <Store size={14} className="text-[#3E2723]" /> Shop Information
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <p className={infoLabelClasses}>Shop Name</p>
                                        <p className={infoValueClasses}>{seller.shopName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className={infoLabelClasses}>Address</p>
                                        <div className="mt-1">
                                            <p className="text-sm font-bold text-gray-900 uppercase leading-relaxed">
                                                {seller.shopAddress || 'N/A'}<br />
                                                {seller.city || 'N/A'}{seller.district ? `, ${seller.district}` : ''}, {seller.state || 'N/A'}<br />
                                                PIN: {seller.pincode || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className={sectionTitleClasses}>
                                    <ShieldCheck size={14} className="text-[#3E2723]" /> Verification Details
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <p className={infoLabelClasses}>Firm Type</p>
                                        <p className={infoValueClasses}>{seller.firmType || 'N/A'}</p>
                                    </div>
                                    {seller.firmType === 'Pvt Ltd' && (
                                        <div>
                                            <p className={infoLabelClasses}>CIN (Corporate Identification Number)</p>
                                            <p className={infoValueClasses}>{seller.cin || 'N/A'}</p>
                                        </div>
                                    )}
                                    {seller.firmType === 'LLP' && (
                                        <div>
                                            <p className={infoLabelClasses}>LLPIN (LLP Identification Number)</p>
                                            <p className={infoValueClasses}>{seller.llpin || 'N/A'}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className={infoLabelClasses}>GST Number</p>
                                        <p className={infoValueClasses}>{seller.gstNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className={infoLabelClasses}>PAN Number</p>
                                        <p className={infoValueClasses}>{seller.panNumber || 'N/A'}</p>
                                    </div>
                                     <div>
                                         <p className={infoLabelClasses}>BIS Hallmark License (Gold)</p>
                                         <p className={infoValueClasses}>{seller.bisNumberGold || 'N/A'}</p>
                                     </div>
                                     <div>
                                         <p className={infoLabelClasses}>BIS Hallmark License (Silver)</p>
                                         <p className={infoValueClasses}>{seller.bisNumberSilver || 'N/A'}</p>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={cardClasses}>
                        <h3 className={sectionTitleClasses}>
                            <FileText size={14} className="text-[#3E2723]" /> Document Verification
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <p className={infoLabelClasses}>Aadhar Card</p>
                                {seller.documents?.aadharUrl ? (
                                    <a 
                                        href={seller.documents.aadharUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center group overflow-hidden relative cursor-pointer hover:bg-gray-100/50 transition-all"
                                    >
                                        <FileText size={32} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest underline decoration-dotted hover:text-[#3E2723]">View Full Document</span>
                                    </a>
                                ) : (
                                    <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center group overflow-hidden relative">
                                        <FileText size={32} className="text-gray-300" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">Not uploaded</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <p className={infoLabelClasses}>Shop License</p>
                                {seller.documents?.shopLicenseUrl ? (
                                    <a 
                                        href={seller.documents.shopLicenseUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center group overflow-hidden relative cursor-pointer hover:bg-gray-100/50 transition-all"
                                    >
                                        <ShieldCheck size={32} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest underline decoration-dotted hover:text-[#3E2723]">View Full Document</span>
                                    </a>
                                ) : (
                                    <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center group overflow-hidden relative">
                                        <ShieldCheck size={32} className="text-gray-300" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">Not uploaded</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <p className={infoLabelClasses}>Certificate</p>
                                {seller.documents?.certificateUrl ? (
                                    <a 
                                        href={seller.documents.certificateUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center group overflow-hidden relative cursor-pointer hover:bg-gray-100/50 transition-all"
                                    >
                                        <FileText size={32} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest underline decoration-dotted hover:text-[#3E2723]">View Full Document</span>
                                    </a>
                                ) : (
                                    <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center group overflow-hidden relative">
                                        <FileText size={32} className="text-gray-300" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">Not uploaded</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <p className={infoLabelClasses}>PAN Card</p>
                                {seller.documents?.panUrl ? (
                                    <a 
                                        href={seller.documents.panUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center group overflow-hidden relative cursor-pointer hover:bg-gray-100/50 transition-all"
                                    >
                                        <FileText size={32} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest underline decoration-dotted hover:text-[#3E2723]">View Full Document</span>
                                    </a>
                                ) : (
                                    <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center group overflow-hidden relative">
                                        <FileText size={32} className="text-gray-300" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">Not uploaded</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <p className={infoLabelClasses}>GST Certificate</p>
                                {seller.documents?.gstUrl ? (
                                    <a 
                                        href={seller.documents.gstUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center group overflow-hidden relative cursor-pointer hover:bg-gray-100/50 transition-all"
                                    >
                                        <FileText size={32} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest underline decoration-dotted hover:text-[#3E2723]">View Full Document</span>
                                    </a>
                                ) : (
                                    <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center group overflow-hidden relative">
                                        <FileText size={32} className="text-gray-300" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">Not uploaded</span>
                                    </div>
                                )}
                            </div>
                            {seller.firmType === 'Partnership' && (
                                <div className="space-y-3">
                                    <p className={infoLabelClasses}>Partnership Deed</p>
                                    {seller.documents?.partnershipDeedUrl ? (
                                        <a 
                                            href={seller.documents.partnershipDeedUrl} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center group overflow-hidden relative cursor-pointer hover:bg-gray-100/50 transition-all"
                                        >
                                            <FileText size={32} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                            <span className="absolute bottom-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest underline decoration-dotted hover:text-[#3E2723]">View Full Document</span>
                                        </a>
                                    ) : (
                                        <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center group overflow-hidden relative">
                                            <FileText size={32} className="text-gray-300" />
                                            <span className="absolute bottom-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">Not uploaded</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="space-y-3">
                                <p className={infoLabelClasses}>Visiting Card</p>
                                {seller.documents?.visitingCardUrl ? (
                                    <a 
                                        href={seller.documents.visitingCardUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center group overflow-hidden relative cursor-pointer hover:bg-gray-100/50 transition-all"
                                    >
                                        <FileText size={32} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest underline decoration-dotted hover:text-[#3E2723]">View Full Document</span>
                                    </a>
                                ) : (
                                    <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center group overflow-hidden relative">
                                        <FileText size={32} className="text-gray-300" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">Not uploaded</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <p className={infoLabelClasses}>Diamond Certificate</p>
                                {seller.documents?.diamondCertificateUrl ? (
                                    <a 
                                        href={seller.documents.diamondCertificateUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center group overflow-hidden relative cursor-pointer hover:bg-gray-100/50 transition-all"
                                    >
                                        <FileText size={32} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest underline decoration-dotted hover:text-[#3E2723]">View Full Document</span>
                                    </a>
                                ) : (
                                    <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center group overflow-hidden relative">
                                        <FileText size={32} className="text-gray-300" />
                                        <span className="absolute bottom-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">Not uploaded</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={cardClasses}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className={sectionTitleClasses}>
                        <Package size={14} className="text-[#3E2723]" /> Recent Seller Products
                    </h3>
                    <button
                        onClick={() => navigate(`/admin/products?sellerId=${seller._id}`)}
                        className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                    >
                        View All Seller Products
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#F8FAFC] border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                                <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Variants</th>
                                <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Stock</th>
                                <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-10 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                        No seller products yet
                                    </td>
                                </tr>
                            ) : recentProducts.map((product) => {
                                const totalStock = (product.variants || []).reduce((sum, variant) => sum + (variant.stock || 0), 0);
                                return (
                                    <tr key={product._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-100 p-1 flex-shrink-0">
                                                    {product.images?.[0] ? (
                                                        <img src={product.images[0]} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                                                    ) : (
                                                        <Package size={16} className="text-gray-300 m-auto" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{product.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        Added {new Date(product.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                            {product.categories?.[0]?.name || 'Uncategorized'}
                                        </td>
                                        <td className="px-4 py-4 text-center text-xs font-black text-gray-700">{product.variants?.length || 0}</td>
                                        <td className="px-4 py-4 text-center text-xs font-black text-gray-700">{totalStock}</td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                                                product.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                                            }`}>
                                                {product.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminSellerDetails;
