// BAXUS API Module

// BAXUS API endpoint
export const BAXUS_API_URL = 'https://services.baxus.co/api/search/listings?from=0&size=2000&listed=true';

// Cache for BAXUS bottle data to minimize API calls
export let baxusCache = {
  listings: [],
  lastUpdated: null,
  isLoading: false
};

// Cache expiration time - 30 minutes for BAXUS data
export const CACHE_EXPIRATION = 30 * 60 * 1000;

// Helper function to extract vintage from name
export function extractVintage(name) {
  const vintageMatch = name.match(/\b(19|20)\d{2}\b/);
  return vintageMatch ? vintageMatch[0] : null;
}

// Helper function to extract age from name
export function extractAge(name) {
  const ageMatch = name.match(/\b(\d+)\s*(?:year|yr)s?\b/i);
  return ageMatch ? ageMatch[1] : null;
}

// Get BAXUS listings with pagination
export async function fetchBaxusListings(from = 0, size = 1000) {
  try {
    
    
    // Create the URL with parameters
    const url = new URL(BAXUS_API_URL);
    url.searchParams.append('from', from);
    url.searchParams.append('size', size);
    url.searchParams.append('listed', 'true');
    
    
    
    // Fetch with appropriate options
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors' // Ensure CORS is enabled
    });
    
    if (!response.ok) {
      console.error(`API request failed with status: ${response.status}`);
      throw new Error(`BAXUS API Error: ${response.status}`);
    }
    
    // Process the response
    const data = await response.json();
    
    
    // Return the processed data
    return {
      listings: data || [],
      total: data ? data.length : 0
    };
  } catch (error) {
    console.error('Error fetching BAXUS data:', error);
    return { listings: [], total: 0 };
  }
}

// Process the listings to extract relevant information
export async function processListings(listings, currencyModule) {
  const { fetchCurrencyRates, convertToUSD, extractNumericPrice } = currencyModule;
  
  
  // Log sample of raw listings for debugging
  if (listings.length > 0) {
    console.log('First 5 raw listings structure:');
    listings.slice(0, 5).forEach((item, index) => {
      console.log(`Item ${index + 1}:`, item);
    });
  }
  
  // Ensure we have up-to-date currency rates before processing
  await currencyModule.fetchCurrencyRates();
  
  // Process listings with Promise.all to handle async currency conversion
  const processedListings = await Promise.all(listings.map(async (item) => {
    try {
      // The item itself has _id, _source contains the actual listing data
      const id = item._id || '';
      const source = item._source || item;
      
      // Extract attributes which contains product details
      const attributes = source.attributes || {};
      
      // Handle price and currency
      let price = source.price || 0;
      let currency = 'USD'; // Default currency
      
      // If price is a string, try to detect currency
      if (typeof price === 'string') {
        currency = currencyModule.detectCurrency(price);
        price = await convertToUSD(price, currency);
      }
      
      // Log full product details for debugging
      //console.log(`Processing: ${source.name} (${id}), Price: $${price} (converted from ${currency}), Type: ${source.spiritType || source.type || ''}`);
      
      const processedListing = {
        id: id,
        name: source.name || '',
        brand: attributes.Producer || attributes.Distillery || '',
        price: price,
        originalPrice: source.price,
        currency: currency,
        vintage: extractVintage(source.name || '') || attributes.Vintage || '',
        age: extractAge(source.name || '') || attributes.Age || '',
        url: `https://baxus.co/asset/${id}`,
        imageUrl: source.imageUrl || '',
        spiritType: source.spiritType || source.type || attributes['Spirit Type'] || '',
        description: source.description || '',
        country: attributes.Country || '',
        region: attributes.Region || '',
        abv: attributes.ABV || ''
      };
      
      // Log the processed listing for comparison
      //console.log('Processed listing:', processedListing);
      
      return processedListing;
    } catch (err) {
      console.error('Error processing listing item:', err, item);
      // Return a minimal object to avoid breaking the flow
      return { 
        id: item._id || 'unknown', 
        name: 'Unknown Item', 
        price: 0,
        currency: 'USD'
      };
    }
  }));
  
  
  // Log product types distribution
  const types = {};
  processedListings.forEach(l => {
    if (l.spiritType) {
      types[l.spiritType] = (types[l.spiritType] || 0) + 1;
    }
  });
  
  return processedListings;
}

