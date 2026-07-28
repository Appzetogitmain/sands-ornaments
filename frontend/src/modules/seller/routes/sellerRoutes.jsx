import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import SellerLayout from '../components/SellerLayout';
import SellerDashboard from '../pages/SellerDashboard';
import SellerProducts from '../pages/SellerProducts';
import SellerProductEditor from '../pages/SellerProductEditor';
import ProductBarcodes from '../pages/ProductBarcodes';
import OfflineSale from '../pages/OfflineSale';
import QrScannerPage from '../pages/QrScannerPage';
import SellerDirectSales from '../pages/SellerDirectSales';
import SellerDirectSaleDetail from '../pages/SellerDirectSaleDetail';
import SellerLogin from '../pages/SellerLogin';
import SellerRegister from '../pages/SellerRegister';
import SellerOrders from '../pages/SellerOrders';
import SellerOrderDetail from '../pages/SellerOrderDetail';
import SellerReturns from '../pages/SellerReturns';
import SellerReturnDetail from '../pages/SellerReturnDetail';
import SellerReplacements from '../pages/SellerReplacements';
import SellerReplacementDetail from '../pages/SellerReplacementDetail';
import SellerCustomers from '../pages/SellerCustomers';
import SellerCustomerDetail from '../pages/SellerCustomerDetail';
import SellerProfile from '../pages/SellerProfile';
import SellerMetalPricing from '../pages/SellerMetalPricing';
import SellerInventory from '../pages/SellerInventory';
import SellerNotifications from '../pages/SellerNotifications';
import SellerShipments from '../pages/SellerShipments';
import SellerPickupLocations from '../pages/SellerPickupLocations';
import SellerStockAdjustmentPage from '../pages/inventory/SellerStockAdjustmentPage';
import SellerStockHistoryPage from '../pages/inventory/SellerStockHistoryPage';
import SellerLowStockAlertsPage from '../pages/inventory/SellerLowStockAlertsPage';
import SellerInventoryReportsPage from '../pages/inventory/SellerInventoryReportsPage';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import SellerAnalytics from '../pages/SellerAnalytics';
import SellerCommission from '../pages/SellerCommission';
import SellerWallet from '../pages/SellerWallet';
import SellerSupport from '../pages/SellerSupport';
import DynamicPage from '../../user/pages/DynamicPage';

// Protected Route Component for Seller
const SellerProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div>Loading...</div>;

    if (!user || user.role !== 'seller') {
        return <Navigate to="/seller/login" replace />;
    }

    if (user.status !== 'APPROVED') {
        // If unapproved, allow them to view / edit their profile
        if (location.pathname === '/seller/profile') {
            return children;
        }
        return <Navigate to="/seller/profile" replace />;
    }

    return children;
};

const SellerRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<SellerLogin />} />
            <Route path="/register" element={<SellerRegister />} />
            <Route path="/privacy-policy" element={<DynamicPage slug="seller-privacy-policy" />} />
            <Route path="/support" element={<SellerSupport />} />
            <Route path="/add-product" element={<Navigate to="/seller/products/new" replace />} />
            
            <Route path="/*" element={
                <SellerProtectedRoute>
                    <SellerLayout>
                        <Routes>
                            <Route path="/dashboard" element={<SellerDashboard />} />
                            <Route path="/products" element={<SellerProducts />} />
                            <Route path="/products/new" element={<SellerProductEditor />} />
                            <Route path="/products/edit/:id" element={<SellerProductEditor />} />
                            <Route path="/products/view/:id" element={<SellerProductEditor />} />
                            <Route path="/product-barcodes/:id" element={<ProductBarcodes />} />
                            <Route path="/offline-sale" element={<OfflineSale />} />
                            <Route path="/qr-scanner" element={<QrScannerPage />} />
                            <Route path="/direct-sales" element={<SellerDirectSales />} />
                            <Route path="/direct-sales/:id" element={<SellerDirectSaleDetail />} />
                            <Route path="/inventory" element={<SellerInventory />} />
                            <Route path="/inventory/adjust" element={<SellerStockAdjustmentPage />} />
                            <Route path="/inventory/history" element={<SellerStockHistoryPage />} />
                            <Route path="/inventory/alerts" element={<SellerLowStockAlertsPage />} />
                            <Route path="/inventory/reports" element={<SellerInventoryReportsPage />} />
                            <Route path="/orders" element={<SellerOrders />} />
                            <Route path="/order-details/:id" element={<SellerOrderDetail />} />
                            <Route path="/shipments" element={<SellerShipments />} />
                            <Route path="/pickup-locations" element={<SellerPickupLocations />} />
                            <Route path="/returns" element={<SellerReturns />} />
                            <Route path="/return-details/:id" element={<SellerReturnDetail />} />
                            <Route path="/replacements" element={<SellerReplacements />} />
                            <Route path="/replacement-details/:id" element={<SellerReplacementDetail />} />
                            <Route path="/customers" element={<SellerCustomers />} />
                            <Route path="/customer-details/:id" element={<SellerCustomerDetail />} />
                            <Route path="/analytics" element={<SellerAnalytics />} />
                            <Route path="/commission" element={<SellerCommission />} />
                            <Route path="/wallet" element={<SellerWallet />} />
                            <Route path="/notifications" element={<SellerNotifications />} />
                            <Route path="/profile" element={<SellerProfile />} />
                            <Route path="/metal-pricing" element={<SellerMetalPricing />} />
                            <Route path="/" element={<Navigate to="/seller/dashboard" replace />} />
                        </Routes>
                    </SellerLayout>
                </SellerProtectedRoute>
            } />
        </Routes>
    );
};

export default SellerRoutes;
