import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Eye, TrendingUp, ScanLine, Download } from 'lucide-react';
import PageHeader from '../../admin/components/common/PageHeader';
import DataTable from '../../admin/components/common/DataTable';
import { sellerProductService } from '../services/sellerProductService';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { exportToExcelCSV } from '../../../utils/exportUtils';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString()}`;

const SellerProducts = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categoryOptions, setCategoryOptions] = useState([{ label: 'All Categories', value: 'all' }]);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });

    const [debouncedSearch, setDebouncedSearch] = useState('');

    const handleExport = async () => {
        const loadingToast = toast.loading("Generating product export...");
        try {
            const params = {
                page: 1,
                limit: Math.max(1000, pagination?.totalItems || 1000)
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (selectedCategory !== 'all') params.category = selectedCategory;

            const result = await sellerProductService.getSellerProductsPaged(params);
            const exportProducts = result.products || [];
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
                'status',
                'createdAt'
            ];
            const columnNames = [
                'Product Name',
                'SKU',
                'Price (INR)',
                'Stock Units',
                'Category',
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
                    categoryName: primaryCat?.name || primaryCat?.category || 'Uncategorized',
                    status: p.active === false ? 'INACTIVE' : 'ACTIVE',
                    createdAt: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : ''
                };
            });

            exportToExcelCSV(formattedProducts, headers, columnNames, 'Seller_Products_Report');
            toast.success("Products report exported successfully", { id: loadingToast });
        } catch (err) {
            console.error("Export seller products failed:", err);
            toast.error("Failed to export products", { id: loadingToast });
        }
    };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await api.get('public/categories', { params: { scope: 'all' } });
                const categories = res.data?.data?.categories || res.data?.categories || [];
                const options = [
                    { label: 'All Categories', value: 'all' },
                    ...categories
                        .filter((c) => c?.isActive !== false)
                        .sort((a, b) => Number(a?.sortOrder ?? 0) - Number(b?.sortOrder ?? 0)
                            || String(a?.name || '').localeCompare(String(b?.name || '')))
                        .map((c) => ({ label: c.name, value: c._id }))
                ];
                setCategoryOptions(options);
            } catch (err) {
                // Silent fallback: product list still works without category options.
            }
        };
        loadCategories();
    }, []);

    useEffect(() => {
        // Reset server page when query changes
        setPage(1);
    }, [debouncedSearch, selectedCategory]);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoading(true);
                const params = { page, limit };
                if (debouncedSearch) params.search = debouncedSearch;
                if (selectedCategory !== 'all') params.category = selectedCategory;

                const result = await sellerProductService.getSellerProductsPaged(params);
                setProducts(result.products || []);
                setPagination(result.pagination || { page, limit, totalItems: (result.products || []).length, totalPages: 1 });
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, [page, limit, debouncedSearch, selectedCategory]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        const success = await sellerProductService.deleteProduct(id);
        if (success) {
            const next = products.filter((product) => product._id !== id);
            if (next.length === 0 && page > 1) {
                setPage((prev) => Math.max(1, prev - 1));
            } else {
                setProducts(next);
                setPagination((prev) => ({
                    ...prev,
                    totalItems: Math.max(0, Number(prev.totalItems || 0) - 1)
                }));
            }
            toast.success('Product deleted successfully');
        } else {
            toast.error('Failed to delete product');
        }
    };

    const filteredProducts = useMemo(() => products, [products]);

    const columns = [
        {
            header: 'Product Name',
            render: (item) => (
                <div className="flex items-center gap-3 py-1">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                        {item.images?.[0] ? (
                            <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400 uppercase">
                                No Image
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <span className="font-semibold text-gray-900 text-[13px] tracking-tight block truncate">{item.name}</span>
                        <span className="font-mono font-bold text-[#8D6E63] text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-widest inline-block mt-1">
                            {item.productCode || 'Pending Code'}
                        </span>
                    </div>
                </div>
            )
        },
        {
            header: 'Category',
            render: (item) => {
                const primary = item.categories?.[0];
                return (
                    <div className="min-w-[140px] flex flex-col justify-center">
                        <span className="font-medium text-gray-900 text-xs">
                            {primary?.name || primary || 'Uncategorized'}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Price',
            render: (item) => {
                const baseVariant = item.variants?.[0] || {};
                const price = baseVariant.finalPrice || baseVariant.price || 0;
                return <span className="font-semibold text-gray-900 text-xs tabular-nums">{formatCurrency(price)}</span>;
            }
        },
        {
            header: 'Stock',
            render: (item) => {
                const totalStock = (item.variants || []).reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
                const inStock = totalStock > 0;

                return (
                    <div className="min-w-[100px]">
                        <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                inStock
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                    : 'bg-red-50 text-red-800 border-red-100'
                            }`}
                        >
                            {inStock ? `${totalStock} Units` : 'Out of Stock'}
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
                    <span className="font-bold text-gray-900 text-xs">{Number(item.rating || 0).toFixed(1)}</span>
                </div>
            )
        },
        {
            header: 'Status',
            render: (item) => {
                const isActive = item.active !== false;
                const status = item.status || 'Active';

                return (
                    <div className="min-w-[100px] flex gap-2 items-center">
                        <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isActive
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                        >
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span
                            className={`text-[9px] font-bold uppercase tracking-tighter ${
                                status === 'Draft' ? 'text-amber-500' : 'text-blue-500'
                            }`}
                        >
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
                return <span className="text-gray-900 text-xs font-semibold">{new Date(item.createdAt).toLocaleDateString()}</span>;
            }
        },
        {
            header: 'Actions',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-3 min-w-[100px]">
                    <button
                        onClick={() => navigate(`/seller/products/view/${item._id}`)}
                        className="p-1 text-gray-700 hover:text-black transition-colors"
                        title="View Details"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate(`/seller/products/edit/${item._id}`)}
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
        }
    ];

    const filters = [
        {
            value: selectedCategory,
            options: categoryOptions,
            onChange: (value) => setSelectedCategory(value)
        }
    ];

    return (
        <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="Products"
                subtitle="Manage your inventory, pricing, and product details."
                action={{
                    label: 'Add New Product',
                    onClick: () => navigate('/seller/products/new')
                }}
            />

            <DataTable
                columns={columns}
                data={filteredProducts}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchPlaceholder="Search products by name..."
                filters={filters}
                itemsPerPage={limit}
                loading={loading}
                pagination={{
                    ...pagination,
                    onPageChange: (nextPage) => setPage(nextPage)
                }}
            >
                <div className="flex gap-2 items-center">
                    <button
                        onClick={handleExport}
                        className="h-10 bg-white border border-gray-200 rounded-full px-4 text-xs font-semibold text-gray-700 hover:bg-[#3E2723] hover:text-white hover:border-[#3E2723] transition-all flex items-center gap-2 shrink-0 shadow-sm"
                        title="Export Products as Excel/CSV"
                    >
                        <Download size={14} />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={() => navigate('/seller/inventory/adjust')}
                        className="h-10 bg-white border border-gray-200 rounded-full px-4 text-xs font-semibold text-gray-700 hover:bg-[#3E2723] hover:text-white hover:border-[#3E2723] transition-all flex items-center gap-2 shrink-0 shadow-sm"
                        title="Adjust Stock"
                    >
                        <TrendingUp size={14} />
                        <span className="hidden md:inline">Adjust Stock</span>
                        <span className="md:hidden">Adjust</span>
                    </button>
                    <button
                        onClick={() => navigate('/seller/offline-sale')}
                        className="h-10 bg-emerald-50 border border-emerald-200 rounded-full px-4 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all flex items-center gap-2 shrink-0 shadow-sm"
                        title="Offline Sale"
                    >
                        <ScanLine size={14} />
                        <span className="hidden md:inline">Offline Sale</span>
                        <span className="md:hidden">Offline</span>
                    </button>
                </div>
            </DataTable>
        </div>
    );
};

export default SellerProducts;
