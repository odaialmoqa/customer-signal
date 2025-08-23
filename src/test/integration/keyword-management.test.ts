import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@/lib/supabase/client';
import { KeywordService } from '@/lib/services/keyword';
import { CreateKeywordRequest, UpdateKeywordRequest } from '@/lib/types/keyword';

// Mock data
const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';
const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

const mockKeywordData: CreateKeywordRequest = {
  term: 'test keyword',
  platforms: ['reddit', 'twitter'],
  alert_threshold: 10,
  monitoring_frequency: 'hourly',
};

describe('Keyword Management Integration Tests', () => {
  let keywordService: KeywordService;
  let createdKeywordIds: string[] = [];

  beforeEach(() => {
    keywordService = new KeywordService();
    createdKeywordIds = [];
  });

  afterEach(async () => {
    // Clean up created keywords
    for (const id of createdKeywordIds) {
      try {
        await keywordService.deleteKeyword(id, mockTenantId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Keyword CRUD Operations', () => {
    it('should create a new keyword successfully', async () => {
      const keyword = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);
      createdKeywordIds.push(keyword.id);

      expect(keyword).toBeDefined();
      expect(keyword.term).toBe('test keyword');
      expect(keyword.platforms).toEqual(['reddit', 'twitter']);
      expect(keyword.alert_threshold).toBe(10);
      expect(keyword.monitoring_frequency).toBe('hourly');
      expect(keyword.is_active).toBe(true);
      expect(keyword.tenant_id).toBe(mockTenantId);
      expect(keyword.created_by).toBe(mockUserId);
    });

    it('should prevent duplicate keywords', async () => {
      const keyword1 = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);
      createdKeywordIds.push(keyword1.id);

      await expect(
        keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData)
      ).rejects.toThrow('A keyword with this term already exists');
    });

    it('should retrieve keywords for a tenant', async () => {
      const keyword = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);
      createdKeywordIds.push(keyword.id);

      const keywords = await keywordService.getKeywords(mockTenantId);
      
      expect(keywords).toBeDefined();
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.some(k => k.id === keyword.id)).toBe(true);
    });

    it('should retrieve a specific keyword', async () => {
      const createdKeyword = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);
      createdKeywordIds.push(createdKeyword.id);

      const keyword = await keywordService.getKeyword(createdKeyword.id, mockTenantId);
      
      expect(keyword).toBeDefined();
      expect(keyword?.id).toBe(createdKeyword.id);
      expect(keyword?.term).toBe('test keyword');
    });

    it('should return null for non-existent keyword', async () => {
      const keyword = await keywordService.getKeyword('non-existent-id', mockTenantId);
      expect(keyword).toBeNull();
    });

    it('should update a keyword successfully', async () => {
      const createdKeyword = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);
      createdKeywordIds.push(createdKeyword.id);

      const updateData: UpdateKeywordRequest = {
        term: 'updated keyword',
        platforms: ['linkedin', 'facebook'],
        alert_threshold: 15,
        monitoring_frequency: 'daily',
      };

      const updatedKeyword = await keywordService.updateKeyword(createdKeyword.id, mockTenantId, updateData);

      expect(updatedKeyword.term).toBe('updated keyword');
      expect(updatedKeyword.platforms).toEqual(['linkedin', 'facebook']);
      expect(updatedKeyword.alert_threshold).toBe(15);
      expect(updatedKeyword.monitoring_frequency).toBe('daily');
    });

    it('should prevent updating to duplicate term', async () => {
      const keyword1 = await keywordService.createKeyword(mockTenantId, mockUserId, {
        ...mockKeywordData,
        term: 'keyword 1',
      });
      createdKeywordIds.push(keyword1.id);

      const keyword2 = await keywordService.createKeyword(mockTenantId, mockUserId, {
        ...mockKeywordData,
        term: 'keyword 2',
      });
      createdKeywordIds.push(keyword2.id);

      await expect(
        keywordService.updateKeyword(keyword2.id, mockTenantId, { term: 'keyword 1' })
      ).rejects.toThrow('A keyword with this term already exists');
    });

    it('should toggle keyword status', async () => {
      const createdKeyword = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);
      createdKeywordIds.push(createdKeyword.id);

      expect(createdKeyword.is_active).toBe(true);

      const toggledKeyword = await keywordService.toggleKeywordStatus(createdKeyword.id, mockTenantId);
      expect(toggledKeyword.is_active).toBe(false);

      const toggledAgain = await keywordService.toggleKeywordStatus(createdKeyword.id, mockTenantId);
      expect(toggledAgain.is_active).toBe(true);
    });

    it('should delete a keyword successfully', async () => {
      const createdKeyword = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);

      await keywordService.deleteKeyword(createdKeyword.id, mockTenantId);

      const deletedKeyword = await keywordService.getKeyword(createdKeyword.id, mockTenantId);
      expect(deletedKeyword).toBeNull();
    });

    it('should throw error when deleting non-existent keyword', async () => {
      await expect(
        keywordService.deleteKeyword('non-existent-id', mockTenantId)
      ).rejects.toThrow('Keyword not found');
    });

    it('should retrieve only active keywords', async () => {
      const activeKeyword = await keywordService.createKeyword(mockTenantId, mockUserId, {
        ...mockKeywordData,
        term: 'active keyword',
      });
      createdKeywordIds.push(activeKeyword.id);

      const inactiveKeyword = await keywordService.createKeyword(mockTenantId, mockUserId, {
        ...mockKeywordData,
        term: 'inactive keyword',
      });
      createdKeywordIds.push(inactiveKeyword.id);

      // Deactivate one keyword
      await keywordService.toggleKeywordStatus(inactiveKeyword.id, mockTenantId);

      const activeKeywords = await keywordService.getActiveKeywords(mockTenantId);
      
      expect(activeKeywords.some(k => k.id === activeKeyword.id)).toBe(true);
      expect(activeKeywords.some(k => k.id === inactiveKeyword.id)).toBe(false);
    });
  });

  describe('Keyword Validation', () => {
    it('should reject invalid keyword data', async () => {
      const invalidData = {
        term: '', // Empty term
        platforms: [], // No platforms
        alert_threshold: -1, // Invalid threshold
        monitoring_frequency: 'invalid' as any, // Invalid frequency
      };

      await expect(
        keywordService.createKeyword(mockTenantId, mockUserId, invalidData)
      ).rejects.toThrow('Validation failed');
    });

    it('should reject keyword with invalid platforms', async () => {
      const invalidData = {
        ...mockKeywordData,
        platforms: ['invalid_platform' as any],
      };

      await expect(
        keywordService.createKeyword(mockTenantId, mockUserId, invalidData)
      ).rejects.toThrow('Validation failed');
    });

    it('should reject keyword with invalid alert threshold', async () => {
      const invalidData = {
        ...mockKeywordData,
        alert_threshold: 1001, // Too high
      };

      await expect(
        keywordService.createKeyword(mockTenantId, mockUserId, invalidData)
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('Tenant Isolation', () => {
    const otherTenantId = '123e4567-e89b-12d3-a456-426614174002';

    it('should not retrieve keywords from other tenants', async () => {
      const keyword = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);
      createdKeywordIds.push(keyword.id);

      const otherTenantKeywords = await keywordService.getKeywords(otherTenantId);
      expect(otherTenantKeywords.some(k => k.id === keyword.id)).toBe(false);
    });

    it('should not allow updating keywords from other tenants', async () => {
      const keyword = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);
      createdKeywordIds.push(keyword.id);

      await expect(
        keywordService.updateKeyword(keyword.id, otherTenantId, { term: 'hacked' })
      ).rejects.toThrow('Keyword not found');
    });

    it('should not allow deleting keywords from other tenants', async () => {
      const keyword = await keywordService.createKeyword(mockTenantId, mockUserId, mockKeywordData);
      createdKeywordIds.push(keyword.id);

      await expect(
        keywordService.deleteKeyword(keyword.id, otherTenantId)
      ).rejects.toThrow('Keyword not found');
    });
  });
});