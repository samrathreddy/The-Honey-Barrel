// The Honey Barrel - Popup Script

// DOM Elements
const statusText = document.getElementById('statusText');
const statusDetails = document.getElementById('statusDetails');
const currentProductSection = document.getElementById('currentProduct');
const noResultsSection = document.getElementById('noResults');
const recentSection = document.getElementById('recentSection');
const recentContainer = document.getElementById('recentContainer');
const productName = document.getElementById('productName');
const productPrice = document.getElementById('productPrice');
const productSite = document.getElementById('productSite');
const refreshButton = document.getElementById('refreshButton');
const toggleBtn = document.getElementById('toggleBtn');
const toggleText = document.getElementById('toggleText');

// Extension state
let isEnabled = true;
let isLoading = false;
let currentBottleInfo = null;
let refreshIcon = null;

// Function to format price with currency
function formatPrice(price, currency = 'USD') {
  if (!price && price !== 0) return 'N/A';
  
  // If price is a string, extract the numeric value
  let numericPrice;
  if (typeof price === 'string') {
    // Remove all non-numeric characters except dots and commas
    const cleaned = price.replace(/[^\d.,]/g, '');
    
    if (cleaned.indexOf(',') > cleaned.indexOf('.')) {
      // Format: 1,234.56 (US/UK format)
      numericPrice = parseFloat(cleaned.replace(/,/g, ''));
    } else if (cleaned.indexOf('.') > cleaned.indexOf(',')) {
      // Format: 1.234,56 (European format)
      numericPrice = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else if (cleaned.indexOf(',') >= 0 && cleaned.indexOf('.') === -1) {
      // Only has commas
      if (cleaned.split(',').pop().length === 2) {
        // Likely decimal separator (e.g., 1234,56)
        numericPrice = parseFloat(cleaned.replace(',', '.'));
      } else {
        // Likely thousands separator (e.g., 1,234)
        numericPrice = parseFloat(cleaned.replace(/,/g, ''));
      }
    } else {
      // Simple case or only dots
      numericPrice = parseFloat(cleaned);
    }
  } else {
    numericPrice = parseFloat(price);
  }
  
  // Check if we got a valid number
  if (isNaN(numericPrice)) return 'N/A';
  
  // Format based on currency
  switch (currency) {
    case 'GBP':
      return `£${numericPrice.toFixed(2)}`;
    case 'EUR':
      return `€${numericPrice.toFixed(2)}`;
    case 'JPY':
      return `¥${Math.round(numericPrice)}`;
    case 'INR':
      return `₹${numericPrice.toFixed(2)}`;
    default:
      return `$${numericPrice.toFixed(2)}`;
  }
}

// Function to calculate savings with currency
function calculateSavings(originalPrice, newPrice, currency = 'USD') {
  if (!originalPrice || !newPrice) return { amount: 0, percent: 0, formatted: 'N/A' };
  
  const amount = originalPrice - newPrice;
  const percent = (amount / originalPrice) * 100;
  
  let formattedAmount = '';
  switch (currency) {
    case 'GBP':
      formattedAmount = `£${amount.toFixed(2)}`;
      break;
    case 'EUR':
      formattedAmount = `€${amount.toFixed(2)}`;
      break;
    case 'JPY':
      formattedAmount = `¥${Math.round(amount)}`;
      break;
    default:
      formattedAmount = `$${amount.toFixed(2)}`;
  }
  
  return {
    amount: amount.toFixed(2),
    percent: percent.toFixed(0),
    formatted: formattedAmount
  };
}

// Function to set loading state
function setLoading(loading) {
  isLoading = loading;
  
  if (!refreshIcon) {
    refreshIcon = refreshButton.querySelector('svg');
  }
  
  if (loading) {
    refreshButton.disabled = true;
    refreshIcon.classList.add('loading');
    refreshButton.textContent = ' Checking...';
    refreshButton.prepend(refreshIcon);
  } else {
    refreshButton.disabled = false;
    refreshIcon.classList.remove('loading');
    refreshButton.textContent = ' Check for Better Prices';
    refreshButton.prepend(refreshIcon);
  }
}

// Function to update the status message
function updateStatus(message, details = '') {
  statusText.textContent = message;
  statusDetails.textContent = details;
}

// Function to update the toggle button state
function updateToggleButton() {
  if (isEnabled) {
    toggleText.textContent = 'Disable';
    toggleBtn.querySelector('svg').innerHTML = `
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="9" x2="15" y2="15"></line>
      <line x1="15" y1="9" x2="9" y2="15"></line>
    `;
  } else {
    toggleText.textContent = 'Enable';
    toggleBtn.querySelector('svg').innerHTML = `
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="12" x2="15" y2="12"></line>
    `;
  }
  
  // Save state to storage
  chrome.storage.local.set({ isEnabled });
}

// Function to display bottle information
function displayBottleInfo(bottleInfo) {
  if (!bottleInfo || !bottleInfo.name) {
    currentProductSection.style.display = 'none';
    updateStatus('No product detected', 'Visit a wine or whisky product page to compare prices');
    return;
  }
  
  // Store the current bottle info for later use
  currentBottleInfo = bottleInfo;
  
  // Detect if we're on The Whisky Exchange
  const isWhiskyExchange = bottleInfo.site && 
    (bottleInfo.site.includes('thewhiskyexchange.com') || 
     bottleInfo.site.includes('whiskyexchange.com'));
  
  // Use GBP for Whisky Exchange by default
  const currency = isWhiskyExchange ? 'GBP' : 'USD';
  
  // Update the current product section
  productName.textContent = bottleInfo.name;
  productPrice.textContent = formatPrice(bottleInfo.price, currency);
  productSite.textContent = `Source: ${bottleInfo.site || 'Unknown'}`;
  
  // Show the current product section
  currentProductSection.style.display = 'block';
  
  // Update status
  updateStatus('Product detected', 'Click "Check for Better Prices" to compare with BAXUS');
}

// Function to display match results
function displayMatches(matches, transparency) {
  // Clear previous matches
  recentContainer.innerHTML = '';
  
  // Hide the no results section by default
  noResultsSection.style.display = 'none';
  
  // If there are no matches or the current bottle info is missing, show no results
  if (!matches || matches.length === 0 || !currentBottleInfo) {
    recentSection.style.display = 'none';
    noResultsSection.style.display = 'block';
    return;
  }
  
  // Get the site currency from transparency data
  const siteCurrency = transparency?.siteCurrency || 'USD';
  console.log(`Displaying matches with site currency: ${siteCurrency}`);
  
  // Check if we have any matches with savings
  const savingsMatches = matches.filter(match => match.listing.isCheaperThanSite);
  const hasSavings = savingsMatches.length > 0;
  
  // Show a header indicating currency if not USD
  if (siteCurrency !== 'USD') {
    const currencyHeader = document.createElement('div');
    currencyHeader.style.cssText = `
      background-color: #f0f8ff;
      padding: 8px 12px;
      margin-bottom: 12px;
      border-radius: 4px;
      font-size: 12px;
      display: flex;
      align-items: center;
    `;
    const infoIcon = document.createElement('span');
    infoIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
    infoIcon.style.marginRight = '8px';
    infoIcon.style.color = '#0066cc';
    
    const infoText = document.createElement('span');
    infoText.textContent = `Showing prices in ${siteCurrency} based on current exchange rates`;
    
    currencyHeader.appendChild(infoIcon);
    currencyHeader.appendChild(infoText);
    recentContainer.appendChild(currencyHeader);
  }
  
  // Display all matches with savings first
  const allMatches = [...savingsMatches, ...matches.filter(match => !match.listing.isCheaperThanSite)];
  
  // Only show up to 5 matches, prioritizing those with savings
  const matchesToShow = allMatches.slice(0, 5);
  
  // Create and append match elements
  matchesToShow.forEach((match, index) => {
    const listing = match.listing;
    
    // Skip items without proper data
    if (!listing || !listing.name) return;
    
    // Determine if this match offers savings in the site's local currency
    const hasSavings = listing.isCheaperThanSite;
    
    const matchItem = document.createElement('div');
    matchItem.className = 'recent-item';
    matchItem.style.position = 'relative';
    
    // Add a highlight for items with savings
    if (hasSavings) {
      matchItem.style.borderLeft = '3px solid #4CAF50';
      matchItem.style.paddingLeft = '12px';
      
      // Add savings badge
      const savingsBadge = document.createElement('div');
      savingsBadge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background-color: #4CAF50;
        color: white;
        border-radius: 12px;
        padding: 3px 8px;
        font-size: 10px;
        font-weight: bold;
      `;
      savingsBadge.textContent = `Save ${Math.round(listing.savingsPercentage)}%`;
      matchItem.appendChild(savingsBadge);
    }
    
    // Use the correct URL from our processed data
    const listingUrl = listing.url || 'https://baxus.co';
    matchItem.addEventListener('click', () => {
      window.open(listingUrl, '_blank');
    });
    
    // Add spirit type and region info
    if (listing.spiritType || listing.country || listing.region) {
      const categoryInfo = document.createElement('div');
      categoryInfo.style.cssText = `
        font-size: 11px;
        color: #666;
        margin-bottom: 3px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      
      const infoArr = [];
      if (listing.spiritType) infoArr.push(listing.spiritType);
      if (listing.region) infoArr.push(listing.region);
      if (listing.country) infoArr.push(listing.country);
      
      categoryInfo.textContent = infoArr.join(' • ');
      matchItem.appendChild(categoryInfo);
    }
    
    const matchTitle = document.createElement('div');
    matchTitle.className = 'recent-title';
    matchTitle.textContent = listing.name || 'Unknown Bottle';
    
    // Add BAXUS badge
    const baxusBadge = document.createElement('span');
    baxusBadge.style.cssText = `
      background-color: #f7931e;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      margin-left: 6px;
      vertical-align: middle;
    `;
    baxusBadge.textContent = 'BAXUS';
    matchTitle.appendChild(baxusBadge);
    
    const matchPrice = document.createElement('div');
    matchPrice.className = 'recent-price';
    
    const priceValue = document.createElement('span');
    priceValue.className = 'price-value';
    priceValue.style.fontSize = '18px';
    priceValue.style.fontWeight = 'bold';
    
    // Use the localized price in site currency
    priceValue.textContent = listing.siteLocalPrice || formatPrice(listing.price, siteCurrency);
    
    // Show the site price with strikethrough if savings
    if (listing.sitePrice && hasSavings) {
      const sitePriceElement = document.createElement('div');
      sitePriceElement.style.cssText = `
        font-size: 13px;
        color: #666;
        margin-top: 4px;
        text-decoration: line-through;
        display: inline-block;
        margin-right: 8px;
      `;
      sitePriceElement.textContent = `Site price: ${listing.sitePrice}`;
      
      const savings = document.createElement('span');
      savings.style.cssText = `
        color: #4CAF50;
        font-weight: bold;
        font-size: 13px;
      `;
      
      // Determine currency symbol
      const currencySymbol = siteCurrency === 'GBP' ? '£' : 
                             siteCurrency === 'EUR' ? '€' : '$';
                             
      savings.textContent = `Save ${currencySymbol}${listing.savingsAmount.toFixed(2)}`;
      
      const priceRow = document.createElement('div');
      priceRow.appendChild(sitePriceElement);
      priceRow.appendChild(savings);
      
      matchPrice.appendChild(priceValue);
      matchPrice.appendChild(priceRow);
    } else {
      // Just show the price
      matchPrice.appendChild(priceValue);
      
      if (!hasSavings) {
        const priceDiff = document.createElement('div');
        priceDiff.style.cssText = `
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        `;
        priceDiff.textContent = listing.priceDifference || 'Comparable price';
        matchPrice.appendChild(priceDiff);
      }
    }
    
    const matchLink = document.createElement('div');
    matchLink.className = 'recent-site';
    matchLink.textContent = 'View on BAXUS';
    
    matchItem.appendChild(matchTitle);
    matchItem.appendChild(matchPrice);
    matchItem.appendChild(matchLink);
    
    recentContainer.appendChild(matchItem);
  });
  
  // Show the no results section if no matches were added
  if (recentContainer.childElementCount === (siteCurrency !== 'USD' ? 1 : 0)) {
    recentSection.style.display = 'none';
    noResultsSection.style.display = 'block';
    return;
  }
  
  // Show the recent section
  recentSection.style.display = 'block';
  
  // Add transparency footer if conversion was applied
  if (transparency?.conversionApplied) {
    const transparencyFooter = document.createElement('div');
    transparencyFooter.style.cssText = `
      font-size: 11px;
      color: #666;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #eee;
      font-style: italic;
    `;
    transparencyFooter.textContent = `Prices converted from USD to ${transparency.siteCurrency}. Exchange rates from ${transparency.ratesSource || 'external source'}.`;
    recentContainer.appendChild(transparencyFooter);
  }
}

// Function to check for matches on the current tab
function checkForMatches() {
  if (isLoading) return;
  
  setLoading(true);
  updateStatus('Checking for better prices...', 'This may take a moment');
  
  // Execute script in the current tab to get bottle information
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0];
    
    // Don't run on BAXUS own site
    if (currentTab.url.includes('baxus.co')) {
      setLoading(false);
      updateStatus('You are on BAXUS', 'No need to compare prices here!');
      return;
    }
    
    // Special handling for Whisky Exchange
    const isWhiskyExchange = currentTab.url.includes('thewhiskyexchange.com') || 
                              currentTab.url.includes('whiskyexchange.com');
    
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      function: extractProductInfo,
      args: []
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Script execution failed:', chrome.runtime.lastError);
        setLoading(false);
        updateStatus('Error detecting product', chrome.runtime.lastError.message);
        return;
      }
      
      console.log('Script execution results:', results);
      const bottleInfo = results[0]?.result;
      
      if (!bottleInfo || !bottleInfo.name) {
        setLoading(false);
        displayBottleInfo(null);
        return;
      }
      
      // Add site information
      bottleInfo.site = new URL(currentTab.url).hostname;
      bottleInfo.url = currentTab.url;
      
      console.log('Extracted bottle info:', bottleInfo);
      
      // Display the detected bottle info
      displayBottleInfo(bottleInfo);
      
      // Now query the background script for matches
      chrome.runtime.sendMessage(
        { action: 'getMatches', bottleInfo },
        (response) => {
          console.log('Received match response:', response);
          setLoading(false);
          
          if (!response || !response.success) {
            updateStatus('Error finding matches', 
              response?.error || 'Unknown error occurred');
            return;
          }
          
          // Handle no matches found
          if (!response.matches || response.matches.length === 0) {
            updateStatus('No matches found', 'We couldn\'t find any comparable bottles');
            noResultsSection.style.display = 'block';
            recentSection.style.display = 'none';
            return;
          }
          
          // Display the matches with transparency information
          displayMatches(response.matches, response.transparency);
          
          // Update status based on if we found savings
          const hasSavings = response.matches.some(match => match.listing.isCheaperThanSite);
          
          if (hasSavings) {
            updateStatus('Savings found!', 'We found better prices for this bottle');
          } else {
            updateStatus('No savings found', 'We found similar bottles but no better prices');
          }
        }
      );
    });
  });
}

