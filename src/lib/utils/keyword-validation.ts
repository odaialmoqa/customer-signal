import { CreateKeywordRequest, UpdateKeywordRequest, KeywordValidationResult, PlatformType } from '../types/keyword';

const VALID_PLATFORMS: PlatformType[] = [
  'reddit', 'twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube',
  'yelp', 'google_reviews', 'trustpilot', 'g2', 'capterra', 'stackoverflow', 
  'quora', 'news', 'blog', 'forum', 'other'
];

export function validateKeyword(data: CreateKeywordRequest | UpdateKeywordRequest): KeywordValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate term
  if ('term' in data) {
    if (!data.term || typeof data.term !== 'string') {
      errors.push({ field: 'term', message: 'Keyword term is required and must be a string' });
    } else if (data.term.trim().length === 0) {
      errors.push({ field: 'term', message: 'Keyword term cannot be empty' });
    } else if (data.term.length > 255) {
      errors.push({ field: 'term', message: 'Keyword term must be 255 characters or less' });
    } else if (data.term.trim() !== data.term) {
      errors.push({ field: 'term', message: 'Keyword term cannot have leading or trailing whitespace' });
    }
  }

  // Validate platforms
  if (data.platforms) {
    if (!Array.isArray(data.platforms)) {
      errors.push({ field: 'platforms', message: 'Platforms must be an array' });
    } else if (data.platforms.length === 0) {
      errors.push({ field: 'platforms', message: 'At least one platform must be selected' });
    } else {
      const invalidPlatforms = data.platforms.filter(p => !VALID_PLATFORMS.includes(p));
      if (invalidPlatforms.length > 0) {
        errors.push({ 
          field: 'platforms', 
          message: `Invalid platforms: ${invalidPlatforms.join(', ')}` 
        });
      }
      
      // Check for duplicates
      const uniquePlatforms = new Set(data.platforms);
      if (uniquePlatforms.size !== data.platforms.length) {
        errors.push({ field: 'platforms', message: 'Duplicate platforms are not allowed' });
      }
    }
  }

  // Validate alert_threshold
  if (data.alert_threshold !== undefined) {
    if (typeof data.alert_threshold !== 'number') {
      errors.push({ field: 'alert_threshold', message: 'Alert threshold must be a number' });
    } else if (data.alert_threshold < 1 || data.alert_threshold > 1000) {
      errors.push({ field: 'alert_threshold', message: 'Alert threshold must be between 1 and 1000' });
    } else if (!Number.isInteger(data.alert_threshold)) {
      errors.push({ field: 'alert_threshold', message: 'Alert threshold must be a whole number' });
    }
  }

  // Validate monitoring_frequency
  if (data.monitoring_frequency !== undefined) {
    const validFrequencies = ['realtime', 'hourly', 'daily'];
    if (!validFrequencies.includes(data.monitoring_frequency)) {
      errors.push({ 
        field: 'monitoring_frequency', 
        message: 'Monitoring frequency must be one of: realtime, hourly, daily' 
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function normalizeKeywordTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function isDuplicateKeyword(existingTerms: string[], newTerm: string): boolean {
  const normalizedNew = normalizeKeywordTerm(newTerm);
  const normalizedExisting = existingTerms.map(term => normalizeKeywordTerm(term));
  return normalizedExisting.includes(normalizedNew);
}