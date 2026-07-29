import React, { useState, useEffect } from 'react';
import {
  Truck, Package, MapPin, CheckCircle, XCircle, AlertTriangle,
  Loader2, ExternalLink, Download, RefreshCw, X, ChevronDown
} from 'lucide-react';
import { sellerShippingService } from '../services/sellerShippingService';
import { pickupLocationService } from '../services/pickupLocationService';
import ShipmentTimeline from '../../shared/components/ShipmentTimeline';

const COURIERS = [
  { id: 'delhivery',  name: 'Delhivery',  desc: 'Temporarily unavailable', disabled: true },
  { id: 'bluedart',  name: 'Blue Dart',   desc: 'Temporarily unavailable', disabled: true },
  { id: 'shiprocket', name: 'Shiprocket', desc: 'Smart courier selection via Shiprocket', disabled: false },
];

const SellerShipmentPanel = ({ order, onShipmentCreated }) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Create form state
  const [selectedCourier, setSelectedCourier] = useState('');
  const [packageInfo, setPackageInfo] = useState({ weight: '', length: '', breadth: '', height: '' });
  const [paymentMode, setPaymentMode] = useState(order?.paymentMethod === 'cod' ? 'cod' : 'prepaid');
  const [codAmount, setCodAmount] = useState(order?.total || 0);

  // Pickup location state (for Shiprocket)
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState('');
  const [loadingPickupLocations, setLoadingPickupLocations] = useState(false);

  // Serviceability
  const [serviceability, setServiceability] = useState(null);
  const [checkingService, setCheckingService] = useState(false);

  const orderId = order?._id || order?.id;

  useEffect(() => {
    if (orderId) fetchShipments();
  }, [orderId]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const data = await sellerShippingService.getOrderShipments(orderId);
      setShipments(data);
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourierSelect = async (courierId) => {
    const courier = COURIERS.find((c) => c.id === courierId);
    if (courier?.disabled) return;

    setSelectedCourier(courierId);
    setServiceability(null);
    setSelectedPickupLocationId('');

    // Load pickup locations when Shiprocket is chosen
    if (courierId === 'shiprocket') {
      setLoadingPickupLocations(true);
      try {
        const locs = await pickupLocationService.list();
        setPickupLocations(locs);
        // Pre-select the default location
        const def = locs.find(l => l.isDefault);
        if (def) setSelectedPickupLocationId(def._id);
      } catch (err) {
        console.error('Failed to load pickup locations:', err);
      } finally {
        setLoadingPickupLocations(false);
      }
    }
  };

  const checkServiceability = async () => {
    if (!selectedCourier) return;
    setCheckingService(true);
    setServiceability(null);
    try {
      const customerPincode = order?.shippingAddress?.pincode || '';
      if (!customerPincode) {
        setServiceability({ serviceable: false, message: 'Customer delivery pincode is missing on this order' });
        return;
      }
      const result = await sellerShippingService.checkServiceability({
        courier: selectedCourier,
        pickupPincode: order?.sellerPincode || undefined,
        deliveryPincode: customerPincode,
        paymentMode,
        weight: Number(packageInfo.weight) || 500,
        pickupLocationId: selectedPickupLocationId || undefined,
      });
      setServiceability(result);
    } catch (err) {
      setServiceability({ serviceable: false, message: err.response?.data?.message || 'Check failed' });
    } finally {
      setCheckingService(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedCourier) {
      setMessage({ type: 'error', text: 'Please select a courier' });
      return;
    }
    if (!packageInfo.weight || !packageInfo.length || !packageInfo.breadth || !packageInfo.height) {
      setMessage({ type: 'error', text: 'Please fill all package dimensions' });
      return;
    }
    if (paymentMode === 'cod' && (!codAmount || codAmount <= 0)) {
      setMessage({ type: 'error', text: 'COD amount is required for COD orders' });
      return;
    }

    setCreating(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await sellerShippingService.createShipment(orderId, {
        courier: selectedCourier,
        packageInfo: {
          weight: Number(packageInfo.weight),
          length: Number(packageInfo.length),
          breadth: Number(packageInfo.breadth),
          height: Number(packageInfo.height),
        },
        paymentMode,
        codAmount: paymentMode === 'cod' ? Number(codAmount) : 0,
        // Only sent for Shiprocket
        pickupLocationId: selectedCourier === 'shiprocket' ? selectedPickupLocationId || undefined : undefined,
      });
      setMessage({ type: 'success', text: `Shipment created! AWB: ${result.shipment?.awbNumber}` });
      setShowCreateForm(false);
      fetchShipments();
      if (onShipmentCreated) onShipmentCreated(result.shipment);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Shipment creation failed' });
    } finally {
      setCreating(false);
    }
  };

  const handleTrack = async () => {
    setTracking(true);
    try {
      await sellerShippingService.trackOrderShipment(orderId);
      fetchShipments();
      setMessage({ type: 'success', text: 'Tracking updated' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Tracking sync failed' });
    } finally {
      setTracking(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this shipment?')) return;
    setCancelling(true);
    try {
      await sellerShippingService.cancelOrderShipment(orderId);
      fetchShipments();
      setMessage({ type: 'success', text: 'Shipment cancelled' });
      if (onShipmentCreated) onShipmentCreated(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Cancellation failed' });
    } finally {
      setCancelling(false);
    }
  };

  const activeShipment = shipments.find(s => s.status !== 'CANCELLED');
  const hasActiveShipment = !!activeShipment;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#3E2723] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Message Banner */}
      {message.text && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Active Shipment Display */}
      {hasActiveShipment ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#3E2723]" /> Shipment Details
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleTrack}
                  disabled={tracking}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${tracking ? 'animate-spin' : ''}`} /> Sync
                </button>
                {['CREATED', 'PICKUP_SCHEDULED'].includes(activeShipment.status) && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">AWB Number</p>
                  <p className="text-sm font-bold text-gray-900 font-mono">{activeShipment.awbNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Courier</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">{activeShipment.courier}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Payment</p>
                  <p className="text-sm font-bold text-gray-900 uppercase">{activeShipment.paymentMode}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Weight</p>
                  <p className="text-sm font-bold text-gray-900">{activeShipment.package?.weight || 0}g</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {activeShipment.trackingUrl && (
                  <a
                    href={activeShipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Track on Courier Site
                  </a>
                )}
                {activeShipment.labelUrl && (
                  <a
                    href={activeShipment.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors border border-green-200"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Label
                  </a>
                )}
                {activeShipment.invoiceUrl && (
                  <a
                    href={activeShipment.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Invoice
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <ShipmentTimeline timeline={activeShipment.timeline} currentStatus={activeShipment.status} />
        </div>
      ) : (
        /* No Active Shipment – Show Create Button */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {!showCreateForm ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-[#3E2723]/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-7 h-7 text-[#3E2723]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Shipment</h3>
              <p className="text-sm text-gray-500 mb-4">Create a shipment to send your items to the customer</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3E2723] text-white text-sm font-bold hover:bg-[#2D1B18] transition-all shadow-lg shadow-[#3E2723]/20"
              >
                <Truck className="w-4 h-4" /> Create Shipment
              </button>
            </div>
          ) : (
            /* Create Shipment Form */
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Create Shipment</h3>
                <button onClick={() => setShowCreateForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Courier Selection */}
              <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Select Courier</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {COURIERS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={c.disabled}
                      onClick={() => handleCourierSelect(c.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${c.disabled
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : selectedCourier === c.id
                          ? 'border-[#3E2723] bg-[#3E2723]/5 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <p className={`text-sm font-bold ${c.disabled ? 'text-gray-400' : 'text-gray-900'}`}>{c.name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{c.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Shiprocket: Pickup Location Picker */}
                {selectedCourier === 'shiprocket' && (
                  <div className="mt-4">
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Pickup Location</label>
                    {loadingPickupLocations ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading pickup locations...
                      </div>
                    ) : pickupLocations.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        No pickup locations found.
                        <a href="/seller/pickup-locations" className="underline font-bold ml-1" target="_blank">Add one here →</a>
                      </div>
                    ) : (
                      <select
                        value={selectedPickupLocationId}
                        onChange={(e) => setSelectedPickupLocationId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20 focus:border-[#3E2723]"
                      >
                        <option value="">— Select a pickup location —</option>
                        {pickupLocations.map((loc) => (
                          <option key={loc._id} value={loc._id}>
                            {loc.warehouseName}{loc.isDefault ? ' (Default)' : ''} — {loc.city}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {selectedCourier && (
                  <button
                    onClick={checkServiceability}
                    disabled={checkingService}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200 disabled:opacity-50"
                  >
                    {checkingService ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                    Check Serviceability
                  </button>
                )}

                {serviceability && (
                  <div className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium ${serviceability.serviceable
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {serviceability.serviceable ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <div>
                      <span className="font-bold">{serviceability.serviceable ? 'Serviceable' : 'Not Serviceable'}</span>
                      {serviceability.estimatedDays && <span className="ml-2">• Est. {serviceability.estimatedDays} days</span>}
                      {serviceability.codAvailable === false && <span className="ml-2 text-amber-600">• COD not available</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Package Dimensions */}
              <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Package Dimensions</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium">Weight (grams)</label>
                    <input
                      type="number"
                      value={packageInfo.weight}
                      onChange={(e) => setPackageInfo(p => ({ ...p, weight: e.target.value }))}
                      placeholder="500"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20 focus:border-[#3E2723]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium">Length (cm)</label>
                    <input
                      type="number"
                      value={packageInfo.length}
                      onChange={(e) => setPackageInfo(p => ({ ...p, length: e.target.value }))}
                      placeholder="20"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20 focus:border-[#3E2723]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium">Breadth (cm)</label>
                    <input
                      type="number"
                      value={packageInfo.breadth}
                      onChange={(e) => setPackageInfo(p => ({ ...p, breadth: e.target.value }))}
                      placeholder="15"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20 focus:border-[#3E2723]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium">Height (cm)</label>
                    <input
                      type="number"
                      value={packageInfo.height}
                      onChange={(e) => setPackageInfo(p => ({ ...p, height: e.target.value }))}
                      placeholder="10"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20 focus:border-[#3E2723]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Payment Mode</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentMode('prepaid')}
                    className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${paymentMode === 'prepaid' ? 'border-[#3E2723] bg-[#3E2723]/5 text-[#3E2723]' : 'border-gray-200 text-gray-600'}`}
                  >
                    Prepaid
                  </button>
                  <button
                    onClick={() => setPaymentMode('cod')}
                    className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${paymentMode === 'cod' ? 'border-[#3E2723] bg-[#3E2723]/5 text-[#3E2723]' : 'border-gray-200 text-gray-600'}`}
                  >
                    COD
                  </button>
                </div>
                {paymentMode === 'cod' && (
                  <div className="mt-3">
                    <label className="text-[10px] text-gray-400 font-medium">COD Amount (₹)</label>
                    <input
                      type="number"
                      value={codAmount}
                      onChange={(e) => setCodAmount(e.target.value)}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20 focus:border-[#3E2723] max-w-xs"
                    />
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={creating || !selectedCourier}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3E2723] text-white text-sm font-bold hover:bg-[#2D1B18] transition-all shadow-lg shadow-[#3E2723]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                {creating ? 'Creating Shipment...' : 'Create Shipment'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancelled Shipments History */}
      {shipments.filter(s => s.status === 'CANCELLED').length > 0 && (
        <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <summary className="px-6 py-4 cursor-pointer text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <ChevronDown className="w-4 h-4" /> Cancelled Shipments ({shipments.filter(s => s.status === 'CANCELLED').length})
          </summary>
          <div className="px-6 pb-4 divide-y divide-gray-50">
            {shipments.filter(s => s.status === 'CANCELLED').map((s) => (
              <div key={s._id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-mono text-gray-500">{s.awbNumber}</span>
                  <span className="text-xs text-gray-400 ml-2">({s.courier})</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Cancelled</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default SellerShipmentPanel;
