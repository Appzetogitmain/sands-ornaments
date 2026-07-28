import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, MousePointer2, Clock, Target, 
    Smartphone, Monitor, Globe, ArrowUpRight,
    Search, ShoppingCart, Heart, Activity, MapPin, Download
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import api from '../../../services/api';
import AdminStatsCard from '../components/AdminStatsCard';
import Loader from '../../shared/components/Loader';
import toast from 'react-hot-toast';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

const AnalyticsDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const leadsRef = React.useRef(null);

    const handleExport = () => {
        if (!data) return;
        const loadingToast = toast.loading("Generating analytics export...");
        try {
            const csvRows = [];
            const { overview, trafficTrends, deviceStats, funnel, countryStats, topPages } = data;
            
            // 1. Overview Section
            csvRows.push('"ANALYTICS SUMMARY OVERVIEW"');
            csvRows.push('"Metric","Value"');
            csvRows.push(`"Total Visitors","${overview.totalVisitors || 0}"`);
            csvRows.push(`"Active Visitors Now","${overview.activeVisitors || 0}"`);
            csvRows.push(`"Total Sessions","${overview.totalSessions || 0}"`);
            csvRows.push(`"Captured Leads","${overview.totalLeads || 0}"`);
            csvRows.push(`"Bounce Rate","${overview.bounceRate || 0}%"`);
            csvRows.push(`"Avg Session Duration","${Math.floor((overview.avgSessionDuration || 0) / 60)}m ${(overview.avgSessionDuration || 0) % 60}s"`);
            csvRows.push(''); // Empty separator
            
            // 2. Traffic Trends Section
            csvRows.push('"TRAFFIC TRENDS (LAST 30 DAYS)"');
            csvRows.push('"Date","Unique Visitors"');
            if (trafficTrends && trafficTrends.length > 0) {
                trafficTrends.forEach(trend => {
                    csvRows.push(`"${trend.date || ''}","${trend.uniqueVisitors || 0}"`);
                });
            }
            csvRows.push('');

            // 3. Device Distribution
            csvRows.push('"DEVICE DISTRIBUTION"');
            csvRows.push('"Device Type","Visitor Count"');
            if (deviceStats && deviceStats.length > 0) {
                deviceStats.forEach(device => {
                    csvRows.push(`"${device._id || 'Unknown'}","${device.count || 0}"`);
                });
            }
            csvRows.push('');

            // 4. Conversion Funnel
            csvRows.push('"CONVERSION FUNNEL"');
            csvRows.push('"Funnel Step","Step Count"');
            if (funnel && funnel.length > 0) {
                funnel.forEach(step => {
                    csvRows.push(`"${(step.step || '').replace('_', ' ').toUpperCase()}","${step.count || 0}"`);
                });
            }
            csvRows.push('');

            // 5. Country Traffic
            csvRows.push('"TOP COUNTRIES"');
            csvRows.push('"Country","Visitors"');
            if (countryStats && countryStats.length > 0) {
                countryStats.forEach(country => {
                    csvRows.push(`"${country._id || 'Unknown'}","${country.count || 0}"`);
                });
            }
            csvRows.push('');

            // 6. Top Pages
            csvRows.push('"MOST VISITED PAGES"');
            csvRows.push('"Page URL","Page Views"');
            if (topPages && topPages.length > 0) {
                topPages.forEach(page => {
                    csvRows.push(`"${page._id || ''}","${page.count || 0}"`);
                });
            }

            const csvContent = '\uFEFF' + csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Analytics report exported successfully", { id: loadingToast });
        } catch (err) {
            console.error("Export analytics failed:", err);
            toast.error("Failed to export analytics", { id: loadingToast });
        }
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('analytics/dashboard');
                if (res.data.success) {
                    setData(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <Loader fullPage={false} />;
    if (!data) return <div className="p-10 text-center">Failed to load analytics data.</div>;

    const { overview, trafficTrends, deviceStats, browserStats, countryStats, cityStats, topPages, productStats, funnel } = data;

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                <div className="text-left">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Analytics Overview</h1>
                    <p className="text-xs md:text-sm font-medium text-gray-500 mt-1">Comprehensive real-time tracking and audience engagement metrics.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap self-start md:self-auto"
                    title="Export Consolidated Analytics Report"
                >
                    <Download size={14} /> Export Report
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <AdminStatsCard 
                    label="TOTAL VISITORS" 
                    value={overview.totalVisitors} 
                    icon={Users} 
                    color="text-blue-500" 
                    bgColor="bg-blue-50" 
                    onClick={() => navigate('/admin/users')}
                />
                <AdminStatsCard 
                    label="ACTIVE NOW" 
                    value={overview.activeVisitors} 
                    icon={Activity} 
                    color="text-emerald-500" 
                    bgColor="bg-emerald-50" 
                    badge="LIVE" 
                    badgeColor="text-emerald-600"
                />
                <AdminStatsCard 
                    label="TOTAL SESSIONS" 
                    value={overview.totalSessions} 
                    icon={Clock} 
                    color="text-orange-500" 
                    bgColor="bg-orange-50" 
                />
                <AdminStatsCard 
                    label="CAPTURED LEADS" 
                    value={overview.totalLeads} 
                    icon={Target} 
                    color="text-pink-500" 
                    bgColor="bg-pink-50" 
                    onClick={() => leadsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                />
            </div>

            {/* Engagement Metrics */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bounce Rate</p>
                        <h4 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{overview.bounceRate}%</h4>
                    </div>
                    <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
                        <ArrowUpRight size={18} className={overview.bounceRate > 50 ? 'rotate-0' : 'rotate-180'} />
                    </div>
                </div>
                <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg. Session Duration</p>
                        <h4 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{Math.floor(overview.avgSessionDuration / 60)}m {overview.avgSessionDuration % 60}s</h4>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center">
                        <Clock size={18} />
                    </div>
                </div>
            </div>

            {/* Traffic Trends */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Traffic Trends (Last 30 Days)</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trafficTrends}>
                            <defs>
                                <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3E2723" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3E2723" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="date" hide />
                            <YAxis hide />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="uniqueVisitors" stroke="#3E2723" strokeWidth={3} fillOpacity={1} fill="url(#colorVis)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Device Distribution */}
                <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Device Distribution</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deviceStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="_id"
                                >
                                    {deviceStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Conversion Funnel</h3>
                    <div className="space-y-4">
                        {funnel.map((item, idx) => {
                            const percentage = idx === 0 ? 100 : Math.round((item.count / funnel[0].count) * 100);
                            return (
                                <div key={item.step} className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium text-gray-600 tracking-wide uppercase">
                                        <span>{item.step.replace('_', ' ')}</span>
                                        <span className="font-semibold">{item.count} ({percentage}%)</span>
                                    </div>
                                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#3E2723] transition-all duration-1000" 
                                            style={{ width: `${percentage}%`, opacity: 1 - (idx * 0.2) }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Top Countries */}
                <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Top Countries</h3>
                    <div className="space-y-4">
                        {countryStats?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <Globe className="text-gray-400" size={16} />
                                    <span className="text-sm font-medium text-gray-700">{item._id || 'UNKNOWN'}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{item.count} visitors</span>
                            </div>
                        ))}
                        {(!countryStats || countryStats.length === 0) && <p className="text-[10px] font-bold text-gray-400 uppercase text-center py-4">Collecting data...</p>}
                    </div>
                </div>

                {/* Top Cities */}
                <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Top Cities</h3>
                    <div className="space-y-4">
                        {cityStats?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <MapPin className="text-gray-400" size={16} />
                                    <span className="text-sm font-medium text-gray-700">{item._id || 'UNKNOWN'}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{item.count} visitors</span>
                            </div>
                        ))}
                        {(!cityStats || cityStats.length === 0) && <p className="text-[10px] font-bold text-gray-400 uppercase text-center py-4">Collecting data...</p>}
                    </div>
                </div>
            </div>

            {/* Recent Leads Table */}
            <div ref={leadsRef} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 md:p-5 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Recent Captured Leads</h3>
                    <Target size={16} className="text-gray-400" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Cart Items</th>
                                <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.recentLeads?.map((lead, idx) => (
                                <tr 
                                    key={idx} 
                                    className="hover:bg-gray-50/50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{lead.email}</span>
                                            <span className="text-xs font-light text-gray-500 mt-0.5">{lead.phone || 'No phone'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-gray-100 text-xs font-medium text-gray-600 rounded-md capitalize">
                                            {lead.source?.replace('_', ' ').toLowerCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                                        {lead.lastCart?.length || 0} items
                                    </td>
                                    <td className="px-6 py-4 text-sm font-light text-gray-500">
                                        {new Date(lead.capturedAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Viewed Products */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-6">Top Engaging Products</h3>
                    <div className="space-y-4">
                        {productStats.map((prod, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => navigate(prod._id ? `/admin/products/view/${prod._id}` : '/admin/products')}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
                                        {idx + 1}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{prod.name}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{prod.views} views</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Traffic Pages */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-6">Most Visited Pages</h3>
                    <div className="space-y-4">
                        {topPages.map((page, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                <span className="text-sm font-medium text-gray-600 truncate max-w-[250px]">{page._id}</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-12 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500" 
                                            style={{ width: `${(page.views / topPages[0].views) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800">{page.views}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
