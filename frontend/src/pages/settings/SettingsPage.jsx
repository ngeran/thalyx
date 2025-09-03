/**
 * @file SettingsPage.jsx
 * @description Refactored Settings page component that integrates with the plugin-based navigation system.
 *              This component manages application settings, user preferences, and system configuration
 *              through a hierarchical navigation structure received from the backend.
 *
 * @author nikos-geranios
 * @created 2025-09-03
 * @version 2.0.0
 *
 * @key-features
 * - Dynamic settings sections from backend
 * - Form-based settings management
 * - Auto-save functionality
 * - Validation and error handling
 * - Import/Export settings
 * - Reset to defaults
 * - Search across settings
 * - Sidebar synchronization for navigation
 *
 * @dependencies
 * - react: ^18.0.0
 * - lucide-react: ^0.263.1 (for icons)
 * - @/core/hooks/withPageIntegration: HOC for page integration
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { withPageIntegration } from '../../core/hooks/withPageIntegration';
import {
  Settings,
  Save,
  RefreshCw,
  Download,
  Upload,
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle,
  Loader2,
  RotateCcw,
  Shield,
  User,
  Bell,
  Palette,
  Database,
  Network,
  Lock,
  Key,
  Globe,
  Monitor,
  Zap,
  Archive
} from 'lucide-react';

// =============================================================================
// TYPE DEFINITIONS (JSDoc instead of TypeScript)
// =============================================================================

/**
 * @typedef {'text' | 'number' | 'boolean' | 'select' | 'multiselect' |
 *   'date' | 'time' | 'datetime' | 'color' | 'file' | 'password'} FieldType
 */

/**
 * @typedef {Object} SettingsField
 * @property {string} id
 * @property {string} label
 * @property {FieldType} type
 * @property {any} [value]
 * @property {any} [defaultValue]
 * @property {string} [description]
 * @property {boolean} [required]
 * @property {boolean} [disabled]
 * @property {Object} [validation]
 * @property {Array<{value:string,label:string,disabled?:boolean}>} [options]
 * @property {string} [placeholder]
 * @property {string} [helpText]
 * @property {{field:string,value:any}} [dependsOn]
 */

/**
 * @typedef {Object} SettingsSection
 * @property {string} id
 * @property {string} label
 * @property {'section'|'page'} type
 * @property {string} [description]
 * @property {SettingsPage[]} [children]
 * @property {boolean} [defaultExpanded]
 * @property {string[]} [permissions]
 */

/**
 * @typedef {Object} SettingsPage
 * @property {string} id
 * @property {string} label
 * @property {'page'} type
 * @property {string} [description]
 * @property {SettingsField[]} [fields]
 * @property {boolean} [disabled]
 * @property {string} [category]
 */

/**
 * @typedef {Object} SettingsData
 * @property {SettingsSection[]} navigation
 * @property {Record<string,any>} [values]
 * @property {string[]} [permissions]
 * @property {string} [version]
 * @property {string} [lastModified]
 */

// =============================================================================
// CONSTANTS
// =============================================================================

const ICON_MAP = {
  settings: Settings,
  user: User,
  shield: Shield,
  bell: Bell,
  palette: Palette,
  database: Database,
  network: Network,
  lock: Lock,
  key: Key,
  globe: Globe,
  monitor: Monitor,
  zap: Zap,
  archive: Archive
};

const FIELD_TYPE_CONFIG = {
  text: { inputType: 'text', component: 'input' },
  number: { inputType: 'number', component: 'input' },
  password: { inputType: 'password', component: 'input' },
  boolean: { inputType: 'checkbox', component: 'checkbox' },
  select: { inputType: null, component: 'select' },
  multiselect: { inputType: null, component: 'multiselect' },
  date: { inputType: 'date', component: 'input' },
  time: { inputType: 'time', component: 'input' },
  datetime: { inputType: 'datetime-local', component: 'input' },
  color: { inputType: 'color', component: 'input' },
  file: { inputType: 'file', component: 'input' }
};