// Function to extract product information
function extractProductInfo() {
  try {
    // Site-specific settings for product extraction
    const SITE_SPECIFIC_SETTINGS = {
      'thewhiskyexchange.com': {
        currency: 'GBP',
        selectors: {
          productName: '.product-main__name',
          productPrice: '.product-action__price',
          productBrand: '.product-main__subtitle'
        }
      },
      'whiskyexchange.com': {
        currency: 'GBP',
        selectors: {
          productName: '.product-main__name',
          productPrice: '.product-action__price',
          productBrand: '.product-main__subtitle'
        }
      },
      'unicornauctions.com': {
        currency: 'USD',
        selectors: {
          productName: '.text-\\[1\\.5rem\\].font-black.mb-3',
          productPrice: 'p.font-bold.mr-2',
          productBrand: '.lot-description',
        }
      },
      'sothebys.com': {
        currency: 'USD',
        selectors: {
          productName: '[data-testid="lotTitle"]',
          productPrice: '[data-testid="lotBidAmount"] p:last-child',
          productBrand: '[data-testid="lotTitle"]'
        }
      }
    };

    // Debug function - kept for future debugging if needed
    function debugLog(message, data = '') {
      console.log(message, data);
    }

    // Helper to extract text content from selector
    function extractText(selector) {
      const element = document.querySelector(selector);
      return element ? element.textContent.trim() : '';
    }
    
    // Helper to extract raw price text (not parsed)
    function extractRawPrice(selector) {
      // Try all selectors if multiple are provided (comma-separated)
      if (selector.includes(',')) {
        const selectors = selector.split(',');
        for (const sel of selectors) {
          const element = document.querySelector(sel.trim());
          if (element) {
            return element.textContent.trim();
          }
        }
        return null;
      }
      
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }
      
      // For Sotheby's specific handling
      if (selector.includes('lotBidAmount')) {
        // Try to get all text nodes directly
        const textNodes = Array.from(element.childNodes)
          .filter(node => node.nodeType === 3)
          .map(node => node.textContent.trim())
          .filter(text => text.length > 0);
          
        if (textNodes.length > 0) {
          return textNodes[textNodes.length - 1];
        }
        
        // Try paragraphs
        const paragraphs = element.querySelectorAll('p');
        if (paragraphs.length > 0) {
          const lastP = paragraphs[paragraphs.length - 1];
          return lastP.textContent.trim();
        }
      }
      
      return element.textContent.trim();
    }

    const hostname = window.location.hostname.replace('www.', '');
    let domain = SITE_SPECIFIC_SETTINGS[hostname];

    if (domain) {
      const name = extractText(domain.selectors.productName);
      const price = extractRawPrice(domain.selectors.productPrice);
      const brand = extractText(domain.selectors.productBrand);
      
      return {
        name,
        price,
        brand,
        site: hostname,
        expectedCurrency: domain.currency
      };
    }

    // Generic extraction for other sites
    const productName = extractText('h1') || 
                       extractText('.product-title') || 
                       extractText('.product-name');
                        
    const productPrice = extractRawPrice('.price') || 
                        extractRawPrice('.product-price') || 
                        extractRawPrice('[data-testid="price"]');
                        
    const productBrand = extractText('.brand') || 
                        extractText('.manufacturer') || 
                        extractText('.vendor');
                          
    return {
      name: productName,
      price: productPrice,
      brand: productBrand,
      site: hostname
    };
  } catch (error) {
    console.error('Error in extractProductInfo:', error);
    throw error;
  }
}

