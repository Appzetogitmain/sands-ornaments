import React from 'react';
import { Package, MapPin, Clock, CheckCircle, XCircle, Truck, AlertTriangle, RotateCcw } from 'lucide-react';

const STATUS_CONFIG = {
  CREATED:          { label: 'Created',           color: 'bg-blue-100 text-blue-700',    icon: Package },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled',  color: 'bg-indigo-100 text-indigo-700', icon: Clock },
  PICKED_UP:        { label: 'Picked Up',         color: 'bg-purple-100 text-purple-700', icon: Truck },
  IN_TRANSIT:       { label: 'In Transit',         color: 'bg-amber-100 text-amber-700',   icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  color: 'bg-orange-100 text-orange-700', icon: Truck },
  DELIVERED:        { label: 'Delivered',          color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  FAILED:           { label: 'Failed',            color: 'bg-red-100 text-red-700',       icon: XCircle },
  FAILED_ORDER_SAVE:{ label: 'Failed Order Save', color: 'bg-rose-100 text-rose-700',     icon: AlertTriangle },
  RTO_INITIATED:    { label: 'RTO Initiated',     color: 'bg-rose-100 text-rose-700',     icon: RotateCcw },
  RTO_DELIVERED:    { label: 'RTO Delivered',      color: 'bg-gray-100 text-gray-700',     icon: RotateCcw },
  CANCELLED:        { label: 'Cancelled',         color: 'bg-gray-100 text-gray-500',     icon: XCircle },
};

const ShipmentTimeline = ({ timeline = [], currentStatus = '' }) => {
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.CREATED;
  const StatusIcon = config.icon;

  const sortedTimeline = [...timeline].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Shipment Timeline</h3>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
        {sortedTimeline.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No timeline events yet</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-gray-200" />

            {sortedTimeline.map((entry, idx) => {
              const entryConfig = STATUS_CONFIG[entry.status] || { label: entry.status, color: 'bg-gray-100 text-gray-600', icon: Clock };
              const EntryIcon = entryConfig.icon;
              const isFirst = idx === 0;

              return (
                <div key={idx} className="relative pl-10 pb-5 last:pb-0">
                  {/* Dot */}
                  <div className={`absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${isFirst ? 'bg-[#3E2723]' : 'bg-gray-300'}`} />

                  <div className={`${isFirst ? 'opacity-100' : 'opacity-70'}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${entryConfig.color}`}>
                        <EntryIcon className="w-3 h-3" />
                        {entryConfig.label}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(entry.date).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {entry.message && (
                      <p className="text-xs text-gray-600 mt-0.5">{entry.message}</p>
                    )}
                    {entry.location && (
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {entry.location}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export { STATUS_CONFIG };
export default ShipmentTimeline;
