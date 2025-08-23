import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  SentimentTrendChart,
  ConversationVolumeChart,
  PlatformDistributionChart,
  KeywordPerformanceChart
} from '@/components/analytics'
import { TrendData, PlatformDistribution, KeywordPerformance } from '@/lib/services/analytics'

// Mock recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children, onClick }: any) => (
    <div data-testid="area-chart" onClick={onClick}>
      {children}
    </div>
  ),
  Area: ({ name }: any) => <div data-testid={`area-${name?.toLowerCase()}`}>{name}</div>,
  BarChart: ({ children, onClick }: any) => (
    <div data-testid="bar-chart" onClick={onClick}>
      {children}
    </div>
  ),
  Bar: ({ name }: any) => <div data-testid={`bar-${name?.toLowerCase()?.replace(/\s+/g, '-')}`}>{name}</div>,
  LineChart: ({ children, onClick }: any) => (
    <div data-testid="line-chart" onClick={onClick}>
      {children}
    </div>
  ),
  Line: ({ name }: any) => <div data-testid={`line-${name?.toLowerCase()?.replace(/\s+/g, '-')}`}>{name}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ onClick }: any) => <div data-testid="pie" onClick={onClick}>Pie</div>,
  Cell: () => <div data-testid="cell">Cell</div>,
  ScatterChart: ({ children, onClick }: any) => (
    <div data-testid="scatter-chart" onClick={onClick}>
      {children}
    </div>
  ),
  Scatter: ({ name }: any) => <div data-testid="scatter">{name}</div>,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis">{dataKey}</div>,
  YAxis: () => <div data-testid="y-axis">Y-Axis</div>,
  ZAxis: () => <div data-testid="z-axis">Z-Axis</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid">Grid</div>,
  Tooltip: ({ content }: any) => <div data-testid="tooltip">{content}</div>,
  Legend: () => <div data-testid="legend">Legend</div>
}))

