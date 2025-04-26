// Currency Utility Module

// Exchange rate API endpoint
export const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest/USD';

// Cache for currency rates
export let currencyCache = {
  rates: {
    'USD': 1.0,
    'EUR': 1.10,
    'GBP': 1.30,
    'JPY': 0.0072,
    'AUD': 0.67,
    'CAD': 0.74,
    'CHF': 1.14,
    'CNY': 0.14,
    'HKD': 0.13,
    'SGD': 0.75,
    'MXN': 0.060,
    'INR': 0.012,  // Added INR rate (1 INR = 0.012 USD)
  },
  lastUpdated: 0
};

// Cache refresh interval - 5 minutes
export const CURRENCY_REFRESH_INTERVAL = 5 * 60 * 1000;

// Currency symbols mapping to currency codes
export const CURRENCY_SYMBOLS = {
  '$': 'USD',
  'US$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY', // Also used for CNY
  'A$': 'AUD',
  'AU$': 'AUD',
  'C$': 'CAD',
  'CA$': 'CAD',
  'Fr': 'CHF',
  'CHF': 'CHF',
  '元': 'CNY',
  'HK$': 'HKD',
  'S$': 'SGD',
  'MX$': 'MXN',
  '₹': 'INR',
  'Rs': 'INR',
  'Rs.': 'INR',
  'INR': 'INR',
  '₽': 'RUB',
  'R$': 'BRL',
  '₩': 'KRW',
  'NZ$': 'NZD',
  'kr': 'SEK', // Also used for NOK, DKK
  'zł': 'PLN',
  '₺': 'TRY'
};

// Currency regex patterns for detection
export const CURRENCY_PATTERNS = [
  // USD patterns
  { regex: /\$\s*[\d,.]+\s*USD/i, currency: 'USD' },
  { regex: /\$\s*[\d,.]+/, currency: 'USD' },
  { regex: /USD\s*[\d,.]+/, currency: 'USD' },
  { regex: /[\d,.]+\s*USD/i, currency: 'USD' },
  
  // EUR patterns
  { regex: /€\s*[\d,.]+/, currency: 'EUR' },
  { regex: /EUR\s*[\d,.]+/, currency: 'EUR' },
  { regex: /[\d,.]+\s*€/, currency: 'EUR' },
  { regex: /[\d,.]+\s*EUR/i, currency: 'EUR' },
  
  // GBP patterns
  { regex: /£\s*[\d,.]+/, currency: 'GBP' },
  { regex: /GBP\s*[\d,.]+/, currency: 'GBP' },
  { regex: /[\d,.]+\s*£/, currency: 'GBP' },
  { regex: /[\d,.]+\s*GBP/i, currency: 'GBP' },
  { regex: /£[\d,.]+/, currency: 'GBP' },
  { regex: /£\s*[\d,.]+\s*\(\d+.\d+cl/, currency: 'GBP' }, // Whisky Exchange format
  
  // JPY patterns
  { regex: /¥\s*[\d,.]+/, currency: 'JPY' },
  { regex: /JPY\s*[\d,.]+/, currency: 'JPY' },
  { regex: /[\d,.]+\s*¥/, currency: 'JPY' },
  { regex: /[\d,.]+\s*JPY/i, currency: 'JPY' },

  // INR patterns
  { regex: /₹\s*[\d,.]+/, currency: 'INR' },
  { regex: /Rs\.?\s*[\d,.]+/, currency: 'INR' },
  { regex: /INR\s*[\d,.]+/, currency: 'INR' },
  { regex: /[\d,.]+\s*₹/, currency: 'INR' },
  { regex: /[\d,.]+\s*Rs\.?/, currency: 'INR' },
  { regex: /[\d,.]+\s*INR/i, currency: 'INR' }
];

// Domain-specific currency settings
export const DOMAIN_CURRENCY_DEFAULTS = [
  { domain: 'thewhiskyexchange.com', currency: 'GBP' },
  { domain: 'whiskyexchange.com', currency: 'GBP' },
  { domain: 'masterofmalt.com', currency: 'GBP' },
  { domain: 'amazon.co.uk', currency: 'GBP' },
  { domain: 'amazon.com', currency: 'USD' },
  { domain: 'totalwine.com', currency: 'USD' },
  { domain: 'reservebar.com', currency: 'USD' },
  { domain: 'caskers.com', currency: 'USD' },
  { domain: 'flaviar.com', currency: 'USD' },
  { domain: 'finedrams.com', currency: 'EUR' },
  { domain: 'amazon.de', currency: 'EUR' },
  { domain: 'amazon.fr', currency: 'EUR' },
  { domain: 'amazon.it', currency: 'EUR' },
  { domain: 'amazon.es', currency: 'EUR' }
];

// Fetch currency exchange rates
export async function fetchCurrencyRates() {
  const currentTime = Date.now();
  
  // Use cached rates if fresh enough
  if (currencyCache.lastUpdated > 0 && 
      currentTime - currencyCache.lastUpdated < CURRENCY_REFRESH_INTERVAL) {
    return currencyCache.rates;
  }
  
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    
    if (!response.ok) {
      console.error(`Currency API request failed: ${response.status}`);
      return currencyCache.rates;
    }
    
    const data = await response.json();
    
    if (data && data.rates) {
      // Update cache with new rates
      currencyCache.rates = {
        'USD': 1.0,
        ...data.rates
      };
      currencyCache.lastUpdated = currentTime;
    }
    
    return currencyCache.rates;
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    return currencyCache.rates;
  }
}

