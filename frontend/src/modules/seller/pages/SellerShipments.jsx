import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Search, Filter, Truck, RefreshCw, ChevronLeft, ChevronRight,
  ExternalLink, Download, XCircle, CheckCircle, Clock, AlertTriangle
} from 'lucide-react';
import { sellerShippingService } from '../services/sellerShippingService';

const STATUS_COLORS = {
  CREATED:          'bg-blue-50 text-blue-700 border-blue-200',
  PICKUP_SCHEDULED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PICKED_UP:        'bg-purple-50 text-purple-700 border-purple-200',
  IN_TRANSIT:       'bg-amber-50 text-amber-700 border-amber-200',
  OUT_FOR_DELIVERY: 'bg-orange-50 text-orange-700 border-orange-200',
  DELIVERED:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED:           'bg-red-50 text-red-700 border-red-200',
  FAILED_ORDER_SAVE:'bg-rose-50 text-rose-700 border-rose-200',
  RTO_INITIATED:    'bg-rose-50 text-rose-700 border-rose-200',
  RTO_DELIVERED:    'bg-gray-50 text-gray-600 border-gray-200',
  CANCELLED:        'bg-gray-50 text-gray-500 border-gray-200',
};

const STATUS_LABELS = {
  CREATED: 'Created', PICKUP_SCHEDULED: 'Pickup Scheduled', PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit', OUT_FOR_DELIVERY: 'Out for Delivery', DELIVERED: 'Delivered',
  FAILED: 'Failed', FAILED_ORDER_SAVE: 'Failed Order Save', RTO_INITIATED: 'RTO', RTO_DELIVERED: 'RTO Delivered', CANCELLED: 'Cancelled',
};

const COURIER_LABELS = { delhivery: 'Delhivery', bluedart: 'Blue Dart', shiprocket: 'Shiprocket' };

const SellerShipments = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', courier: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);

  const fetchShipments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.status) params.status = filters.status;
      if (filters.courier) params.courier = filters.courier;
      if (filters.search) params.search = filters.search;

      const result = await sellerShippingService.getMyShipments(params);
      setShipments(result.shipments);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const handleTrack = async (shipment) => {
    try {
      await sellerShippingService.trackOrderShipment(shipment.orderId?._id || shipment.orderId);
      fetchShipments(pagination.page);
    } catch (err) {
      console.error('Tracking sync failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF5F6] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3E2723] rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          Shipments
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage all your shipments and courier deliveries</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by AWB number..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && fetchShipments(1)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20 focus:border-[#3E2723]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters ? 'bg-[#3E2723] text-white border-[#3E2723]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button
            onClick={() => fetchShipments(pagination.page)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3E2723] text-white text-sm font-medium hover:bg-[#2D1B18] transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={filters.courier}
              onChange={(e) => setFilters(f => ({ ...f, courier: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20"
            >
              <option value="">All Couriers</option>
              {Object.entries(COURIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button
              onClick={() => { setFilters({ status: '', courier: '', search: '' }); }}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#3E2723]/20 border-t-[#3E2723] rounded-full animate-spin" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No shipments found</p>
            <p className="text-gray-400 text-sm mt-1">Create shipments from your order details page</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">AWB</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Order</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Courier</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Created</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shipments.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900 font-mono">{s.awbNumber || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/seller/order-details/${s.orderId?._id || s.orderId}`)}
                          className="text-sm text-[#3E2723] font-semibold hover:underline"
                        >
                          {s.orderId?.orderId || 'View Order'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-700">{COURIER_LABELS[s.courier] || s.courier}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[s.status] || STATUS_COLORS.CREATED}`}>
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTrack(s)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                            title="Sync Tracking"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          {s.trackingUrl && (
                            <a
                              href={s.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              title="Track"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {s.labelUrl && (
                            <a
                              href={s.labelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                              title="Download Label"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          {s.invoiceUrl && (
                            <a
                              href={s.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
                              title="Download Invoice"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {shipments.map((s) => (
                <div key={s._id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900 font-mono">{s.awbNumber || '—'}</span>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[s.status] || STATUS_COLORS.CREATED}`}>
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{COURIER_LABELS[s.courier] || s.courier}</span>
                    <span>{new Date(s.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/seller/order-details/${s.orderId?._id || s.orderId}`)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#3E2723] text-white text-xs font-bold text-center"
                    >
                      View Order
                    </button>
                    <button
                      onClick={() => handleTrack(s)}
                      className="p-2 rounded-xl bg-amber-50 text-amber-600"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {s.trackingUrl && (
                      <a
                        href={s.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-blue-50 text-blue-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchShipments(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fetchShipments(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SellerShipments;
