import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, Download, Search, ChevronDown, ChevronUp,
  Clock, RefreshCw, User, Package, ShoppingBag, Settings, Store,
} from 'lucide-react';
import { getAuditLogs, getAuditStats, exportAuditLogs } from '../services/auditLogService';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const ENTITIES = ['All', 'Product', 'Seller', 'Order', 'Settings', 'User'];
const ACTIONS  = ['All', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'STATUS_CHANGE', 'REFUND', 'BLOCK', 'UNBLOCK', 'SETTINGS_UPDATE'];

const ACTION_META = {
  CREATE:          { label: 'Create',          color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  UPDATE:          { label: 'Update',          color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  DELETE:          { label: 'Delete',          color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  APPROVE:         { label: 'Approve',         color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  REJECT:          { label: 'Reject',          color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
  STATUS_CHANGE:   { label: 'Status Change',   color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  REFUND:          { label: 'Refund',          color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
  BLOCK:           { label: 'Block',           color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  UNBLOCK:         { label: 'Unblock',         color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  SETTINGS_UPDATE: { label: 'Settings Update', color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
};

const ENTITY_ICONS = {
  Product:  Package,
  Seller:   Store,
  Order:    ShoppingBag,
  Settings: Settings,
  User:     User,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const relativeTime = (ts) => {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const initials = (email = '') => {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '??';
};

// ─── Diff Viewer ──────────────────────────────────────────────────────────────
const DiffViewer = ({ before, after }) => {
  if (!before && !after) return <span className="text-gray-400 text-xs">No diff available</span>;
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  return (
    <div className="grid grid-cols-2 gap-3 mt-2">
      <div className="bg-red-50 rounded-lg p-3 border border-red-100">
        <p className="text-[10px] font-medium  tracking-wide text-red-400 mb-2">Before</p>
        {before ? keys.map(k => (
          <div key={k} className="flex items-start gap-2 text-xs mb-1">
            <span className="font-medium text-red-500 min-w-[80px] shrink-0">{k}:</span>
            <span className="text-red-700 break-all">{JSON.stringify(before[k])}</span>
          </div>
        )) : <span className="text-xs text-red-400">—</span>}
      </div>
      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
        <p className="text-[10px] font-medium  tracking-wide text-emerald-400 mb-2">After</p>
        {after ? keys.map(k => (
          <div key={k} className="flex items-start gap-2 text-xs mb-1">
            <span className="font-medium text-emerald-600 min-w-[80px] shrink-0">{k}:</span>
            <span className="text-emerald-700 break-all">{JSON.stringify(after[k])}</span>
          </div>
        )) : <span className="text-xs text-emerald-400">—</span>}
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: CardIcon, color, bg }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
      {React.createElement(CardIcon, { size: 22, className: color })}
    </div>
    <div>
      <p className="text-2xl font-medium text-gray-900">{value ?? '—'}</p>
      <p className="text-[10px] font-medium text-gray-400  tracking-wide mt-0.5">{label}</p>
    </div>
  </div>
);

// ─── Row ──────────────────────────────────────────────────────────────────────
const AuditRow = ({ log, index }) => {
  const [expanded, setExpanded] = useState(false);
  const meta   = ACTION_META[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
  const EIcon  = ENTITY_ICONS[log.entity] || ShieldCheck;

  return (
    <>
      <tr className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <td className="px-5 py-4 text-center text-xs font-medium text-gray-400">{index}</td>

        {/* Timestamp */}
        <td className="px-5 py-4">
          <div className="text-xs font-medium text-gray-700">{relativeTime(log.timestamp)}</div>
          <div className="text-[10px] font-medium text-gray-400 mt-0.5">{formatDate(log.timestamp)}</div>
        </td>

        {/* Admin */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-medium shrink-0">
              {initials(log.adminEmail)}
            </div>
            <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{log.adminEmail || '—'}</span>
          </div>
        </td>

        {/* Action */}
        <td className="px-5 py-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium  tracking-wider ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </td>

        {/* Entity */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <EIcon size={14} className="text-gray-400 shrink-0" />
            <div>
              <div className="text-xs font-medium text-gray-700">{log.entity}</div>
              <div className="text-[10px] font-medium text-gray-400 truncate max-w-[120px]">{log.entityLabel || log.entityId || '—'}</div>
            </div>
          </div>
        </td>

        {/* IP */}
        <td className="px-5 py-4 text-[10px] font-medium text-gray-400 font-mono">{log.ip || '—'}</td>

        {/* Expand toggle */}
        <td className="px-5 py-4 text-right">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
            {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>
        </td>
      </tr>

      {/* Diff row */}
      {expanded && (
        <tr className="bg-gray-50/60">
          <td colSpan={7} className="px-6 pb-4 pt-2">
            <DiffViewer before={log.before} after={log.after} />
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AuditLogPage = () => {
  const [logs,       setLogs]       = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const [filters, setFilters] = useState({
    entity:   '',
    action:   '',
    dateFrom: '',
    dateTo:   '',
    search:   '',
  });
  const [page, setPage] = useState(1);

  // Fetch logs
  const fetchLogs = useCallback(async (currentPage = 1, currentFilters = filters) => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: 50 };
      if (currentFilters.entity && currentFilters.entity !== 'All') params.entity = currentFilters.entity;
      if (currentFilters.action && currentFilters.action !== 'All') params.action = currentFilters.action;
      if (currentFilters.dateFrom) params.dateFrom = currentFilters.dateFrom;
      if (currentFilters.dateTo)   params.dateTo   = currentFilters.dateTo;
      if (currentFilters.search)   params.search   = currentFilters.search.trim();

      const res = await getAuditLogs(params);
      setLogs(res.data?.logs || []);
      setPagination(res.data?.pagination || { total: 0, page: 1, pages: 1 });
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getAuditStats();
      setStats(res.data?.stats || null);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchLogs(page, filters); }, [fetchLogs, page, filters]);

  const handleSearch = () => {
    if (filters.dateFrom && filters.dateTo && new Date(filters.dateTo) < new Date(filters.dateFrom)) {
      toast.error("'To' date cannot be before 'From' date");
      return;
    }
    setPage(1);
    fetchLogs(1, filters);
  };

  const handleFilterChange = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleExport = async () => {
    if (filters.dateFrom && filters.dateTo && new Date(filters.dateTo) < new Date(filters.dateFrom)) {
      toast.error("'To' date cannot be before 'From' date");
      return;
    }
    try {
      setExporting(true);
      const params = {};
      if (filters.entity && filters.entity !== 'All') params.entity = filters.entity;
      if (filters.action && filters.action !== 'All') params.action = filters.action;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo)   params.dateTo   = filters.dateTo;
      if (filters.search)   params.search   = filters.search.trim();
      await exportAuditLogs(params);
      toast.success('Audit log exported successfully');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    const clean = { entity: '', action: '', dateFrom: '', dateTo: '', search: '' };
    setFilters(clean);
    setPage(1);
    fetchLogs(1, clean);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-sans text-left">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-medium text-gray-900 tracking-tight">Audit Trail</h1>
          <p className="text-xs md:text-sm font-medium text-gray-500 mt-1">Enterprise activity log.</p>
        </div>
        <button
          id="audit-export-btn"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95 disabled:opacity-60"
        >
          <Download size={16} />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Today"      value={stats?.today} icon={Clock}      color="text-blue-600"    bg="bg-blue-50" />
        <StatCard label="This Week"  value={stats?.week}  icon={RefreshCw}  color="text-indigo-600"  bg="bg-indigo-50" />
        <StatCard label="This Month" value={stats?.month} icon={ShieldCheck} color="text-violet-600" bg="bg-violet-50" />
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap gap-3">

          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="audit-search"
              type="text"
              placeholder="Search admin, entity, IP…"
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:border-indigo-300 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Entity */}
          <select
            id="audit-filter-entity"
            value={filters.entity}
            onChange={e => handleFilterChange('entity', e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:border-indigo-300 transition-all"
          >
            {ENTITIES.map(e => <option key={e} value={e === 'All' ? '' : e}>{e}</option>)}
          </select>

          {/* Action */}
          <select
            id="audit-filter-action"
            value={filters.action}
            onChange={e => handleFilterChange('action', e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:border-indigo-300 transition-all"
          >
            {ACTIONS.map(a => <option key={a} value={a === 'All' ? '' : a}>{a === 'All' ? 'All Actions' : ACTION_META[a]?.label || a}</option>)}
          </select>

          {/* Date From */}
          <input
            id="audit-date-from"
            type="date"
            value={filters.dateFrom}
            onChange={e => handleFilterChange('dateFrom', e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:border-indigo-300 transition-all"
            max={filters.dateTo || undefined}
          />

          {/* Date To */}
          <input
            id="audit-date-to"
            type="date"
            value={filters.dateTo}
            onChange={e => handleFilterChange('dateTo', e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:border-indigo-300 transition-all"
            min={filters.dateFrom || undefined}
          />

          {/* Buttons */}
          <button
            id="audit-apply-filter"
            onClick={handleSearch}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium  tracking-wide transition-all active:scale-95"
          >
            Apply
          </button>
          <button
            id="audit-reset-filter"
            onClick={handleReset}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-medium  tracking-wide transition-all"
          >
            Reset
          </button>
        </div>

        {pagination.total > 0 && (
          <p className="text-[11px] font-medium text-gray-400">
            Showing <span className="text-gray-700">{logs.length}</span> of <span className="text-gray-700">{pagination.total}</span> events
          </p>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['#', 'Timestamp', 'Admin', 'Action', 'Entity', 'IP', ''].map((h, i) => (
                  <th key={i} className="px-5 py-4 text-[10px] font-medium text-gray-500  tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium text-gray-400  tracking-wide">Loading audit logs…</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-50">
                      <ShieldCheck size={40} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-400  tracking-wide">No audit logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <AuditRow
                    key={log._id || idx}
                    log={log}
                    index={(pagination.page - 1) * 50 + idx + 1}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium  tracking-wide text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-gray-500 px-2">
            Page {page} of {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium  tracking-wide text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
