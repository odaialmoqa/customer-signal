import { useState, useEffect, useCallback } from 'react';
import { Keyword, CreateKeywordRequest, UpdateKeywordRequest } from '../types/keyword';

interface UseKeywordsReturn {
  keywords: Keyword[];
  loading: boolean;
  error: string | null;
  createKeyword: (data: CreateKeywordRequest) => Promise<void>;
  updateKeyword: (id: string, data: UpdateKeywordRequest) => Promise<void>;
  deleteKeyword: (id: string) => Promise<void>;
  toggleKeywordStatus: (id: string) => Promise<void>;
  refreshKeywords: () => Promise<void>;
}

export function useKeywords(): UseKeywordsReturn {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeywords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/keywords');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch keywords');
      }

      setKeywords(data.keywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const createKeyword = useCallback(async (data: CreateKeywordRequest) => {
    try {
      setError(null);
      
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create keyword');
      }

      // Add the new keyword to the list
      setKeywords(prev => [result.keyword, ...prev]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateKeyword = useCallback(async (id: string, data: UpdateKeywordRequest) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/keywords/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update keyword');
      }

      // Update the keyword in the list
      setKeywords(prev => 
        prev.map(keyword => 
          keyword.id === id ? result.keyword : keyword
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteKeyword = useCallback(async (id: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/keywords/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete keyword');
      }

      // Remove the keyword from the list
      setKeywords(prev => prev.filter(keyword => keyword.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const toggleKeywordStatus = useCallback(async (id: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/keywords/${id}/toggle`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to toggle keyword status');
      }

      // Update the keyword in the list
      setKeywords(prev => 
        prev.map(keyword => 
          keyword.id === id ? result.keyword : keyword
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const refreshKeywords = useCallback(async () => {
    await fetchKeywords();
  }, [fetchKeywords]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  return {
    keywords,
    loading,
    error,
    createKeyword,
    updateKeyword,
    deleteKeyword,
    toggleKeywordStatus,
    refreshKeywords,
  };
}