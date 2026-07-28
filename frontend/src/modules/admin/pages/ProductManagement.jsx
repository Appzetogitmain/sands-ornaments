import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Edit2, Trash2, Eye, Package, TrendingUp, Check, Plus, Download } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import BulkUpdateModal from '../components/BulkUpdateModal';
import { adminService } from '../services/adminService';
import toast from 'react-hot-toast';
import { exportToExcelCSV } from '../../../utils/exportUtils';

const ProductManagement = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const isSelectMode = searchParams.get('selectMode') === 'true';
    const returnUrl = searchParams.get('returnUrl') || '/admin/products';
    const sellerId = searchParams.get('sellerId') || '';

    const [searchTerm, setSearchTerm] = useState('');
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedIds, setSelectedIds] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [categoriesById, setCategoriesById] = useState({});
    
    // Advanced Filters & Pagination
    const [filtersObj, setFiltersObj] = useState({
        minPrice: '',
        maxPrice: '',
        inStock: 'all',
        sortBy: 'newest',
        page: 1,
        limit: 20
    });
    const [pagination, setPagination] = useState(null);

    const handleExport = async () => {
        const loadingToast = toast.loading("Generating product export...");
        try {
            const params = {
                search: searchTerm,
                category: selectedCategory === 'all' ? '' : selectedCategory,
                minPrice: filtersObj.minPrice,
                maxPrice: filtersObj.maxPrice,
                inStock: filtersObj.inStock === 'all' ? '' : filtersObj.inStock,
                sortBy: filtersObj.sortBy,
                sellerId: sellerId || '',
                page: 1,
                limit: Math.max(1000, pagination?.total || 1000)
            };
            const response = await adminService.getProducts(params);
            const exportProducts = response.products || [];
            if (exportProducts.length === 0) {
                toast.error("No products to export", { id: loadingToast });
                return;
            }

            const headers = [
                'name',
                'sku',
                'price',
                'stock',
                'categoryName',
                'sellerName',
                'status',
                'createdAt'
            ];
            const columnNames = [
                'Product Name',
                'SKU',
                'Price (INR)',
                'Stock Units',
                'Category',
                'Seller Shop',
                'Status',
                'Created At'
            ];

            const formattedProducts = exportProducts.map(p => {
                const primaryCat = p.categories && p.categories[0];
                const price = p.variants?.[0]?.price || p.price || 0;
                const stock = (p.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
                const sku = p.variants?.[0]?.sku || p.sku || 'N/A';

                return {
                    ...p,
                    sku,
                    price,
                    stock,
                    categoryName: primaryCat?.name || primaryCat?.category || categoriesById[p.category] || 'Uncategorized',
                    sellerName: p.sellerId?.shopName || p.sellerName || 'Platform',
                    status: p.active === false ? 'INACTIVE' : 'ACTIVE'
                };
            });

            exportToExcelCSV(formattedProducts, headers, columnNames, 'Products_Report');
            toast.success("Products report exported successfully", { id: loadingToast });
        } catch (err) {
            console.error("Export products failed:", err);
            toast.error("Failed to export products", { id: loadingToast });
        }
    };

    const fetchProducts = async (isLoadMore = false) => {
        try {
            if (!isLoadMore) setLoading(true);
            const params = {
                search: searchTerm,
                category: selectedCategory === 'all' ? '' : selectedCategory,
                minPrice: filtersObj.minPrice,
                maxPrice: filtersObj.maxPrice,
                inStock: filtersObj.inStock === 'all' ? '' : filtersObj.inStock,
                sortBy: filtersObj.sortBy,
                sellerId: sellerId || '',
                page: isLoadMore ? filtersObj.page + 1 : 1,
                limit: filtersObj.limit
            };
            
            const { products: data, pagination: pagin } = await adminService.getProducts(params);
            
            if (isLoadMore) {
                setProducts(prev => [...prev, ...data]);
                setFiltersObj(prev => ({ ...prev, page: prev.page + 1 }));
            } else {
                setProducts(data);
                setFiltersObj(prev => ({ ...prev, page: 1 }));
            }
            setPagination(pagin);
        } catch (err) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [selectedCategory, filtersObj.minPrice, filtersObj.maxPrice, filtersObj.inStock, filtersObj.sortBy, sellerId]);

    useEffect(() => {
        const loadCategories = async () => {
            const cats = await adminService.getCategories();
            const sorted = [...cats].sort((a, b) =>
                Number(a?.sortOrder ?? 0) - Number(b?.sortOrder ?? 0)
                || (a.name || '').localeCompare(b.name || '')
            );
            const map = sorted.reduce((acc, cat) => {
                acc[String(cat._id)] = cat.name;
                return acc;
            }, {});
            const options = [
                { label: 'All Categories', value: 'all' },
                ...sorted.map(cat => ({
                    label: `${cat.name}${cat.isActive === false ? ' (Inactive)' : ''}`,
                    value: cat._id
                }))
            ];
            setCategoryOptions(options);
            setCategoriesById(map);
        };
        loadCategories();
    }, []);

    // Use a separate debounced effect for search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleConfirmSelection = () => {
        const selectedProducts = products.filter(p => selectedIds.includes(p._id));
        localStorage.setItem('temp_selected_products', JSON.stringify(selectedProducts));
        navigate(returnUrl);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            const success = await adminService.deleteProduct(id);
            if (success) {
                setProducts(prev => prev.filter(p => p._id !== id));
                toast.success("Product deleted successfully");
            } else {
                toast.error("Failed to delete product");
            }
        }
    };

    const columns = [
        ...(isSelectMode ? [{
            header: '',
            render: (item) => (
                <div onClick={(e) => { e.stopPropagation(); toggleSelection(item._id); }} className="cursor-pointer">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedIds.includes(item._id) ? 'bg-[#3E2723] border-[#3E2723] text-white' : 'border-gray-300 bg-white'}`}>
                        {selectedIds.includes(item._id) && <Check size={12} strokeWidth={3} />}
                    </div>
                </div>
            )
        }] : []),
        {
            header: 'Product Name',
            render: (item) => (
                <div className="flex items-center py-1">
                    <span className="font-semibold text-gray-900 text-[13px] tracking-tight">{item.name}</span>
                </div>
            )
        },
        {
            header: 'Category',
            render: (item) => {
                const categories = item.categories || [];
                const primary = categories[0] || { name: 'Uncategorized' };
                return (
                    <div className="min-w-[140px] flex flex-col justify-center">
                        <span className="font-medium text-gray-900 text-xs">{primary.name || primary.category || 'Uncategorized'}</span>
                    </div>
                );
            }
        },
        {
            header: 'Price',
            render: (item) => {
                const price = item.variants?.[0]?.price || '0';
                return <span className="font-semibold text-gray-900 text-xs tabular-nums">₹{price}</span>;
            }
        },
        {
            header: 'Stock',
            render: (item) => {
                const totalStock = (item.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
                const inStock = totalStock > 0;
                return (
                    <div className="min-w-[100px]">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${inStock
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : 'bg-red-50 text-red-800 border-red-100'
                            }`}>
                            {inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Rating',
            render: (item) => (
                <div className="flex items-center gap-1 min-w-[60px]">
                    <span className="text-amber-500 text-xs">★</span>
                    <span className="font-bold text-gray-900 text-xs">{(item.rating || 0).toFixed(1)}</span>
                </div>
            )
        },
        {
            header: 'Status',
            render: (item) => {
                const isActive = item.active !== false;
                const status = item.status || 'Active';

                const toggleStatus = async (e) => {
                    e.stopPropagation();
                    const success = await adminService.toggleProductStatus(item._id);
                    if (success) {
                        toast.success(`Product ${!isActive ? 'activated' : 'deactivated'}`);
                        setProducts(prev => prev.map(p => 
                            p._id === item._id ? { ...p, active: !isActive } : p
                        ));
                    } else {
                        toast.error("Failed to update status");
                    }
                };

                return (
                    <div className="min-w-[100px] flex gap-2 items-center">
                        <button
                            onClick={toggleStatus}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${isActive
                                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                }`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </button>
                        <span className={`text-[9px] font-bold uppercase tracking-tighter ${
                            status === 'Draft' ? 'text-amber-500' : 'text-blue-500'
                        }`}>
                            {status}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Date',
            render: (item) => {
                if (!item.createdAt) return <span className="text-gray-400 text-xs font-semibold">-</span>;
                const date = new Date(item.createdAt);
                return <span className="text-gray-900 text-xs font-semibold">{date.toLocaleDateString()}</span>;
            }
        },
        ...(!isSelectMode ? [{
            header: 'Actions',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-3 min-w-[100px]">
                    <button
                        onClick={() => navigate(`/admin/products/view/${item._id}`)}
                        className="p-1 text-gray-700 hover:text-black transition-colors"
                        title="View Details"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate(`/admin/products/edit/${item._id}`)}
                        className="p-1 text-gray-700 hover:text-black transition-colors"
                        title="Edit"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1 text-gray-700 hover:text-red-700 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }] : [])
    ];

    const filters = [
        {
            options: categoryOptions.length > 0
                ? categoryOptions
                : [{ label: 'All Categories', value: 'all' }],
            onChange: (val) => setSelectedCategory(val)
        },
        {
            options: [
                { label: 'All Stock', value: 'all' },
                { label: 'In Stock', value: 'true' },
                { label: 'Out of Stock', value: 'false' }
            ],
            onChange: (val) => setFiltersObj(prev => ({ ...prev, inStock: val, page: 1 }))
        },
        {
            options: [
                { label: 'Sort: Newest', value: 'newest' },
                { label: 'Price: Low-High', value: 'price_low' },
                { label: 'Price: High-Low', value: 'price_high' },
                { label: 'Name: A-Z', value: 'name_asc' }
            ],
            onChange: (val) => setFiltersObj(prev => ({ ...prev, sortBy: val, page: 1 }))
        }
    ];

    const handleBulkApply = async (config) => {
        const categoryId = selectedCategory === 'all' ? undefined : selectedCategory;
        const success = await adminService.bulkUpdatePrices({
            ...(categoryId ? { categoryId } : {}),
            ...config
        });
        if (success) {
            toast.success("Bulk update applied successfully");
            await fetchProducts();
        } else {
            toast.error("Bulk update failed");
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6 pb-20 animate-in fade-in duration-500 relative">
            <PageHeader
                title={isSelectMode ? "Select Products" : "Products"}
                subtitle={isSelectMode
                    ? `Select products to add to showcase (${selectedIds.length} selected)`
                    : sellerId
                        ? "Showing products for selected seller."
                        : "Manage your inventory, pricing, and product details."}
                action={!isSelectMode ? {
                    label: "Add New Product",
                    onClick: () => navigate('/admin/products/new')
                } : undefined}
                backPath={sellerId ? `/admin/seller-details/${sellerId}` : undefined}
            />

            <DataTable
                columns={columns}
                data={products} 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchPlaceholder="Search products by name..."
                filters={filters}
            >
                <div className="flex gap-2 items-center">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm focus-within:ring-2 focus-within:ring-[#3E2723]/10 focus-within:border-[#3E2723] transition-all">
                        <span className="text-[10px] font-bold text-gray-400 mr-2">₹</span>
                        <input 
                            type="number" 
                            placeholder="Min" 
                            className="w-16 bg-transparent text-xs focus:outline-none"
                            value={filtersObj.minPrice}
                            onChange={(e) => setFiltersObj(prev => ({ ...prev, minPrice: e.target.value, page: 1 }))}
                        />
                        <span className="text-gray-300 mx-1">-</span>
                        <input 
                            type="number" 
                            placeholder="Max" 
                            className="w-16 bg-transparent text-xs focus:outline-none"
                            value={filtersObj.maxPrice}
                            onChange={(e) => setFiltersObj(prev => ({ ...prev, maxPrice: e.target.value, page: 1 }))}
                        />
                    </div>
                    {!isSelectMode && (
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={handleExport}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-600 hover:bg-[#3E2723] hover:text-white hover:border-[#3E2723] transition-all flex items-center gap-2 shrink-0"
                                title="Export Products as Excel/CSV"
                            >
                                <Download size={14} />
                                <span>Export</span>
                            </button>
                            <button
                                onClick={() => setIsBulkModalOpen(true)}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-600 hover:bg-[#3E2723] hover:text-white hover:border-[#3E2723] transition-all flex items-center gap-2 shrink-0"
                                title="Bulk Update Prices"
                            >
                                <TrendingUp size={14} />
                                <span className="hidden md:inline">Bulk Actions</span>
                                <span className="md:hidden">Bulk</span>
                            </button>
                        </div>
                    )}
                </div>
            </DataTable>

            {pagination && pagination.page < pagination.pages && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={() => fetchProducts(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-[#3E2723] hover:bg-[#3E2723] hover:text-white transition-all shadow-sm disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Load More Products'}
                        {!loading && <Plus size={14} />}
                    </button>
                </div>
            )}

            {isSelectMode && selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#3E2723] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
                    <span className="font-bold text-sm">{selectedIds.length} Products Selected</span>
                    <button
                        onClick={handleConfirmSelection}
                        className="bg-white text-[#3E2723] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-100 transition-colors"
                    >
                        Confirm Selection
                    </button>
                </div>
            )}

            <BulkUpdateModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onApply={handleBulkApply}
                products={products}
            />
        </div>
    );
};

export default ProductManagement;
