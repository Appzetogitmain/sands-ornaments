import React from 'react';
import { Plus, Check } from 'lucide-react';

const CheckoutAddresses = ({
    addresses,
    user,
    addressSelection,
    setAddressSelection,
    selectedSavedAddressId,
    setSelectedSavedAddressId,
    formData,
    setFormData,
    defaultAddressId,
    handleInputChange,
    saveNewAddress,
    setSaveNewAddress
}) => {
    return (
        <div className="bg-white p-0 md:p-6 rounded-2xl md:border md:border-gray-100 md:shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg md:text-xl font-bold text-black flex items-center gap-3 font-display uppercase tracking-wide">
                    <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">1</span>
                    Shipping Details
                </h2>
            </div>

            {/* Saved Addresses List */}
            {addresses.length > 0 && (
                <div className="mb-8 p-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Saved Addresses</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map((addr) => (
                            <div
                                key={addr._id}
                                onClick={() => {
                                    setFormData({
                                        firstName: addr.name.split(' ')[0] || '',
                                        lastName: addr.name.split(' ').slice(1).join(' ') || '',
                                        email: user.email || '',
                                        phone: addr.phone,
                                        flatNo: addr.flatNo || '',
                                        area: addr.area || '',
                                        city: addr.city,
                                        district: addr.district || '',
                                        state: addr.state || '',
                                        pincode: addr.pincode
                                    });
                                    setAddressSelection('saved');
                                    setSelectedSavedAddressId(addr._id);
                                }}
                                className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative ${selectedSavedAddressId === addr._id ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-black/30'}`}
                            >
                                <div className="flex justify-between mb-3">
                                    <div className="flex gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-gray-200 text-black rounded-sm">{addr.type}</span>
                                        {defaultAddressId === addr._id && (
                                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[#D39A9F] text-white rounded-sm">Default</span>
                                        )}
                                    </div>
                                    {(selectedSavedAddressId === addr._id) && <div className="bg-black text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                </div>
                                <p className="font-bold text-black text-sm mb-1">{addr.name}</p>
                                <p className="text-xs text-gray-500 leading-relaxed font-serif">{addr.flatNo}, {addr.area}, {addr.city}</p>
                                <p className="text-xs text-gray-500 font-serif">{addr.pincode}</p>
                            </div>
                        ))}
                        <div
                            onClick={() => {
                                setFormData({
                                    firstName: '',
                                    lastName: '',
                                    email: user.email || '',
                                    phone: '',
                                    flatNo: '',
                                    area: '',
                                    city: '',
                                    district: '',
                                    state: '',
                                    pincode: ''
                                });
                                setAddressSelection('new');
                                setSelectedSavedAddressId(null);
                            }}
                            className={`p-5 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-50 min-h-[140px] ${addressSelection === 'new' ? 'border-black bg-gray-50' : 'border-gray-200 text-gray-400'}`}
                        >
                            <Plus className="w-6 h-6 mb-2 text-[#D39A9F]" />
                            <span className="text-xs font-bold uppercase tracking-widest text-black">New Address</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 bg-gray-50/50 p-4 md:p-6 rounded-2xl border border-gray-100">
                <div className="md:col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                        {addressSelection === 'new' || addresses.length === 0 ? 'Delivery Address' : 'Selected Address Details'}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">First Name</label>
                    <input
                        required
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Last Name</label>
                    <input
                        required
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Email Address</label>
                    <input
                        required
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Phone Number</label>
                    <input
                        required
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Flat / House / Building</label>
                    <input
                        required
                        type="text"
                        name="flatNo"
                        value={formData.flatNo}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Area / Street / Sector</label>
                    <input
                        required
                        type="text"
                        name="area"
                        value={formData.area}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">City</label>
                    <input
                        required
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">District</label>
                    <input
                        required
                        type="text"
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">State</label>
                    <input
                        required
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Pincode</label>
                    <input
                        required
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="pincode"
                        value={formData.pincode}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            e.target.value = val;
                            handleInputChange(e);
                        }}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white"
                    />
                </div>
                {(addressSelection === 'new' || addresses.length === 0) && (
                    <div className="md:col-span-2 flex items-center gap-3 pt-2">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                id="save-address"
                                checked={saveNewAddress}
                                onChange={(e) => setSaveNewAddress(e.target.checked)}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm checked:border-black checked:bg-black focus:outline-none"
                            />
                            <Check
                                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100"
                                size={12}
                                strokeWidth={3}
                            />
                        </div>
                        <label htmlFor="save-address" className="text-sm text-gray-600 cursor-pointer font-medium select-none">Save this address for future orders</label>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutAddresses;
