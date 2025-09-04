# Adding a New Page - Complete Guide

## Overview
This guide explains how to add a new page to the plugin-based architecture. The system uses a PageRegistry pattern where each page is self-contained with its own configuration, data fetching, and navigation transformation.

## Step 1: Create Page Component

Create your page component in `src/pages/yourpage/YourPage.jsx`:

```jsx
import React from 'react';
import { withPageIntegration } from '../../core/hooks/withPageIntegration';

const YourPage = ({ 
  data,           // Fetched page data
  loading,        // Loading state
  error,          // Error state
  pageState,      // Page-specific state
  setPageState,   // State update function
  refresh,        // Data refresh function
  activeItem,     // Active sidebar item
  onItemChange    // Item selection handler
}) => {
  // Your page implementation
  return (
    <div className="p-6">
      <h1>Your Page</h1>
      {/* Page content */}
    </div>
  );
};

export default withPageIntegration(YourPage, 'yourpage');
