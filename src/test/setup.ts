import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:54321/postgres'
process.env.REDIS_URL = 'redis://localhost:6379'

// Mock API keys for testing
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing'
process.env.AZURE_COGNITIVE_SERVICES_KEY = 'test-azure-key'
process.env.AZURE_COGNITIVE_SERVICES_ENDPOINT = 'https://test.cognitiveservices.azure.com/'
process.env.AWS_ACCESS_KEY_ID = 'test-aws-access-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret-key'
process.env.AWS_REGION = 'us-east-1'
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
process.env.GOOGLE_APPLICATION_CREDENTIALS = './test-service-account.json'

// Social Media API Keys (for testing)
process.env.TWITTER_BEARER_TOKEN = 'test-twitter-bearer-token'
process.env.REDDIT_CLIENT_ID = 'test-reddit-client-id'
process.env.REDDIT_CLIENT_SECRET = 'test-reddit-client-secret'
process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id'
process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-client-secret'

// Email service keys
process.env.SENDGRID_API_KEY = 'SG.test-sendgrid-key'
process.env.RESEND_API_KEY = 'test-resend-key'

// Monitoring and analytics
process.env.SENTRY_DSN = 'https://test@sentry.io/test'
process.env.MIXPANEL_TOKEN = 'test-mixpanel-token'

// Create a comprehensive Supabase client mock
const createMockSupabaseClient = () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    csv: vi.fn().mockResolvedValue({ data: '', error: null }),
    geojson: vi.fn().mockResolvedValue({ data: null, error: null }),
    explain: vi.fn().mockResolvedValue({ data: null, error: null }),
    rollback: vi.fn().mockResolvedValue({ data: null, error: null }),
    returns: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: null, url: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      setSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(() => ({ ...mockQueryBuilder })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: null }),
        createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      })),
    },
    realtime: {
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),
      getChannels: vi.fn().mockReturnValue([]),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  }
}

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createMockSupabaseClient(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createMockSupabaseClient(),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
    entries: vi.fn(),
    toString: vi.fn(),
  }),
  usePathname: () => '/test-path',
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock fetch for API tests
global.fetch = vi.fn()

// Mock Redis for caching tests
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(0),
      expire: vi.fn().mockResolvedValue(1),
      flushall: vi.fn().mockResolvedValue('OK'),
      ping: vi.fn().mockResolvedValue('PONG'),
      quit: vi.fn().mockResolvedValue('OK'),
      on: vi.fn(),
      off: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    })),
  }
})

// Mock file system operations
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
  },
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
}))

// Mock external API services
vi.mock('@/lib/services/sentiment/openai-provider', () => ({
  OpenAISentimentProvider: vi.fn().mockImplementation(() => ({
    analyzeSentiment: vi.fn().mockResolvedValue({
      sentiment: 'positive',
      confidence: 0.85,
      scores: { positive: 0.85, negative: 0.1, neutral: 0.05 }
    }),
  })),
}))

vi.mock('@/lib/services/sentiment/azure-provider', () => ({
  AzureSentimentProvider: vi.fn().mockImplementation(() => ({
    analyzeSentiment: vi.fn().mockResolvedValue({
      sentiment: 'positive',
      confidence: 0.85,
      scores: { positive: 0.85, negative: 0.1, neutral: 0.05 }
    }),
  })),
}))

vi.mock('@/lib/services/sentiment/aws-provider', () => ({
  AWSComprehendProvider: vi.fn().mockImplementation(() => ({
    analyzeSentiment: vi.fn().mockResolvedValue({
      sentiment: 'positive',
      confidence: 0.85,
      scores: { positive: 0.85, negative: 0.1, neutral: 0.05 }
    }),
  })),
}))

vi.mock('@/lib/services/sentiment/google-provider', () => ({
  GoogleSentimentProvider: vi.fn().mockImplementation(() => ({
    analyzeSentiment: vi.fn().mockResolvedValue({
      sentiment: 'positive',
      confidence: 0.85,
      scores: { positive: 0.85, negative: 0.1, neutral: 0.05 }
    }),
  })),
}))

// Mock email services
vi.mock('@sendgrid/mail', () => ({
  setApiKey: vi.fn(),
  send: vi.fn().mockResolvedValue([{ statusCode: 202 }]),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}))

// Mock social media APIs
vi.mock('twitter-api-v2', () => ({
  TwitterApi: vi.fn().mockImplementation(() => ({
    v2: {
      search: vi.fn().mockResolvedValue({
        data: {
          data: [
            {
              id: '1',
              text: 'Test tweet',
              created_at: new Date().toISOString(),
              author_id: 'test-author',
            },
          ],
        },
      }),
    },
  })),
}))

// Mock performance monitoring
global.performance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
} as any

// Mock console methods for cleaner test output
const originalConsole = { ...console }
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Restore console in afterAll if needed
afterAll(() => {
  global.console = originalConsole
})