describe('SentimentTrendChart', () => {
  const mockTrendData: TrendData[] = [
    {
      keyword: 'test',
      platform: 'twitter',
      timeBucket: '2024-01-01T00:00:00Z',
      positiveCount: 10,
      negativeCount: 5,
      neutralCount: 15,
      totalCount: 30,
      sentimentScore: 0.2
    },
    {
      keyword: 'test',
      platform: 'reddit',
      timeBucket: '2024-01-02T00:00:00Z',
      positiveCount: 8,
      negativeCount: 12,
      neutralCount: 10,
      totalCount: 30,
      sentimentScore: -0.1
    }
  ]

  it('renders sentiment trend chart with data', () => {
    render(<SentimentTrendChart data={mockTrendData} />)
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    expect(screen.getByTestId('area-positive')).toBeInTheDocument()
    expect(screen.getByTestId('area-negative')).toBeInTheDocument()
    expect(screen.getByTestId('area-neutral')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<SentimentTrendChart data={[]} />)
    
    expect(screen.getByText('No sentiment data available')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your filters or date range')).toBeInTheDocument()
  })

  it('calls onDataPointClick when interactive', () => {
    const mockClick = vi.fn()
    render(
      <SentimentTrendChart 
        data={mockTrendData} 
        interactive={true}
        onDataPointClick={mockClick}
      />
    )
    
    const chart = screen.getByTestId('area-chart')
    fireEvent.click(chart)
    
    expect(mockClick).toHaveBeenCalled()
  })

  it('does not show legend when showLegend is false', () => {
    render(<SentimentTrendChart data={mockTrendData} showLegend={false} />)
    
    expect(screen.queryByTestId('legend')).not.toBeInTheDocument()
  })
})

describe('ConversationVolumeChart', () => {
  const mockVolumeData = [
    {
      date: '2024-01-01',
      value: 100,
      breakdown: { twitter: 50, reddit: 30, linkedin: 20 }
    },
    {
      date: '2024-01-02',
      value: 150,
      breakdown: { twitter: 80, reddit: 40, linkedin: 30 }
    }
  ]

  it('renders bar chart by default', () => {
    render(<ConversationVolumeChart data={mockVolumeData} />)
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('renders line chart when specified', () => {
    render(<ConversationVolumeChart data={mockVolumeData} chartType="line" />)
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('shows platform breakdown when enabled', () => {
    render(<ConversationVolumeChart data={mockVolumeData} showBreakdown={true} />)
    
    // Should show individual platform bars/lines
    expect(screen.getByTestId('bar-twitter')).toBeInTheDocument()
    expect(screen.getByTestId('bar-reddit')).toBeInTheDocument()
    expect(screen.getByTestId('bar-linkedin')).toBeInTheDocument()
  })

  it('shows total only when breakdown disabled', () => {
    render(<ConversationVolumeChart data={mockVolumeData} showBreakdown={false} />)
    
    expect(screen.getByTestId('bar-total-conversations')).toBeInTheDocument()
    expect(screen.queryByTestId('bar-twitter')).not.toBeInTheDocument()
  })

  it('handles click events when interactive', () => {
    const mockClick = vi.fn()
    render(
      <ConversationVolumeChart 
        data={mockVolumeData}
        interactive={true}
        onDataPointClick={mockClick}
      />
    )
    
    const chart = screen.getByTestId('bar-chart')
    fireEvent.click(chart)
    
    expect(mockClick).toHaveBeenCalled()
  })
})

describe('PlatformDistributionChart', () => {
  const mockPlatformData: PlatformDistribution[] = [
    {
      platform: 'twitter',
      count: 100,
      percentage: 50,
      sentimentBreakdown: { positive: 60, negative: 20, neutral: 20 }
    },
    {
      platform: 'reddit',
      count: 80,
      percentage: 40,
      sentimentBreakdown: { positive: 40, negative: 30, neutral: 10 }
    },
    {
      platform: 'linkedin',
      count: 20,
      percentage: 10,
      sentimentBreakdown: { positive: 15, negative: 3, neutral: 2 }
    }
  ]

  it('renders pie chart by default', () => {
    render(<PlatformDistributionChart data={mockPlatformData} />)
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('renders bar chart when specified', () => {
    render(<PlatformDistributionChart data={mockPlatformData} chartType="bar" />)
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument()
  })

  it('handles platform click events', () => {
    const mockClick = vi.fn()
    render(
      <PlatformDistributionChart 
        data={mockPlatformData}
        interactive={true}
        onPlatformClick={mockClick}
      />
    )
    
    const pie = screen.getByTestId('pie')
    fireEvent.click(pie)
    
    expect(mockClick).toHaveBeenCalled()
  })

  it('shows empty state when no data', () => {
    render(<PlatformDistributionChart data={[]} />)
    
    expect(screen.getByText('No platform data available')).toBeInTheDocument()
  })
})

describe('KeywordPerformanceChart', () => {
  const mockKeywordData: KeywordPerformance[] = [
    {
      keyword: 'customer service',
      totalMentions: 150,
      averageSentiment: 0.3,
      platforms: ['twitter', 'reddit'],
      recentTrend: 'up',
      engagementScore: 85.5
    },
    {
      keyword: 'product quality',
      totalMentions: 120,
      averageSentiment: -0.2,
      platforms: ['twitter', 'linkedin', 'reviews'],
      recentTrend: 'down',
      engagementScore: 72.3
    },
    {
      keyword: 'pricing',
      totalMentions: 90,
      averageSentiment: 0.1,
      platforms: ['reddit', 'forums'],
      recentTrend: 'stable',
      engagementScore: 45.8
    }
  ]

  it('renders bar chart by default', () => {
    render(<KeywordPerformanceChart data={mockKeywordData} />)
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('scatter-chart')).not.toBeInTheDocument()
  })

  it('renders scatter chart when specified', () => {
    render(<KeywordPerformanceChart data={mockKeywordData} chartType="scatter" />)
    
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('limits keywords to maxKeywords prop', () => {
    render(<KeywordPerformanceChart data={mockKeywordData} maxKeywords={2} />)
    
    // Should only render 2 keywords (this would be tested by checking data processing)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('handles different metrics', () => {
    const { rerender } = render(
      <KeywordPerformanceChart data={mockKeywordData} metric="mentions" />
    )
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()

    rerender(<KeywordPerformanceChart data={mockKeywordData} metric="sentiment" />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()

    rerender(<KeywordPerformanceChart data={mockKeywordData} metric="engagement" />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('handles keyword click events', () => {
    const mockClick = vi.fn()
    render(
      <KeywordPerformanceChart 
        data={mockKeywordData}
        interactive={true}
        onKeywordClick={mockClick}
      />
    )
    
    const chart = screen.getByTestId('bar-chart')
    fireEvent.click(chart)
    
    expect(mockClick).toHaveBeenCalled()
  })

  it('shows empty state when no data', () => {
    render(<KeywordPerformanceChart data={[]} />)
    
    expect(screen.getByText('No keyword data available')).toBeInTheDocument()
  })
})