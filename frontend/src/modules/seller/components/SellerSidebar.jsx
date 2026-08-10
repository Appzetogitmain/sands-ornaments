import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Plus,
    List,
    ShoppingBag,
    ScanLine,
    LogOut,
    X,
    ChevronDown,
    Boxes,
    RotateCcw,
    RefreshCcw,
    AlertTriangle,
    Users,
    UserCircle,
    QrCode,
    BarChart3,
    Bell,
    Truck,
    MapPin,
    Wallet,
    CreditCard
} from 'lucide-react';
import logo from '@assets/sands-logo.png';
import logoName from '@assets/sands-logoname.png';
import { useAuth } from '../../../context/AuthContext';

const SellerSidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const isPathMatch = (pathname, targetPath) => (
        pathname === targetPath || pathname.startsWith(`${targetPath}/`)
    );

    const menuItems = [
        { name: 'Overview', icon: LayoutDashboard, path: '/seller/dashboard' },
        {
            name: 'Products',
            icon: Package,
            path: '/seller/products',
            subItems: [
                { name: 'Product List', path: '/seller/products', icon: List },
                { name: 'Add Product', path: '/seller/products/new', icon: Plus }
            ]
        },
        {
            name: 'Inventory',
            icon: Boxes,
            path: '/seller/inventory',
            subItems: [
                { name: 'Overview', path: '/seller/inventory', icon: Boxes },
                { name: 'Adjust Stock', path: '/seller/inventory/adjust', icon: Plus },
                { name: 'Stock History', path: '/seller/inventory/history', icon: RotateCcw },
                { name: 'Low Stock Alerts', path: '/seller/inventory/alerts', icon: AlertTriangle },
                { name: 'Reports', path: '/seller/inventory/reports', icon: Package }
            ]
        },
        { name: 'Orders', icon: ShoppingBag, path: '/seller/orders' },
        {
            name: 'Shipping',
            icon: Truck,
            path: '/seller/shipments',
            subItems: [
                { name: 'Shipments', path: '/seller/shipments', icon: Truck },
                { name: 'Pickup Locations', path: '/seller/pickup-locations', icon: MapPin },
            ]
        },
        { name: 'Returns', icon: RotateCcw, path: '/seller/returns' },
        { name: 'Replacements', icon: RefreshCcw, path: '/seller/replacements' },
        { name: 'Customers', icon: Users, path: '/seller/customers' },
        { name: 'Analytics', icon: BarChart3, path: '/seller/analytics' },
        { name: 'Commission', icon: Wallet, path: '/seller/commission' },
        { name: 'Wallet & Payouts', icon: CreditCard, path: '/seller/wallet' },
        { name: 'Notifications', icon: Bell, path: '/seller/notifications' },
        {
            name: 'Direct Sales',
            icon: ScanLine,
            path: '/seller/offline-sale',
            subItems: [
                { name: 'Terminal', path: '/seller/offline-sale', icon: ScanLine },
                { name: 'Scanner', path: '/seller/qr-scanner', icon: QrCode },
                { name: 'History', path: '/seller/direct-sales', icon: List }
            ]
        },
        { name: 'Metal Pricing', icon: RefreshCcw, path: '/seller/metal-pricing' },
        { name: 'Profile', icon: UserCircle, path: '/seller/profile' }
    ];

    const [expandedMenu, setExpandedMenu] = useState(() => {
        const activeItem = menuItems.find(item =>
            item.subItems?.some(sub => isPathMatch(location.pathname, sub.path))
        );
        return activeItem ? activeItem.name : null;
    });

    const handleLogout = () => {
        logout();
        navigate('/seller/login');
    };

    const handleMenuClick = (item) => {
        if (item.subItems) {
            setExpandedMenu(expandedMenu === item.name ? null : item.name);
            if (!isSidebarOpen) setIsSidebarOpen(true);
        } else {
            navigate(item.path);
            if (window.innerWidth <= 1024) {
                setIsSidebarOpen(false);
            }
        }
    };

    return (
        <aside
            className={`
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                fixed inset-y-0 left-0 z-[100] bg-[#3E2723] text-white transition-all duration-500 flex flex-col
                w-[300px] lg:z-50 border-r border-white/10
                ${isSidebarOpen ? 'lg:w-80' : 'lg:w-20'}
            `}
        >
            <div className="h-16 flex items-center justify-center px-4 border-b border-white/10 shrink-0 relative bg-[#3E2723]">
                {isSidebarOpen ? (
                    <img src={logoName} alt="Sands" className="h-13 lg:h-15 brightness-0 invert object-contain" />
                ) : (
                    <img src={logo} alt="S" className="h-13 w-13 mx-auto brightness-0 invert object-contain" />
                )}
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden p-2 hover:bg-white/10 rounded-full transition-colors absolute right-2"
                >
                    <X className="w-6 h-6 text-gray-400" />
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll bg-[#3E2723]" data-lenis-prevent>
                <nav className="py-6 lg:py-4 px-4 lg:px-0 space-y-1 lg:space-y-0 pb-20">
                    {menuItems.map((item) => {
                        const relatedPrefixes = (() => {
                            if (item.path === '/seller/orders') return ['/seller/order-details'];
                            if (item.path === '/seller/returns') return ['/seller/return-details'];
                            if (item.path === '/seller/replacements') return ['/seller/replacement-details'];
                            if (item.path === '/seller/customers') return ['/seller/customer-details'];
                            if (item.path === '/seller/direct-sales') return ['/seller/direct-sales'];
                            return [];
                        })();

                        const isActive = isPathMatch(location.pathname, item.path)
                            || relatedPrefixes.some((p) => location.pathname.startsWith(`${p}/`))
                            || (item.subItems && item.subItems.some((sub) => isPathMatch(location.pathname, sub.path)));
                        const isExpanded = expandedMenu === item.name;

                        return (
                            <div key={item.name} className="flex flex-col">
                                <button
                                    onClick={() => handleMenuClick(item)}
                                    className={`flex items-center gap-4 px-6 py-3 transition-all w-full text-left ${isActive && !item.subItems
                                        ? 'bg-white/10 text-white border-l-2 border-white'
                                        : isActive && item.subItems ? 'text-white bg-white/5 border-l-2 border-white/50' : 'text-white/60 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-white/60'}`} />
                                    {(isSidebarOpen || window.innerWidth <= 1024) && (
                                        <>
                                            <span className={`text-sm tracking-wide flex-1 ${isActive ? 'font-medium' : 'font-light'}`}>{item.name}</span>
                                            {item.subItems && (
                                                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                    <ChevronDown className="w-4 h-4 opacity-50" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </button>

                                {item.subItems && isExpanded && (isSidebarOpen || window.innerWidth <= 1024) && (
                                    <div className="bg-black/10 lg:bg-transparent overflow-hidden animate-in slide-in-from-top-2 duration-200 py-1">
                                        {item.subItems.map((subItem) => {
                                            const isSubActive = location.pathname === subItem.path;
                                            return (
                                                <button
                                                    key={subItem.path}
                                                    onClick={() => {
                                                        navigate(subItem.path);
                                                        if (window.innerWidth <= 1024) {
                                                            setIsSidebarOpen(false);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-3 pl-14 pr-6 py-2.5 w-full text-left transition-all ${isSubActive
                                                        ? 'text-white font-medium bg-white/5'
                                                        : 'text-white/60 hover:text-white hover:bg-white/5 font-light'
                                                        }`}
                                                >
                                                    <subItem.icon className="w-4 h-4 opacity-80" />
                                                    <span className="text-sm tracking-wide">{subItem.name}</span>
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

            <div className="py-2 border-t border-white/10 shrink-0 bg-[#3E2723]">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 text-white/60 hover:text-white hover:bg-white/5 transition-all w-full px-6 py-3 border-l-2 border-transparent font-light"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0 opacity-80" />
                    {(isSidebarOpen || window.innerWidth <= 1024) && <span className="text-sm tracking-wide">Logout</span>}
                </button>
            </div>
        </aside>
    );
};

export default SellerSidebar;

