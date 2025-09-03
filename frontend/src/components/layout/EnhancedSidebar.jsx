/**
 * @file EnhancedSidebar.jsx
 * @description Generic sidebar component that receives navigation items from context.
 *              Supports dynamic navigation, loading states, and item selection.
 *
 * @key-features
 * - Dynamic navigation items from NavigationContext
 * - Support for nested navigation structures
 * - Loading and error states
 * - Responsive design
 * - Expandable/collapsible sections
 *
 * @dependencies
 * - @/core/contexts/NavigationContext: For navigation items and state
 * - lucide-react: For icons
 *
 * @usage-guide
 * ```jsx
 * <EnhancedSidebar
 *   items={sidebarItems}
 *   activePageId={activePageId}
 *   onItemSelect={handleItemSelect}
 *   loading={pageLoading}
 * />
 * ```
 */

import React from 'react';
import { useNavigation } from '../../core/contexts/NavigationContext';
import { Loader2 } from 'lucide-react';

const EnhancedSidebar = ({
  items = [],
  activePageId,
  onItemSelect,
  loading = false,
  className = ''
}) => {
  const { setActiveSidebarItem } = useNavigation();

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleItemClick = (item) => {
    if (item.type === 'page' && item.id) {
      setActiveSidebarItem(item.id);
      if (onItemSelect) {
        onItemSelect(item.id, item);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER FUNCTIONS
  // ---------------------------------------------------------------------------

  const renderNavigationItem = (item) => {
    const Icon = item.icon;

    if (item.type === 'divider') {
      return <div key={item.id} className="border-t border-gray-200 my-2" />;
    }

    if (item.type === 'section') {
      return (
        <div key={item.id} className="mb-4">
          <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700">
            {Icon && <Icon className="h-4 w-4 mr-2" />}
            {item.label}
          </div>
          {item.children && (
            <div className="ml-4 mt-1">
              {item.children.map(renderNavigationItem)}
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'page') {
      const isActive = activePageId === item.id;

      return (
        <button
          key={item.id}
          onClick={() => handleItemClick(item)}
          className={`
            w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors
            ${isActive
              ? 'bg-primary text-white'
              : 'text-gray-700 hover:bg-gray-100'
            }
          `}
          title={item.description}
        >
          {Icon && <Icon className="h-4 w-4 mr-2" />}
          <span className="truncate">{item.label}</span>
          {item.badge && (
            <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${
              item.badge.variant === 'primary' ? 'bg-blue-100 text-blue-800' :
              item.badge.variant === 'destructive' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {item.badge.value}
            </span>
          )}
        </button>
      );
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={`w-64 bg-white border-r border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-gray-600">Loading navigation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-64 bg-white border-r border-gray-200 overflow-y-auto ${className}`}>
      <div className="p-4">
        <nav className="space-y-1">
          {items.length > 0 ? (
            items.map(renderNavigationItem)
          ) : (
            <div className="text-center py-8 text-sm text-gray-500">
              No navigation items available
            </div>
          )}
        </nav>
      </div>
    </div>
  );
};

export default EnhancedSidebar;
