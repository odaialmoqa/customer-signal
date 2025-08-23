import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface TransformRequest {
  tenantId: string
  integrationType: 'zendesk' | 'salesforce' | 'hubspot' | 'intercom' | 'freshdesk'
  data: any[]
  transformationRules?: Record<string, any>
}

interface TransformResult {
  success: boolean
  transformedRecords: any[]
  errors: string[]
  recordsProcessed: number
  recordsTransformed: number
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

    const { tenantId, integrationType, data, transformationRules }: TransformRequest = await req.json()

    if (!tenantId || !integrationType || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result: TransformResult = {
      success: false,
      transformedRecords: [],
      errors: [],
      recordsProcessed: 0,
      recordsTransformed: 0
    }

    // Transform data based on integration type
    for (const record of data) {
      try {
        result.recordsProcessed++
        
        let transformedRecord: any = null

        switch (integrationType) {
          case 'zendesk':
            transformedRecord = transformZendeskData(record, tenantId)
            break
          case 'salesforce':
            transformedRecord = transformSalesforceData(record, tenantId)
            break
          case 'hubspot':
            transformedRecord = transformHubSpotData(record, tenantId)
            break
          case 'intercom':
            transformedRecord = transformIntercomData(record, tenantId)
            break
          case 'freshdesk':
            transformedRecord = transformFreshdeskData(record, tenantId)
            break
          default:
            throw new Error(`Unsupported integration type: ${integrationType}`)
        }

        if (transformedRecord) {
          // Apply custom transformation rules if provided
          if (transformationRules) {
            transformedRecord = applyTransformationRules(transformedRecord, transformationRules)
          }

          result.transformedRecords.push(transformedRecord)
          result.recordsTransformed++
        }
      } catch (error) {
        result.errors.push(`Record ${result.recordsProcessed}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    result.success = result.errors.length === 0

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error transforming integration data:', error)
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

function transformZendeskData(record: any, tenantId: string): any {
  return {
    tenant_id: tenantId,
    content: `${record.subject || 'No Subject'}\n\n${record.description || 'No Description'}`,
    author: record.requester?.name || 'Unknown',
    platform: 'zendesk',
    url: record.url || `https://zendesk.com/tickets/${record.id}`,
    external_id: record.id?.toString(),
    timestamp: record.created_at,
    keywords: record.tags || [],
    tags: [
      `status:${record.status}`,
      `priority:${record.priority}`,
      'zendesk'
    ].filter(Boolean),
    engagement_metrics: {
      status: record.status,
      priority: record.priority,
      requester_id: record.requester_id,
      assignee_id: record.assignee_id
    },
    raw_data: record
  }
}

function transformSalesforceData(record: any, tenantId: string): any {
  return {
    tenant_id: tenantId,
    content: `${record.Subject || 'No Subject'}\n\n${record.Description || 'No Description'}`,
    author: record.Contact?.Name || 'Unknown Contact',
    platform: 'salesforce',
    url: record.url || `https://salesforce.com/${record.Id}`,
    external_id: record.Id,
    timestamp: record.CreatedDate,
    keywords: [record.Type, record.Reason].filter(Boolean),
    tags: [
      `status:${record.Status}`,
      `priority:${record.Priority}`,
      `origin:${record.Origin}`,
      'salesforce'
    ].filter(Boolean),
    engagement_metrics: {
      status: record.Status,
      priority: record.Priority,
      origin: record.Origin,
      caseNumber: record.CaseNumber,
      contactEmail: record.Contact?.Email
    },
    raw_data: record
  }
}

function transformHubSpotData(record: any, tenantId: string): any {
  const properties = record.properties || {}
  
  return {
    tenant_id: tenantId,
    content: `${properties.subject || 'No Subject'}\n\n${properties.content || 'No Content'}`,
    author: record.contact?.name || 'Unknown Contact',
    platform: 'hubspot',
    url: record.url || `https://app.hubspot.com/contacts/tickets/${record.id}`,
    external_id: record.id,
    timestamp: properties.createdate,
    keywords: [properties.source_type].filter(Boolean),
    tags: [
      `stage:${properties.hs_pipeline_stage}`,
      `priority:${properties.hs_ticket_priority}`,
      'hubspot'
    ].filter(Boolean),
    engagement_metrics: {
      stage: properties.hs_pipeline_stage,
      priority: properties.hs_ticket_priority,
      sourceType: properties.source_type,
      ownerId: properties.hubspot_owner_id
    },
    raw_data: record
  }
}

function transformIntercomData(record: any, tenantId: string): any {
  const primaryContact = record.contacts?.contacts?.[0]
  
  return {
    tenant_id: tenantId,
    content: record.source?.body || record.title || 'No content',
    author: primaryContact?.name || primaryContact?.email || 'Unknown Contact',
    platform: 'intercom',
    url: record.url || `https://app.intercom.com/a/inbox/conversation/${record.id}`,
    external_id: record.id,
    timestamp: new Date(record.created_at * 1000).toISOString(),
    keywords: record.tags?.tags?.map((tag: any) => tag.name) || [],
    tags: [
      `state:${record.state}`,
      `priority:${record.priority}`,
      'intercom'
    ].filter(Boolean),
    engagement_metrics: {
      state: record.state,
      priority: record.priority,
      sourceType: record.source?.type,
      contactEmail: primaryContact?.email
    },
    raw_data: record
  }
}

function transformFreshdeskData(record: any, tenantId: string): any {
  return {
    tenant_id: tenantId,
    content: `${record.subject || 'No Subject'}\n\n${record.description_text || record.description || 'No Description'}`,
    author: record.requester?.name || 'Unknown Contact',
    platform: 'freshdesk',
    url: record.url || `https://freshdesk.com/tickets/${record.id}`,
    external_id: record.id?.toString(),
    timestamp: record.created_at,
    keywords: record.tags || [],
    tags: [
      `status:${getStatusName(record.status)}`,
      `priority:${getPriorityName(record.priority)}`,
      'freshdesk'
    ].filter(Boolean),
    engagement_metrics: {
      status: getStatusName(record.status),
      priority: getPriorityName(record.priority),
      source: getSourceName(record.source),
      type: record.type,
      requester_id: record.requester_id
    },
    raw_data: record
  }
}

function applyTransformationRules(record: any, rules: Record<string, any>): any {
  const transformed = { ...record }

  // Apply field mappings
  if (rules.fieldMappings) {
    for (const [targetField, sourceField] of Object.entries(rules.fieldMappings)) {
      if (record[sourceField as string] !== undefined) {
        transformed[targetField] = record[sourceField as string]
      }
    }
  }

  // Apply value transformations
  if (rules.valueTransformations) {
    for (const [field, transformation] of Object.entries(rules.valueTransformations)) {
      if (transformed[field] !== undefined) {
        const value = transformed[field]
        const rule = transformation as any

        switch (rule.type) {
          case 'uppercase':
            transformed[field] = value.toString().toUpperCase()
            break
          case 'lowercase':
            transformed[field] = value.toString().toLowerCase()
            break
          case 'replace':
            transformed[field] = value.toString().replace(new RegExp(rule.pattern, 'g'), rule.replacement)
            break
          case 'prefix':
            transformed[field] = `${rule.prefix}${value}`
            break
          case 'suffix':
            transformed[field] = `${value}${rule.suffix}`
            break
        }
      }
    }
  }

  // Apply filters
  if (rules.filters) {
    for (const filter of rules.filters) {
      const fieldValue = transformed[filter.field]
      
      switch (filter.operator) {
        case 'contains':
          if (!fieldValue?.toString().includes(filter.value)) {
            return null // Filter out this record
          }
          break
        case 'equals':
          if (fieldValue !== filter.value) {
            return null
          }
          break
        case 'not_equals':
          if (fieldValue === filter.value) {
            return null
          }
          break
      }
    }
  }

  return transformed
}

function getStatusName(status: number): string {
  const statusMap: Record<number, string> = {
    2: 'Open',
    3: 'Pending',
    4: 'Resolved',
    5: 'Closed'
  }
  return statusMap[status] || 'Unknown'
}

function getPriorityName(priority: number): string {
  const priorityMap: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Urgent'
  }
  return priorityMap[priority] || 'Unknown'
}

function getSourceName(source: number): string {
  const sourceMap: Record<number, string> = {
    1: 'Email',
    2: 'Portal',
    3: 'Phone',
    4: 'Chat',
    7: 'Feedback Widget',
    8: 'Outbound Email',
    9: 'Ecommerce',
    10: 'Bot'
  }
  return sourceMap[source] || 'Unknown'
}