// Load all BAXUS listings into cache
export async function loadAllBaxusListings(currencyModule) {
  try {
    // Set loading state
    baxusCache.isLoading = true;
    
    console.log('Loading BAXUS data...');
    
    // First ensure we have fresh currency rates
    await currencyModule.fetchCurrencyRates();
    
    // Fetch the data
    const response = await fetch(BAXUS_API_URL);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    console.log(response)
    const data = await response.json();
    console.log(`Loaded ${data.length} BAXUS listings`);
    console.log(data)
    
    // Process and store listings
    baxusCache.listings = await processListings(data,currencyModule)
    baxusCache.lastUpdated = Date.now();
    
    console.log('BAXUS data loaded and processed successfully');
    
    // Update loading state
    baxusCache.isLoading = false;
    
    return baxusCache.listings;
  } catch (error) {
    console.error('Error loading BAXUS data:', error);
    
    // Update loading state even on error
    baxusCache.isLoading = false;
    
    throw error;
  }
}

// Function to wait for BAXUS data to be loaded
async function waitForBaxusData() {
  // If data is already loaded and not loading, return immediately
  if (baxusCache.listings.length > 0 && !baxusCache.isLoading) {
    return;
  }
  
  // If it's currently loading, wait for it to complete
  if (baxusCache.isLoading) {
    console.log('Waiting for BAXUS data to finish loading...');
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!baxusCache.isLoading) {
          clearInterval(checkInterval);
          console.log('BAXUS data loading complete, proceeding...');
          resolve();
        }
      }, 100);
    });
  }
  
  // If no data and not loading, return (will be handled by caller)
  return;
}

// Helper function to prepare matching terms
function prepareMatchingTerms(name) {
  const targetName = name.toLowerCase();
  // Extract words (excluding common words)
  const words = targetName.split(/\s+/).filter(word => 
    word.length > 2 && 
    !['the', 'and', 'for', 'with'].includes(word)
  );
  
  // Extract numbers separately
  const numbers = targetName.match(/\b\d+\b/g) || [];
  
  // Extract first word for prioritized matching
  const firstWord = words.length > 0 ? words[0] : '';
  
  
  return { words, firstWord, numbers };
}

// Helper function to calculate match score
function calculateMatchScore(listing, bottleInfo, words, firstWord, targetPrice, numbers) {
  const listingName = listing.name.toLowerCase();
  let score = 0;
  
  // Check if the first word matches - prioritize this highly
  const listingFirstWord = listingName.split(/\s+/)[0];
  const hasFirstWordMatch = firstWord && listingFirstWord && (
    // Only count as a match if one is a prefix of the other or they're very similar
    (firstWord.startsWith(listingFirstWord) && listingFirstWord.length > 2) || 
    (listingFirstWord.startsWith(firstWord) && firstWord.length > 2) ||
    // Or if they're the same when ignoring special characters
    firstWord.replace(/[^a-z0-9]/g, '') === listingFirstWord.replace(/[^a-z0-9]/g, '')
  );
  
  // Add significant score boost for first word match
  if (hasFirstWordMatch) {
    console.log(`First word match: "${firstWord}" ~ "${listingFirstWord}"`);
    score += 100;
  }
  
  // Check for exact brand match
  if (bottleInfo.brand && listing.brand && 
      bottleInfo.brand.toLowerCase() === listing.brand.toLowerCase()) {
    score += 50;
  }
  
  // Check for key words from bottle name
  words.forEach(word => {
    if (listingName.includes(word)) {
      score += 10;
    }
  });
  
  // Check for number matches (batch numbers, etc.)
  if (numbers && numbers.length > 0) {
    // Extract numbers from listing name
    const listingNumbers = listingName.match(/\b\d+\b/g) || [];
    
    // Add high score for exact number matches
    numbers.forEach(num => {
      if (listingNumbers.includes(num)) {
        console.log(`Number match found: ${num} in "${listing.name}"`);
        score += 40; // Higher than word matches to prioritize batch numbers
      }
    });
    
    // Track if we have any number matches
    const hasNumberMatch = numbers.some(num => listingNumbers.includes(num));
    
    return { score, hasFirstWordMatch, hasNumberMatch };
  }
  
  // Age match if available
  if (bottleInfo.age && listing.age && bottleInfo.age === listing.age) {
    score += 30;
  }
  
  // Vintage match if available
  if (bottleInfo.vintage && listing.vintage && bottleInfo.vintage === listing.vintage) {
    score += 30;
  }
  
  // Spirit type match if available
  if (bottleInfo.description && listing.spiritType && 
      bottleInfo.description.toLowerCase().includes(listing.spiritType.toLowerCase())) {
    score += 20;
  }
  
  // Price match - if within 15% of target price, add points (both prices in USD)
  if (targetPrice > 0 && listing.price > 0) {
    const priceDiff = Math.abs(targetPrice - listing.price) / targetPrice;
    if (priceDiff <= 0.15) {
      // The closer the price, the higher the score
      score += Math.round(30 * (1 - priceDiff / 0.15));
    }
  }
  
  return { score, hasFirstWordMatch, hasNumberMatch: false };
}

