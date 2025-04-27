# The Honey Barrel (BAXUS Marketplace Integration)

A Chrome extension that revolutionizes how wine and spirits enthusiasts discover the best prices by seamlessly integrating with the BAXUS marketplace. This extension automatically identifies bottles on retail websites and finds matching listings on BAXUS, potentially saving users significant money on their purchases.

## 🌟 Key Features

- **Smart Product Detection**

  - Automatic identification of wine and spirit products on retail pages
  - Support for multiple product page layouts and formats
  - Fallback detection for unsupported sites using generic selectors

- **Intelligent Matching Algorithm**

  - Advanced scoring system for precise product matching
  - Batch number recognition for limited releases
  - Brand and vintage verification
  - Price similarity analysis

- **Global Price Comparison**

  - Real-time currency conversion
  - Support for multiple currency formats
  - Domain-based currency detection
  - Savings calculation and display

- **User Interface**
  - Non-intrusive price comparison notifications
  - Detailed product match information
  - Easy access to BAXUS listings
  - Clean, modern popup interface

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Chrome Browser (latest version)
- Git

### Installation

#### From Chrome Web Store

1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. Follow the installation prompts

#### Installation

1. Clone this repository
   ```bash
   git clone https://github.com/samrathreddy/The-Honey-Barrel.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the extension directory

### Usage

1. Visit any supported wine or spirits retailer
2. Browse to a product page
3. The extension will automatically:
   - Detect the product
   - Search for matches on BAXUS
   - Display price comparisons if better deals are found
4. Click on matches to view the BAXUS listings

## 🌐 Supported Websites

The extension supports a wide range of wine and spirits retailers through optimized site-specific integrations:

### Primary Supported Retailers

| Retailer            | Website                                                    | Features                                                                                            |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Total Wine & More   | [totalwine.com](https://www.totalwine.com)                 | - Full product detection<br>- Price tracking<br>- Local store inventory<br>- Member pricing         |
| Wine.com            | [wine.com](https://www.wine.com)                           | - Complete catalog support<br>- Steward-Ship pricing<br>- Vintage detection<br>- Rating integration |
| Wine-Searcher       | [wine-searcher.com](https://www.wine-searcher.com)         | - Pro price history<br>- Market analysis<br>- Merchant comparison<br>- Global availability          |
| The Whisky Exchange | [thewhiskyexchange.com](https://www.thewhiskyexchange.com) | - Batch number detection<br>- International shipping<br>- GBP conversion<br>- Auction integration   |
| Master of Malt      | [masterofmalt.com](https://www.masterofmalt.com)           | - Dram pricing<br>- Tasting notes<br>- Special releases<br>- EU pricing                             |
| K&L Wines           | [klwines.com](https://www.klwines.com)                     | - Futures pricing<br>- Coming soon alerts<br>- Local inventory<br>- Special orders                  |
| Caskers             | [caskers.com](https://www.caskers.com)                     | - Member pricing<br>- Concierge service<br>- Limited releases<br>- Gift options                     |
| ReserveBar          | [reservebar.com](https://www.reservebar.com)               | - Premium selections<br>- Corporate orders<br>- Gift services<br>- Same-day delivery                |
| Flaviar             | [flaviar.com](https://www.flaviar.com)                     | - Member pricing<br>- Tasting boxes<br>- Exclusive releases<br>- Reviews integration                |
| Sotheby's Wine      | [sothebyswine.com](https://www.sothebyswine.com)           | - Auction pricing<br>- Rare vintages<br>- Collection valuation<br>- Market trends                   |




### Browser Permissions

```json
{
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": ["*://*/*", "https://services.baxus.co/*"]
}
```

### Adding New Retailers

Retailers can be added by contributing to our open-source selectors:

1. Fork the repository
2. Add site-specific selectors
3. Test with sample products
4. Submit a pull request

For retailer integration requests, please [open an issue](https://github.com/samrathreddy/The-Honey-Barrel/issues) with:

- Retailer website
- Example product pages
- Special features needed
- Region/Market information

## 💻 Technical Architecture

### Core Components

```
honey-barrel/
├── manifest.json           # Extension configuration and permissions
├── src/
│   ├── background.js      # Background service worker for API and state management
│   ├── content.js         # Content script for page detection and UI injection
│   ├── api/
│   │   └── baxus.js      # BAXUS API integration and matching logic
│   └── utils/
│       ├── currency.js    # Currency detection and conversion
│       └── matcher.js     # Product matching algorithms
├── popup/
│   ├── popup.html        # Extension popup interface
│   └── popup.js         # Popup UI logic and interactions
├── icons/               # Extension icons and assets
│   ├── icon-16.png     # Browser toolbar icon
│   ├── icon-48.png     # Extension management icon
│   └── icon-128.png    # Web store icon
├── popup.html        # Extension popup interface
│-── popup.js         # Popup UI logic and interactions
├── screenshots/        # Extension screenshots for documentation
├── .gitignore         # Git ignore configuration
└── LICENSE           # MIT License file
```

#### Component Responsibilities

1. **Background Service** (background.js)

   - BAXUS API communication
   - Data caching management
   - Price monitoring
   - Currency rate updates

2. **Content Script** (content.js)

   - Product detection on retail pages
   - Price extraction
   - DOM manipulation for notifications
   - Real-time UI updates

3. **BAXUS Integration** (baxus.js)

   - Product matching algorithm
   - API request handling
   - Response processing
   - Cache management

4. **Popup Interface** (popup.html, popup.js)

   - User settings management
   - Match history display
   - Price comparison visualization
   - Quick actions interface

5. **Utility Modules**
   - Currency conversion (currency.js)
   - Product matching logic (matcher.js)
   - Data validation
   - Error handling

### BAXUS API Integration

- Base URL: `https://services.baxus.co/api/search/listings`
- Methods: GET
- Parameters:
  - `from`: Pagination start index
  - `size`: Number of results per page
  - `listed`: Filter for listed items only

