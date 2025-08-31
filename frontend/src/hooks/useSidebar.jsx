/**
 * useSidebar Hook
 * 
 * Custom hook for managing sidebar state, interactions, and responsive behavior.
 * Handles collapse/expand, mobile overlay, keyboard navigation, and state persistence.
 * 
 * Features:
 * - Persistent state using localStorage (optional)
 * - Mobile responsive behavior
 * - Keyboard navigation support
 * - Auto-collapse on mobile
 * - Search functionality integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export const useSidebar = (initialCollapsed = false, persistState = true) => {
  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================
  
  const [collapsed, setCollapsed] = useState(() => {
    if (persistState && typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : initialCollapsed;
    }
    return initialCollapsed;
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarRef = useRef(null);

  // ===========================================================================
  // RESPONSIVE DETECTION
  // ===========================================================================
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile && !collapsed) {
      setCollapsed(true);
    }
  }, [isMobile]);

  // ===========================================================================
  // STATE PERSISTENCE
  // ===========================================================================
  
  useEffect(() => {
    if (persistState && typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
    }
  }, [collapsed, persistState]);

  // ===========================================================================
  // KEYBOARD NAVIGATION
  // ===========================================================================
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keyboard navigation when sidebar is focused
      if (!sidebarRef.current?.contains(document.activeElement)) return;
      
      switch (e.key) {
        case 'Escape':
          if (isMobile && mobileOpen) {
            setMobileOpen(false);
          } else if (!collapsed) {
            setCollapsed(true);
          }
          break;
        case 'ArrowLeft':
          if (!collapsed) {
            e.preventDefault();
            setCollapsed(true);
          }
          break;
        case 'ArrowRight':
          if (collapsed) {
            e.preventDefault();
            setCollapsed(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsed, isMobile, mobileOpen]);

  // ===========================================================================
  // CLICK OUTSIDE TO CLOSE (MOBILE)
  // ===========================================================================
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobile && mobileOpen && sidebarRef.current && 
          !sidebarRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };

    if (isMobile && mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobile, mobileOpen]);

  // ===========================================================================
  // ACTION HANDLERS
  // ===========================================================================
  
  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  }, [collapsed, isMobile, mobileOpen]);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen(false);
    } else {
      setCollapsed(true);
    }
  }, [isMobile]);

  const openSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen(true);
    } else {
      setCollapsed(false);
    }
  }, [isMobile]);

  const toggleExpanded = useCallback((itemId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const expandAll = useCallback(() => {
    // This would need to be called with all expandable item IDs
    // Implementation depends on your navigation structure
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedItems(new Set());
  }, []);

  const updateSearchQuery = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================
  
  const filterItems = useCallback((items, query = searchQuery) => {
    if (!query) return items;
    
    return items.filter(item => {
      const matchesItem = item.label.toLowerCase().includes(query.toLowerCase());
      const matchesChildren = item.children?.some(child =>
        child.label.toLowerCase().includes(query.toLowerCase())
      );
      return matchesItem || matchesChildren;
    });
  }, [searchQuery]);

  // ===========================================================================
  // RETURN VALUES
  // ===========================================================================
  
  return {
    // State
    collapsed,
    isMobile,
    mobileOpen,
    expandedItems,
    searchQuery,
    sidebarRef,
    
    // Actions
    toggleSidebar,
    closeSidebar,
    openSidebar,
    toggleExpanded,
    expandAll,
    collapseAll,
    updateSearchQuery,
    clearSearch,
    
    // Utilities
    filterItems,
    
    // Computed values
    isOpen: isMobile ? mobileOpen : !collapsed,
    showOverlay: isMobile && mobileOpen,
  };
};

// ===========================================================================
// SIDEBAR CONTEXT (OPTIONAL)
// ===========================================================================

import React, { createContext, useContext } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children, ...sidebarProps }) => {
  const sidebar = useSidebar(sidebarProps.initialCollapsed, sidebarProps.persistState);
  
  return (
    <SidebarContext.Provider value={sidebar}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
};

// ===========================================================================
// KEYBOARD SHORTCUTS COMPONENT
// ===========================================================================

export const SidebarKeyboardShortcuts = () => {
  return (
    <div className="text-xs text-gray-500 px-4 py-2 border-t border-gray-200">
      <p className="font-medium mb-1">Keyboard shortcuts:</p>
      <div className="space-y-1">
        <div>← Collapse sidebar</div>
        <div>→ Expand sidebar</div>
        <div>Esc Close/collapse</div>
      </div>
    </div>
  );
};
