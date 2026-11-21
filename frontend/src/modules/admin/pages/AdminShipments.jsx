import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, ExternalLink,
  Download, XCircle, CheckCircle, Package, BarChart3, AlertTriangle, Eye
} from 'lucide-react';
import { adminShippingService } from '../services/adminShippingService';
import ShipmentTimeline from '../../shared/components/ShipmentTimeline';

const STATUS_COLORS = {
  CREATED: 'bg-blue-50 text-blue-700 border-blue-200',
  PICKUP_SCHEDULED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PICKED_UP: 'bg-purple-50 text-purple-700 border-purple-200',
  IN_TRANSIT: 'bg-amber-50 text-amber-700 border-amber-200',
  OUT_FOR_DELIVERY: 'bg-orange-50 text-orange-700 border-orange-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  FAILED_ORDER_SAVE: 'bg-rose-50 text-rose-700 border-rose-200',
  RTO_INITIATED: 'bg-rose-50 text-rose-700 border-rose-200',
  RTO_DELIVERED: 'bg-gray-50 text-gray-600 border-gray-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
};
const STATUS_LABELS = {
  CREATED: 'Created', PICKUP_SCHEDULED: 'Pickup Scheduled', PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit', OUT_FOR_DELIVERY: 'Out for Delivery', DELIVERED: 'Delivered',
  FAILED: 'Failed', FAILED_ORDER_SAVE: 'Failed Order Save', RTO_INITIATED: 'RTO', RTO_DELIVERED: 'RTO Delivered', CANCELLED: 'Cancelled',
};
const COURIER_LABELS = { delhivery: 'Delhivery', bluedart: 'Blue Dart', shiprocket: 'Shiprocket' };
const ALL_STATUSES = Object.keys(STATUS_LABELS);

