/**
 * EnhancedSidebar.jsx
 * 
 * Enhanced sidebar component following shadcn sidebar-08 design patterns.
 * Features collapsible navigation, nested items, search functionality, and user profile section.
 * 
 * Key Features:
 * - Collapsible/expandable sidebar
 * - Nested navigation items with expand/collapse
 * - Search functionality with filtering
 * - Responsive design for mobile devices
 * - Dark/light theme support
 * - User profile section
 * 
 * Dependencies:
 * - React
 * - Lucide React (for icons)
 * - Tailwind CSS
 * 
 * Props:
 * - items: Array of navigation items
 * - pageTitle: Title to display in sidebar header
 * - collapsed: Boolean to control collapsed state
 * - onToggle: Function to handle sidebar toggle
 * - activePageId: Currently active page ID
 * - onPageSelect: Function to handle page selection
 * 
 * How to Use:
 * 1. Import the component: import EnhancedSidebar from './EnhancedSidebar'
 * 2. Pass navigation items and required props
 * 3. Handle page selection and toggle events in parent component
 */
import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  User,
  Menu,
  X
} from 'lucide-react';

const EnhancedSidebar = ({ 
  items = [], 
  pageTitle = "Thalyx", 
  isOpen = true, 
  onToggle,
  activePageId = "home",
  onItemSelect,
  wsConnected = false,
  lastUpdate = null,
  theme = 'light',
  connectionStats = null
}) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleItemClick = (item) => {
    if (item.type === 'section' && item.children) {
      toggleExpanded(item.id);
    } else {
      onItemSelect?.(item.id);
    }
  };

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.children && item.children.some(child =>
      child.label.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  );

  const NavItem = ({ item, level = 0 }) => {
    const isExpanded = expandedItems.has(item.id);
    const isActive = activePageId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const Icon = item.icon;

    return (
      <div>
        <button
          onClick={() => handleItemClick(item)}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
            ${level > 0 ? 'ml-6 pl-6' : ''}
            ${isActive 
              ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary' 
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }
            ${!isOpen ? 'justify-center px-2' : ''}
            group
          `}
          title={!isOpen ? item.label : undefined}
        >
          {Icon && (
            <Icon className={`
              ${!isOpen ? 'h-5 w-5' : 'h-4 w-4'} 
              flex-shrink-0 transition-colors
              ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'}
            `} />
          )}
          
          {isOpen && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {hasChildren && (
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  )}
                </div>
              )}
            </>
          )}
        </button>

        {hasChildren && isExpanded && isOpen && (
          <div className="mt-1 space-y-1 relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-sidebar-border"></div>
            {item.children.map((child) => (
              <NavItem key={child.id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 
        ${isOpen ? 'w-64' : 'w-16'} 
        bg-sidebar border-r border-sidebar-border
        transition-all duration-300 ease-in-out
        flex flex-col h-screen
      `}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {isOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                  <span className="text-sidebar-primary-foreground font-bold text-sm">T</span>
                </div>
                <span className="font-semibold text-sidebar-foreground">{pageTitle}</span>
              </div>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
              >
                <X className="h-4 w-4 text-sidebar-foreground" />
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors mx-auto"
              title="Expand sidebar"
            >
              <Menu className="h-4 w-4 text-sidebar-foreground" />
            </button>
          )}
        </div>

        {/* Search */}
        {isOpen && (
          <div className="p-4 border-b border-sidebar-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
              <input
                type="text"
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-sidebar-accent border border-sidebar-border rounded-lg
                         focus:ring-2 focus:ring-sidebar-ring focus:border-transparent
                         text-sidebar-foreground placeholder:text-sidebar-foreground/50"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <NavItem key={item.id} item={item} />
            ))
          ) : (
            isOpen && searchQuery && (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-sidebar-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-sidebar-foreground/70">No results found</p>
                <p className="text-xs text-sidebar-foreground/50 mt-1">Try a different search term</p>
              </div>
            )
          )}
        </nav>

        {/* WebSocket Status */}
        {isOpen && wsConnected && lastUpdate && (
          <div className="px-4 py-2 border-t border-sidebar-border">
            <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Updated {new Date(lastUpdate).toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="border-t border-sidebar-border p-4">
          <div className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'} group`}>
            <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground">John Doe</p>
                <p className="text-xs text-sidebar-foreground/70">john@thalyx.com</p>
              </div>
            )}
            {!isOpen && (
              <div className="absolute left-20 bottom-4 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                John Doe
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EnhancedSidebar;
