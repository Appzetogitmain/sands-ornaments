import React, { useState, useEffect, Suspense } from 'react';
import { useShop } from '../../../context/ShopContext';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProfileSidebar from '../components/Profile/ProfileSidebar';
import DeleteModal from '../../shared/components/DeleteModal';
import { useResetScroll } from '../../../hooks/useResetScroll';

const ProfileDetailsTab = React.lazy(() => import('../components/Profile/ProfileDetailsTab'));
const OrdersTab = React.lazy(() => import('../components/Profile/OrdersTab'));
const AddressesTab = React.lazy(() => import('../components/Profile/AddressesTab'));
const PaymentsTab = React.lazy(() => import('../components/Profile/PaymentsTab'));
const CouponsTab = React.lazy(() => import('../components/Profile/CouponsTab'));
const GiftCardsTab = React.lazy(() => import('../components/Profile/GiftCardsTab'));

const EMPTY_ADDRESS = {
    name: '',
    phone: '',
    flatNo: '',
    area: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    type: 'Home',
    isDefault: false
};

const normalizeAddressPayload = (address) => ({
    name: String(address.name || '').trim(),
    phone: String(address.phone || '').replace(/\D/g, '').slice(-10),
    flatNo: String(address.flatNo || '').trim(),
    area: String(address.area || '').trim(),
    city: String(address.city || '').trim(),
    district: String(address.district || '').trim(),
    state: String(address.state || '').trim(),
    pincode: String(address.pincode || '').replace(/\D/g, ''),
    type: String(address.type || 'Home').trim() || 'Home',
    isDefault: Boolean(address.isDefault)
});

