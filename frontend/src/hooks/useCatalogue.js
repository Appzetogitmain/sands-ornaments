import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useCatalogue = () => {
    // Fetch Categories
    const categoriesQuery = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get('public/categories');
            const data = res.data.data.categories || [];
            return data.map(cat => ({
                id: cat._id,
                _id: cat._id,
                name: cat.name,
                slug: cat.slug,
                path: cat.slug,
                description: cat.description || '',
                image: cat.image,
                bannerTitle: cat.bannerTitle || '',
                bannerSubtitle: cat.bannerSubtitle || '',
                bannerImage: cat.bannerImage || '',
                showInNavbar: cat.showInNavbar,
                showInCollection: cat.showInCollection,
                isActive: cat.isActive,
                subcategories: (cat.subcategories || []).map(sub => ({
                    id: sub._id,
                    name: sub.name,
                    path: sub.slug,
                    image: sub.image
                }))
            }));
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch Products
    const productsQuery = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await api.get('public/products', {
                params: {
                    inStockOnly: true,
                    limit: 48  // Load 48 initially — enough for home/shop above-fold display
                               // Shop page has its own server-side pagination
                }
            });
            const data = res.data.data.products || [];
            return data.map(prod => {
                const rawCategory = Array.isArray(prod.categories) ? prod.categories[0] : null;
                const rawCategoryId = rawCategory?._id || (typeof rawCategory === 'string' ? rawCategory : '');
                const rawCategoryName = typeof rawCategory === 'string' ? rawCategory : (rawCategory?.name || '');
                const rawCategorySlug = rawCategory?.slug || '';

                return ({
                id: prod._id,
                name: prod.name,
                slug: prod.slug,
                price: prod.variants?.[0]?.price || 0,
                originalPrice: prod.variants?.[0]?.mrp || 0,
                image: prod.images?.[0] || '',
                images: prod.images || [],
                rating: prod.rating || 4.5,
                reviews: prod.reviewCount || 0,
                isNew: prod.tags?.isNewArrival || false,
                isTrending: prod.tags?.isTrending || false,
                createdAt: prod.createdAt || prod.updatedAt || '',
                updatedAt: prod.updatedAt || prod.createdAt || '',
                sold: Number(prod.sold || (prod.variants || []).reduce((sum, v) => sum + (v.sold || 0), 0)),
                category: rawCategoryName || '', // Updated for flat populate + legacy string fallback
                categoryId: rawCategoryId || '',
                categorySlug: rawCategorySlug || '',
                material: prod.material || '',
                videoUrl: prod.videoUrl || '',
                audience: Array.isArray(prod.audience) && prod.audience.length > 0 ? prod.audience : ['unisex'],
                navShopByCategory: prod.navShopByCategory || [],
                faqs: prod.faqs || [], // Added FAQs
                goldCategory: prod.goldCategory || '',
                silverCategory: prod.silverCategory || '',
                variants: (prod.variants || []).map((v, index) => ({
                    ...v,
                    id: v._id || v.id || `${prod._id}-variant-${index}`
                }))
            });
            });
        },
        staleTime: 10 * 60 * 1000, // 10 minutes — avoids refetch on every navigation
        gcTime: 30 * 60 * 1000,    // 30 minutes — keep in cache across page changes
    });


    // Fetch Public Settings (Value propositions & policies)
    const settingsQuery = useQuery({
        queryKey: ['publicSettings'],
        queryFn: async () => {
            const res = await api.get('public/settings');
            return res.data.data?.settings || {};
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch Coupons
    const couponsQuery = useQuery({
        queryKey: ['coupons'],
        queryFn: async () => {
            const res = await api.get('public/coupons'); 
            return res.data.data.coupons || [];
        },
        staleTime: 5 * 60 * 1000, 
    });

    return {
        categories: categoriesQuery.data || [],
        products: productsQuery.data || [],
        coupons: couponsQuery.data || [],
        siteSettings: settingsQuery.data || {},
        isLoading: categoriesQuery.isLoading || productsQuery.isLoading || couponsQuery.isLoading || settingsQuery.isLoading,
        isError: categoriesQuery.isError || productsQuery.isError || couponsQuery.isError || settingsQuery.isError,
        refetch: () => {
            categoriesQuery.refetch();
            productsQuery.refetch();
            couponsQuery.refetch();
            settingsQuery.refetch();
        }
    };
};
