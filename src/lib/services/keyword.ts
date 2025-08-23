import { createClient } from '../supabase/client';
import { Keyword, CreateKeywordRequest, UpdateKeywordRequest } from '../types/keyword';
import { validateKeyword, isDuplicateKeyword, normalizeKeywordTerm } from '../utils/keyword-validation';

export class KeywordService {
  private supabase = createClient();

  async getKeywords(tenantId: string): Promise<Keyword[]> {
    const { data, error } = await this.supabase
      .from('keywords')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch keywords: ${error.message}`);
    }

    return data || [];
  }

  async getKeyword(id: string, tenantId: string): Promise<Keyword | null> {
    const { data, error } = await this.supabase
      .from('keywords')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch keyword: ${error.message}`);
    }

    return data;
  }

  async createKeyword(tenantId: string, userId: string, data: CreateKeywordRequest): Promise<Keyword> {
    // Validate input
    const validation = validateKeyword(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for duplicates
    const existingKeywords = await this.getKeywords(tenantId);
    const existingTerms = existingKeywords.map(k => k.term);
    
    if (isDuplicateKeyword(existingTerms, data.term)) {
      throw new Error('A keyword with this term already exists');
    }

    // Create keyword
    const keywordData = {
      tenant_id: tenantId,
      term: normalizeKeywordTerm(data.term),
      platforms: data.platforms,
      alert_threshold: data.alert_threshold || 5,
      monitoring_frequency: data.monitoring_frequency || 'hourly',
      created_by: userId,
      is_active: true
    };

    const { data: createdKeyword, error } = await this.supabase
      .from('keywords')
      .insert(keywordData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create keyword: ${error.message}`);
    }

    return createdKeyword;
  }

  async updateKeyword(id: string, tenantId: string, data: UpdateKeywordRequest): Promise<Keyword> {
    // Validate input
    const validation = validateKeyword(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check if keyword exists
    const existingKeyword = await this.getKeyword(id, tenantId);
    if (!existingKeyword) {
      throw new Error('Keyword not found');
    }

    // Check for duplicates if term is being updated
    if (data.term && data.term !== existingKeyword.term) {
      const existingKeywords = await this.getKeywords(tenantId);
      const existingTerms = existingKeywords
        .filter(k => k.id !== id)
        .map(k => k.term);
      
      if (isDuplicateKeyword(existingTerms, data.term)) {
        throw new Error('A keyword with this term already exists');
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.term !== undefined) {
      updateData.term = normalizeKeywordTerm(data.term);
    }
    if (data.platforms !== undefined) {
      updateData.platforms = data.platforms;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }
    if (data.alert_threshold !== undefined) {
      updateData.alert_threshold = data.alert_threshold;
    }
    if (data.monitoring_frequency !== undefined) {
      updateData.monitoring_frequency = data.monitoring_frequency;
    }

    const { data: updatedKeyword, error } = await this.supabase
      .from('keywords')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update keyword: ${error.message}`);
    }

    return updatedKeyword;
  }

  async deleteKeyword(id: string, tenantId: string): Promise<void> {
    // Check if keyword exists
    const existingKeyword = await this.getKeyword(id, tenantId);
    if (!existingKeyword) {
      throw new Error('Keyword not found');
    }

    const { error } = await this.supabase
      .from('keywords')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete keyword: ${error.message}`);
    }
  }

  async toggleKeywordStatus(id: string, tenantId: string): Promise<Keyword> {
    const existingKeyword = await this.getKeyword(id, tenantId);
    if (!existingKeyword) {
      throw new Error('Keyword not found');
    }

    return this.updateKeyword(id, tenantId, {
      is_active: !existingKeyword.is_active
    });
  }

  async getActiveKeywords(tenantId: string): Promise<Keyword[]> {
    const { data, error } = await this.supabase
      .from('keywords')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch active keywords: ${error.message}`);
    }

    return data || [];
  }
}