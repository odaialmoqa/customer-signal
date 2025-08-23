import { describe, it, expect } from 'vitest';
import { validateKeyword, normalizeKeywordTerm, isDuplicateKeyword } from '../keyword-validation';
import { CreateKeywordRequest, UpdateKeywordRequest } from '../../types/keyword';

describe('Keyword Validation', () => {
  describe('validateKeyword', () => {
    const validKeywordData: CreateKeywordRequest = {
      term: 'test keyword',
      platforms: ['reddit', 'twitter'],
      alert_threshold: 5,
      monitoring_frequency: 'hourly',
    };

    it('should validate a correct keyword', () => {
      const result = validateKeyword(validKeywordData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('term validation', () => {
      it('should reject empty term', () => {
        const result = validateKeyword({ ...validKeywordData, term: '' });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'term')).toBe(true);
      });

      it('should reject term with only whitespace', () => {
        const result = validateKeyword({ ...validKeywordData, term: '   ' });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'term')).toBe(true);
      });

      it('should reject term that is too long', () => {
        const longTerm = 'a'.repeat(256);
        const result = validateKeyword({ ...validKeywordData, term: longTerm });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'term')).toBe(true);
      });

      it('should reject term with leading/trailing whitespace', () => {
        const result = validateKeyword({ ...validKeywordData, term: ' test keyword ' });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'term')).toBe(true);
      });

      it('should reject non-string term', () => {
        const result = validateKeyword({ ...validKeywordData, term: 123 as any });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'term')).toBe(true);
      });
    });

    describe('platforms validation', () => {
      it('should reject empty platforms array', () => {
        const result = validateKeyword({ ...validKeywordData, platforms: [] });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'platforms')).toBe(true);
      });

      it('should reject non-array platforms', () => {
        const result = validateKeyword({ ...validKeywordData, platforms: 'reddit' as any });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'platforms')).toBe(true);
      });

      it('should reject invalid platform names', () => {
        const result = validateKeyword({ 
          ...validKeywordData, 
          platforms: ['reddit', 'invalid_platform' as any] 
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'platforms')).toBe(true);
      });

      it('should reject duplicate platforms', () => {
        const result = validateKeyword({ 
          ...validKeywordData, 
          platforms: ['reddit', 'twitter', 'reddit'] 
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'platforms')).toBe(true);
      });

      it('should accept all valid platforms', () => {
        const validPlatforms = [
          'reddit', 'twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube',
          'yelp', 'google_reviews', 'trustpilot', 'g2', 'capterra', 'stackoverflow', 
          'quora', 'news', 'blog', 'forum', 'other'
        ];
        
        const result = validateKeyword({ ...validKeywordData, platforms: validPlatforms });
        expect(result.isValid).toBe(true);
      });
    });

    describe('alert_threshold validation', () => {
      it('should reject non-number alert threshold', () => {
        const result = validateKeyword({ ...validKeywordData, alert_threshold: 'five' as any });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'alert_threshold')).toBe(true);
      });

      it('should reject alert threshold below 1', () => {
        const result = validateKeyword({ ...validKeywordData, alert_threshold: 0 });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'alert_threshold')).toBe(true);
      });

      it('should reject alert threshold above 1000', () => {
        const result = validateKeyword({ ...validKeywordData, alert_threshold: 1001 });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'alert_threshold')).toBe(true);
      });

      it('should reject non-integer alert threshold', () => {
        const result = validateKeyword({ ...validKeywordData, alert_threshold: 5.5 });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'alert_threshold')).toBe(true);
      });

      it('should accept valid alert thresholds', () => {
        const validThresholds = [1, 5, 100, 1000];
        
        validThresholds.forEach(threshold => {
          const result = validateKeyword({ ...validKeywordData, alert_threshold: threshold });
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('monitoring_frequency validation', () => {
      it('should reject invalid monitoring frequency', () => {
        const result = validateKeyword({ 
          ...validKeywordData, 
          monitoring_frequency: 'invalid' as any 
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'monitoring_frequency')).toBe(true);
      });

      it('should accept valid monitoring frequencies', () => {
        const validFrequencies = ['realtime', 'hourly', 'daily'];
        
        validFrequencies.forEach(frequency => {
          const result = validateKeyword({ 
            ...validKeywordData, 
            monitoring_frequency: frequency as any 
          });
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('partial validation for updates', () => {
      it('should validate partial update data', () => {
        const updateData: UpdateKeywordRequest = {
          term: 'updated term',
        };
        
        const result = validateKeyword(updateData);
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid partial update data', () => {
        const updateData: UpdateKeywordRequest = {
          term: '',
          alert_threshold: -1,
        };
        
        const result = validateKeyword(updateData);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBe(2);
      });
    });

    describe('multiple validation errors', () => {
      it('should return all validation errors', () => {
        const invalidData = {
          term: '',
          platforms: [],
          alert_threshold: -1,
          monitoring_frequency: 'invalid' as any,
        };
        
        const result = validateKeyword(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBe(4);
        
        const errorFields = result.errors.map(e => e.field);
        expect(errorFields).toContain('term');
        expect(errorFields).toContain('platforms');
        expect(errorFields).toContain('alert_threshold');
        expect(errorFields).toContain('monitoring_frequency');
      });
    });
  });

  describe('normalizeKeywordTerm', () => {
    it('should trim and lowercase keyword terms', () => {
      expect(normalizeKeywordTerm('  Test Keyword  ')).toBe('test keyword');
      expect(normalizeKeywordTerm('UPPERCASE')).toBe('uppercase');
      expect(normalizeKeywordTerm('MiXeD cAsE')).toBe('mixed case');
    });

    it('should handle empty strings', () => {
      expect(normalizeKeywordTerm('')).toBe('');
      expect(normalizeKeywordTerm('   ')).toBe('');
    });
  });

  describe('isDuplicateKeyword', () => {
    const existingTerms = ['existing keyword', 'another term', 'third term'];

    it('should detect exact duplicates', () => {
      expect(isDuplicateKeyword(existingTerms, 'existing keyword')).toBe(true);
      expect(isDuplicateKeyword(existingTerms, 'another term')).toBe(true);
    });

    it('should detect case-insensitive duplicates', () => {
      expect(isDuplicateKeyword(existingTerms, 'EXISTING KEYWORD')).toBe(true);
      expect(isDuplicateKeyword(existingTerms, 'Another Term')).toBe(true);
    });

    it('should detect duplicates with whitespace differences', () => {
      expect(isDuplicateKeyword(existingTerms, '  existing keyword  ')).toBe(true);
      expect(isDuplicateKeyword(existingTerms, ' another term ')).toBe(true);
    });

    it('should not detect non-duplicates', () => {
      expect(isDuplicateKeyword(existingTerms, 'new keyword')).toBe(false);
      expect(isDuplicateKeyword(existingTerms, 'completely different')).toBe(false);
    });

    it('should handle empty existing terms array', () => {
      expect(isDuplicateKeyword([], 'any term')).toBe(false);
    });
  });
});