const Profile = () => {
    useResetScroll();
    const {
        user, updateProfile, logout, orders, wishlist, addresses,
        addAddress, removeAddress, setDefaultAddress, defaultAddressId,
        deleteAccount, notificationsEnabled, toggleNotificationSettings, coupons,
        replacements
    } = useShop();

    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeWishlist = Array.isArray(wishlist) ? wishlist : [];
    const safeAddresses = Array.isArray(addresses) ? addresses : [];
    const safeReplacements = Array.isArray(replacements) ? replacements : [];
    const availableCoupons = Array.isArray(coupons) ? coupons.filter(c => c?.active !== false) : [];
    const { activeTab: tabParam, subId } = useParams();
    const activeTab = tabParam || 'profile';
    const navigate = useNavigate();

    // State Synced with params
    const isEditing = subId === 'edit';
    const showAddressForm = subId === 'add';

    const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: ''
    });
    const [copiedCoupon, setCopiedCoupon] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.name ? user.name.split(' ')[0] : '',
                lastName: user.name ? user.name.split(' ').slice(1).join(' ') : '',
                email: user.email || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    // Fetch addresses when component mounts
    useEffect(() => {
        if (user && user.id) {
            // Trigger address fetch from context
            const fetchAddressesData = async () => {
                try {
                    const api = (await import('../../../services/api')).default;
                    const res = await api.get('user/addresses');
                    if (res.data.success) {
                        // Addresses should be updated in context
                    }
                } catch (err) {
                    console.log('Addresses loaded from context');
                }
            };
            fetchAddressesData();
        }
    }, [user?.id]);

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-32 text-center">
                <h2 className="text-2xl font-serif text-[#3E2723] mb-4">Please Login to View Profile</h2>
                <Link to="/login" className="inline-block bg-[#3E2723] text-white px-8 py-3 rounded-full hover:bg-[#5D4037] transition-colors">Login Now</Link>
            </div>
        );
    }

    const handleLogout = () => { logout(); navigate('/'); };

    const handleSave = async () => {
        if (isSaving) return;
        
        const name = `${formData.firstName} ${formData.lastName}`.trim();
        if (!name) {
            toast.error("Name is required");
            return;
        }

        const payload = {
            name,
            email: formData.email,
            phone: formData.phone
        };

        setIsSaving(true);
        const savePromise = updateProfile(payload);

        toast.promise(savePromise, {
            loading: 'Saving profile changes...',
            success: (res) => {
                if (res.success) {
                    navigate('/profile/profile');
                    return 'Profile updated successfully!';
                } else {
                    throw new Error(res.message || 'Failed to update profile');
                }
            },
            error: (err) => err.message || 'Failed to update profile'
        });

        try {
            await savePromise;
        } catch (err) {
            console.error("Save error:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddAddress = async (e) => {
        e.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        try {
            const payload = normalizeAddressPayload(newAddress);
            console.log('Adding address:', payload);

            const success = await addAddress(payload);
            console.log('Add address result:', success);

            if (success) {
                // Force a small delay to ensure backend saved
                await new Promise(resolve => setTimeout(resolve, 500));
                toast.success('Address added successfully!');
                navigate('/profile/addresses');
                setNewAddress(EMPTY_ADDRESS);
            } else {
                toast.error('Failed to add address. Please try again.');
            }
        } catch (error) {
            console.error('Error adding address:', error);
            toast.error('Error adding address: ' + (error.message || 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyCoupon = (code) => {
        if (!code) return;
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(code);
        }
        setCopiedCoupon(code);
        toast.success('Coupon code copied');
        setTimeout(() => setCopiedCoupon(''), 2000);
    };

    return (
        <div className="bg-white min-h-screen w-full">
            <div className="container mx-auto px-4 py-3 md:py-8 min-h-[60vh]">
                {/* General Back Button */}
                <div className="mb-4 md:mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-[#D39A9F] hover:text-black transition-all group font-bold uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>
                </div>

                <h1 className={`${tabParam ? 'hidden md:block' : 'block'} text-xl md:text-3xl font-serif font-bold text-[#3E2723] mb-4 md:mb-8 text-center md:text-left`}>My Account</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                    <ProfileSidebar 
                        user={user}
                        activeTab={activeTab}
                        safeOrders={safeOrders}
                        safeAddresses={safeAddresses}
                        safeWishlist={safeWishlist}
                        availableCoupons={availableCoupons}
                        notificationsEnabled={notificationsEnabled}
                        toggleNotificationSettings={toggleNotificationSettings}
                        handleLogout={handleLogout}
                        setShowDeleteModal={setShowDeleteModal}
                        tabParam={tabParam}
                        safeReplacements={safeReplacements}
                    />

                    {/* Content Area - Hidden on mobile if NO tab is active */}
                    <div className={`${!tabParam ? 'hidden md:block' : 'block'} md:col-span-2`}>
                        <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-[#3E2723] border-t-transparent rounded-full animate-spin"></div></div>}>
                            {activeTab === 'profile' && (
                                <ProfileDetailsTab 
                                    user={user}
                                    isEditing={isEditing}
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleSave={handleSave}
                                    isSaving={isSaving}
                                />
                            )}
                            {activeTab === 'orders' && (
                                <OrdersTab 
                                    safeOrders={safeOrders}
                                    subId={subId}
                                />
                            )}
                            {activeTab === 'payments' && (
                                <PaymentsTab />
                            )}
                            {activeTab === 'coupons' && (
                                <CouponsTab 
                                    availableCoupons={availableCoupons}
                                    copiedCoupon={copiedCoupon}
                                    handleCopyCoupon={handleCopyCoupon}
                                />
                            )}
                            {activeTab === 'gift-cards' && (
                                <GiftCardsTab />
                            )}
                            {activeTab === 'addresses' && (
                                <AddressesTab 
                                    safeAddresses={safeAddresses}
                                    showAddressForm={showAddressForm}
                                    newAddress={newAddress}
                                    setNewAddress={setNewAddress}
                                    handleAddAddress={handleAddAddress}
                                    removeAddress={removeAddress}
                                    defaultAddressId={defaultAddressId}
                                    setDefaultAddress={setDefaultAddress}
                                />
                            )}
                        </Suspense>
                    </div>
                </div>
            </div>

            <DeleteModal 
                isOpen={showDeleteModal} 
                onClose={() => setShowDeleteModal(false)} 
                onConfirm={async () => {
                    const result = await deleteAccount();
                    if (result?.success) {
                        navigate('/');
                    } else if (result?.message) {
                        toast.error(result.message);
                    }
                    return result;
                }} 
                title="Delete Account?"
                description="This action is permanent and cannot be undone. All your profile data, addresses, and wishlist will be permanently deleted."
            />
        </div>
    );
};

export default Profile;
