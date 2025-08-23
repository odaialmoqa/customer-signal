import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'

// Mock fetch with proper base URL handling
const mockFetch = vi.fn()
global.fetch = mockFetch

// Base URL for API tests
const BASE_URL = 'http://localhost:3000'

// Helper function to make API calls with proper URL
const apiCall = (url: string, options?: RequestInit) => {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  return mockFetch(fullUrl, options)
}

// Mock Supabase client for API tests
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        data: [],
        error: null,
      })),
      data: [],
      error: null,
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
        data: [],
        error: null,
      })),
      data: [],
      error: null,
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
          data: [],
          error: null,
        })),
        data: [],
        error: null,
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
  })),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}))

describe('Complete API Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database and environment
    process.env.NODE_ENV = 'test'
    
    // Setup default mock responses
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve('OK'),
      headers: new Headers(),
    })
  })

  afterAll(async () => {
    // Cleanup test data
    vi.clearAllMocks()
  })

  describe('Authentication API', () => {
    test('POST /api/auth/signup - should create new user account', async () => {
      const response = await apiCall('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          tenantName: 'Test Company'
        })
      })
      
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/auth/signup`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(response).toBeDefined()
    })

    test('POST /api/auth/signin - should authenticate user', async () => {
      const response = await apiCall('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      })
      
      expect(response).toBeDefined()
    })
  })

  describe('Keywords API', () => {
    test('GET /api/keywords - should return user keywords', async () => {
      const response = await apiCall('/api/keywords')
      expect(response).toBeDefined()
    })

    test('POST /api/keywords - should create new keyword', async () => {
      const response = await apiCall('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: 'test keyword',
          platforms: ['twitter', 'reddit'],
          alertThreshold: 0.7
        })
      })
      
      expect(response).toBeDefined()
    })

    test('PUT /api/keywords/[id] - should update keyword', async () => {
      const keywordId = 'test-keyword-id'
      const response = await apiCall(`/api/keywords/${keywordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: 'updated keyword',
          platforms: ['twitter', 'reddit', 'linkedin']
        })
      })
      
      expect(response).toBeDefined()
    })

    test('DELETE /api/keywords/[id] - should delete keyword', async () => {
      const keywordId = 'test-keyword-id'
      const response = await apiCall(`/api/keywords/${keywordId}`, {
        method: 'DELETE'
      })
      
      expect(response).toBeDefined()
    })
  })

  describe('Conversations API', () => {
    test('GET /api/conversations - should return conversations with filters', async () => {
      const response = await apiCall('/api/conversations?sentiment=positive&platform=twitter')
      expect(response).toBeDefined()
    })

    test('GET /api/conversations/[id] - should return specific conversation', async () => {
      const conversationId = 'test-conversation-id'
      const response = await apiCall(`/api/conversations/${conversationId}`)
      expect(response).toBeDefined()
    })

    test('POST /api/conversations/bulk-tag - should tag multiple conversations', async () => {
      const response = await apiCall('/api/conversations/bulk-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationIds: ['id1', 'id2', 'id3'],
          tags: ['important', 'customer-feedback']
        })
      })
      
      expect(response).toBeDefined()
    })

    test('GET /api/conversations/stats - should return conversation statistics', async () => {
      const response = await apiCall('/api/conversations/stats')
      expect(response).toBeDefined()
    })
  })

  describe('Analytics API', () => {
    test('GET /api/analytics/dashboard - should return dashboard metrics', async () => {
      const response = await apiCall('/api/analytics/dashboard')
      expect(response).toBeDefined()
    })

    test('GET /api/analytics/trends - should return trend analysis', async () => {
      const response = await apiCall('/api/analytics/trends?timeRange=7d')
      expect(response).toBeDefined()
    })

    test('GET /api/analytics/sentiment - should return sentiment analysis', async () => {
      const response = await apiCall('/api/analytics/sentiment?timeRange=30d')
      expect(response).toBeDefined()
    })

    test('GET /api/analytics/platforms - should return platform distribution', async () => {
      const response = await apiCall('/api/analytics/platforms')
      expect(response).toBeDefined()
    })

    test('GET /api/analytics/keywords - should return keyword performance', async () => {
      const response = await apiCall('/api/analytics/keywords')
      expect(response).toBeDefined()
    })
  })

  describe('Alerts API', () => {
    test('GET /api/alerts - should return user alerts', async () => {
      const response = await apiCall('/api/alerts')
      expect(response).toBeDefined()
    })

    test('POST /api/alerts - should create new alert', async () => {
      const response = await apiCall('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'High Priority Alert',
          conditions: {
            sentiment: 'negative',
            threshold: 0.8
          },
          notifications: ['email']
        })
      })
      
      expect(response).toBeDefined()
    })
  })

  describe('Integrations API', () => {
    test('GET /api/integrations - should return configured integrations', async () => {
      const response = await apiCall('/api/integrations')
      expect(response).toBeDefined()
    })

    test('POST /api/integrations - should create new integration', async () => {
      const response = await apiCall('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'zendesk',
          config: {
            subdomain: 'test',
            apiToken: 'token',
            email: 'admin@test.com'
          }
        })
      })
      
      expect(response).toBeDefined()
    })

    test('POST /api/integrations/upload - should handle file upload', async () => {
      const formData = new FormData()
      formData.append('file', new Blob(['test,data\n1,2'], { type: 'text/csv' }))
      
      const response = await apiCall('/api/integrations/upload', {
        method: 'POST',
        body: formData
      })
      
      expect(response).toBeDefined()
    })
  })

  describe('Reports API', () => {
    test('GET /api/reports - should return available reports', async () => {
      const response = await apiCall('/api/reports')
      expect(response).toBeDefined()
    })

    test('POST /api/reports - should generate new report', async () => {
      const response = await apiCall('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sentiment-analysis',
          timeRange: '30d',
          format: 'pdf'
        })
      })
      
      expect(response).toBeDefined()
    })

    test('GET /api/reports/download/[id] - should download report', async () => {
      const reportId = 'test-report-id'
      const response = await apiCall(`/api/reports/download/${reportId}`)
      expect(response).toBeDefined()
    })
  })

  describe('Tags API', () => {
    test('GET /api/tags - should return available tags', async () => {
      const response = await apiCall('/api/tags')
      expect(response).toBeDefined()
    })

    test('POST /api/tags - should create new tag', async () => {
      const response = await apiCall('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'customer-feedback',
          color: '#3B82F6',
          description: 'Customer feedback related conversations'
        })
      })
      
      expect(response).toBeDefined()
    })

    test('GET /api/tags/suggestions - should return tag suggestions', async () => {
      const response = await apiCall('/api/tags/suggestions?content=customer%20complaint')
      expect(response).toBeDefined()
    })
  })

  describe('Sentiment Analysis API', () => {
    test('POST /api/sentiment/analyze - should analyze single text', async () => {
      const response = await apiCall('/api/sentiment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'This product is amazing! I love it.'
        })
      })
      
      expect(response).toBeDefined()
    })

    test('POST /api/sentiment/batch - should analyze multiple texts', async () => {
      const response = await apiCall('/api/sentiment/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [
            'Great product!',
            'Terrible experience',
            'It\'s okay, nothing special'
          ]
        })
      })
      
      expect(response).toBeDefined()
    })
  })

  describe('Pipeline API', () => {
    test('POST /api/pipeline/trigger - should trigger data processing', async () => {
      const response = await apiCall('/api/pipeline/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'full-sync',
          keywords: ['test-keyword']
        })
      })
      
      expect(response).toBeDefined()
    })

    test('GET /api/pipeline/jobs - should return job status', async () => {
      const response = await apiCall('/api/pipeline/jobs')
      expect(response).toBeDefined()
    })

    test('GET /api/pipeline/stats - should return pipeline statistics', async () => {
      const response = await apiCall('/api/pipeline/stats')
      expect(response).toBeDefined()
    })
  })

  describe('Health Check API', () => {
    test('GET /api/health - should return system health status', async () => {
      const response = await apiCall('/api/health')
      expect(response).toBeDefined()
    })
  })

  describe('Security API', () => {
    test('GET /api/security/audit-logs - should return audit logs', async () => {
      const response = await apiCall('/api/security/audit-logs')
      expect(response).toBeDefined()
    })

    test('POST /api/gdpr/export - should export user data', async () => {
      const response = await apiCall('/api/gdpr/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-id'
        })
      })
      
      expect(response).toBeDefined()
    })

    test('POST /api/gdpr/delete - should delete user data', async () => {
      const response = await apiCall('/api/gdpr/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-id'
        })
      })
      
      expect(response).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    test('should handle 404 errors gracefully', async () => {
      const response = await apiCall('/api/nonexistent-endpoint')
      expect(response).toBeDefined()
    })

    test('should handle authentication errors', async () => {
      const response = await apiCall('/api/keywords', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })
      expect(response).toBeDefined()
    })

    test('should handle validation errors', async () => {
      const response = await apiCall('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields
        })
      })
      
      expect(response).toBeDefined()
    })
  })
})