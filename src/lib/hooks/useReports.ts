import { useState, useEffect } from 'react'
import { ReportConfig, GeneratedReport, ReportTemplate, ReportGenerationJob } from '@/lib/types/report'

export function useReports() {
  const [reportConfigs, setReportConfigs] = useState<ReportConfig[]>([])
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([])
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch report configurations
  const fetchReportConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports?type=configs')
      if (!response.ok) throw new Error('Failed to fetch report configs')
      const data = await response.json()
      setReportConfigs(data.configs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch generated reports
  const fetchGeneratedReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports?type=generated')
      if (!response.ok) throw new Error('Failed to fetch generated reports')
      const data = await response.json()
      setGeneratedReports(data.reports)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch report templates
  const fetchReportTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports?type=templates')
      if (!response.ok) throw new Error('Failed to fetch report templates')
      const data = await response.json()
      setReportTemplates(data.templates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Create report configuration
  const createReportConfig = async (configData: Omit<ReportConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-config', ...configData })
      })
      if (!response.ok) throw new Error('Failed to create report config')
      const data = await response.json()
      setReportConfigs(prev => [...prev, data.config])
      return data.config
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Update report configuration
  const updateReportConfig = async (id: string, updates: Partial<ReportConfig>) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-config', ...updates })
      })
      if (!response.ok) throw new Error('Failed to update report config')
      const data = await response.json()
      setReportConfigs(prev => prev.map(config => 
        config.id === id ? data.config : config
      ))
      return data.config
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Delete report configuration
  const deleteReportConfig = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/${id}?type=config`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete report config')
      setReportConfigs(prev => prev.filter(config => config.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Generate report
  const generateReport = async (configId: string, format: 'pdf' | 'excel' | 'csv') => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', configId, format })
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const data = await response.json()
      return data.jobId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Get report generation status
  const getReportStatus = async (jobId: string): Promise<ReportGenerationJob> => {
    try {
      const response = await fetch(`/api/reports/${jobId}?type=status`)
      if (!response.ok) throw new Error('Failed to get report status')
      const data = await response.json()
      return data.status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Download report
  const downloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/download/${reportId}`)
      if (!response.ok) {
        if (response.status === 404) throw new Error('Report not found')
        if (response.status === 410) throw new Error('Report has expired')
        throw new Error('Failed to download report')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${reportId}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Update report schedule
  const updateReportSchedule = async (configId: string, schedule: any) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/${configId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-schedule', schedule })
      })
      if (!response.ok) throw new Error('Failed to update report schedule')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Remove report schedule
  const removeReportSchedule = async (configId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/${configId}?type=schedule`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to remove report schedule')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Load initial data
  useEffect(() => {
    fetchReportConfigs()
    fetchGeneratedReports()
    fetchReportTemplates()
  }, [])

  return {
    // State
    reportConfigs,
    generatedReports,
    reportTemplates,
    loading,
    error,
    
    // Actions
    fetchReportConfigs,
    fetchGeneratedReports,
    fetchReportTemplates,
    createReportConfig,
    updateReportConfig,
    deleteReportConfig,
    generateReport,
    getReportStatus,
    downloadReport,
    updateReportSchedule,
    removeReportSchedule,
    
    // Utilities
    clearError: () => setError(null)
  }
}