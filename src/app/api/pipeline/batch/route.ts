import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pipelineService } from '@/lib/services/pipeline'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { batch_size = 10 } = body

    if (batch_size < 1 || batch_size > 100) {
      return NextResponse.json(
        { error: 'Batch size must be between 1 and 100' },
        { status: 400 }
      )
    }

    const result = await pipelineService.processBatch(batch_size)

    return NextResponse.json({
      message: 'Batch processing completed',
      ...result
    })

  } catch (error) {
    console.error('Batch processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch' },
      { status: 500 }
    )
  }
}