// Helper function to score and process matches
async function scoreAndProcessMatches(listings, bottleInfo, words, firstWord, priceInfo, rates, currencyModule) {
  const { formatCurrencyPrice, formatPriceForCurrency, addCurrencySymbol } = currencyModule;
  
  return Promise.all(listings.map(async (listing) => {
    // Safety check
    if (!listing.name) return { listing, score: 0 };
    
    // Calculate match score
    const { score, hasFirstWordMatch, hasNumberMatch } = calculateMatchScore(
      listing, 
      bottleInfo, 
      words, 
      firstWord, 
      priceInfo.targetPrice,
      bottleInfo.numbers
    );
    
    // Process pricing information for comparison
    const enhancedListing = await processListingPrices(
      listing,
      priceInfo,
      rates,
      formatCurrencyPrice,
      formatPriceForCurrency,
      addCurrencySymbol,
      hasFirstWordMatch,
      bottleInfo.url
    );
    
    // Add number match flag to the enhanced listing
    enhancedListing.hasNumberMatch = hasNumberMatch;
    
    return { listing: enhancedListing, score };
  }));
}

// Find potential matches for a product in BAXUS listings
export async function findMatches(bottleInfo, siteUrl = '', currencyModule) {
  console.log('===========================================');
  console.log('Finding matches for:', bottleInfo.name);
  console.log('===========================================');
  
  // Wait for BAXUS data to be fully loaded if it's in progress
  await waitForBaxusData();

  // Check for available listings
  if (!baxusCache.listings || baxusCache.listings.length === 0) {
    console.log('No BAXUS listings available for matching');
    return [];
  }
  
  // 1. Extract currency utilities and validate inputs
  const { 
    fetchCurrencyRates, 
    detectCurrency, 
    extractNumericPrice, 
    formatCurrencyPrice, 
    getDomainDefaultCurrency,
    convertToUSD,
    formatPriceForCurrency,
    addCurrencySymbol
  } = currencyModule;
  
  // Validate input bottle info
  if (!bottleInfo || !bottleInfo.name) {
    console.log('No valid bottle info provided for matching');
    return [];
  }
  
  // 2. Process price information and handle currency
  const priceInfo = await processPriceInformation(
    bottleInfo.price, 
    siteUrl, 
    { detectCurrency, extractNumericPrice, convertToUSD, formatCurrencyPrice, getDomainDefaultCurrency }
  );
  
  // Log bottle details we're trying to match
  logBottleDetails(bottleInfo, siteUrl, priceInfo);
  
  // 3. Prepare for matching by extracting key terms from bottle name
  const { words, firstWord, numbers } = prepareMatchingTerms(bottleInfo.name);
  console.log(`Key words for matching: ${words.join(', ')}`);
  
  // Add numbers to bottle info for matching
  bottleInfo.numbers = numbers;
  
  // 4. Get current currency rates for price comparison
  const rates = await fetchCurrencyRates();
  console.log(baxusCache.listings)
  // 5. Score and process matches
  const processedMatches = await scoreAndProcessMatches(
    baxusCache.listings,
    bottleInfo,
    words,
    firstWord,
    priceInfo,
    rates,
    currencyModule
  );
  
  // 6. Filter, sort and return top matches
  const matches = processedMatches
    .filter(match => match.score > 20) // Only return reasonably good matches
    .sort((a, b) => {
      // First prioritize by first word match
      if (a.listing.hasFirstWordMatch && !b.listing.hasFirstWordMatch) return -1;
      if (!a.listing.hasFirstWordMatch && b.listing.hasFirstWordMatch) return 1;
      
      // Then prioritize by number match (batch numbers, etc.)
      if (a.listing.hasNumberMatch && !b.listing.hasNumberMatch) return -1;
      if (!a.listing.hasNumberMatch && b.listing.hasNumberMatch) return 1;
      
      // Then by score for matches with the same first word and number match status
      return b.score - a.score;
    });
  
  // Get top 5 matches
  const topMatches = matches.slice(0, 5);
  
  console.log(`Found ${matches.length} potential matches, returning top ${topMatches.length}`);
  
  // Log detailed information about top matches
  logTopMatchesWithNumbers(topMatches, addCurrencySymbol, formatPriceForCurrency);
  
  return topMatches;
}