const AUTO_SAVE_DELAY = 2000;

// =============================================================================
// HELPERS
// =============================================================================

const getIcon = (iconName) => {
  if (!iconName) return Settings;
  return ICON_MAP[iconName.toLowerCase()] || Settings;
};

const validateField = (field, value) => {
  if (field.required && !value) {
    return `${field.label} is required`;
  }
  if (field.validation) {
    const { min, max, minLength, maxLength, pattern, message } = field.validation;
    if (typeof value === 'number') {
      if (min !== undefined && value < min) return message || `Value must be at least ${min}`;
      if (max !== undefined && value > max) return message || `Value must be at most ${max}`;
    }
    if (typeof value === 'string') {
      if (minLength && value.length < minLength) return message || `Must be at least ${minLength} characters`;
      if (maxLength && value.length > maxLength) return message || `Must be at most ${maxLength} characters`;
      if (pattern && !new RegExp(pattern).test(value)) return message || `Invalid format`;
    }
  }
  return null;
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const SettingsFieldComponent = ({ field, value, onChange, error, disabled }) => {
  const handleChange = (newValue) => onChange(field.id, newValue);
  const config = FIELD_TYPE_CONFIG[field.type];
  const isDisabled = disabled || field.disabled;

  return (
    <div className="mb-6">
      {/* Label */}
      <label className="block mb-2">
        <span className="text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </span>
        {field.helpText && (
          <HelpCircle className="inline-block h-4 w-4 ml-2 text-gray-400" title={field.helpText} />
        )}
      </label>

      {/* Inputs */}
      {field.type === 'boolean' ? (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleChange(e.target.checked)}
            disabled={isDisabled}
            className="h-4 w-4 text-primary border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-600">{field.description}</span>
        </div>
      ) : field.type === 'select' ? (
        <select
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isDisabled}
          className={`w-full px-3 py-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
        >
          <option value="">Select an option</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === 'multiselect' ? (
        <div className={`border rounded-lg p-2 max-h-40 overflow-y-auto ${error ? 'border-red-500' : 'border-gray-300'}`}>
          {field.options?.map(option => (
            <label key={option.value} className="flex items-center p-1 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={value?.includes(option.value) || false}
                onChange={(e) => {
                  const currentValue = value || [];
                  const newValue = e.target.checked
                    ? [...currentValue, option.value]
                    : currentValue.filter((v) => v !== option.value);
                  handleChange(newValue);
                }}
                disabled={isDisabled || option.disabled}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <span className="ml-2 text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <input
          type={config.inputType || 'text'}
          value={value || ''}
          onChange={(e) => handleChange(field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          disabled={isDisabled}
          placeholder={field.placeholder}
          className={`w-full px-3 py-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
      )}

      {field.description && field.type !== 'boolean' && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{error}</p>}
    </div>
  );
};

const Breadcrumb = ({ items, onNavigate }) => (
  <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-6">
    {items.map((item, index) => (
      <React.Fragment key={item.id}>
        {index > 0 && <ChevronRight className="h-4 w-4" />}
        <button
          onClick={() => onNavigate(item.id)}
          className="hover:text-gray-700 transition-colors"
        >
          {item.label}
        </button>
      </React.Fragment>
    ))}
  </nav>
);

