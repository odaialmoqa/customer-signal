import { NextRequest, NextResponse } from 'next/server';
import { getSentimentService } from '@/lib/services/sentiment';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contents, provider, batchSize } = body;

    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json(
        { error: 'Contents must be an array of strings' },
        { status: 400 }
      );
    }

    if (contents.length === 0) {
      return NextResponse.json(
        { error: 'Contents array cannot be empty' },
        { status: 400 }
      );
    }

    if (contents.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 items allowed per batch' },
        { status: 400 }
      );
    }

    // Validate each content item
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      if (typeof content !== 'string') {
        return NextResponse.json(
          { error: `Item at index ${i} must be a string` },
          { status: 400 }
        );
      }
      if (content.length > 10000) {
        return NextResponse.json(
          { error: `Item at index ${i} exceeds 10,000 character limit` },
          { status: 400 }
        );
      }
    }

    // Initialize sentiment service with optional configuration
    const config: any = {};
    if (provider) config.primaryProvider = provider;
    if (batchSize) config.batchSize = Math.min(batchSize, 100); // Cap at 100

    const sentimentService = getSentimentService(config);

    // Process batch
    const result = await sentimentService.batchAnalyze(contents);

    // Log the batch analysis for audit purposes
    await supabase.from('sentiment_batch_api_usage').insert({
      user_id: user.id,
      input_count: contents.length,
      processed_count: result.totalProcessed,
      error_count: result.errors.length,
      processing_time: result.processingTime,
      average_content_length: Math.round(
        contents.reduce((sum, content) => sum + content.length, 0) / contents.length
      ),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Batch sentiment analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve batch job status (for future async processing)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Get recent batch processing history for the user
    const { data: batchHistory, error } = await supabase
      .from('sentiment_batch_api_usage')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        batches: batchHistory,
        pagination: {
          limit,
          offset,
          hasMore: batchHistory.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('Batch history error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}