# Search and Filtering UI Components

This directory contains the comprehensive search and filtering UI components for CustomerSignal, implementing advanced search capabilities with real-time filtering, saved searches, and pagination.

## Components

### AdvancedSearchFilters

A comprehensive filtering component that provides:

- **Real-time search** with debounced input
- **Date range filtering** with preset options (Last 7 days, 30 days, etc.)
- **Platform filtering** across all supported platforms (Reddit, Twitter, LinkedIn, etc.)
- **Sentiment filtering** (Positive, Negative, Neutral)
- **Keyword and tag filtering** with add/remove functionality
- **Filter presets** for common search scenarios
- **Saved searches** functionality with localStorage persistence
- **Expandable interface** to show/hide advanced options

#### Usage

```tsx
import { AdvancedSearchFilters } from '@/components/search'

<AdvancedSearchFilters
  filters={filters}
  onFiltersChange={handleFiltersChange}
  onSearch={handleSearch}
  loading={loading}
  tenantId={tenantId}
  savedSearches={savedSearches}
  onSaveSearch={handleSaveSearch}
  onDeleteSavedSearch={handleDeleteSavedSearch}
  onLoadSavedSearch={handleLoadSavedSearch}
/>
```

### SearchResults

A results display component that provides:

- **Conversation cards** with rich metadata display
- **Pagination** with intelligent page number display
- **Tag management** with inline add/remove functionality
- **Platform and sentiment indicators** with color coding
- **External link access** to original conversations
- **Loading and error states**
- **Empty state** with helpful messaging

#### Usage

```tsx
import { SearchResults } from '@/components/search'

<SearchResults
  conversations={conversations}
  totalCount={totalCount}
  loading={loading}
  error={error}
  currentPage={currentPage}
  pageSize={pageSize}
  onPageChange={handlePageChange}
  onConversationClick={handleConversationClick}
  onAddTag={handleAddTag}
  showPagination={true}
/>
```

### SearchPage

A complete search page that combines all components:

- **Integrated search experience** combining filters and results
- **State management** for search, pagination, and saved searches
- **Automatic search execution** when filters change
- **Tenant isolation** for multi-tenant applications

#### Usage

```tsx
import { SearchPage } from '@/components/search'

<SearchPage 
  tenantId={tenantId}
  initialFilters={initialFilters}
  onConversationClick={handleConversationClick}
/>
```

## Hooks

### useSavedSearches

A custom hook for managing saved searches:

- **localStorage persistence** with tenant isolation
- **CRUD operations** for saved searches
- **Error handling** and loading states
- **Automatic refresh** capabilities

#### Usage

```tsx
import { useSavedSearches } from '@/lib/hooks/useSavedSearches'

const {
  savedSearches,
  loading,
  error,
  saveSearch,
  updateSearch,
  deleteSearch,
  loadSearch,
  refresh
} = useSavedSearches({ tenantId })
```

## Features

### Real-time Search

- **Debounced input** prevents excessive API calls
- **Instant feedback** with loading states
- **Auto-complete suggestions** for keywords and tags

### Advanced Filtering

- **Multiple filter types** can be combined
- **Filter presets** for common scenarios:
  - Recent Negative Feedback
  - Social Media Buzz
  - Review Sites
  - Positive Mentions

### Saved Searches

- **Persistent storage** using localStorage
- **Tenant isolation** prevents cross-tenant data access
- **Quick access** to frequently used searches
- **Search management** with rename and delete options

### Responsive Design

- **Mobile-first approach** with responsive breakpoints
- **Touch-friendly interactions** for mobile devices
- **Collapsible sections** to optimize screen space

### Accessibility

- **Keyboard navigation** support
- **Screen reader compatibility** with proper ARIA labels
- **High contrast** color schemes for visibility
- **Focus management** for better UX

## Filter Types

### Text Search
- Full-text search across conversation content
- Supports partial matches and phrase searches

### Date Range
- Preset ranges (Last 7 days, 30 days, 90 days, etc.)
- Custom date picker for specific ranges
- Timezone-aware filtering

### Platform Filtering
Supports all major platforms:
- **Social Media**: Reddit, Twitter/X, LinkedIn, Facebook, Instagram, TikTok
- **Review Sites**: Yelp, Google Reviews, Trustpilot, G2, Capterra
- **Forums**: Stack Overflow, Quora, Industry Forums
- **Content**: News Sites, Blogs, YouTube

### Sentiment Analysis
- **Positive**: Happy customers, praise, recommendations
- **Negative**: Complaints, issues, criticism
- **Neutral**: Informational, questions, general mentions

### Keywords and Tags
- **Keywords**: Automatically extracted from content
- **Tags**: User-defined categorization
- **Bulk operations** for efficient management

## Performance Optimizations

### Debouncing
- **300ms delay** on search input to prevent excessive API calls
- **Immediate feedback** for filter changes

### Pagination
- **Configurable page sizes** (default: 20 items)
- **Intelligent page number display** with ellipsis for large datasets
- **Smooth navigation** between pages

### Caching
- **Filter state persistence** during session
- **Saved searches** cached in localStorage
- **Optimistic updates** for better perceived performance

## Testing

Comprehensive test coverage includes:

### Unit Tests
- **Component rendering** and interaction testing
- **Hook functionality** with mocked dependencies
- **Filter logic** validation
- **Pagination behavior** testing

### Integration Tests
- **Search functionality** with real database queries
- **Filter combinations** and edge cases
- **Tenant isolation** verification
- **Performance testing** with large datasets

### Test Files
- `src/test/unit/advanced-search-filters.test.tsx`
- `src/test/unit/search-results.test.tsx`
- `src/test/unit/useSavedSearches.test.tsx`
- `src/test/integration/search-functionality.test.ts`

## Styling

### Design System
- **Tailwind CSS** for consistent styling
- **Notion-inspired** clean and minimal design
- **Color-coded indicators** for platforms and sentiments
- **Smooth animations** and transitions

### Theme Support
- **Light theme** as default
- **Consistent spacing** using Tailwind's spacing scale
- **Accessible colors** meeting WCAG guidelines

## Future Enhancements

### Planned Features
- **Advanced query syntax** with operators (AND, OR, NOT)
- **Bulk actions** for conversation management
- **Export functionality** for search results
- **Real-time updates** using WebSocket connections
- **Machine learning** suggestions for search improvements

### Performance Improvements
- **Virtual scrolling** for large result sets
- **Search result caching** with intelligent invalidation
- **Progressive loading** of conversation details
- **Background prefetching** of likely next pages

## Requirements Fulfilled

This implementation fulfills **Requirement 14** from the specifications:

> **User Story:** As a business user, I want filtering options by date range, sentiment, platform, and keywords, so that I can focus on specific subsets of data.

#### Acceptance Criteria Met:
1. ✅ **Real-time filtering** - Results update without page refreshes
2. ✅ **Multiple filter combinations** - All filters work together with logical AND operations
3. ✅ **Individual and bulk filter clearing** - Users can reset filters individually or all at once
4. ✅ **Helpful empty states** - Clear messaging when no results match filters
5. ✅ **Saved filter combinations** - Users can save and name custom filter presets

The implementation goes beyond the basic requirements by adding:
- Saved searches functionality
- Filter presets for common scenarios
- Advanced UI with expandable sections
- Comprehensive tag management
- Real-time search with autocomplete
- Mobile-responsive design
- Extensive test coverage