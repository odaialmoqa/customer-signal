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
    const { content, provider } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Content too long. Maximum 10,000 characters allowed.' },
        { status: 400 }
      );
    }

    // Initialize sentiment service with optional provider preference
    const config = provider ? { primaryProvider: provider } : {};
    const sentimentService = getSentimentService(config);

    // Analyze sentiment
    const result = await sentimentService.analyzeSentiment(content);

    // Log the analysis for audit purposes
    await supabase.from('sentiment_api_usage').insert({
      user_id: user.id,
      content_length: content.length,
      provider_used: result.provider,
      processing_time: result.processingTime,
      sentiment: result.sentiment,
      confidence: result.confidence,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

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

    // Get provider status
    const sentimentService = getSentimentService();
    const providerStatus = await sentimentService.getProviderStatus();

    return NextResponse.json({
      success: true,
      data: {
        providers: providerStatus,
        availableProviders: Object.keys(providerStatus).filter(
          provider => providerStatus[provider]
        ),
      },
    });
  } catch (error) {
    console.error('Provider status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}