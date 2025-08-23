import { RawContent } from './platform-adapters/base-adapter.ts'

export interface ScrapingOptions {
  respectRobotsTxt?: boolean
  userAgent?: string
  delay?: number
  maxRetries?: number
  timeout?: number
}

export interface RobotsTxtRules {
  allowed: boolean
  crawlDelay?: number
  sitemaps: string[]
}

export class WebScraper {
  private readonly defaultUserAgent = 'CustomerSignal-Bot/1.0 (+https://customersignal.com/bot)'
  private readonly robotsCache = new Map<string, RobotsTxtRules>()
  private readonly defaultOptions: Required<ScrapingOptions> = {
    respectRobotsTxt: true,
    userAgent: this.defaultUserAgent,
    delay: 1000,
    maxRetries: 3,
    timeout: 10000
  }

  async scrapeUrl(url: string, options: ScrapingOptions = {}): Promise<string> {
    const opts = { ...this.defaultOptions, ...options }
    
    if (opts.respectRobotsTxt) {
      const robotsRules = await this.checkRobotsTxt(url, opts.userAgent)
      if (!robotsRules.allowed) {
        throw new Error(`Scraping not allowed by robots.txt for ${url}`)
      }
      
      if (robotsRules.crawlDelay && robotsRules.crawlDelay > opts.delay) {
        opts.delay = robotsRules.crawlDelay * 1000 // Convert to milliseconds
      }
    }

    return this.fetchWithRetry(url, opts)
  }

  async scrapeMultipleUrls(urls: string[], options: ScrapingOptions = {}): Promise<Map<string, string>> {
    const opts = { ...this.defaultOptions, ...options }
    const results = new Map<string, string>()
    
    for (const url of urls) {
      try {
        const content = await this.scrapeUrl(url, opts)
        results.set(url, content)
        
        // Respect delay between requests
        if (opts.delay > 0) {
          await this.sleep(opts.delay)
        }
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error)
        results.set(url, '')
      }
    }
    
    return results
  }

  private async checkRobotsTxt(url: string, userAgent: string): Promise<RobotsTxtRules> {
    const domain = new URL(url).origin
    const robotsUrl = `${domain}/robots.txt`
    
    // Check cache first
    if (this.robotsCache.has(robotsUrl)) {
      return this.robotsCache.get(robotsUrl)!
    }
    
    try {
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        // If robots.txt doesn't exist, assume scraping is allowed
        const defaultRules: RobotsTxtRules = { allowed: true, sitemaps: [] }
        this.robotsCache.set(robotsUrl, defaultRules)
        return defaultRules
      }
      
      const robotsText = await response.text()
      const rules = this.parseRobotsTxt(robotsText, userAgent, url)
      
      // Cache the rules for 1 hour
      this.robotsCache.set(robotsUrl, rules)
      setTimeout(() => this.robotsCache.delete(robotsUrl), 60 * 60 * 1000)
      
      return rules
    } catch (error) {
      console.error(`Failed to fetch robots.txt for ${domain}:`, error)
      // Default to allowing scraping if robots.txt can't be fetched
      const defaultRules: RobotsTxtRules = { allowed: true, sitemaps: [] }
      this.robotsCache.set(robotsUrl, defaultRules)
      return defaultRules
    }
  }

  private parseRobotsTxt(robotsText: string, userAgent: string, targetUrl: string): RobotsTxtRules {
    const lines = robotsText.split('\n').map(line => line.trim())
    const rules: RobotsTxtRules = { allowed: true, sitemaps: [] }
    
    let currentUserAgent = ''
    let isRelevantSection = false
    
    for (const line of lines) {
      if (line.startsWith('#') || line === '') continue
      
      const [directive, ...valueParts] = line.split(':')
      const value = valueParts.join(':').trim()
      
      switch (directive.toLowerCase()) {
        case 'user-agent':
          currentUserAgent = value.toLowerCase()
          isRelevantSection = currentUserAgent === '*' || 
                            userAgent.toLowerCase().includes(currentUserAgent) ||
                            currentUserAgent.includes('customersignal')
          break
          
        case 'disallow':
          if (isRelevantSection && value) {
            const path = new URL(targetUrl).pathname
            if (this.pathMatches(path, value)) {
              rules.allowed = false
            }
          }
          break
          
        case 'allow':
          if (isRelevantSection && value) {
            const path = new URL(targetUrl).pathname
            if (this.pathMatches(path, value)) {
              rules.allowed = true
            }
          }
          break
          
        case 'crawl-delay':
          if (isRelevantSection) {
            rules.crawlDelay = parseInt(value, 10)
          }
          break
          
        case 'sitemap':
          rules.sitemaps.push(value)
          break
      }
    }
    
    return rules
  }

  private pathMatches(path: string, pattern: string): boolean {
    if (pattern === '/') return true
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1))
    }
    return path === pattern || path.startsWith(pattern + '/')
  }

  private async fetchWithRetry(url: string, options: Required<ScrapingOptions>): Promise<string> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': options.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: AbortSignal.timeout(options.timeout)
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return await response.text()
      } catch (error) {
        lastError = error as Error
        console.error(`Attempt ${attempt} failed for ${url}:`, error)
        
        if (attempt < options.maxRetries) {
          // Exponential backoff
          const delay = options.delay * Math.pow(2, attempt - 1)
          await this.sleep(delay)
        }
      }
    }
    
    throw lastError || new Error(`Failed to fetch ${url} after ${options.maxRetries} attempts`)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Extract text content from HTML
   */
  extractTextContent(html: string): string {
    // Simple HTML tag removal - in production, you'd want a proper HTML parser
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Extract links from HTML content
   */
  extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = []
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
    let match
    
    while ((match = linkRegex.exec(html)) !== null) {
      try {
        const url = new URL(match[1], baseUrl).href
        links.push(url)
      } catch {
        // Invalid URL, skip
      }
    }
    
    return [...new Set(links)] // Remove duplicates
  }

  /**
   * Extract meta information from HTML
   */
  extractMetadata(html: string): Record<string, string> {
    const metadata: Record<string, string> = {}
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
      metadata.title = titleMatch[1].trim()
    }
    
    // Extract meta tags
    const metaRegex = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi
    let match
    
    while ((match = metaRegex.exec(html)) !== null) {
      metadata[match[1]] = match[2]
    }
    
    return metadata
  }
}