'use client';

import { useState } from 'react';
import { Keyword, CreateKeywordRequest, UpdateKeywordRequest } from '@/lib/types/keyword';
import { useKeywords } from '@/lib/hooks/useKeywords';
import KeywordForm from './KeywordForm';
import KeywordList from './KeywordList';

export default function KeywordManagement() {
  const {
    keywords,
    loading,
    error,
    createKeyword,
    updateKeyword,
    deleteKeyword,
    toggleKeywordStatus,
  } = useKeywords();

  const [showForm, setShowForm] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateKeyword = async (data: CreateKeywordRequest) => {
    setFormLoading(true);
    setFormError(null);
    
    try {
      await createKeyword(data);
      setShowForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create keyword');
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateKeyword = async (data: UpdateKeywordRequest) => {
    if (!editingKeyword) return;
    
    setFormLoading(true);
    setFormError(null);
    
    try {
      await updateKeyword(editingKeyword.id, data);
      setEditingKeyword(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to update keyword');
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingKeyword(null);
    setFormError(null);
  };

  const activeKeywords = keywords.filter(k => k.is_active);
  const inactiveKeywords = keywords.filter(k => !k.is_active);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Keyword Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor keywords across multiple platforms and configure alerts
            </p>
          </div>
          
          {!showForm && !editingKeyword && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Keyword
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Keywords</p>
                <p className="text-2xl font-semibold text-gray-900">{keywords.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-semibold text-gray-900">{activeKeywords.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Inactive</p>
                <p className="text-2xl font-semibold text-gray-900">{inactiveKeywords.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Error Display */}
      {formError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{formError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Keyword</h2>
          <KeywordForm
            onSubmit={handleCreateKeyword}
            onCancel={handleCancel}
            loading={formLoading}
          />
        </div>
      )}

      {/* Edit Form */}
      {editingKeyword && (
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Keyword</h2>
          <KeywordForm
            initialData={{
              term: editingKeyword.term,
              platforms: editingKeyword.platforms,
              alert_threshold: editingKeyword.alert_threshold,
              monitoring_frequency: editingKeyword.monitoring_frequency,
            }}
            onSubmit={handleUpdateKeyword}
            onCancel={handleCancel}
            isEditing={true}
            loading={formLoading}
          />
        </div>
      )}

      {/* Keywords List */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Keywords</h2>
        <KeywordList
          keywords={keywords}
          onEdit={handleEdit}
          onDelete={deleteKeyword}
          onToggleStatus={toggleKeywordStatus}
          loading={loading}
        />
      </div>
    </div>
  );
}