// Helper function to process price information
async function processPriceInformation(price, siteUrl, currencyUtils) {
  const { detectCurrency, extractNumericPrice, convertToUSD, formatCurrencyPrice, getDomainDefaultCurrency } = currencyUtils;
  
  let targetPrice = 0;
  let targetCurrency = 'USD';
  let originalSitePrice = '';
  let sitePriceNumeric = 0;
  let sitePriceFormatted = '';
  
  if (price) {
    originalSitePrice = price;
    
    if (typeof price === 'string') {
      // Handle string price: detect currency and extract numeric value
      targetCurrency = detectCurrency(price, 'USD', siteUrl);
      sitePriceNumeric = extractNumericPrice(price);
      targetPrice = await convertToUSD(sitePriceNumeric, targetCurrency);
      sitePriceFormatted = await formatCurrencyPrice(sitePriceNumeric, targetCurrency);
    } else {
      // Handle numeric price: check for non-USD domain
      const domainCurrency = getDomainDefaultCurrency(siteUrl);
      if (domainCurrency !== 'USD' && siteUrl) {
        console.log(`Numeric price ${price} on ${domainCurrency} site - will convert to USD`);
        targetCurrency = domainCurrency;
        targetPrice = await convertToUSD(price, targetCurrency);
        sitePriceNumeric = price;
      } else {
        targetPrice = price;
        sitePriceNumeric = price;
        targetCurrency = 'USD';
      }
      sitePriceFormatted = await formatCurrencyPrice(sitePriceNumeric, targetCurrency);
    }
  } else if (siteUrl) {
    // If no price but we have a site URL, use domain-based default currency
    targetCurrency = getDomainDefaultCurrency(siteUrl);
    console.log(`No price provided, using domain default currency: ${targetCurrency}`);
  }
  
  return {
    targetPrice,
    targetCurrency,
    originalSitePrice,
    sitePriceNumeric,
    sitePriceFormatted
  };
}

// Helper function to log bottle details
function logBottleDetails(bottleInfo, siteUrl, priceInfo) {
  // console.log(`Finding matches for: ${bottleInfo.name}`);
  // console.log(`Site URL: ${siteUrl || 'Not provided'}`);
  // console.log(`Site Price: ${priceInfo.originalSitePrice} (Detected as ${priceInfo.sitePriceNumeric} ${priceInfo.targetCurrency})`);
  // console.log(`Formatted site price: ${priceInfo.sitePriceFormatted}`);
  // console.log(`Converted to USD: $${priceInfo.targetPrice.toFixed(2)}`);
  if (bottleInfo.brand) console.log(`Brand: ${bottleInfo.brand}`);
  if (bottleInfo.vintage) console.log(`Vintage: ${bottleInfo.vintage}`);
  if (bottleInfo.age) console.log(`Age: ${bottleInfo.age}`);
}

