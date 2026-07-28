import React, { useState } from 'react';
import { Plus, ArrowLeft, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AddressesTab = ({
    safeAddresses,
    showAddressForm,
    newAddress,
    setNewAddress,
    handleAddAddress,
    removeAddress,
    defaultAddressId,
    setDefaultAddress
}) => {
    const navigate = useNavigate();
    const [selectedAddress, setSelectedAddress] = useState(null);

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-display font-bold text-black tracking-wide">My Addresses</h2>
                <button onClick={() => showAddressForm ? navigate('/profile/addresses') : navigate('/profile/addresses/add')} className="bg-black text-white px-4 py-2 md:px-6 md:py-2.5 rounded-lg text-sm font-bold hover:bg-[#D39A9F] transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {showAddressForm ? 'Cancel' : 'Add New'}
                </button>
            </div>

            {/* Mobile Add Address Form - Full Screen Overlay Style */}
            {showAddressForm && (
                <div className="md:hidden fixed inset-0 z-[200] bg-[#FDFBF7] flex flex-col animate-in slide-in-from-bottom duration-300">
                    <div className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                        <button onClick={() => navigate('/profile/addresses')} className="text-[#3E2723]"><ArrowLeft className="w-5 h-5" /></button>
                        <h2 className="text-lg font-display font-bold text-[#3E2723]">Add New Address</h2>
                    </div>
                    <form onSubmit={handleAddAddress} className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest mb-1 block">Full Name</label>
                                <input value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} className="w-full bg-[#FAFAFA] border border-[#EFEBE9] p-2.5 rounded-lg text-sm font-medium text-[#3E2723] placeholder:text-gray-300 focus:outline-none focus:border-[#3E2723] transition-colors" placeholder="e.g. Aditi Sharma" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest mb-1 block">Phone Number</label>
                                <input value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} className="w-full bg-[#FAFAFA] border border-[#EFEBE9] p-2.5 rounded-lg text-sm font-medium text-[#3E2723] placeholder:text-gray-300 focus:outline-none focus:border-[#3E2723] transition-colors" placeholder="e.g. 9876543210" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest mb-1 block">Flat, House no., Building, Company, Apartment</label>
                                <input value={newAddress.flatNo} onChange={e => setNewAddress({ ...newAddress, flatNo: e.target.value })} className="w-full bg-[#FAFAFA] border border-[#EFEBE9] p-2.5 rounded-lg text-sm font-medium text-[#3E2723] placeholder:text-gray-300 focus:outline-none focus:border-[#3E2723] transition-colors" placeholder="e.g. Flat 4B, Rose Apartments" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest mb-1 block">Area, Street, Sector, Village</label>
                                <input value={newAddress.area} onChange={e => setNewAddress({ ...newAddress, area: e.target.value })} className="w-full bg-[#FAFAFA] border border-[#EFEBE9] p-2.5 rounded-lg text-sm font-medium text-[#3E2723] placeholder:text-gray-300 focus:outline-none focus:border-[#3E2723] transition-colors" placeholder="e.g. Lokhandwala Complex" required />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest mb-1 block">City</label>
                                    <input value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} className="w-full bg-[#FAFAFA] border border-[#EFEBE9] p-2.5 rounded-lg text-sm font-medium text-[#3E2723] placeholder:text-gray-300 focus:outline-none focus:border-[#3E2723] transition-colors" placeholder="Mumbai" required />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest mb-1 block">State</label>
                                    <input value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} className="w-full bg-[#FAFAFA] border border-[#EFEBE9] p-2.5 rounded-lg text-sm font-medium text-[#3E2723] placeholder:text-gray-300 focus:outline-none focus:border-[#3E2723] transition-colors" placeholder="Maharashtra" required />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest mb-1 block">Pincode</label>
                                <input value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} className="w-full bg-[#FAFAFA] border border-[#EFEBE9] p-2.5 rounded-lg text-sm font-medium text-[#3E2723] placeholder:text-gray-300 focus:outline-none focus:border-[#3E2723] transition-colors" placeholder="400001" required />
                            </div>
                        </div>
                        <div className="pt-2 pb-8">
                            <button type="submit" className="w-full bg-[#3E2723] text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest shadow-lg shadow-[#3E2723]/20 active:scale-95 transition-transform">Save Address</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Desktop Add Address Form - With Validation */}
            {showAddressForm && (
                <form onSubmit={handleAddAddress} className="hidden md:grid bg-white p-8 rounded-2xl shadow-sm grid-cols-2 gap-4 border border-[#EBCDD0] animate-in fade-in duration-300">
                    <input placeholder="Name" value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" required />
                    <input placeholder="Phone" value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" required />
                    <input placeholder="Flat, House no., Building, Company, Apartment" value={newAddress.flatNo} onChange={e => setNewAddress({ ...newAddress, flatNo: e.target.value })} className="col-span-2 w-full bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" required />
                    <input placeholder="Area, Street, Sector, Village" value={newAddress.area} onChange={e => setNewAddress({ ...newAddress, area: e.target.value })} className="col-span-2 w-full bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" required />
                    <input placeholder="City" value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" required />
                    <input placeholder="State" value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" required />
                    <input placeholder="Pincode" value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} className="col-span-2 w-full bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" required />
                    <button type="submit" className="col-span-2 bg-[#3E2723] text-white py-3 rounded-lg text-sm font-bold tracking-widest uppercase hover:bg-black transition-colors mt-2">Save Address</button>
                </form>
            )}

            {/* Full Address Detail Modal */}
            {selectedAddress && (
                <div className="fixed inset-0 bg-black/50 z-[300] flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full md:w-[90%] md:max-w-md rounded-t-2xl md:rounded-2xl shadow-xl p-6 space-y-4 animate-in slide-in-from-bottom-5 md:slide-in-from-center duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg md:text-xl font-bold text-black">{selectedAddress.type} Address</h3>
                            <button onClick={() => setSelectedAddress(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 border-t border-gray-200 pt-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name</p>
                                <p className="text-sm md:text-base font-semibold text-black">{selectedAddress.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                                <p className="text-sm md:text-base font-semibold text-black">{selectedAddress.phone || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Flat / House / Building</p>
                                <p className="text-sm md:text-base font-semibold text-black">{selectedAddress.flatNo}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Area / Street / Sector</p>
                                <p className="text-sm md:text-base font-semibold text-black">{selectedAddress.area}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">City</p>
                                    <p className="text-sm md:text-base font-semibold text-black">{selectedAddress.city}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">State</p>
                                    <p className="text-sm md:text-base font-semibold text-black">{selectedAddress.state}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pincode</p>
                                <p className="text-sm md:text-base font-semibold text-black">{selectedAddress.pincode}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                            {defaultAddressId !== (selectedAddress.id || selectedAddress._id) && (
                                <button
                                    onClick={() => {
                                        setDefaultAddress(selectedAddress.id || selectedAddress._id);
                                        setSelectedAddress(null);
                                    }}
                                    className="flex-1 bg-[#D39A9F] text-white py-2.5 rounded-lg font-bold text-sm uppercase hover:bg-[#8E2B45] transition-all active:scale-95"
                                >
                                    Set as Default
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    removeAddress(selectedAddress.id || selectedAddress._id);
                                    setSelectedAddress(null);
                                }}
                                className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg font-bold text-sm uppercase hover:bg-red-100 transition-all active:scale-95"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {safeAddresses.length === 0 ? (
                <div className="text-center py-12 bg-[#FDF5F6] rounded-2xl border border-[#EBCDD0]">
                    <p className="text-gray-500 text-sm mb-4">No addresses added yet</p>
                    <button
                        onClick={() => navigate('/profile/addresses/add')}
                        className="bg-[#8E2B45] text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase hover:bg-[#722F37] transition-all active:scale-95"
                    >
                        Add Your First Address
                    </button>
                </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {safeAddresses.map(addr => {
                    const addressId = addr.id || addr._id;
                    return (
                        <div
                            key={addressId}
                            onClick={() => setSelectedAddress(addr)}
                            className="bg-[#FDF5F6] p-4 md:p-6 rounded-2xl shadow-sm relative border border-[#EBCDD0] md:border-transparent transition-all hover:shadow-md cursor-pointer hover:bg-[#FCE8EC] active:scale-95"
                        >
                            <div className="flex justify-between mb-2">
                                <span className="text-[9px] md:text-[10px] font-bold uppercase py-1 px-2 bg-white md:bg-white rounded text-black tracking-wider shadow-sm">{addr.type}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeAddress(addressId);
                                    }}
                                    className="text-red-400 p-1 active:scale-90 hover:text-red-600 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <h4 className="font-bold text-sm md:text-base text-black mb-1">{addr.name}</h4>
                            <p className="text-xs md:text-sm text-gray-500 leading-relaxed mb-3">
                                {[addr.flatNo, addr.area, addr.city].filter(Boolean).join(', ')}
                                {addr.pincode ? ` - ${addr.pincode}` : ''}
                            </p>
                            <p className="text-[10px] text-[#D39A9F] font-bold cursor-pointer hover:underline">View Full Address →</p>
                        </div>
                    );
                })}
            </div>
            )}
        </div>
    );
};

export default AddressesTab;
