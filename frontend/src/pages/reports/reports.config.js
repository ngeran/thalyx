/**
 * @file reports.config.js
 * @description Configuration for the Reports page module.
 *              Handles report data fetching and dynamic navigation transformation.
 *
 * @key-features
 * - Report catalog data fetching
 * - Dynamic navigation transformation by categories
 * - Support for report execution and selection
 *
 * @dependencies
 * - @/pages/reports/ReportsPage: Reports page component
 * - lucide-react: For category icons
 *
 * @usage-guide
 * ```javascript
 * // Register in main application
 * import { reportsConfig } from '@/pages/reports/reports.config';
 * pageRegistry.register(reportsConfig);
 * ```
 */

import { BarChart3, Network, Cpu, Server, Shield, FileText } from 'lucide-react';
import ReportsPage from './ReportsPage';

// Icon mapping for report categories
const CATEGORY_ICONS = {
  Interfaces: Network,
  MPLS: BarChart3,
  Routing: Cpu,
  System: Server,
  Security: Shield,
  Default: FileText
};

export const reportsConfig = {
  id: 'reports',
  component: ReportsPage,

  // Fetch report catalog from API
  fetchData: async () => {
    const response = await fetch('/api/reports');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  // Transform report data into navigation structure
  transformNavigation: (data) => {
    if (!data?.categories || !data?.reports) return [];

    return data.categories.map(category => ({
      id: `category-${category.toLowerCase()}`,
      label: category,
      icon: CATEGORY_ICONS[category] || CATEGORY_ICONS.Default,
      type: 'section',
      children: Object.entries(data.reports)
        .filter(([_, report]) => report.category === category)
        .map(([id, report]) => ({
          id,
          label: report.title,
          description: report.description,
          type: 'page',
          metadata: {
            reportId: id,
            category: report.category,
            requiresParams: report.requiresParams
          }
        }))
    }));
  },

  options: {
    requiresAuth: true,
    showInNavigation: true,
    navigationLabel: 'Reports',
    navigationIcon: BarChart3,
    navigationOrder: 2,
    preloadData: false,
    cacheData: true,
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    breadcrumb: true,
    layout: 'default'
  },

  // Lifecycle hooks
  onMount: () => {
    console.log('🚀 Reports page mounted');
  },

  onUnmount: () => {
    console.log('🔚 Reports page unmounted');
  },

  onBeforeFetch: () => {
    console.log('🔄 Fetching reports data...');
  },

  onAfterFetch: (data) => {
    console.log('✅ Reports data loaded:', {
      categories: data.categories?.length,
      reports: Object.keys(data.reports || {}).length
    });
  },

  onFetchError: (error) => {
    console.error('❌ Reports data fetch failed:', error);
  }
};

export default reportsConfig;
