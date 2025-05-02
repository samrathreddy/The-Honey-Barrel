// The Honey Barrel - Background Service Worker

// Import modules
import * as currencyModule from './utils/currency.js';
import * as baxusModule from './api/baxus.js';
import * as config from './utils/config.js';

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  //console.log(`Received message: ${message.action}`);
  
  if (message.action === 'getMatches') {
    // Enhanced logging of price info from site
    console.log('Site product info received:', message.bottleInfo);
    
    // Get the site URL from the sender
    const siteUrl = sender.tab ? sender.tab.url : '';
    
    // Special logging for The Whisky Exchange
    const isWhiskyExchange = siteUrl.includes('thewhiskyexchange.com') || siteUrl.includes('whiskyexchange.com');
    if (isWhiskyExchange) {
      console.log('⭐ The Whisky Exchange site detected - using GBP as base currency');
    }
    
    // Store original site price information
    const sitePriceInfo = {
      raw: message.bottleInfo.price,
      currency: 'Unknown',
      numericValue: 0,
      detectedFormat: 'Unknown'
    };
    
    // Detect currency and numeric value
    if (message.bottleInfo.price) {
      sitePriceInfo.currency = currencyModule.detectCurrency(message.bottleInfo.price, 'USD', siteUrl);
      sitePriceInfo.numericValue = currencyModule.extractNumericPrice(message.bottleInfo.price);
      
      // Special handling for The Whisky Exchange
      if (isWhiskyExchange) {
        if (sitePriceInfo.currency !== 'GBP') {
          console.log(`⚠️ Currency detection issue: Expected GBP for Whisky Exchange but got ${sitePriceInfo.currency}`);
          sitePriceInfo.currency = 'GBP';
        }
      }
      
      // Determine format type based on the price string
      if (typeof message.bottleInfo.price === 'string') {
        const priceStr = message.bottleInfo.price;
        if (priceStr.indexOf('€') >= 0) {
          sitePriceInfo.detectedFormat = 'EUR Format';
        } else if (priceStr.indexOf('£') >= 0) {
          sitePriceInfo.detectedFormat = 'GBP Format';
        } else if (priceStr.indexOf('$') >= 0) {
          if (priceStr.indexOf('US') >= 0) {
            sitePriceInfo.detectedFormat = 'USD Format';
          } else {
            // Detect other dollar currencies
            for (const symbol in currencyModule.CURRENCY_SYMBOLS) {
              if (symbol.includes('$') && priceStr.includes(symbol)) {
                sitePriceInfo.detectedFormat = `${currencyModule.CURRENCY_SYMBOLS[symbol]} Format`;
                break;
              }
            }
            if (sitePriceInfo.detectedFormat === 'Unknown') {
              sitePriceInfo.detectedFormat = 'Dollar Format';
            }
          }
        } else {
          // Check other currency symbols
          for (const symbol in currencyModule.CURRENCY_SYMBOLS) {
            if (priceStr.includes(symbol)) {
              sitePriceInfo.detectedFormat = `${currencyModule.CURRENCY_SYMBOLS[symbol]} Format`;
              break;
            }
          }
        }
      } else {
        sitePriceInfo.detectedFormat = 'Numeric Format';
      }
    } else if (siteUrl) {
      // If no price but we have a site URL, use domain-based default currency
      sitePriceInfo.currency = currencyModule.getDomainDefaultCurrency(siteUrl);
      sitePriceInfo.detectedFormat = 'Domain Default';
    }
    
    // Additional logging for conversion debugging
    if (sitePriceInfo.currency !== 'USD') {
      console.log(`💱 Will convert prices between USD and ${sitePriceInfo.currency}`);
      console.log(`💷 Original price: ${sitePriceInfo.raw} (${sitePriceInfo.numericValue} ${sitePriceInfo.currency})`);
    }
    
    // Check if cache needs refreshing
    const needsRefresh = !baxusModule.baxusCache.lastUpdated || 
                         (Date.now() - baxusModule.baxusCache.lastUpdated > baxusModule.CACHE_EXPIRATION);
    
    // If cache is valid, return matches immediately
    if (baxusModule.baxusCache.listings.length > 0 && !needsRefresh) {
      console.log('Using cached BAXUS data for matching');
      baxusModule.findMatches(message.bottleInfo, siteUrl, currencyModule).then(matches => {
        // Include transparency info in the response
        const siteCurrency = sitePriceInfo.currency;
        
        // Log conversion details for debugging
        if (siteCurrency !== 'USD' && matches.length > 0) {
          console.log(`💱 Sample price conversion for first match:`);
          console.log(`   USD: ${matches[0].listing.usdPriceFormatted}`);
          console.log(`   ${siteCurrency}: ${matches[0].listing.siteLocalPrice}`);
          console.log(`   Rate: 1 USD = ${matches[0].listing.conversionRate.toFixed(4)} ${siteCurrency}`);
        }
        
        sendResponse({ 
          success: true, 
          matches,
          bottleInfo: message.bottleInfo,
          sitePrice: {
            original: sitePriceInfo.raw,
            currency: sitePriceInfo.currency,
            value: sitePriceInfo.numericValue,
            format: sitePriceInfo.detectedFormat
          },
          transparency: {
            siteCurrency: siteCurrency,
            conversionApplied: siteCurrency !== 'USD',
            lastRatesUpdate: new Date(currencyModule.currencyCache.lastUpdated).toLocaleString(),
            ratesSource: currencyModule.EXCHANGE_RATE_API,
            sitePrice: sitePriceInfo.raw,
            conversionDetails: matches.length > 0 ? matches[0].listing.priceComparisonSummary : ''
          }
        });
      }).catch(error => {
        console.error('Error finding matches:', error);
        sendResponse({ success: false, error: error.message });
      });
      
      return true; // Indicates we'll respond asynchronously
    }
    
    // Otherwise, refresh cache and then find matches
    console.log('Cache needs refresh, loading fresh data');
    baxusModule.loadAllBaxusListings(currencyModule).then(() => {
      baxusModule.findMatches(message.bottleInfo, siteUrl, currencyModule).then(matches => {
        console.log('Sending match results back to caller');
        
        // Include transparency info in the response
        const siteCurrency = sitePriceInfo.currency;
        
        // Log conversion details for debugging
        if (siteCurrency !== 'USD' && matches.length > 0) {
          console.log(`💱 Sample price conversion for first match after refresh:`);
          console.log(`   USD: ${matches[0].listing.usdPriceFormatted}`);
          console.log(`   ${siteCurrency}: ${matches[0].listing.siteLocalPrice}`);
          console.log(`   Rate: 1 USD = ${matches[0].listing.conversionRate.toFixed(4)} ${siteCurrency}`);
        }
        
        sendResponse({ 
          success: true, 
          matches,
          bottleInfo: message.bottleInfo,
          sitePrice: {
            original: sitePriceInfo.raw,
            currency: sitePriceInfo.currency,
            value: sitePriceInfo.numericValue,
            format: sitePriceInfo.detectedFormat
          },
          transparency: {
            siteCurrency: siteCurrency,
            conversionApplied: siteCurrency !== 'USD',
            lastRatesUpdate: new Date(currencyModule.currencyCache.lastUpdated).toLocaleString(),
            ratesSource: currencyModule.EXCHANGE_RATE_API,
            sitePrice: sitePriceInfo.raw,
            conversionDetails: matches.length > 0 ? matches[0].listing.priceComparisonSummary : ''
          }
        });
      }).catch(error => {
        console.error('Error processing matches:', error);
        sendResponse({ success: false, error: error.message });
      });
    }).catch(error => {
      console.error('Error processing matches:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Indicates we'll respond asynchronously
  }
  if(message.action === 'getSiteSpecificSettings'){
    try {
      if(!config || !config.SITE_SPECIFIC_SETTINGS){
        console.error('Site specific settings are unavailable:', { config });
        sendResponse({ 
          success: false, 
          error: 'Site specific settings are unavailable',
          debug: { hasConfig: !!config, configKeys: config ? Object.keys(config) : [] }
        });
        return true;
      }
      console.log('Sending site specific settings:', config.SITE_SPECIFIC_SETTINGS);
      sendResponse({
        success: true, 
        SITE_SPECIFIC_SETTINGS: config.SITE_SPECIFIC_SETTINGS
      });
    } catch (error) {
      console.error('Error getting site specific settings:', error);
      sendResponse({ 
        success: false, 
        error: 'Error accessing site specific settings',
        debug: { error: error.message }
      });
    }
    return true;
  }
  if(message.action === 'formatPrice') {
    const { price, currency } = message;
    const currencySymbol = currencyModule.detectCurrency(price,currency);
    const numericPrice = currencyModule.extractNumericPrice(price);
    const formattedPrice = numericPrice.toLocaleString('en-US', {
      style: 'currency',
      currency: currencySymbol,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    sendResponse({ success: true, formattedPrice });
    return true;
  }
  
  if (message.action === 'convertPrice') {
    // Provide a direct price conversion service
    const { amount, fromCurrency, toCurrency } = message;
    
    if (!amount || !fromCurrency || !toCurrency) {
      sendResponse({ 
        success: false, 
        error: 'Missing required parameters (amount, fromCurrency, toCurrency)'
      });
      return true;
    }
    
    // First convert to USD if needed, then to target currency
    (async () => {
      try {
        const rates = await currencyModule.fetchCurrencyRates();
        let usdAmount = amount;
        
        // Convert to USD first if not already USD
        if (fromCurrency !== 'USD') {
          if (!rates[fromCurrency]) {
            sendResponse({ 
              success: false, 
              error: `No exchange rate found for ${fromCurrency}`
            });
            return;
          }
          usdAmount = amount / rates[fromCurrency];
        }
        
        // Convert from USD to target currency
        let targetAmount = usdAmount;
        if (toCurrency !== 'USD') {
          if (!rates[toCurrency]) {
            sendResponse({ 
              success: false, 
              error: `No exchange rate found for ${toCurrency}`
            });
            return;
          }
          targetAmount = usdAmount * rates[toCurrency];
        }
        
        // Calculate direct conversion rate
        const directRate = fromCurrency === toCurrency ? 
          1 : targetAmount / amount;
        
        sendResponse({
          success: true,
          original: {
            amount,
            currency: fromCurrency
          },
          converted: {
            amount: targetAmount,
            currency: toCurrency
          },
          conversionRate: directRate,
          conversionSummary: `${amount} ${fromCurrency} = ${targetAmount.toFixed(2)} ${toCurrency}`,
          rateDetails: {
            lastUpdated: new Date(currencyModule.currencyCache.lastUpdated).toLocaleString(),
            source: currencyModule.EXCHANGE_RATE_API
          }
        });
      } catch (error) {
        console.error('Error converting price:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Indicates we'll respond asynchronously
  }
  
  if (message.action === 'refreshBaxusData') {
    console.log('Manual refresh requested');
    baxusModule.loadAllBaxusListings(currencyModule).then(() => {
      console.log('Manual refresh complete');
      sendResponse({ success: true, count: baxusModule.baxusCache.listings.length });
    }).catch(error => {
      console.error('Error during manual refresh:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Indicates we'll respond asynchronously
  }
  
  if (message.action === 'refreshCurrencyRates') {
    console.log('Currency rates refresh requested');
    currencyModule.fetchCurrencyRates().then(rates => {
      console.log('Currency rates refresh complete');
      sendResponse({ 
        success: true, 
        rates: rates,
        lastUpdated: currencyModule.currencyCache.lastUpdated
      });
    }).catch(error => {
      console.error('Error refreshing currency rates:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Indicates we'll respond asynchronously
  }
});

// Initial load of BAXUS data when extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated - loading BAXUS data');
  // Fetch currency rates first, then load BAXUS data
  currencyModule.fetchCurrencyRates().then(() => {
    baxusModule.loadAllBaxusListings(currencyModule);
  });
});

// Also load data when the service worker starts
console.log('Background service worker started - initializing data');
// Fetch currency rates first, then load BAXUS data
currencyModule.fetchCurrencyRates().then(() => {
  baxusModule.loadAllBaxusListings(currencyModule);
});

// For testing: expose a function to manually trigger data refresh from the console
self.refreshBaxusData = () => {
  console.log('Manual refresh triggered');
  baxusModule.loadAllBaxusListings(currencyModule);
  return 'Refresh initiated - check console for progress';
};

// For testing: expose a function to manually refresh currency rates
self.refreshCurrencyRates = () => {
  console.log('Manual currency rates refresh triggered');
  currencyModule.fetchCurrencyRates().then(rates => {
    console.log('Current rates:', rates);
  });
  return 'Currency rates refresh initiated - check console for progress';
}; 