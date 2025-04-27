## 🔒 Data Management & Privacy

### API Integration & Caching

The extension implements an efficient local-first architecture with intelligent caching:

#### BAXUS API Integration

```javascript
const BAXUS_API_URL = "https://services.baxus.co/api/search/listings";
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutes

// Cache structure for BAXUS data
const baxusCache = {
  listings: [],
  lastUpdated: null,
  isLoading: false,
};
```

#### Intelligent Caching System

1. **Cache Management**

   - 30-minute cache expiration for optimal freshness
   - Automatic cache invalidation
   - Loading state tracking to prevent duplicate requests
   - Batch loading of listings for efficiency

2. **Data Processing Pipeline**

```javascript
async function processListings(listings, currencyModule) {
  // Currency conversion and normalization
  const processedListings = await Promise.all(
    listings.map(async (item) => ({
      id: item._id,
      name: item._source.name,
      brand: item._source.attributes.Producer,
      price: await convertToUSD(item._source.price),
      vintage: extractVintage(item._source.name),
      age: extractAge(item._source.name),
      // ... other normalized fields
    }))
  );

  return processedListings;
}
```

3. **Smart Loading Strategy**

```javascript
async function loadAllBaxusListings() {
  if (baxusCache.isLoading) {
    return waitForBaxusData();
  }

  if (isCacheValid()) {
    return baxusCache.listings;
  }

  baxusCache.isLoading = true;
  try {
    const data = await fetchBaxusListings();
    baxusCache.listings = await processListings(data);
    baxusCache.lastUpdated = Date.now();
  } finally {
    baxusCache.isLoading = false;
  }
}
```

### Price Comparison Engine

1. **Currency Handling**

   - Real-time currency conversion
   - Domain-based currency detection
   - Price normalization to USD
   - Formatted price display with proper symbols

2. **Matching Algorithm**

```javascript
function calculateMatchScore(listing, bottleInfo) {
  let score = 0;

  // Brand name match (100 points)
  if (hasFirstWordMatch(listing, bottleInfo)) score += 100;

  // Batch number match (40 points)
  if (hasNumberMatch(listing, bottleInfo)) score += 40;

  // Age/Vintage match (30 points)
  if (matchesAgeOrVintage(listing, bottleInfo)) score += 30;

  // Price similarity (up to 30 points)
  const priceDiff = calculatePriceDifference(listing, bottleInfo);
  if (priceDiff < 0.15) score += Math.round(30 * (1 - priceDiff / 0.15));

  return score;
}
```

### Privacy & Performance

1. **Local Storage Management**

   - All data processing happens locally
   - No external data storage
   - Automatic cache cleanup
   - Memory usage optimization

2. **Request Optimization**

   - Rate limiting for API requests
   - Batch processing of listings
   - Efficient data structures for quick matching
   - Minimal network usage through caching

This architecture ensures:

- Fast response times through local caching
- Minimal API usage through intelligent cache management
- Accurate price comparisons with real-time currency conversion
- Robust error handling and recovery
- Privacy-focused data management
- Efficient memory usage and cleanup

The system maintains a balance between data freshness (30-minute cache) and performance, while ensuring all sensitive operations happen locally on the user's device.