// Get default currency for a domain
export function getDomainDefaultCurrency(url) {
  if (!url) return 'USD';
  
  try {
    // Extract domain from URL
    let domain = '';
    if (url.includes('://')) {
      domain = url.split('://')[1].split('/')[0];
    } else {
      domain = url.split('/')[0];
    }
    
    // Remove www. if present
    domain = domain.replace(/^www\./, '');
    
    // Find matching domain in defaults
    const match = DOMAIN_CURRENCY_DEFAULTS.find(entry => 
      domain.includes(entry.domain)
    );
    
    return match ? match.currency : 'USD';
  } catch (error) {
    return 'USD';
  }
}

// Detect currency from price string or symbol
export function detectCurrency(priceStr, defaultCurrency = 'USD', siteUrl = '') {
  if (!priceStr) {
    return siteUrl ? getDomainDefaultCurrency(siteUrl) : defaultCurrency;
  }
  
  priceStr = String(priceStr).trim();
  
  // First try regex patterns
  for (const pattern of CURRENCY_PATTERNS) {
    if (pattern.regex.test(priceStr)) {
      return pattern.currency;
    }
  }
  
  // Check for currency symbols at beginning of string
  for (const symbol in CURRENCY_SYMBOLS) {
    if (priceStr.startsWith(symbol)) {
      return CURRENCY_SYMBOLS[symbol];
    }
  }
  
  // Check for currency codes at end of string
  for (const code in currencyCache.rates) {
    if (priceStr.endsWith(` ${code}`)) {
      return code;
    }
  }
  
  // Check for currency symbols at end of string
  for (const symbol in CURRENCY_SYMBOLS) {
    if (priceStr.endsWith(symbol)) {
      return CURRENCY_SYMBOLS[symbol];
    }
  }
  
  // Try domain default if available
  if (siteUrl) {
    const domainDefault = getDomainDefaultCurrency(siteUrl);
    if (domainDefault !== 'USD') {
      return domainDefault;
    }
  }
  
  return defaultCurrency;
}

