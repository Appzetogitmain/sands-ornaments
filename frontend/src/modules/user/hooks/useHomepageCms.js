import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

const toHomepageSectionsMap = (resOrData) => {
  const sections = resOrData?.data?.data?.sections || resOrData?.data?.sections || resOrData?.sections || [];
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

const getCachedHomepageCms = () => {
  try {
    const raw = localStorage.getItem('sands_homepage_cms_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { data: parsed };
    }
  } catch (e) {
    // ignore
  }
  return undefined;
};

export const useHomepageCms = () => {
  return useQuery({
    queryKey: ['public-cms', 'homepage'],
    queryFn: async () => {
      const res = await api.get('public/cms/pages/home');
      try {
        if (res?.data) {
          localStorage.setItem('sands_homepage_cms_cache', JSON.stringify(res.data));
        }
      } catch (e) {
        // ignore
      }
      return res;
    },
    select: toHomepageSectionsMap,
    placeholderData: getCachedHomepageCms,
    staleTime: 60 * 1000, // 1 minute
    gcTime:   15 * 60 * 1000,  // 15 minutes
    retry: 1,
  });
};
