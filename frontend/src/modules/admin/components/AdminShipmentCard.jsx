import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Package, Download, ExternalLink, Copy, Check, Loader2,
  AlertCircle, MapPin, RefreshCw, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminShippingService } from '../services/adminShippingService';

const STATUS_BADGE = {
  CREATED: 'bg-blue-50 text-blue-700 border-blue-200',
  PICKUP_SCHEDULED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PICKED_UP: 'bg-purple-50 text-purple-700 border-purple-200',
  IN_TRANSIT: 'bg-amber-50 text-amber-700 border-amber-200',
  OUT_FOR_DELIVERY: 'bg-orange-50 text-orange-700 border-orange-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  FAILED_ORDER_SAVE: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
};

const AdminShipmentCard = ({ order, onOrderUpdated }) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickup, setSelectedPickup] = useState('');
  const [packageInfo, setPackageInfo] = useState({
    weight: '200',
    length: '10',
    breadth: '10',
    height: '5',
  });

  const orderId = order?._id || order?.id;

  const loadData = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [shipmentList, locList] = await Promise.all([
        adminShippingService.getOrderShipments(orderId).catch(() => []),
        adminShippingService.getPickupLocations().catch(() => []),
      ]);
      setShipments(shipmentList || []);
      const validLocs = Array.isArray(locList) ? locList : [];
      setPickupLocations(validLocs);
      if (validLocs.length > 0 && validLocs[0]?.warehouseName) {
        setSelectedPickup(validLocs[0].warehouseName);
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const adminShipments = shipments.filter((s) => s.isAdminShipment || !s.sellerId);
  const activeShipment = adminShipments.find((s) => s.status !== 'CANCELLED');
  const hasCancelledShipment = adminShipments.some((s) => s.status === 'CANCELLED');

  const handleCopyAwb = (awb) => {
    if (!awb) return;
    navigator.clipboard.writeText(awb);
    setCopied(true);
    toast.success('AWB copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateShipment = async () => {
    if (!orderId) return;
    const weightNum = Number(packageInfo.weight);
    if (!weightNum || weightNum <= 0) {
      toast.error('Please enter a valid package weight in grams');
      return;
    }

    setCreating(true);
    try {
      const res = await adminShippingService.createShipment(orderId, {
        courier: 'shiprocket',
        packageInfo: {
          weight: weightNum,
          length: Number(packageInfo.length) || 10,
          breadth: Number(packageInfo.breadth) || 10,
          height: Number(packageInfo.height) || 5,
        },
        pickupLocationName: selectedPickup,
        codAmount: adminCodAmount,
      });

      toast.success(res?.message || 'Shipment created successfully in Shiprocket!');
      await loadData();
      if (onOrderUpdated) {
        await onOrderUpdated();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create Shiprocket shipment';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerateLabel = async (shipmentId) => {
    setActionLoading(true);
    try {
      const res = await adminShippingService.regenerateLabel(shipmentId);
      if (res?.labelUrl) {
        window.open(res.labelUrl, '_blank', 'noopener,noreferrer');
        toast.success('Label generated');
        loadData();
      } else {
        toast.error('Could not generate label');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate label');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelShipment = async (shipmentId) => {
    if (!window.confirm('Are you sure you want to cancel this Shiprocket shipment?')) return;
    setActionLoading(true);
    try {
      await adminShippingService.cancelShipment(shipmentId);
      toast.success('Shipment cancelled successfully');
      loadData();
      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel shipment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center gap-2 text-gray-400 text-xs font-semibold">
        <Loader2 className="w-4 h-4 animate-spin text-[#3E2723]" />
        Checking shipping status...
      </div>
    );
  }

  // Case 1: Active shipment exists
  if (activeShipment) {
    const awb = activeShipment.awbNumber || activeShipment.waybill || '';
    const labelUrl = activeShipment.labelUrl;
    const invoiceUrl = activeShipment.invoiceUrl;
    const trackingUrl = activeShipment.trackingUrl || (awb ? `https://shiprocket.co/tracking/${awb}` : '');
    const badgeClass = STATUS_BADGE[activeShipment.status] || 'bg-gray-50 text-gray-600 border-gray-200';

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3E2723]/5 flex items-center justify-center text-[#3E2723]">
              <Truck size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Shiprocket Shipment</h3>
              <p className="text-[10px] text-gray-400 font-bold">Courier partner assigned</p>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeClass}`}>
            {activeShipment.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AWB Number</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-gray-900">
              <span>{awb || 'Processing...'}</span>
              {awb && (
                <button
                  type="button"
                  onClick={() => handleCopyAwb(awb)}
                  className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                  title="Copy AWB"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Courier</span>
            <span className="font-bold text-gray-800 capitalize">
              {activeShipment.courierResponse?.courier_name || activeShipment.courier || 'Shiprocket'}
            </span>
          </div>

          {activeShipment.shiprocketPickupName && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup Warehouse</span>
              <span className="font-bold text-gray-800">{activeShipment.shiprocketPickupName}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Package</span>
            <span className="font-bold text-gray-600">
              {activeShipment.package?.weight || 200}g &bull; {activeShipment.package?.length || 10}x{activeShipment.package?.breadth || 10}x{activeShipment.package?.height || 5} cm
            </span>
          </div>
        </div>

        {activeShipment.status === 'FAILED_ORDER_SAVE' && (
          <div className="text-[11px] bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 flex items-start gap-2">
            <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              Order status update failed after Shiprocket creation. Remote order is still active with AWB <strong>{awb}</strong>. You can track or cancel it.
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {labelUrl ? (
            <a
              href={labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#3E2723] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#2d1e1b] transition-all shadow-sm"
            >
              <Download size={13} />
              Print Label
            </a>
          ) : (
            <button
              type="button"
              onClick={() => handleRegenerateLabel(activeShipment._id)}
              disabled={actionLoading}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#3E2723] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#2d1e1b] transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Generate Label
            </button>
          )}

          {invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              <FileText size={13} />
              Invoice PDF
            </a>
          )}

          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              <ExternalLink size={13} />
              Track Status
            </a>
          )}

          {!['DELIVERED', 'RTO_DELIVERED', 'CANCELLED'].includes(activeShipment.status) && (
            <button
              type="button"
              onClick={() => handleCancelShipment(activeShipment._id)}
              disabled={actionLoading}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <AlertCircle size={13} />}
              Cancel Shipment
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 2: No shipment yet - Show One-Click Creation Form
  const isCod = order?.paymentMethod === 'cod';
  const items = order?.items || [];
  const adminItems = items.filter((item) => !item.sellerId);
  const sellerItems = items.filter((item) => Boolean(item.sellerId));
  const isPureSellerOrder = items.length > 0 && adminItems.length === 0;
  const isMixedOrder = adminItems.length > 0 && sellerItems.length > 0;

  const adminSubtotal = adminItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const orderSubtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const adminCodAmount = isCod
    ? (isMixedOrder && orderSubtotal > 0
        ? Math.round(((order?.total || 0) * adminSubtotal) / orderSubtotal)
        : Number(order?.total || 0))
    : 0;

  if (isPureSellerOrder) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
            <Truck size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Seller-Fulfilled Order</h3>
            <p className="text-[10px] text-gray-400 font-bold">Independent marketplace vendor items</p>
          </div>
        </div>
        <div className="text-xs bg-blue-50/70 border border-blue-200/60 rounded-xl p-3.5 text-blue-900 flex items-start gap-2.5">
          <AlertCircle size={15} className="text-blue-700 shrink-0 mt-0.5" />
          <span className="leading-snug">
            All items in this order belong to third-party sellers. Courier dispatch and label generation are managed by the seller in their Seller Portal.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3E2723] to-[#5D4037] flex items-center justify-center text-white">
            <Truck size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Shiprocket Fulfillment</h3>
            <p className="text-[10px] text-gray-400 font-bold">1-click order dispatch</p>
          </div>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${isCod ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {isCod ? `COD: ₹${adminCodAmount}` : 'Prepaid'}
        </span>
      </div>

      <div className="space-y-4">
        {isMixedOrder && (
          <div className="text-[11px] bg-sky-50 border border-sky-200 rounded-xl p-3 text-sky-900 flex items-start gap-2">
            <AlertCircle size={14} className="text-sky-700 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong>Mixed Order:</strong> Contains {adminItems.length} admin product(s) and {sellerItems.length} seller product(s). This shipment will fulfill only the admin-managed items{isCod ? ` (COD collection: ₹${adminCodAmount})` : ''}.
            </span>
          </div>
        )}

        {hasCancelledShipment && (
          <div className="text-[11px] bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong>Previous shipment cancelled:</strong> You can configure package dimensions and dispatch a new Shiprocket shipment below.
            </span>
          </div>
        )}

        {/* Pickup Location selection */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <MapPin size={11} /> Pickup Warehouse (Shiprocket)
          </label>
          {pickupLocations.length > 0 ? (
            <select
              value={selectedPickup}
              onChange={(e) => setSelectedPickup(e.target.value)}
              disabled={creating}
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10"
            >
              {pickupLocations.map((loc, idx) => (
                <option key={idx} value={loc.warehouseName || loc.pickupName || 'Primary'}>
                  {loc.warehouseName || loc.pickupName || 'Primary'} {loc.city ? `(${loc.city})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-[11px] bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
              <span>
                No pickup locations found in your Shiprocket account. Please configure a pickup warehouse in Shiprocket Settings.
              </span>
            </div>
          )}
        </div>

        {/* Package Dimensions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Weight (g)</label>
            <input
              type="number"
              value={packageInfo.weight}
              onChange={(e) => setPackageInfo((prev) => ({ ...prev, weight: e.target.value }))}
              placeholder="200"
              disabled={creating}
              className="w-full bg-white border border-gray-200 rounded-xl py-2 px-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#3E2723]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Length (cm)</label>
            <input
              type="number"
              value={packageInfo.length}
              onChange={(e) => setPackageInfo((prev) => ({ ...prev, length: e.target.value }))}
              placeholder="10"
              disabled={creating}
              className="w-full bg-white border border-gray-200 rounded-xl py-2 px-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#3E2723]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Breadth (cm)</label>
            <input
              type="number"
              value={packageInfo.breadth}
              onChange={(e) => setPackageInfo((prev) => ({ ...prev, breadth: e.target.value }))}
              placeholder="10"
              disabled={creating}
              className="w-full bg-white border border-gray-200 rounded-xl py-2 px-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#3E2723]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Height (cm)</label>
            <input
              type="number"
              value={packageInfo.height}
              onChange={(e) => setPackageInfo((prev) => ({ ...prev, height: e.target.value }))}
              placeholder="5"
              disabled={creating}
              className="w-full bg-white border border-gray-200 rounded-xl py-2 px-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#3E2723]"
            />
          </div>
        </div>

        {/* Customer Address confirmation */}
        <div className="text-[11px] bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-amber-900 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
          <span className="leading-snug">
            Will dispatch to <strong>{order?.shippingAddress?.city || 'customer'}, {order?.shippingAddress?.state || ''} ({order?.shippingAddress?.pincode || 'pincode'})</strong> via Shiprocket.
          </span>
        </div>

        {/* Cancelled Order Warning */}
        {order?.orderStatus === 'Cancelled' && (
          <div className="text-[11px] bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 flex items-start gap-2">
            <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              This order has been cancelled and cannot be dispatched.
            </span>
          </div>
        )}

        {/* Create Button */}
        <button
          type="button"
          onClick={handleCreateShipment}
          disabled={creating || pickupLocations.length === 0 || ['Delivered', 'Cancelled', 'Returned'].includes(order?.orderStatus)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-[#3E2723] to-[#5D4037] text-white text-[11px] font-black uppercase tracking-widest hover:from-[#2d1e1b] hover:to-[#4a342c] transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {creating ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Sending to Shiprocket...</span>
            </>
          ) : (
            <>
              <Truck size={15} />
              <span>{order?.orderStatus === 'Cancelled' ? 'Order Cancelled' : 'Create Shiprocket Shipment'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminShipmentCard;
