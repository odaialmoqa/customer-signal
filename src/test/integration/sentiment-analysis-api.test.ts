import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Sentiment Analysis API Integration Tests', () => {
  let supabase: any;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create a test user for authentication
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'test-sentiment@example.com',
      password: 'test-password-123',
    });

    if (authError && !authError.message.includes('already registered')) {
      throw authError;
    }

    // Sign in to get token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test-sentiment@example.com',
      password: 'test-password-123',
    });

    if (signInError) {
      throw signInError;
    }

    authToken = signInData.session.access_token;
    testUserId = signInData.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await supabase.from('sentiment_api_usage').delete().eq('user_id', testUserId);
      await supabase.from('sentiment_batch_api_usage').delete().eq('user_id', testUserId);
    }
  });

  describe('POST /api/sentiment/analyze', () => {
    it('should analyze positive sentiment successfully', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: 'This product is absolutely amazing and I love it so much!',
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('sentiment');
      expect(data.data).toHaveProperty('confidence');
      expect(data.data).toHaveProperty('provider');
      expect(data.data).toHaveProperty('processingTime');
      
      expect(data.data.sentiment).toBe('positive');
      expect(data.data.confidence).toBeGreaterThan(0);
      expect(typeof data.data.processingTime).toBe('number');
    });

    it('should analyze negative sentiment successfully', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: 'This is terrible and I hate it completely!',
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.sentiment).toBe('negative');
      expect(data.data.confidence).toBeGreaterThan(0);
    });

    it('should analyze neutral sentiment successfully', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: 'This is a product description with technical specifications.',
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.sentiment).toBe('neutral');
    });

    it('should handle empty content', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: '',
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.sentiment).toBe('neutral');
      expect(data.data.confidence).toBe(0);
    });

    it('should reject requests without authentication', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Test content',
        }),
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid content', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: 123, // Invalid type
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Content is required and must be a string');
    });

    it('should reject content that is too long', async () => {
      const longContent = 'a'.repeat(10001); // Exceeds 10,000 character limit
      
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: longContent,
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Content too long');
    });

    it('should accept provider preference', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: 'This is great!',
          provider: 'local',
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.provider).toBe('local');
    });
  });

  describe('GET /api/sentiment/analyze', () => {
    it('should return provider status', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('providers');
      expect(data.data).toHaveProperty('availableProviders');
      
      expect(data.data.providers).toHaveProperty('local');
      expect(data.data.providers).toHaveProperty('google');
      expect(data.data.providers).toHaveProperty('aws');
      expect(data.data.providers).toHaveProperty('azure');
      
      expect(data.data.providers.local).toBe(true); // Local should always be available
      expect(Array.isArray(data.data.availableProviders)).toBe(true);
    });

    it('should reject requests without authentication', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/analyze`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/sentiment/batch', () => {
    it('should process batch sentiment analysis successfully', async () => {
      const contents = [
        'This is absolutely wonderful!',
        'This is completely terrible!',
        'This is a neutral statement.',
        'I love this product so much!',
        'I hate this service.',
      ];

      const response = await fetch(`${apiBaseUrl}/api/sentiment/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          contents,
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('results');
      expect(data.data).toHaveProperty('totalProcessed');
      expect(data.data).toHaveProperty('errors');
      expect(data.data).toHaveProperty('processingTime');
      
      expect(data.data.results).toHaveLength(5);
      expect(data.data.totalProcessed).toBe(5);
      expect(data.data.errors).toHaveLength(0);
      
      // Check that sentiments are correctly identified
      expect(data.data.results[0].sentiment).toBe('positive');
      expect(data.data.results[1].sentiment).toBe('negative');
      expect(data.data.results[2].sentiment).toBe('neutral');
      expect(data.data.results[3].sentiment).toBe('positive');
      expect(data.data.results[4].sentiment).toBe('negative');
    });

    it('should handle empty batch', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          contents: [],
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Contents array cannot be empty');
    });

    it('should reject non-array contents', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          contents: 'not an array',
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Contents must be an array of strings');
    });

    it('should reject batch that is too large', async () => {
      const largeBatch = Array(1001).fill('test content');
      
      const response = await fetch(`${apiBaseUrl}/api/sentiment/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          contents: largeBatch,
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Maximum 1000 items allowed per batch');
    });

    it('should validate individual content items', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          contents: ['valid content', 123, 'another valid content'],
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Item at index 1 must be a string');
    });

    it('should respect batch size configuration', async () => {
      const contents = Array(50).fill('test content');
      
      const response = await fetch(`${apiBaseUrl}/api/sentiment/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          contents,
          batchSize: 10,
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.totalProcessed).toBe(50);
    });
  });

  describe('GET /api/sentiment/batch', () => {
    beforeEach(async () => {
      // Create some test batch history
      await supabase.from('sentiment_batch_api_usage').insert([
        {
          user_id: testUserId,
          input_count: 10,
          processed_count: 10,
          error_count: 0,
          processing_time: 1500,
          average_content_length: 50,
          created_at: new Date().toISOString(),
        },
        {
          user_id: testUserId,
          input_count: 5,
          processed_count: 4,
          error_count: 1,
          processing_time: 800,
          average_content_length: 75,
          created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        },
      ]);
    });

    it('should return batch processing history', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/batch`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('batches');
      expect(data.data).toHaveProperty('pagination');
      
      expect(Array.isArray(data.data.batches)).toBe(true);
      expect(data.data.batches.length).toBeGreaterThan(0);
      
      // Check pagination
      expect(data.data.pagination).toHaveProperty('limit');
      expect(data.data.pagination).toHaveProperty('offset');
      expect(data.data.pagination).toHaveProperty('hasMore');
    });

    it('should respect pagination parameters', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/batch?limit=1&offset=0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.batches).toHaveLength(1);
      expect(data.data.pagination.limit).toBe(1);
      expect(data.data.pagination.offset).toBe(0);
    });

    it('should reject requests without authentication', async () => {
      const response = await fetch(`${apiBaseUrl}/api/sentiment/batch`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });
});