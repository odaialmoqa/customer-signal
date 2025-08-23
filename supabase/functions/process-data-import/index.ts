import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ImportRequest {
  tenantId: string
  filePath: string
  mapping: Record<string, string>
  userId: string
}

interface ImportResult {
  success: boolean
  recordsProcessed: number
  recordsImported: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
  validationErrors: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tenantId, filePath, mapping, userId }: ImportRequest = await req.json()

    if (!tenantId || !filePath || !mapping || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result: ImportResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      validationErrors: []
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('data-imports')
      .download(filePath)

    if (downloadError) {
      result.validationErrors.push(`Failed to download file: ${downloadError.message}`)
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse file content
    const content = await fileData.text()
    const rows = parseCSV(content)

    if (rows.length === 0) {
      result.validationErrors.push('File is empty or contains no valid data')
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate mapping
    const headers = Object.keys(rows[0])
    const mappedFields = Object.values(mapping)
    
    for (const mappedField of mappedFields) {
      if (!headers.includes(mappedField)) {
        result.validationErrors.push(`Mapped field '${mappedField}' not found in file headers`)
      }
    }

    if (result.validationErrors.length > 0) {
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      try {
        result.recordsProcessed++
        const row = rows[i]

        // Map fields according to mapping configuration
        const mappedData = mapRowData(row, mapping)

        // Convert to conversation format
        const conversation = {
          tenant_id: tenantId,
          content: mappedData.content || mappedData.description || 'Imported data',
          author: mappedData.author || mappedData.customer_name || mappedData.name || 'Unknown',
          platform: 'csv',
          url: null,
          external_id: `csv_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${i}`,
          timestamp: parseTimestamp(mappedData.timestamp || mappedData.created_at) || new Date().toISOString(),
          keywords: extractKeywords(mappedData),
          tags: ['imported', 'csv'],
          engagement_metrics: {
            importedFrom: filePath,
            rowNumber: i + 1,
            originalData: mappedData
          },
          raw_data: row
        }

        // Insert into database
        const { error } = await supabase
          .from('conversations')
          .upsert(conversation, {
            onConflict: 'tenant_id,platform,external_id'
          })

        if (error) {
          result.errors.push({
            row: i + 1,
            field: 'database',
            message: error.message
          })
        } else {
          result.recordsImported++
        }
      } catch (error) {
        result.errors.push({
          row: i + 1,
          field: 'processing',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Create integration record
    const { error: integrationError } = await supabase
      .from('integrations')
      .insert({
        tenant_id: tenantId,
        type: 'csv',
        name: `File Import: ${filePath.split('/').pop()}`,
        config: {
          filePath,
          mapping,
          importResult: {
            recordsProcessed: result.recordsProcessed,
            recordsImported: result.recordsImported,
            errorCount: result.errors.length
          }
        },
        status: result.success ? 'active' : 'error',
        error_message: result.success ? null : result.errors.slice(0, 5).map(e => 
          `Row ${e.row}: ${e.message}`
        ).join('; '),
        created_by: userId,
        last_sync: new Date().toISOString()
      })

    if (integrationError) {
      console.error('Failed to create integration record:', integrationError)
    }

    result.success = result.errors.length === 0

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing data import:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function mapRowData(row: Record<string, string>, mapping: Record<string, string>): Record<string, any> {
  const mapped: Record<string, any> = {}

  for (const [targetField, sourceField] of Object.entries(mapping)) {
    mapped[targetField] = row[sourceField]
  }

  return mapped
}

function extractKeywords(data: Record<string, any>): string[] {
  const keywords: string[] = []

  // Extract keywords from various fields
  const keywordFields = ['tags', 'keywords', 'category', 'type', 'status']
  
  for (const field of keywordFields) {
    const value = data[field]
    if (value && typeof value === 'string') {
      keywords.push(...value.split(',').map(k => k.trim()).filter(k => k))
    }
  }

  return [...new Set(keywords)] // Remove duplicates
}

function parseTimestamp(value: any): string | null {
  if (!value) return null
  
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}