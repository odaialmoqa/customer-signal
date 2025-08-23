'use client';

import { useState } from 'react';
import { CreateKeywordRequest, UpdateKeywordRequest, PlatformType, MonitoringFrequency } from '@/lib/types/keyword';
import { validateKeyword } from '@/lib/utils/keyword-validation';

interface KeywordFormProps {
  initialData?: Partial<CreateKeywordRequest>;
  onSubmit: (data: CreateKeywordRequest | UpdateKeywordRequest) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  loading?: boolean;
}

const PLATFORM_OPTIONS: { value: PlatformType; label: string }[] = [
  { value: 'reddit', label: 'Reddit' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'google_reviews', label: 'Google Reviews' },
  { value: 'trustpilot', label: 'Trustpilot' },
  { value: 'g2', label: 'G2' },
  { value: 'capterra', label: 'Capterra' },
  { value: 'stackoverflow', label: 'Stack Overflow' },
  { value: 'quora', label: 'Quora' },
  { value: 'news', label: 'News Sites' },
  { value: 'blog', label: 'Blogs' },
  { value: 'forum', label: 'Forums' },
  { value: 'other', label: 'Other' },
];

const FREQUENCY_OPTIONS: { value: MonitoringFrequency; label: string }[] = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
];

export default function KeywordForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
  loading = false,
}: KeywordFormProps) {
  const [formData, setFormData] = useState({
    term: initialData?.term || '',
    platforms: initialData?.platforms || [],
    alert_threshold: initialData?.alert_threshold || 5,
    monitoring_frequency: initialData?.monitoring_frequency || 'hourly' as MonitoringFrequency,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateKeyword(formData);
    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
      return;
    }

    setErrors({});
    
    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handlePlatformChange = (platform: PlatformType, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      platforms: checked
        ? [...prev.platforms, platform]
        : prev.platforms.filter(p => p !== platform),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-2">
          Keyword Term *
        </label>
        <input
          type="text"
          id="term"
          value={formData.term}
          onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.term ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter keyword to monitor"
          disabled={loading}
        />
        {errors.term && (
          <p className="mt-1 text-sm text-red-600">{errors.term}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Platforms to Monitor *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PLATFORM_OPTIONS.map((platform) => (
            <label key={platform.value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.platforms.includes(platform.value)}
                onChange={(e) => handlePlatformChange(platform.value, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">{platform.label}</span>
            </label>
          ))}
        </div>
        {errors.platforms && (
          <p className="mt-1 text-sm text-red-600">{errors.platforms}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="alert_threshold" className="block text-sm font-medium text-gray-700 mb-2">
            Alert Threshold
          </label>
          <input
            type="number"
            id="alert_threshold"
            min="1"
            max="1000"
            value={formData.alert_threshold}
            onChange={(e) => setFormData(prev => ({ ...prev, alert_threshold: parseInt(e.target.value) || 5 }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.alert_threshold ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">Number of mentions before triggering alerts</p>
          {errors.alert_threshold && (
            <p className="mt-1 text-sm text-red-600">{errors.alert_threshold}</p>
          )}
        </div>

        <div>
          <label htmlFor="monitoring_frequency" className="block text-sm font-medium text-gray-700 mb-2">
            Monitoring Frequency
          </label>
          <select
            id="monitoring_frequency"
            value={formData.monitoring_frequency}
            onChange={(e) => setFormData(prev => ({ ...prev, monitoring_frequency: e.target.value as MonitoringFrequency }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.monitoring_frequency ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.monitoring_frequency && (
            <p className="mt-1 text-sm text-red-600">{errors.monitoring_frequency}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Saving...' : isEditing ? 'Update Keyword' : 'Create Keyword'}
        </button>
      </div>
    </form>
  );
}