// Function to refresh BAXUS data
function refreshBaxusData() {
  chrome.runtime.sendMessage(
    { action: 'refreshBaxusData' },
    response => {
      if (response && response.success) {
        updateStatus('BAXUS data refreshed', `Loaded ${response.count} listings`);
      } else {
        updateStatus('Error refreshing data', 'Please try again later');
      }
    }
  );
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Load extension state from storage
  chrome.storage.local.get('isEnabled', (data) => {
    isEnabled = data.isEnabled !== undefined ? data.isEnabled : true;
    updateToggleButton();
  });
  
  // Check if we're on a product page
  checkForMatches();
  
  // Refresh button click event
  refreshButton.addEventListener('click', () => {
    checkForMatches();
  });
  
  // Toggle button click event
  toggleBtn.addEventListener('click', () => {
    isEnabled = !isEnabled;
    updateToggleButton();
    
    // Update status based on new state
    if (isEnabled) {
      updateStatus('The Honey Barrel is enabled', 'You will receive price comparisons');
      // Re-check for matches
      checkForMatches();
    } else {
      updateStatus('The Honey Barrel is disabled', 'You will not receive price comparisons');
      // Hide results sections
      currentProductSection.style.display = 'none';
      recentSection.style.display = 'none';
      noResultsSection.style.display = 'none';
    }
  });
}); 