// Helper function to process listing prices
async function processListingPrices(listing, priceInfo, rates, formatCurrencyPrice, formatPriceForCurrency, addCurrencySymbol, hasFirstWordMatch, siteUrl) {
  const { targetCurrency, sitePriceNumeric, sitePriceFormatted, originalSitePrice } = priceInfo;
  
  // Convert the BAXUS price (USD) to the site's currency
  let convertedPrice = listing.price;
  let conversionRate = 1;
  
  if (targetCurrency !== 'USD' && rates[targetCurrency]) {
    // Convert from USD to target currency
    conversionRate = rates[targetCurrency];
    convertedPrice = listing.price * conversionRate;
  }
  
  // Format prices for display
  const formattedSiteLocalPrice = await formatCurrencyPrice(convertedPrice, targetCurrency);
  const formattedUsdPrice = await formatCurrencyPrice(listing.price, 'USD');
  const formattedOriginalPrice = listing.originalPrice ? 
    `${listing.originalPrice} ${listing.currency}` : 
    formattedUsdPrice;
  
  // Calculate price difference in site currency
  let sitePriceStr = sitePriceFormatted || '';
  let priceDiff = 0;
  let priceDiffPercentage = 0;
  let priceDiffStr = '';
  let savingsAmount = 0;
  
  if (sitePriceNumeric > 0) {
    priceDiff = sitePriceNumeric - convertedPrice;
    priceDiffPercentage = (priceDiff / sitePriceNumeric) * 100;
    savingsAmount = priceDiff > 0 ? priceDiff : 0;
    
    const sign = priceDiff >= 0 ? '+' : '';
    
    // Format the price difference with the correct currency format
    const formattedDiff = await formatCurrencyPrice(Math.abs(priceDiff), targetCurrency, false);
    priceDiffStr = `${sign}${formattedDiff} ${targetCurrency} (${sign}${priceDiffPercentage.toFixed(1)}%)`;
  }
  
  // Create enhanced listing with pricing information
  return {
    ...listing,
    siteLocalPrice: formattedSiteLocalPrice,
    siteLocalPriceRaw: convertedPrice,
    siteCurrency: targetCurrency,
    usdPriceFormatted: formattedUsdPrice,
    originalPriceFormatted: formattedOriginalPrice,
    conversionRate: conversionRate,
    conversionApplied: targetCurrency !== 'USD',
    conversionDirection: `USD → ${targetCurrency}`,
    priceComparisonSummary: `${formattedUsdPrice} = ${formattedSiteLocalPrice} (Rate: 1 USD = ${conversionRate.toFixed(4)} ${targetCurrency})`,
    sitePrice: sitePriceStr,
    sitePriceRaw: sitePriceNumeric,
    sitePriceOriginal: originalSitePrice,
    priceDifference: priceDiffStr,
    priceDifferenceRaw: priceDiff,
    isCheaperThanSite: priceDiff > 0,
    savingsPercentage: priceDiffPercentage,
    savingsAmount: savingsAmount,
    hasFirstWordMatch: hasFirstWordMatch,
    siteUrl: siteUrl
  };
}

// Helper function to log top matches details with number match info
function logTopMatchesWithNumbers(topMatches, addCurrencySymbol, formatPriceForCurrency) {
  console.log('=========== TOP MATCHES DETAILS ===========');
  topMatches.forEach((match, index) => {
    const listing = match.listing;
    console.log(`TOP MATCH ${index + 1}:`);
    console.log(`- Name: ${listing.name}`);
    console.log(`- URL: ${listing.url}`);
    
    // Primary display is now in site currency
    console.log(`- BAXUS Price: ${listing.siteLocalPrice}`);
    console.log(`  (Original: ${listing.usdPriceFormatted})`);
    
    if (listing.sitePrice) {
      console.log(`- Site Price: ${listing.sitePrice}`);
      console.log(`- Difference: ${listing.priceDifference}`);
      if (listing.isCheaperThanSite) {
        console.log(` SAVINGS: ${addCurrencySymbol(formatPriceForCurrency(listing.savingsAmount, listing.siteCurrency), listing.siteCurrency)} ★`);
      }
    }
    
    console.log(`- First Word Match: ${listing.hasFirstWordMatch ? 'YES' : 'NO'}`);
    console.log(`- Number Match: ${listing.hasNumberMatch ? 'YES' : 'NO'}`);
    console.log(`- Conversion Details: ${listing.priceComparisonSummary}`);
    console.log(`- Score: ${match.score}`);
    console.log('-------------------------------------------');
  });
  console.log('===========================================');
} 