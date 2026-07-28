import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

const toHomepageSectionsMap = (res) => {
  const sections = res?.data?.data?.sections || res?.data?.sections || [];
  return (sections || []).reduce((acc, section) => {
    const key = section.sectionId || section.sectionKey;
    if (!key) return acc;
    acc[key] = {
      id: section.sectionId,
      sectionId: section.sectionId,
      sectionKey: section.sectionKey,
      label: section.label,
      isActive: section.isActive !== false,
      sortOrder: section.sortOrder || 0,
      items: section.items || [],
      settings: section.settings || {},
      pageKey: section.pageKey || 'home',
      sectionType: section.sectionType || null,
    };
    return acc;
  }, {});
};

export const useHomepageCms = () => {
  return useQuery({
    queryKey: ['public-cms', 'homepage'],
    // Align homepage CMS with the centralized page endpoint used by men/women/family/gold.
    // Backend `/public/cms/homepage` is a convenience wrapper (includes banners), but the UI
    // only needs sections; `/public/cms/pages/home` keeps the contract consistent.
    queryFn: async () => api.get('public/cms/pages/home'),
    select: toHomepageSectionsMap,
    staleTime: 30 * 1000, // 30 seconds — keep it responsive for admin updates
    gcTime:   5 * 60 * 1000,  // 5 minutes — keep in cache across page changes
    retry: 1,
  });
};
