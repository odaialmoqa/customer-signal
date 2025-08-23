'use client';

import { useState } from 'react';
import { Keyword } from '@/lib/types/keyword';

interface KeywordListProps {
  keywords: Keyword[];
  onEdit: (keyword: Keyword) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  loading?: boolean;
}

export default function KeywordList({
  keywords,
  onEdit,
  onDelete,
  onToggleStatus,
  loading = false,
}: KeywordListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this keyword? This action cannot be undone.')) {
      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatPlatforms = (platforms: string[]) => {
    if (platforms.length === 0) return 'No platforms';
    if (platforms.length <= 3) return platforms.join(', ');
    return `${platforms.slice(0, 3).join(', ')} +${platforms.length - 3} more`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No keywords</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating your first keyword to monitor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {keywords.map((keyword) => (
        <div key={keyword.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium text-gray-900">{keyword.term}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  keyword.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {keyword.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Platforms:</span> {formatPlatforms(keyword.platforms)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Frequency:</span> {keyword.monitoring_frequency}
                  <span className="mx-2">•</span>
                  <span className="font-medium">Alert threshold:</span> {keyword.alert_threshold}
                </p>
                <p className="text-sm text-gray-500">
                  Created {formatDate(keyword.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onToggleStatus(keyword.id)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  keyword.is_active
                    ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                    : 'text-green-700 bg-green-100 hover:bg-green-200'
                }`}
                disabled={loading}
              >
                {keyword.is_active ? 'Pause' : 'Resume'}
              </button>
              
              <button
                onClick={() => onEdit(keyword)}
                className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                disabled={loading}
              >
                Edit
              </button>
              
              <button
                onClick={() => handleDelete(keyword.id)}
                className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                disabled={loading || deletingId === keyword.id}
              >
                {deletingId === keyword.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}