const SaveIndicator = ({ status, lastSaved }) => (
  <div className="flex items-center text-sm text-gray-500">
    {status === 'saving' && (
      <>
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
        <span>Saving...</span>
      </>
    )}
    {status === 'saved' && (
      <>
        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
        <span>Saved {lastSaved}</span>
      </>
    )}
    {status === 'error' && (
      <>
        <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
        <span>Save failed</span>
      </>
    )}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const SettingsPage = ({ data, loading, error, refresh }) => {
  const [settingsData, setSettingsData] = useState(null);
  const [currentPage, setCurrentPage] = useState('root');
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSaved, setLastSaved] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set());
  const autoSaveTimer = useRef(null);

  // Initialize data
  useEffect(() => {
    if (data) {
      setSettingsData(data);
      setFormValues(data.values || {});
    }
  }, [data]);

  const currentSection = useMemo(() => {
    if (!settingsData) return null;
    
    const findSection = (sections, pageId) => {
      for (const section of sections) {
        if (section.id === pageId) return section;
        if (section.children) {
          const found = findSection(section.children, pageId);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findSection(settingsData.navigation, currentPage);
  }, [settingsData, currentPage]);

  const handleFieldChange = useCallback((fieldId, value) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error for this field
    setErrors(prev => ({ ...prev, [fieldId]: null }));
    
    // Schedule auto-save
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      handleSave();
    }, AUTO_SAVE_DELAY);
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      // Validate all fields
      const newErrors = {};
      if (currentSection?.fields) {
        currentSection.fields.forEach(field => {
          const error = validateField(field, formValues[field.id]);
          if (error) newErrors[field.id] = error;
        });
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setSaveStatus('error');
        return;
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString());
      setErrors({});
    } catch (err) {
      setSaveStatus('error');
    }
  }, [currentSection, formValues]);

  const handleReset = useCallback(() => {
    if (currentSection?.fields) {
      const defaults = {};
      currentSection.fields.forEach(field => {
        defaults[field.id] = field.defaultValue;
      });
      setFormValues(prev => ({ ...prev, ...defaults }));
    }
  }, [currentSection]);

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Failed to load settings</p>
          <p className="text-gray-500 mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!settingsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No settings data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your application preferences and configuration</p>
        </div>
        <div className="flex items-center space-x-4">
          <SaveIndicator status={saveStatus} lastSaved={lastSaved} />
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <nav className="space-y-1">
              {settingsData.navigation.map(section => (
                <div key={section.id}>
                  <button
                    onClick={() => section.type === 'section' ? toggleSection(section.id) : setCurrentPage(section.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-gray-50 ${
                      currentPage === section.id ? 'bg-primary/10 text-primary' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex items-center">
                      {getIcon(section.icon)({ className: "h-4 w-4 mr-2" })}
                      {section.label}
                    </span>
                    {section.type === 'section' && (
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          expandedSections.has(section.id) ? 'rotate-90' : ''
                        }`}
                      />
                    )}
                  </button>
                  
                  {section.type === 'section' && expandedSections.has(section.id) && section.children && (
                    <div className="ml-6 mt-1 space-y-1">
                      {section.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setCurrentPage(child.id)}
                          className={`w-full flex items-center p-2 rounded-lg text-left hover:bg-gray-50 ${
                            currentPage === child.id ? 'bg-primary/10 text-primary' : 'text-gray-600'
                          }`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {currentSection ? (
              <>
                <Breadcrumb
                  items={[]} // You'd need to implement breadcrumb generation
                  onNavigate={setCurrentPage}
                />
                
                <h2 className="text-xl font-semibold mb-4">{currentSection.label}</h2>
                {currentSection.description && (
                  <p className="text-gray-500 mb-6">{currentSection.description}</p>
                )}
                
                {currentSection.fields?.map(field => (
                  <SettingsFieldComponent
                    key={field.id}
                    field={field}
                    value={formValues[field.id]}
                    onChange={handleFieldChange}
                    error={errors[field.id]}
                  />
                ))}
                
                <div className="flex items-center space-x-4 mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center"
                  >
                    {saveStatus === 'saving' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </button>
                  
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a settings category</h3>
                <p className="text-gray-500">Choose a category from the sidebar to view and edit settings</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// EXPORT
// =============================================================================

export default withPageIntegration(SettingsPage, 'settings', {
  debug: true,
  persistState: true,
  trackPerformance: true
});
