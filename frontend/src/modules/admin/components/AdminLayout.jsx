import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Package, ShoppingCart, Users, Image as ImageIcon,
    Bell, ChevronRight, ChevronDown, Star, HelpCircle, LogOut, Menu, X, ListTree,
    FileText, MessageSquare, Ticket, Settings, Plus, List, BookOpen,
    Clock, RefreshCw, RefreshCcw, RotateCcw, Boxes, ClipboardList, MapPin, Truck, CheckCircle2, XCircle, Percent,
    AlertTriangle, FileBarChart, Store, ShieldCheck, User, Wallet, CreditCard
} from 'lucide-react';
import { adminService } from '../services/adminService';
import logo from '@assets/sands-logo.png';
import logoName from '@assets/sands-logoname.png';

const AdminLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const location = useLocation();
    const navigate = useNavigate();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { name: 'Analytics', icon: FileBarChart, path: '/admin/analytics' },
        { name: 'Audit Trail', icon: ShieldCheck, path: '/admin/audit-logs' },
        { name: 'Categories', icon: ImageIcon, path: '/admin/categories' },

        {
            name: 'Products',
            icon: Package,
            path: '/admin/products',
            subItems: [
                { name: 'Add Product', path: '/admin/products/new', icon: Plus },
                { name: 'Product List', path: '/admin/products', icon: List }
            ]
        },
        { name: 'Coupons', icon: Ticket, path: '/admin/coupons' },
        {
            name: 'Orders',
            icon: ShoppingCart,
            path: '/admin/orders',
            subItems: [
                // Counts should come from admin-side stats APIs (not the user ShopContext).
                { name: 'All Orders', path: '/admin/orders?status=all', icon: ShoppingCart },
                { name: 'Pending', path: '/admin/orders?status=pending', icon: Clock },
                { name: 'Received', path: '/admin/orders?status=received', icon: CheckCircle2 },
                { name: 'Processed', path: '/admin/orders?status=processed', icon: ClipboardList },
                { name: 'Shipped', path: '/admin/orders?status=shipped', icon: Truck },
                { name: 'Out for Delivery', path: '/admin/orders?status=out-for-delivery', icon: MapPin },
                { name: 'Delivered', path: '/admin/orders?status=delivered', icon: CheckCircle2 },
                { name: 'Cancelled', path: '/admin/orders?status=cancelled', icon: XCircle },
            ]
        },
        { name: 'Returns', icon: RotateCcw, path: '/admin/returns' },
        { name: 'Replacements', icon: RefreshCw, path: '/admin/replacements' },
        { name: 'Shipping', icon: Truck, path: '/admin/shipping' },
        { name: 'Direct Sales', icon: Store, path: '/admin/direct-sales' },
        {
            name: 'Inventory',
            icon: Boxes,
            path: '/admin/inventory',
            subItems: [
                { name: 'Stock Adjustment', path: '/admin/inventory/adjust', icon: RefreshCcw },
                { name: 'Stock History', path: '/admin/inventory/history', icon: Clock },
                { name: 'Low Stock Alerts', path: '/admin/inventory/alerts', icon: AlertTriangle },
                { name: 'Reports', path: '/admin/inventory/reports', icon: FileBarChart }
            ]
        },
        { name: 'Sellers', icon: Store, path: '/admin/sellers' },
        { name: 'Users', icon: Users, path: '/admin/users' },
        {
            name: 'Commission',
            icon: Wallet,
            path: '/admin/commission',
            subItems: [
                { name: 'Report', path: '/admin/commission/report', icon: FileBarChart },
                { name: 'Tier Settings', path: '/admin/commission/tiers', icon: Settings },
                { name: 'Seller Payouts', path: '/admin/payout', icon: CreditCard }
            ]
        },
        { name: 'Reviews', icon: Star, path: '/admin/reviews' },
        {
            name: 'Notifications',
            icon: Bell,
            path: '/admin/notifications',
            subItems: [
                { name: 'Create Notification', path: '/admin/notifications/add', icon: Plus },
                { name: 'Notification List', path: '/admin/notifications', icon: List },
                { name: 'Global Broadcasts', path: '/admin/broadcasts', icon: Bell }
            ]
        },
        {
            name: 'Support',
            icon: HelpCircle,
            path: '/admin/support',
            subItems: [
                { name: 'Support Tickets', path: '/admin/support', icon: Ticket },
                { name: 'Contact Inquiries', path: '/admin/support/inquiries', icon: MessageSquare }
            ]
        },

        {
            name: 'Pages',
            icon: FileText,
            path: '/admin/pages',
            subItems: [
                { name: 'Privacy Policy', path: '/admin/pages/privacy-policy', icon: FileText },
                { name: 'Terms & Conditions', path: '/admin/pages/terms-conditions', icon: FileText },
                { name: 'Return & Refund', path: '/admin/pages/return-refund-policy', icon: FileText },
                { name: 'Shipping Policy', path: '/admin/pages/shipping-policy', icon: FileText },
                { name: 'Cancellation Policy', path: '/admin/pages/cancellation-policy', icon: FileText },
                { name: 'Jewelry Care', path: '/admin/pages/jewelry-care', icon: FileText },
                { name: 'Warranty Info', path: '/admin/pages/warranty-info', icon: FileText },
                { name: 'Our Craftsmanship', path: '/admin/pages/our-craftsmanship', icon: FileText },
                { name: 'Customization', path: '/admin/pages/customization', icon: FileText },
                { name: 'About Us', path: '/admin/pages/about-us', icon: FileText },
                { name: 'Seller Terms', path: '/admin/seller-terms', icon: FileText },
            ]
        },
        { name: 'Blogs', icon: BookOpen, path: '/admin/blogs' },
        { name: 'Homepage Sections', icon: LayoutDashboard, path: '/admin/sections' },
        { name: 'Metal Pricing', icon: RefreshCcw, path: '/admin/metal-pricing' },
        { name: 'Tax Settings', icon: Percent, path: '/admin/tax-settings' },
        { name: 'Global Settings', icon: Settings, path: '/admin/settings' },
    ];

    // Notification state with ref for count tracking
    const [notifications, setNotifications] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [latestNotif, setLatestNotif] = useState(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const prevCountRef = React.useRef(0);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.profile-dropdown-container')) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    React.useEffect(() => {
        let mounted = true;
        let hideTimer = null;

        const checkNotifications = async () => {
            const allNotifs = await adminService.getAdminNotifications({ limit: 100 });
            if (!mounted) return;

            const safeNotifications = Array.isArray(allNotifs) ? allNotifs : [];
            const unreadItems = safeNotifications.filter((n) => !n?.isRead);
            const unreadCount = unreadItems.length;

            if (unreadCount > prevCountRef.current) {
                const newest = unreadItems[0];
                if (newest) {
                    setLatestNotif(newest);
                    setShowPopup(true);
                    if (hideTimer) clearTimeout(hideTimer);
                    hideTimer = setTimeout(() => setShowPopup(false), 8000);
                }
            }

            prevCountRef.current = unreadCount;
            setNotifications(safeNotifications);
        };

        checkNotifications();
        const interval = setInterval(checkNotifications, 10000);
        return () => {
            mounted = false;
            clearInterval(interval);
            if (hideTimer) clearTimeout(hideTimer);
        };
    }, []);

    const unreadCount = notifications.filter((n) => !n?.isRead).length;

    // State for expanded menus
    const [expandedMenu, setExpandedMenu] = useState(() => {
        // Auto-expand if current path matches a subitem
        const activeItem = menuItems.find(item =>
            item.subItems?.some(sub => location.pathname === sub.path)
        );
        return activeItem ? activeItem.name : null;
    });

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
        navigate('/admin/login');
    };

    const handleMenuClick = (item) => {
        if (item.subItems) {
            setExpandedMenu(expandedMenu === item.name ? null : item.name);
            if (!isSidebarOpen) setIsSidebarOpen(true);

            // If the item itself has a path, navigate to it too
            if (item.path) navigate(item.path);
        } else {
            navigate(item.path);
            if (window.innerWidth <= 1024) {
                setIsSidebarOpen(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-x-hidden admin-font-reset">
            <style>{`
                .admin-font-reset, .admin-font-reset * {
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji" !important;
                }
                .sidebar-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
                }
                .sidebar-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .sidebar-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .sidebar-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                }
                .sidebar-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.25);
                }
            `}</style>
            {/* Sidebar Backdrop (Mobile only) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[90] lg:hidden backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar / Mobile Menu Drawer */}
            <aside
                className={`
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    fixed inset-y-0 left-0 z-[100] bg-[#3E2723] text-white transition-all duration-500 flex flex-col
                    w-[300px] lg:z-50 border-r border-white/10
                    ${isSidebarOpen ? 'lg:w-80' : 'lg:w-20'}
                `}
            >
                {/* Header Section */}
                <div className="h-16 flex items-center justify-center px-4 border-b border-white/10 shrink-0 relative bg-[#3E2723]">
                    {isSidebarOpen ? (
                        <img src={logoName} alt="Sands" className="h-13 lg:h-15 brightness-0 invert object-contain" />
                    ) : (
                        <img src={logo} alt="S" className="h-13 w-13 mx-auto brightness-0 invert object-contain" />
                    )}
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-2 hover:bg-white/10 rounded-full transition-colors absolute right-2"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Scrollable Container for Nav */}
                <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll bg-[#3E2723]" data-lenis-prevent>
                    <nav className="py-6 lg:py-4 px-4 lg:px-0 space-y-1 lg:space-y-0 pb-20">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path || (item.subItems && location.pathname.startsWith(item.path));
                            const isExpanded = expandedMenu === item.name;

                            return (
                                <div key={item.name} className="flex flex-col">
                                    <button
                                        onClick={() => handleMenuClick(item)}
                                        className={`flex items-center gap-4 px-6 py-4 lg:py-3.5 rounded-xl lg:rounded-none transition-all w-full text-left ${isActive && !item.subItems
                                            ? 'bg-[#8D6E63] text-white shadow-lg lg:scale-100 scale-[1.02]'
                                            : isActive && item.subItems ? 'text-white bg-white/5' : 'text-gray-200 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        <item.icon className={`w-6 h-6 lg:w-6 lg:h-6 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                                        {(isSidebarOpen || window.innerWidth <= 1024) && (
                                            <>
                                                <span className="text-lg lg:text-base font-semibold lg:font-semibold flex-1 tracking-wide">{item.name}</span>
                                                {item.subItems && (
                                                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <ChevronDown className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </button>

                                    {/* Submenu */}
                                    {item.subItems && isExpanded && (isSidebarOpen || window.innerWidth <= 1024) && (
                                        <div className="bg-black/20 lg:bg-transparent overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                            {item.subItems.map((subItem) => {
                                                const currentPath = location.pathname + location.search;
                                                const isSubActive = currentPath === subItem.path ||
                                                    (subItem.path.includes('?status=all') && location.pathname === subItem.path.split('?')[0] && !location.search);

                                                return (
                                                    <button
                                                        key={subItem.path}
                                                        onClick={() => navigate(subItem.path)}
                                                        className={`flex items-center gap-3 pl-14 pr-6 py-3 w-full text-left transition-all ${isSubActive
                                                            ? 'text-white bg-white/5 font-bold'
                                                            : 'text-white/90 hover:text-white hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <subItem.icon className="w-4 h-4" />
                                                        <span className="text-base font-medium">{subItem.name}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                </div>

                {/* Logout Section - Fixed at Bottom */}
                <div className="p-6 lg:p-4 border-t border-white/10 shrink-0 bg-[#3E2723]">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors w-full px-2 py-3 lg:py-2"
                    >
                        <LogOut className="w-6 h-6 lg:w-6 lg:h-6" />
                        {(isSidebarOpen || window.innerWidth <= 1024) && <span className="text-lg lg:text-base font-semibold">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-grow flex flex-col min-h-screen min-w-0 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-20'
                }`}>
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40 shrink-0 shadow-sm">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2.5 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 lg:border-none shadow-sm lg:shadow-none"
                        >
                            {isSidebarOpen && window.innerWidth > 1024 ? <Menu className="w-5 h-5 text-gray-500" /> : <Menu className="w-5 h-5 text-gray-500" />}
                        </button>
                        <h2 className="text-sm lg:text-lg font-bold text-gray-800 tracking-tight line-clamp-1">
                            {menuItems.find(i => i.path === location.pathname)?.name || 'Admin Panel'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-6">
                        {/* Notification Icon */}
                        <button
                            onClick={() => navigate('/admin/notifications')}
                            className="relative p-2.5 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 shadow-sm group"
                        >
                            <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-amber-600' : 'text-gray-500'} group-hover:scale-110 transition-transform`} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <div className="h-8 w-px bg-gray-100 mx-1 hidden sm:block" />

                        <div className="relative profile-dropdown-container">
                            <button 
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="flex items-center gap-2 lg:gap-3 focus:outline-none group"
                            >
                                <div className="text-right hidden sm:block font-medium group-hover:opacity-80 transition-opacity">
                                    <p className="text-[11px] lg:text-sm text-gray-900 font-bold tracking-tight">Admin User</p>
                                    <p className="text-[9px] lg:text-xs text-gray-500 font-black uppercase tracking-widest mt-0.5">Super Admin</p>
                                </div>
                                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#3E2723] text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-[#3E2723]/20 border border-white/10 group-hover:scale-105 transition-transform">
                                    A
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileDropdownOpen && (
                                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-4 duration-200 z-[200]">
                                    <div className="px-4 py-3 border-b border-gray-100 mb-1 sm:hidden">
                                        <p className="text-sm text-gray-900 font-bold">Admin User</p>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Super Admin</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setIsProfileDropdownOpen(false);
                                            navigate('/admin/settings');
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#3E2723] flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                            <Settings className="w-4 h-4" />
                                        </div>
                                        Global Settings
                                    </button>
                                    <div className="h-px bg-gray-100 my-1 mx-2" />
                                    <button 
                                        onClick={() => {
                                            setIsProfileDropdownOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                            <LogOut className="w-4 h-4" />
                                        </div>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <div className="flex-grow min-h-0 bg-gray-50 p-4 lg:p-8 space-y-6 relative">
                    {/* Floating Notification Popup */}
                    {showPopup && latestNotif && (
                        <div className="fixed top-20 right-8 z-[200] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in slide-in-from-right-8 fade-in duration-500 overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                                    <Bell className="w-5 h-5 text-amber-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight truncate">{latestNotif.title}</h4>
                                    <p className="text-[11px] text-gray-500 font-bold mt-1 line-clamp-2 leading-relaxed uppercase tracking-tight">{latestNotif.message}</p>
                                    <button
                                        onClick={() => {
                                            navigate(latestNotif.link || '/admin/notifications');
                                            setShowPopup(false);
                                        }}
                                        className="text-[10px] font-black text-[#3E2723] uppercase tracking-widest mt-3 hover:underline"
                                    >
                                        View Details
                                    </button>
                                </div>
                                <button onClick={() => setShowPopup(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="max-w-[1600px] mx-auto w-full min-w-0 animate-in fade-in duration-500 pb-10 lg:pb-14">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;