#### Response Handling

- Automatic retry on failure
- Response caching
- Rate limiting compliance
- Error handling with fallbacks

### Matching Algorithm

The extension uses a sophisticated scoring system to match products:

#### Scoring Factors (Total: 280 points possible)

1. **Brand Name Match** (100 points)

   - First word exact match
   - Case-insensitive comparison
   - Special character handling

2. **Brand Exact Match** (50 points)

   - Full brand name comparison
   - Alias handling for known variations

3. **Batch Number Match** (40 points)

   - Numeric sequence identification
   - Format normalization (e.g., "Batch 3" = "B3")

4. **Age/Vintage Match** (30 points)

   - Year extraction and comparison
   - Age statement verification

5. **Spirit Type Match** (20 points)

   - Category matching
   - Subcategory bonus points

6. **Keyword Matches** (10 points each)

   - Common word filtering
   - Relevance scoring

7. **Price Similarity** (30 points max)
   - Percentage-based comparison
   - Currency-normalized calculation

#### Matching Process

1. **Text Preprocessing**

```javascript
// Example of keyword extraction and normalization
function prepareMatchingTerms(name) {
  // Convert to lowercase and split into words
  const words = name
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  // Extract numbers (batch numbers, years, etc.)
  const numbers = name.match(/\b\d+\b/g) || [];

  // Extract potential brand name (first significant word)
  const brandName = words[0];

  return { words, numbers, brandName };
}
```

2. **Score Calculation**

```javascript
// Comprehensive scoring example
function calculateMatchScore(listing, target) {
  let score = 0;

  // Brand name matching (100 points)
  if (listing.brandName.toLowerCase() === target.brandName.toLowerCase()) {
    score += 100;
  }

  // Full brand exact match (50 points)
  if (listing.fullBrand.toLowerCase() === target.fullBrand.toLowerCase()) {
    score += 50;
  }

  // Batch number matching (40 points)
  if (
    listing.batchNumber &&
    target.batchNumber &&
    normalizeBatchNumber(listing.batchNumber) ===
      normalizeBatchNumber(target.batchNumber)
  ) {
    score += 40;
  }

  // Age/Vintage matching (30 points)
  if (listing.year === target.year) {
    score += 30;
  }

  // Spirit type matching (20 points)
  if (listing.category === target.category) {
    score += 20;
  }

  // Keyword matches (10 points each)
  const commonKeywords = listing.keywords.filter((k) =>
    target.keywords.includes(k)
  );
  score += commonKeywords.length * 10;

  // Price similarity (up to 30 points)
  const priceDiff = Math.abs(listing.normalizedPrice - target.normalizedPrice);
  if (priceDiff < 0.1) score += 30;
  else if (priceDiff < 0.2) score += 20;
  else if (priceDiff < 0.3) score += 10;

  return score;
}
```

The matching algorithm prioritizes exact matches on critical fields like brand name and batch numbers while still considering partial matches through keyword scoring. The price similarity score helps identify listings that are reasonably priced compared to the target product.

### Currency Handling

- **Detection**: Automatic currency symbol and format recognition
- **Conversion**: Real-time exchange rate updates
- **Display**: Locale-specific formatting
- **Caching**: Rate caching with configurable expiration

## 🔒 Privacy & Security

- No personal data collection
- Local-only processing
- Secure API communications
- Rate limiting compliance
- No external tracking

### Contributing

1. Fork the repository
2. Create your feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [BAXUS](https://baxus.co) for their marketplace API
- The open-source community for various tools and libraries used in this project

---

## 🔄 Version History

- v1.0.0 (2025-04-27)
  - Initial release
  - Basic product matching
  - Price comparison
  - Currency conversion

---

_This extension is affiliated with BAXUS. It is an independent project designed to enhance the BAXUS marketplace experience._
