# The Honey Barrel (BAXUS Marketplace)

A Chrome extension that helps wine and whisky enthusiasts find better prices by comparing bottles from retail websites with the BAXUS marketplace.

## Overview

The Honey Barrel is a browser extension that automatically identifies wine and whisky bottles on e-commerce and retail websites, then cross-references with the BAXUS marketplace to determine if the same bottles are available at better prices. The extension provides a seamless experience with non-intrusive notifications when better deals are available.

## Features

- **Automatic Bottle Detection**: Identifies wine and whisky products on popular retail websites
- **Smart Matching Algorithm**: Precisely matches detected bottles with BAXUS marketplace listings
- **Price Comparison**: Calculates potential savings between retail sites and BAXUS
- **Non-intrusive UI**: Clean notification only appears when better prices are found
- **Multiple Site Support**: Works on major wine and whisky retailers including Wine.com, The Whisky Exchange, Total Wine, and ReserveBar
- **Fallback Detection**: Can attempt to detect bottles on unsupported sites with generic selectors
- **Multi-Currency Support**: Converts prices between currencies for accurate global price comparisons

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your browser toolbar

## How It Works

1. When you visit a supported wine or whisky retail website, the extension automatically scans the page to detect if you're looking at a product.
2. If a product is detected, the extension:
   - Extracts key information (name, brand, price, vintage/age)
   - Queries the BAXUS marketplace for matching bottles
   - Compares prices to identify potential savings
   - Displays a notification if better deals are found on BAXUS
3. Clicking on a match in the notification takes you directly to the BAXUS listing.

## Supported Websites

The extension is designed to work with these major wine and whisky retailers:

- Wine.com
- The Whisky Exchange (thewhiskyexchange.com)
- Total Wine (totalwine.com)
- ReserveBar (reservebar.com)

The extension also includes a fallback detection system that attempts to identify product information on unsupported retail sites.

## Technical Architecture

### Core Components

- **Background Script**: Manages API calls, caching, and bottle matching
- **Content Script**: Handles page scraping and UI injection
- **Popup UI**: Provides user controls and alternative interface for checking prices

### BAXUS API Integration

The extension integrates with the BAXUS API to find matching wine and spirits listings:

- **API Endpoint**: `https://services.baxus.co/api/search/listings`
- **Parameters**: `from`, `size`, `listed`

### Matching Algorithm

The matching algorithm uses a sophisticated scoring system to find the most relevant matches:

#### Scoring Factors

1. **Brand Name Match** (100 points): Prioritizes matches where the first word of the product name matches
2. **Brand Exact Match** (50 points): Scores exact matches between brand names
3. **Batch Number Match** (40 points): Identifies and matches specific batch numbers in product names
4. **Age/Vintage Match** (30 points): Scores matches where age or vintage statements align
5. **Spirit Type Match** (20 points): Scores matches with the same spirit category
6. **Keyword Match** (10 points per match): Scores matches for each significant keyword found
7. **Price Similarity** (up to 30 points): Scores matches based on price similarity (within 15%)

#### Matching Process

1. Extract keywords, numbers, and the first word from the product name
2. Score all potential matches based on the factors above
3. Filter results to only include those with scores above 20
4. Sort matches by:
   - First word match (highest priority)
   - Number match (for batch numbers)
   - Overall score

#### Example Match

For a product like "Kentucky Owl Batch 3 Bourbon":

- First word: "kentucky"
- Keywords: "kentucky", "owl", "batch", "bourbon"
- Numbers: "3"

The system prioritizes products that start with "Kentucky" and specifically have "Batch 3" in the name.

### Currency Handling

The system supports global price comparison with:

- **Currency Detection**: Automatically detects currency from price strings
- **Currency Conversion**: Converts all prices to USD for accurate comparison
- **Display Formatting**: Formats prices according to locale-specific conventions
- **Domain-Based Defaults**: Uses domain-specific currency defaults for websites

### Implementation Details

The matching system uses several specialized helper functions:

- `prepareMatchingTerms`: Extracts keywords and numbers from product names
- `calculateMatchScore`: Scores potential matches based on multiple factors
- `processPriceInformation`: Handles currency detection and conversion
- `processListingPrices`: Processes pricing for comparison

## Privacy & Security

- The extension only runs on retail websites with product pages
- No user data is stored or shared outside of the local browser
- API calls to BAXUS are cached to minimize network requests
- All matching happens locally within the browser

## Development

### Project Structure

```
honey-barrel/
├── manifest.json       # Extension configuration
├── background.js       # Background service worker
├── content.js          # Content script for page detection
├── popup.html          # Popup user interface
├── popup.js            # Popup functionality
├── src/
│   ├── api/            # API integration modules
│   │   └── baxus.js    # BAXUS API handling
│   └── currency/       # Currency conversion utilities
└── icons/              # Extension icons
```

### Usage Example

```javascript
import { findMatches } from "./api/baxus";
import currencyModule from "./currency/module";

// Product information to match
const bottleInfo = {
  name: "Kentucky Owl Batch 3 Bourbon",
  price: "$199.99",
  description: "Small batch Kentucky straight bourbon whiskey",
};

// Find matches from BAXUS inventory
const matches = await findMatches(bottleInfo, "example.com", currencyModule);

// Display top matches
console.log(matches);
```

### Building from Source

1. Clone the repository
2. Make any desired changes to the code
3. Load the extension in Chrome using Developer Mode as described above

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Screenshots

### Notification UI

### Popup Interface

## Acknowledgements

- [BAXUS](https://baxus.co) for providing the marketplace API

---

This extension is affiliated with BAXUS. It is an independent project designed to enhance the BAXUS marketplace experience.