const AdminShipments = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', courier: '', search: '', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideMessage, setOverrideMessage] = useState('');
  const [reports, setReports] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const fetchShipments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const result = await adminShippingService.getAllShipments(params);
      setShipments(result.shipments);
      setPagination(result.pagination);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const viewDetail = async (id) => {
    setDetailLoading(true);
    try {
      const s = await adminShippingService.getShipmentDetail(id);
      setSelectedShipment(s);
    } catch (err) { console.error(err); } finally { setDetailLoading(false); }
  };

  const handleTrack = async (id) => {
    setActionLoading(id);
    try { await adminShippingService.trackShipment(id); fetchShipments(pagination.page); } catch (err) { console.error(err); }
    finally { setActionLoading(''); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this shipment?')) return;
    setActionLoading(id);
    try { await adminShippingService.cancelShipment(id); fetchShipments(pagination.page); if (selectedShipment?._id === id) viewDetail(id); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); } finally { setActionLoading(''); }
  };

  const handleOverride = async () => {
    if (!overrideStatus) return;
    setActionLoading(overrideModal);
    try {
      await adminShippingService.overrideStatus(overrideModal, { status: overrideStatus, message: overrideMessage });
      setOverrideModal(null); setOverrideStatus(''); setOverrideMessage('');
      fetchShipments(pagination.page); if (selectedShipment?._id === overrideModal) viewDetail(overrideModal);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); } finally { setActionLoading(''); }
  };

  const fetchReports = async () => {
    try {
      const data = await adminShippingService.getReports({ dateFrom: filters.dateFrom, dateTo: filters.dateTo });
      setReports(data); setShowReports(true);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#3E2723] to-[#5D4037] rounded-xl flex items-center justify-center"><Truck className="w-5 h-5 text-white" /></div>
            Shipping Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all seller shipments across couriers</p>
        </div>
        <button onClick={fetchReports} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold hover:bg-indigo-100 border border-indigo-200">
          <BarChart3 className="w-4 h-4" /> Reports
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search AWB..." value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && fetchShipments(1)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${showFilters ? 'bg-[#3E2723] text-white border-[#3E2723]' : 'border-gray-200 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button onClick={() => fetchShipments(pagination.page)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3E2723] text-white text-sm font-medium hover:bg-[#2D1B18]">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} className="px-3 py-2 rounded-xl border border-gray-200 text-sm">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.courier} onChange={(e) => setFilters(f => ({ ...f, courier: e.target.value }))} className="px-3 py-2 rounded-xl border border-gray-200 text-sm">
              <option value="">All Couriers</option>
              {Object.entries(COURIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="From" />
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="To" />
            <button onClick={() => setFilters({ status: '', courier: '', search: '', dateFrom: '', dateTo: '' })} className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Clear</button>
          </div>
        )}
      </div>

      {/* Reports Modal */}
      {showReports && reports && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Shipping Reports</h3>
            <button onClick={() => setShowReports(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(reports.courierStats || []).map(cs => (
              <div key={cs._id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase">{COURIER_LABELS[cs._id] || cs._id}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{cs.count}</p>
                <p className="text-xs text-emerald-600 font-medium">{cs.delivered} delivered</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(reports.statusStats || []).map(ss => (
              <div key={ss._id} className={`p-3 rounded-xl border text-center ${STATUS_COLORS[ss._id] || 'bg-gray-50 border-gray-200'}`}>
                <p className="text-lg font-black">{ss.count}</p>
                <p className="text-[10px] font-bold uppercase">{STATUS_LABELS[ss._id] || ss._id}</p>
              </div>
            ))}
          </div>
          {(reports.failedDeliveries || []).length > 0 && (
            <div><h4 className="text-xs font-bold text-red-600 uppercase mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Failed Deliveries</h4>
              <div className="space-y-2">{reports.failedDeliveries.map(f => (
                <div key={f._id} className="flex items-center justify-between px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-sm">
                  <span className="font-mono font-bold text-red-700">{f.awbNumber}</span>
                  <span className="text-xs text-gray-500">{f.sellerId?.shopName} • {COURIER_LABELS[f.courier]}</span>
                </div>
              ))}</div></div>
          )}
        </div>
      )}

      {/* Detail Panel */}
      {selectedShipment && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Shipment Detail</h3>
            <button onClick={() => setSelectedShipment(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">AWB</p><p className="text-sm font-bold font-mono">{selectedShipment.awbNumber}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Courier</p><p className="text-sm font-bold capitalize">{selectedShipment.courier}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Seller</p><p className="text-sm font-bold">{selectedShipment.sellerId?.shopName || 'N/A'}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Order</p><p className="text-sm font-bold">{selectedShipment.orderId?.orderId || 'N/A'}</p></div>
          </div>
          <div className="px-6 pb-4 flex gap-2 flex-wrap">
            <button onClick={() => handleTrack(selectedShipment._id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 border border-amber-200"><RefreshCw className="w-3.5 h-3.5" /> Sync</button>
            {!['CANCELLED','DELIVERED','RTO_DELIVERED'].includes(selectedShipment.status) && (
              <><button onClick={() => handleCancel(selectedShipment._id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Cancel</button>
              <button onClick={() => { setOverrideModal(selectedShipment._id); setOverrideStatus(selectedShipment.status); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100 border border-violet-200">Override Status</button></>
            )}
          </div>
          <div className="px-6 pb-6"><ShipmentTimeline timeline={selectedShipment.timeline} currentStatus={selectedShipment.status} /></div>
        </div>
      )}

      {/* Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOverrideModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Override Shipment Status</h3>
            <select value={overrideStatus} onChange={e => setOverrideStatus(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-3">
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <textarea value={overrideMessage} onChange={e => setOverrideMessage(e.target.value)} placeholder="Reason for override..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-4 min-h-[80px]" />
            <div className="flex gap-3">
              <button onClick={() => setOverrideModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Cancel</button>
              <button onClick={handleOverride} disabled={actionLoading === overrideModal} className="flex-1 py-2.5 rounded-xl bg-[#3E2723] text-white text-sm font-bold">Apply Override</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-[#3E2723]/20 border-t-[#3E2723] rounded-full animate-spin" /></div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-20"><Package className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No shipments found</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                  {['AWB','Order','Courier','Seller','Status','Created','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {shipments.map(s => (
                    <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold font-mono text-gray-900">{s.awbNumber || '—'}</td>
                      <td className="px-4 py-3"><button onClick={() => navigate(`/admin/orders/${s.orderId?._id || s.orderId}`)} className="text-sm text-[#3E2723] font-semibold hover:underline">{s.orderId?.orderId || 'View'}</button></td>
                      <td className="px-4 py-3 text-sm text-gray-700">{COURIER_LABELS[s.courier] || s.courier}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{s.sellerId?.shopName || s.sellerId?.fullName || '—'}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[s.status]}`}>{STATUS_LABELS[s.status] || s.status}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => viewDetail(s._id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" title="View"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handleTrack(s._id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="Sync"><RefreshCw className={`w-4 h-4 ${actionLoading === s._id ? 'animate-spin' : ''}`} /></button>
                          {!['CANCELLED','DELIVERED','RTO_DELIVERED'].includes(s.status) && (
                            <button onClick={() => { setOverrideModal(s._id); setOverrideStatus(s.status); }} className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600" title="Override">⚡</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)</span>
                <div className="flex gap-2">
                  <button onClick={() => fetchShipments(pagination.page - 1)} disabled={pagination.page <= 1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => fetchShipments(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminShipments;
