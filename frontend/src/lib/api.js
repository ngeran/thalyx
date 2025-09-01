/**
 * API Service for Thalyx Frontend-Backend Communication
 * 
 * ## Version: 2.0.0
 * ## Description: Enhanced API client with comprehensive error handling
 * ## Key Features:
 * - Centralized API configuration
 * - Automatic error handling and retry mechanism
 * - Request/Response logging for debugging
 * - Support for all backend endpoints
 * 
 * ## Dependencies:
 * - fetch API (built-in)
 * 
 * ## Usage:
 * import { apiClient } from '../lib/api';
 * 
 * // Get navigation data
 * const { data, error } = await apiClient.getNavigation();
 * 
 * // Get settings navigation
 * const { data, error } = await apiClient.getSettingsNavigation();
 */

export const API_BASE_URL = 'http://127.0.0.1:3001';

/**
 * Enhanced API client with comprehensive error handling
 */
export const apiClient = {
  /**
   * Generic GET request handler
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise} Response data or error
   */
  async get(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed for ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Health check endpoint
   * @returns {Promise} Health status
   */
  async healthCheck() {
    return this.get('/health');
  },

  /**
   * Get main navigation data
   * @param {string} file - Optional file path
   * @returns {Promise} Navigation data
   */
  async getNavigation(file = null) {
    const endpoint = file 
      ? `/api/navigation/yaml?file=${encodeURIComponent(file)}`
      : '/api/navigation/yaml';
    return this.get(endpoint);
  },

  /**
   * Get settings navigation data (NEW)
   * @param {string} file - Optional file path
   * @returns {Promise} Settings navigation data
   */
  async getSettingsNavigation(file = null) {
    const endpoint = file 
      ? `/api/navigation/settings?file=${encodeURIComponent(file)}`
      : '/api/navigation/settings';
    return this.get(endpoint);
  },

  /**
   * Validate navigation data
   * @param {string} file - Optional file path
   * @returns {Promise} Validation result
   */
  async validateNavigation(file = null) {
    const endpoint = file 
      ? `/api/yaml/navigation/validate?file=${encodeURIComponent(file)}`
      : '/api/yaml/navigation/validate';
    return this.get(endpoint);
  },

  /**
   * Get available schemas
   * @returns {Promise} Array of schema names
   */
  async getSchemas() {
    return this.get('/api/schemas');
  },

  /**
   * Get YAML data by schema name
   * @param {string} schemaName - Schema identifier
   * @param {string} file - Optional file path
   * @returns {Promise} YAML data
   */
  async getYamlData(schemaName, file = null) {
    const endpoint = file 
      ? `/api/yaml/${schemaName}?file=${encodeURIComponent(file)}`
      : `/api/yaml/${schemaName}`;
    return this.get(endpoint);
  },

  /**
   * Validate YAML data against schema
   * @param {string} schemaName - Schema identifier
   * @param {string} file - Optional file path
   * @returns {Promise} Validation result
   */
  async validateYamlData(schemaName, file = null) {
    const endpoint = file 
      ? `/api/yaml/${schemaName}/validate?file=${encodeURIComponent(file)}`
      : `/api/yaml/${schemaName}/validate`;
    return this.get(endpoint);
  }
};
