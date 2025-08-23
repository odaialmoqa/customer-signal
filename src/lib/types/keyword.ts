export type PlatformType = 
  | 'reddit' 
  | 'twitter' 
  | 'linkedin' 
  | 'facebook' 
  | 'instagram' 
  | 'tiktok' 
  | 'youtube' 
  | 'yelp' 
  | 'google_reviews' 
  | 'trustpilot' 
  | 'g2' 
  | 'capterra' 
  | 'stackoverflow' 
  | 'quora' 
  | 'news' 
  | 'blog' 
  | 'forum' 
  | 'other';

export type MonitoringFrequency = 'realtime' | 'hourly' | 'daily';

export interface Keyword {
  id: string;
  tenant_id: string;
  term: string;
  platforms: PlatformType[];
  is_active: boolean;
  alert_threshold: number;
  monitoring_frequency: MonitoringFrequency;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateKeywordRequest {
  term: string;
  platforms: PlatformType[];
  alert_threshold?: number;
  monitoring_frequency?: MonitoringFrequency;
}

export interface UpdateKeywordRequest {
  term?: string;
  platforms?: PlatformType[];
  is_active?: boolean;
  alert_threshold?: number;
  monitoring_frequency?: MonitoringFrequency;
}

export interface KeywordValidationError {
  field: string;
  message: string;
}

export interface KeywordValidationResult {
  isValid: boolean;
  errors: KeywordValidationError[];
}