// Extract numeric price from a price string
export function extractNumericPrice(priceStr) {
  if (!priceStr) return 0;
  if (typeof priceStr === 'number') return priceStr;
  
  
  // Remove all non-numeric characters except dots and commas
  const cleaned = priceStr.replace(/[^\d.,]/g, '');
  
  let numeric;
  
  // Count occurrences of dots and commas
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;
  
  // Handle simple decimal cases first (e.g., 10.45, 4.5)
  if (dotCount === 1 && commaCount === 0) {
    return parseFloat(cleaned);
  }
  
  // Handle simple comma as decimal cases (e.g., 10,45)
  if (dotCount === 0 && commaCount === 1) {
    // Check if the comma appears to be a decimal separator
    // (2 or fewer digits after comma)
    const afterComma = cleaned.split(',')[1];
    if (afterComma && afterComma.length <= 2) {
      return parseFloat(cleaned.replace(',', '.'));
    }
  }
  
  if (cleaned.indexOf(',') > cleaned.indexOf('.')) {
    // Format: 1,234.56 (US/UK format)
    numeric = parseFloat(cleaned.replace(/,/g, ''));
  } else if (cleaned.indexOf('.') > cleaned.indexOf(',')) {
    // Format: 1.234,56 (European format)
    numeric = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  } else if (cleaned.indexOf(',') >= 0 && cleaned.indexOf('.') === -1) {
    // Only has commas
    const parts = cleaned.split(',');
    if (parts[1] && parts[1].length === 2) {
      // Likely decimal separator (e.g., 1234,56)
      numeric = parseFloat(cleaned.replace(',', '.'));
    } else {
      // Likely thousands separator (e.g., 1,234)
      numeric = parseFloat(cleaned.replace(/,/g, ''));
    }
  } else if (cleaned.indexOf('.') >= 0 && cleaned.indexOf(',') === -1) {
    // Only has dots
    const parts = cleaned.split('.');
    if (parts[1] && parts[1].length === 2) {
      // Likely decimal separator (e.g., 1234.56)
      numeric = parseFloat(cleaned);
    } else {
      // Likely thousands separator (e.g., 1.234)
      numeric = parseFloat(cleaned.replace(/\./g, ''));
    }
  } else {
    // No separators found, just parse the number
    numeric = parseFloat(cleaned);
  }
  
  return isNaN(numeric) ? 0 : numeric;
}

// Format price according to currency conventions
export function formatPriceForCurrency(price, currency) {
  if (typeof price !== 'number') {
    price = parseFloat(price);
  }
  
  if (isNaN(price)) return '0';
  
  // Format based on currency
  switch (currency) {
    case 'JPY':
    case 'KRW':
      // No decimal for Yen or Won
      return Math.round(price).toLocaleString();
    case 'EUR':
      // European format (1.234,56 €)
      return price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'GBP':
      // UK format (£1,234.56)
      return price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    default:
      // US format ($1,234.56)
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

// Add symbol to price based on currency
export function addCurrencySymbol(formattedPrice, currency) {
  switch (currency) {
    case 'USD': return '$' + formattedPrice;
    case 'EUR': return formattedPrice + ' €';
    case 'GBP': return '£' + formattedPrice;
    case 'JPY': return '¥' + formattedPrice;
    case 'AUD': return 'A$' + formattedPrice;
    case 'CAD': return 'C$' + formattedPrice;
    case 'CHF': return formattedPrice + ' CHF';
    case 'CNY': return '¥' + formattedPrice;
    case 'HKD': return 'HK$' + formattedPrice;
    case 'SGD': return 'S$' + formattedPrice;
    case 'MXN': return 'MX$' + formattedPrice;
    case 'INR': return '₹' + formattedPrice;
    case 'RUB': return formattedPrice + ' ₽';
    case 'BRL': return 'R$' + formattedPrice;
    case 'KRW': return '₩' + formattedPrice;
    default: return formattedPrice + ' ' + currency;
  }
}

// Convert price to USD
export async function convertToUSD(price, currency) {
  if (!price) return 0;
  
  // Handle string prices
  if (typeof price === 'string') {
    price = extractNumericPrice(price);
  }
  
  if (isNaN(price) || price === 0) return 0;
  if (currency === 'USD') return price;
  
  // Ensure we have current rates
  const rates = await fetchCurrencyRates();
  
  // Get conversion rate
  const rate = rates[currency];
  if (!rate) {
    console.warn(`No conversion rate for ${currency}, using 1.0`);
    return price;
  }
  
  // Convert to USD (divide by rate)
  return price / rate;
}

// Convert from USD to another currency
export async function convertFromUSD(usdPrice, toCurrency) {
  if (!usdPrice) return 0;
  if (toCurrency === 'USD') return usdPrice;
  
  // Ensure we have current rates
  const rates = await fetchCurrencyRates();
  
  // Get conversion rate
  const rate = rates[toCurrency];
  if (!rate) {
    console.warn(`No conversion rate for ${toCurrency}, using 1.0`);
    return usdPrice;
  }
  
  // Convert from USD (multiply by rate)
  return usdPrice * rate;
}

// Format a price with proper currency symbol
export async function formatCurrencyPrice(price, currency, withSymbol = true) {
  const formatted = formatPriceForCurrency(price, currency);
  return withSymbol ? addCurrencySymbol(formatted, currency) : formatted;
} 