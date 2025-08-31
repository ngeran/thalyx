export const API_BASE_URL = 'http://localhost:3001'

export const apiClient = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },
  
  async healthCheck() {
    return this.get('/health')
  },
  
  async getNavigation() {
    return this.get('/api/yaml/navigation')
  },
  
  async validateNavigation() {
    return this.get('/api/yaml/navigation/validate')
  },
  
  async getSchemas() {
    return this.get('/api/schemas')
  }
}
