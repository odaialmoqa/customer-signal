export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          subscription: 'free' | 'pro' | 'enterprise'
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subscription?: 'free' | 'pro' | 'enterprise'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subscription?: 'free' | 'pro' | 'enterprise'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string | null
          role: string
          avatar_url: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          email: string
          full_name?: string | null
          role?: string
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string | null
          role?: string
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      keywords: {
        Row: {
          id: string
          tenant_id: string
          term: string
          platforms: string[]
          is_active: boolean
          alert_threshold: number
          monitoring_frequency: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          term: string
          platforms?: string[]
          is_active?: boolean
          alert_threshold?: number
          monitoring_frequency?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          term?: string
          platforms?: string[]
          is_active?: boolean
          alert_threshold?: number
          monitoring_frequency?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          tenant_id: string
          content: string
          author: string | null
          platform: string
          url: string | null
          external_id: string | null
          timestamp: string | null
          sentiment: 'positive' | 'negative' | 'neutral' | null
          sentiment_confidence: number | null
          keywords: string[]
          tags: string[]
          engagement_metrics: Json
          parent_conversation_id: string | null
          raw_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          content: string
          author?: string | null
          platform: string
          url?: string | null
          external_id?: string | null
          timestamp?: string | null
          sentiment?: 'positive' | 'negative' | 'neutral' | null
          sentiment_confidence?: number | null
          keywords?: string[]
          tags?: string[]
          engagement_metrics?: Json
          parent_conversation_id?: string | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          content?: string
          author?: string | null
          platform?: string
          url?: string | null
          external_id?: string | null
          timestamp?: string | null
          sentiment?: 'positive' | 'negative' | 'neutral' | null
          sentiment_confidence?: number | null
          keywords?: string[]
          tags?: string[]
          engagement_metrics?: Json
          parent_conversation_id?: string | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          tenant_id: string
          type: 'zendesk' | 'salesforce' | 'hubspot' | 'intercom' | 'freshdesk' | 'csv'
          name: string
          config: Json
          status: 'active' | 'error' | 'paused'
          last_sync: string | null
          error_message: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: 'zendesk' | 'salesforce' | 'hubspot' | 'intercom' | 'freshdesk' | 'csv'
          name: string
          config: Json
          status?: 'active' | 'error' | 'paused'
          last_sync?: string | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: 'zendesk' | 'salesforce' | 'hubspot' | 'intercom' | 'freshdesk' | 'csv'
          name?: string
          config?: Json
          status?: 'active' | 'error' | 'paused'
          last_sync?: string | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          tenant_id: string
          keyword_id: string
          conversation_id: string
          priority: 'low' | 'medium' | 'high' | 'urgent'
          title: string
          message: string | null
          is_read: boolean
          notified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          keyword_id: string
          conversation_id: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          title: string
          message?: string | null
          is_read?: boolean
          notified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          keyword_id?: string
          conversation_id?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          title?: string
          message?: string | null
          is_read?: boolean
          notified_at?: string | null
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          tenant_id: string
          name: string
          config: Json
          file_url: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          config: Json
          file_url?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          config?: Json
          file_url?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          color: string
          parent_tag_id: string | null
          usage_count: number
          is_system_tag: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          color?: string
          parent_tag_id?: string | null
          usage_count?: number
          is_system_tag?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          color?: string
          parent_tag_id?: string | null
          usage_count?: number
          is_system_tag?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      conversation_tags: {
        Row: {
          id: string
          conversation_id: string
          tag_id: string
          tagged_by: string | null
          tagged_at: string
          confidence: number | null
          is_auto_tagged: boolean
        }
        Insert: {
          id?: string
          conversation_id: string
          tag_id: string
          tagged_by?: string | null
          tagged_at?: string
          confidence?: number | null
          is_auto_tagged?: boolean
        }
        Update: {
          id?: string
          conversation_id?: string
          tag_id?: string
          tagged_by?: string | null
          tagged_at?: string
          confidence?: number | null
          is_auto_tagged?: boolean
        }
      }
      tag_suggestions: {
        Row: {
          id: string
          conversation_id: string
          tag_id: string
          confidence: number
          reason: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          tag_id: string
          confidence: number
          reason?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          tag_id?: string
          confidence?: number
          reason?: string | null
          status?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_tier: 'free' | 'pro' | 'enterprise'
      platform_type: 'reddit' | 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'yelp' | 'google_reviews' | 'trustpilot' | 'g2' | 'capterra' | 'stackoverflow' | 'quora' | 'news' | 'blog' | 'forum' | 'other'
      sentiment_type: 'positive' | 'negative' | 'neutral'
      integration_type: 'zendesk' | 'salesforce' | 'hubspot' | 'intercom' | 'freshdesk' | 'csv'
      integration_status: 'active' | 'error' | 'paused'
      alert_priority: 'low' | 'medium' | 'high' | 'urgent'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}