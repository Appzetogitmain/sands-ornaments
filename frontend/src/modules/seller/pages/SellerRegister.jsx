import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    User, Phone, Mail, Lock, Store, MapPin, Building,
    ArrowRight, AlertCircle, CheckCircle2, ShieldCheck,
    FileText, X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import loginBg from '@assets/admin-login-bg.png';

const SellerRegister = () => {
    const navigate = useNavigate();
    const { sellerRegister } = useAuth();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [termsContent, setTermsContent] = useState('');
    const [termsLoading, setTermsLoading] = useState(true);
    const [termsError, setTermsError] = useState('');
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [termsNotified, setTermsNotified] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        fullName: '',
        mobileNumber: '',
        email: '',
        password: '',
        shopName: '',
        shopAddress: '',
        city: '',
        state: ''
    });

    useEffect(() => {
        const fetchSellerTerms = async () => {
            setTermsLoading(true);
            setTermsError('');
            try {
                const res = await api.get('/public/pages/seller-terms');
                const page = res.data?.data?.page || res.data?.page || null;
                if (page?.content) {
                    setTermsContent(page.content);
                } else {
                    setTermsContent('');
                    setTermsError('Seller terms are not configured yet.');
                }
            } catch (err) {
                setTermsContent('');
                setTermsError('Unable to load seller terms right now.');
            } finally {
                setTermsLoading(false);
            }
        };

        fetchSellerTerms();
    }, []);

    useEffect(() => {
        if (termsError && !termsNotified) {
            toast.error(termsError);
            setTermsNotified(true);
        }
    }, [termsError, termsNotified]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setErrors(prev => {
            if (!name || !prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = (data) => {
        const nextErrors = {};
        const trimmedEmail = String(data.email || '').trim();
        const trimmedMobile = String(data.mobileNumber || '').trim();

        if (!data.fullName?.trim()) {
            nextErrors.fullName = 'Full name is required';
        } else if (!/^[A-Za-z\s]+$/.test(data.fullName.trim())) {
            nextErrors.fullName = 'Full name should contain only alphabets and spaces';
        }
        if (!trimmedMobile) {
            nextErrors.mobileNumber = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(trimmedMobile)) {
            nextErrors.mobileNumber = 'Enter a valid 10 digit mobile number';
        }
        if (!trimmedEmail) {
            nextErrors.email = 'Email is required';
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
            nextErrors.email = 'Enter a valid email address';
        }
        if (!data.password?.trim()) {
            nextErrors.password = 'Password is required';
        } else if (data.password.length < 6) {
            nextErrors.password = 'Password must be at least 6 characters';
        }
        if (!data.shopName?.trim()) nextErrors.shopName = 'Shop name is required';
        if (!data.shopAddress?.trim()) nextErrors.shopAddress = 'Shop address is required';
        if (!data.city?.trim()) {
            nextErrors.city = 'City is required';
        } else if (!/^[A-Za-z\s]+$/.test(data.city.trim())) {
            nextErrors.city = 'City should contain only alphabets and spaces';
        }
        if (!data.state?.trim()) {
            nextErrors.state = 'State is required';
        } else if (!/^[A-Za-z\s]+$/.test(data.state.trim())) {
            nextErrors.state = 'State should contain only alphabets and spaces';
        }

        return nextErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nextErrors = validateForm(formData);
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            const firstMessage = Object.values(nextErrors)[0];
            toast.error(firstMessage || 'Please fix the highlighted fields before submitting.');
            return;
        }

        if (!termsContent) {
            toast.error(termsError || "Seller terms are not available. Please try again later.");
            return;
        }
        if (!acceptTerms) {
            toast.error("Please accept the seller terms & conditions to continue.");
            return;
        }

        setLoading(true);
        
        try {
            const res = await sellerRegister({
                ...formData,
                acceptTerms
            });
            if (res.success) {
                setSubmitted(true);
            } else {
                const message = res.message || "Registration failed. Please check your details.";
                if (/email/i.test(message) && /exist/i.test(message)) {
                    setErrors(prev => ({ ...prev, email: message }));
                } else if (/mobile/i.test(message) && /exist/i.test(message)) {
                    setErrors(prev => ({ ...prev, mobileNumber: message }));
                }
                toast.error(message);
            }
        } catch (err) {
            const message = err.response?.data?.message || "Connection error. Please try again.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-3 px-10 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner";
    const labelClasses = "text-[9px] font-black text-[#8D6E63] uppercase tracking-widest ml-1 mb-1 block";
    const iconClasses = "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#8D6E63] transition-colors mt-[1px]";

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#FDF5F6] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 shadow-2xl text-center space-y-6 border border-white animate-in zoom-in-95 duration-500 font-sans">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Registration Successful!</h2>
                    <p className="text-gray-500 text-sm leading-relaxed font-medium">
                        Your partner account has been created. Please log in to complete your profile verification and start listing products.
                    </p>
                    <button 
                        onClick={() => navigate('/seller/login')}
                        className="w-full bg-[#3E2723] text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#3E2723]/20 hover:bg-[#2D1B18] transition-all"
                    >
                        Log In Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDF5F6] flex flex-col lg:flex-row lg:overflow-hidden font-sans">
            {/* Left: Design/Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#3E2723] items-center justify-center p-12 overflow-hidden">
                <img src={loginBg} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay scale-110" alt="bg" />
                <div className="relative z-10 max-w-lg text-center">
                    <h1 className="text-6xl font-black text-white uppercase tracking-tighter mb-6 leading-none">Strategic <br/><span className="text-[#D39A9F]">Alliance</span></h1>
                    <p className="text-gray-300 text-lg font-medium leading-relaxed">Join the most prestigious network of authentic jewellery curators. Register in seconds and verify your business to start selling.</p>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
            </div>

            {/* Right: Registration Form */}
            <div className="w-full lg:w-1/2 min-h-screen lg:h-screen flex flex-col justify-center p-6 lg:p-12 lg:overflow-hidden bg-[#FDF5F6]">
                <div className="max-w-xl w-full mx-auto flex flex-col lg:h-full min-h-0 space-y-6 justify-center">
                    <div className="flex justify-between items-center shrink-0">
                        <div>
                             <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Partner Onboarding</h2>
                             <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
                                <span className="text-[#8D6E63]">Simplified Seller Registration</span>
                             </p>
                        </div>
                        <Link to="/seller/login" className="text-[10px] font-black text-[#8D6E63] uppercase tracking-widest hover:text-[#3E2723] transition-colors border-b-2 border-[#8D6E63]/20 pb-1">Already registered?</Link>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0 justify-between">
                        <div className="flex-grow overflow-y-auto pr-2 py-1 custom-scrollbar min-h-0 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className={labelClasses}>Full Name <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <input required name="fullName" value={formData.fullName} onChange={handleChange} className={inputClasses} placeholder="Ex: Rajesh Kumar" />
                                        <User className={iconClasses} />
                                    </div>
                                    {errors.fullName && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.fullName}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClasses}>Mobile Number <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <input required name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className={inputClasses} placeholder="9876543210" />
                                        <Phone className={iconClasses} />
                                    </div>
                                    {errors.mobileNumber && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.mobileNumber}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className={labelClasses}>Email Address <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <input required type="email" name="email" value={formData.email} onChange={handleChange} className={inputClasses} placeholder="rajesh@example.com" />
                                        <Mail className={iconClasses} />
                                    </div>
                                    {errors.email && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.email}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClasses}>Password <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <input required type="password" name="password" value={formData.password} onChange={handleChange} className={inputClasses} placeholder="********" />
                                        <Lock className={iconClasses} />
                                    </div>
                                    {errors.password && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.password}</p>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className={labelClasses}>Shop Name <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <input required name="shopName" value={formData.shopName} onChange={handleChange} className={inputClasses} placeholder="Ex: Royal Gold & Diamonds" />
                                    <Store className={iconClasses} />
                                </div>
                                {errors.shopName && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.shopName}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className={labelClasses}>Shop Address <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <input required name="shopAddress" value={formData.shopAddress} onChange={handleChange} className={inputClasses} placeholder="123, Marketplace Street" />
                                    <MapPin className={iconClasses} />
                                </div>
                                {errors.shopAddress && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.shopAddress}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className={labelClasses}>City <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <input required name="city" value={formData.city} onChange={handleChange} className={inputClasses} placeholder="Mumbai" />
                                        <Building className={iconClasses} />
                                    </div>
                                    {errors.city && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.city}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClasses}>State <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <input required name="state" value={formData.state} onChange={handleChange} className={inputClasses} placeholder="Maharashtra" />
                                        <MapPin className={iconClasses} />
                                    </div>
                                    {errors.state && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.state}</p>}
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Seller Terms & Conditions</h3>
                                {termsLoading ? (
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading terms...</div>
                                ) : termsContent ? (
                                    <div className="text-[10px] text-gray-500 font-semibold">
                                        Please review our{' '}
                                        <button
                                            type="button"
                                            onClick={() => setShowTermsModal(true)}
                                            className="text-[#3E2723] font-black underline underline-offset-4 hover:text-[#2D1B18] transition-colors"
                                        >
                                            Seller Terms & Conditions
                                        </button>
                                        .
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-bold text-red-500">{termsError || 'Seller terms are unavailable.'}</div>
                                )}
                                <label className="flex items-start gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#3E2723] focus:ring-[#3E2723]"
                                        checked={acceptTerms}
                                        onChange={(e) => setAcceptTerms(e.target.checked)}
                                        disabled={!termsContent}
                                        required
                                    />
                                    <span>I agree to the seller terms & conditions.</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 mt-2 border-t border-gray-100 shrink-0">
                            <button type="submit" disabled={loading || !termsContent || !acceptTerms} className="w-full bg-[#3E2723] text-white py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-[#3E2723]/20 hover:bg-[#2D1B18] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Register Onboarding
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            {showTermsModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[#3E2723]">Seller Terms & Conditions</h3>
                            <button
                                type="button"
                                onClick={() => setShowTermsModal(false)}
                                className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-[#3E2723]"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto text-sm text-gray-600 leading-relaxed">
                            <div dangerouslySetInnerHTML={{ __html: termsContent }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerRegister;