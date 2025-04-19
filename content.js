// The Honey Barrel - Content Script

// Configuration for supported e-commerce sites
const siteConfigs = {
  // Wine.com
  'wine.com': {
    titleSelector: '.pipName',
    priceSelector: '.productPrice',
    brandSelector: '.pipWinery',
    descriptionSelector: '.pipDescription',
    imageSelector: '.pipMasterImage img',
    vintage: {
      pattern: /(\d{4})/,
      selector: '.pipName'
    }
  },
  // Whisky Exchange
  'thewhiskyexchange.com': {
    titleSelector: '.product-main__name',
    priceSelector: '.product-action__price',
    brandSelector: '.product-main__subtitle a',
    descriptionSelector: '.product-main__description',
    imageSelector: '.product-main__image img',
    age: {
      pattern: /(\d+)\s*Year/i,
      selector: '.product-main__name'
    }
  },
  // Total Wine
  'totalwine.com': {
    titleSelector: '.product-name',
    priceSelector: '.price',
    brandSelector: '.product-brand',
    descriptionSelector: '.product-description',
    imageSelector: '.product-img img',
    vintage: {
      pattern: /(\d{4})/,
      selector: '.product-name'
    }
  },
  // ReserveBar
  'reservebar.com': {
    titleSelector: '.product-title h1',
    priceSelector: '.product-price',
    brandSelector: '.product-vendor',
    descriptionSelector: '.product-description',
    imageSelector: '.product__media img',
    age: {
      pattern: /(\d+)\s*Year/i,
      selector: '.product-title h1'
    }
  },
  // Default fallback selectors for other sites
  'default': {
    titleSelector: 'h1',
    priceSelector: '.price, [class*="price"], [id*="price"]',
    brandSelector: '.brand, [class*="brand"], [itemprop="brand"]',
    descriptionSelector: '.description, [class*="description"], [itemprop="description"]',
    imageSelector: '.product-image img, [class*="product"] img',
    vintage: {
      pattern: /(\d{4})/,
      selector: 'h1, .title, [class*="title"]'
    },
    age: {
      pattern: /(\d+)\s*Year/i,
      selector: 'h1, .title, [class*="title"]'
    }
  }
};

// Add currency handling for Whisky Exchange at the beginning of the content script
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
  }
};

// Helper to extract text content from selector
function extractText(selector) {
  const element = document.querySelector(selector);
  return element ? element.textContent.trim() : '';
}

// Helper to extract price value
function extractPrice(selector) {
  const priceText = extractText(selector);
  // Find the first price-like pattern in the text
  const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
  if (priceMatch && priceMatch[1]) {
    // Remove commas and convert to number
    return parseFloat(priceMatch[1].replace(/,/g, ''));
  }
  return null;
}

// Helper to extract pattern from text
function extractPattern(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : null;
}

// Main function to scrape bottle information from the current page
function scrapeBottleInfo() {
  // Get the current hostname
  const hostname = window.location.hostname.replace('www.', '');
  
  // Find the matching site config or use default
  const siteConfig = siteConfigs[hostname] || siteConfigs['default'];
  
  // Extract basic information
  const name = extractText(siteConfig.titleSelector);
  const price = extractPrice(siteConfig.priceSelector);
  const brand = extractText(siteConfig.brandSelector);
  const description = extractText(siteConfig.descriptionSelector);
  
  // Extract image URL if available
  const imageElement = document.querySelector(siteConfig.imageSelector);
  const imageUrl = imageElement ? imageElement.src : '';
  
  // Extract vintage if pattern and selector exist
  let vintage = null;
  if (siteConfig.vintage) {
    const vintageText = extractText(siteConfig.vintage.selector);
    vintage = vintageText ? extractPattern(vintageText, siteConfig.vintage.pattern) : null;
  }
  
  // Extract age if pattern and selector exist
  let age = null;
  if (siteConfig.age) {
    const ageText = extractText(siteConfig.age.selector);
    age = ageText ? extractPattern(ageText, siteConfig.age.pattern) : null;
  }
  
  // Return the collected bottle information
  return {
    name,
    brand,
    price,
    description,
    imageUrl,
    vintage,
    age,
    url: window.location.href,
    site: hostname
  };
}

// Function to create and inject the notification UI
// function createNotification(matches) {
//   // Remove any existing notification
//   const existingNotification = document.getElementById('honey-barrel-notification');
//   if (existingNotification) {
//     existingNotification.remove();
//   }
  
//   // If no matches, don't show anything
//   if (!matches || matches.length === 0) return;
  
//   // Get the current bottle info
//   const bottleInfo = scrapeBottleInfo();
  
//   // Create the notification container
//   const notification = document.createElement('div');
//   notification.id = 'honey-barrel-notification';
//   notification.style.cssText = `
//     position: fixed;
//     bottom: 20px;
//     right: 20px;
//     width: 320px;
//     background-color: #fff;
//     border-radius: 8px;
//     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
//     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
//     z-index: 10000;
//     overflow: hidden;
//     transition: all 0.3s ease;
//   `;
  
//   // Create the header
//   const header = document.createElement('div');
//   header.style.cssText = `
//     background-color: #4a3520;
//     color: #fff;
//     padding: 12px 16px;
//     display: flex;
//     align-items: center;
//     justify-content: space-between;
//     border-bottom: 1px solid #e0e0e0;
//   `;
  
//   // Header content
//   const title = document.createElement('div');
//   title.textContent = 'The Honey Barrel';
//   title.style.cssText = `
//     font-weight: 600;
//     font-size: 16px;
//     display: flex;
//     align-items: center;
//   `;
  
//   // Add logo/icon to header
//   const logo = document.createElement('div');
//   logo.innerHTML = `
//     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//       <path d="M12 3L4 7.5V16.5L12 21L20 16.5V7.5L12 3Z" stroke="#f9d342" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//       <path d="M12 21V12" stroke="#f9d342" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//       <path d="M12 12L20 7.5" stroke="#f9d342" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//       <path d="M12 12L4 7.5" stroke="#f9d342" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//     </svg>
//   `;
//   logo.style.marginRight = '8px';
//   title.prepend(logo);
  
//   // Close button
//   const closeButton = document.createElement('button');
//   closeButton.innerHTML = '&times;';
//   closeButton.style.cssText = `
//     background: none;
//     border: none;
//     color: #fff;
//     font-size: 20px;
//     cursor: pointer;
//     padding: 0;
//     line-height: 1;
//   `;
//   closeButton.addEventListener('click', () => notification.remove());
  
//   header.appendChild(title);
//   header.appendChild(closeButton);
//   notification.appendChild(header);
  
//   // Create content container
//   const content = document.createElement('div');
//   content.style.cssText = `
//     padding: 16px;
//     max-height: 300px;
//     overflow-y: auto;
//   `;
  
//   // Add current bottle info
//   const currentBottle = document.createElement('div');
//   currentBottle.style.cssText = `
//     margin-bottom: 16px;
//     padding-bottom: 12px;
//     border-bottom: 1px solid #e0e0e0;
//   `;
  
//   const currentTitle = document.createElement('h3');
//   currentTitle.textContent = 'Found better prices on BAXUS:';
//   currentTitle.style.cssText = `
//     font-size: 14px;
//     margin: 0 0 8px 0;
//     color: #333;
//   `;
  
//   currentBottle.appendChild(currentTitle);
//   content.appendChild(currentBottle);
  
//   // Add matches
//   matches.forEach(match => {
//     const matchItem = document.createElement('div');
//     matchItem.style.cssText = `
//       padding: 12px;
//       margin-bottom: 12px;
//       border-radius: 6px;
//       background-color: #f9f9f9;
//       cursor: pointer;
//       transition: background-color 0.2s;
//     `;
//     matchItem.addEventListener('mouseover', () => {
//       matchItem.style.backgroundColor = '#f0f0f0';
//     });
//     matchItem.addEventListener('mouseout', () => {
//       matchItem.style.backgroundColor = '#f9f9f9';
//     });
    
//     // Use the correct URL path from our processed data
//     const listingUrl = match.listing.url || 'https://baxus.co';
//     matchItem.addEventListener('click', () => {
//       window.open(listingUrl, '_blank');
//     });
    
//     const matchTitle = document.createElement('div');
//     matchTitle.textContent = match.listing.name || 'Unknown Bottle';
//     matchTitle.style.cssText = `
//       font-weight: 600;
//       margin-bottom: 4px;
//       font-size: 14px;
//     `;
    
//     // Add additional info if available
//     if (match.listing.spiritType || match.listing.country || match.listing.region) {
//       const matchInfo = document.createElement('div');
//       matchInfo.style.cssText = `
//         font-size: 12px;
//         color: #666;
//         margin-bottom: 8px;
//       `;
      
//       const infoArr = [];
//       if (match.listing.spiritType) infoArr.push(match.listing.spiritType);
//       if (match.listing.region) infoArr.push(match.listing.region);
//       if (match.listing.country) infoArr.push(match.listing.country);
      
//       matchInfo.textContent = infoArr.join(' • ');
//       matchItem.appendChild(matchInfo);
//     }
    
//     const matchPrice = document.createElement('div');
//     const priceValue = match.listing.price || 0;
//     const savingsAmount = bottleInfo.price ? (bottleInfo.price - priceValue).toFixed(2) : 0;
//     const savingsPercent = bottleInfo.price ? ((bottleInfo.price - priceValue) / bottleInfo.price * 100).toFixed(0) : 0;
    
//     matchPrice.innerHTML = `
//       <span style="font-weight: 600; color: #168821;">$${priceValue.toFixed(2)}</span>
//       ${savingsAmount > 0 ? `<span style="margin-left: 8px; color: #168821; font-size: 12px;">Save $${savingsAmount} (${savingsPercent}%)</span>` : ''}
//     `;
//     matchPrice.style.marginBottom = '8px';
    
//     const matchLink = document.createElement('div');
//     matchLink.textContent = 'View on BAXUS';
//     matchLink.style.cssText = `
//       color: #4a3520;
//       font-size: 12px;
//       text-decoration: underline;
//     `;
    
//     matchItem.appendChild(matchTitle);
//     matchItem.appendChild(matchPrice);
//     matchItem.appendChild(matchLink);
//     content.appendChild(matchItem);
//   });
  
//   notification.appendChild(content);
  
//   // Add footer
//   const footer = document.createElement('div');
//   footer.style.cssText = `
//     padding: 8px 16px;
//     background-color: #f9f9f9;
//     text-align: center;
//     font-size: 12px;
//     color: #666;
//     border-top: 1px solid #e0e0e0;
//   `;
//   footer.textContent = 'Powered by BAXUS Marketplace';
//   notification.appendChild(footer);
  
//   // Add to page
//   document.body.appendChild(notification);
  
//   // Slide-in animation
//   setTimeout(() => {
//     notification.style.transform = 'translateX(0)';
//   }, 100);
// }

// Main function to check if we're on a product page and find matches
function checkForBottleMatches() {
  // Don't run on BAXUS own site
  if (window.location.hostname.includes('baxus.co')) return;
  
  // Simple check if we're on a product page - look for price elements
  const priceElements = document.querySelectorAll('.price, [class*="price"], [id*="price"]');
  if (priceElements.length === 0) return;
  
  // Scrape bottle information
  const bottleInfo = scrapeBottleInfo();
  
  // Only proceed if we have at least a name
  if (!bottleInfo.name) return;
  
  // Send message to background script to find matches
  chrome.runtime.sendMessage(
    { action: 'getMatches', bottleInfo },
    response => {
      if (response && response.success && response.matches) {
        // Filter matches that offer savings
        const savingsMatches = response.matches.filter(match => {
          return match.listing.price && bottleInfo.price && match.listing.price < bottleInfo.price;
        });
        
        // Show notification if we have matches with savings
        // if (savingsMatches.length > 0) {
        //   createNotification(savingsMatches);
        // }
      }
    }
  );
}

// Run the main function after page load
window.addEventListener('load', () => {
  // Small delay to make sure all elements are loaded
  setTimeout(checkForBottleMatches, 1500);
});

// Also run when URL changes (for SPAs)
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (lastUrl !== window.location.href) {
    lastUrl = window.location.href;
    setTimeout(checkForBottleMatches, 1500);
  }
}).observe(document, { subtree: true, childList: true });

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
  #honey-barrel-notification {
    transform: translateX(400px);
  }
  #honey-barrel-notification:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
`;
document.head.appendChild(style);

// Listener for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractProductInfo') {
    const bottleInfo = extractProductInfo();
    sendResponse(bottleInfo);
  }
});

// Function to extract product information
function extractProductInfo() {
  // Helper to extract text content from selector
  function extractText(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim() : '';
  }
  
  // Helper to extract raw price text (not parsed)
  function extractRawPrice(selector) {
    const element = document.querySelector(selector);
    if (!element) return null;
    
    // Return the raw text for currency detection in the background
    const priceText = element.textContent.trim();
    console.log(`Raw price text: "${priceText}"`);
    return priceText;
  }
  
  // Check if we're on a known site
  const hostname = window.location.hostname;
  let domain = '';
  
  // Extract the domain for site-specific handling
  for (const site in SITE_SPECIFIC_SETTINGS) {
    if (hostname.includes(site)) {
      domain = site;
      break;
    }
  }
  
  // If we have specific settings for this site, use them
  if (domain) {
    const settings = SITE_SPECIFIC_SETTINGS[domain];
    console.log(`Using specific settings for ${domain}`);
    
    const name = extractText(settings.selectors.productName);
    const price = extractRawPrice(settings.selectors.productPrice);
    const brand = extractText(settings.selectors.productBrand);
    
    // Special handling for The Whisky Exchange - preserve raw price string
    if (domain.includes('whiskyexchange')) {
      console.log(`Whisky Exchange detected: "${price}" (${settings.currency})`);
    }
    
    return {
      name,
      price,
      brand,
      site: domain,
      expectedCurrency: settings.currency
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
}

// Auto-run product detection on page load
window.addEventListener('load', () => {
  // Wait a short delay to ensure page is fully loaded
  setTimeout(() => {
    const bottleInfo = extractProductInfo();
    
    // Only send if we have a product name
    if (bottleInfo && bottleInfo.name) {
      console.log('Product detected:', bottleInfo);
      
      // Send the info to the background script
      chrome.runtime.sendMessage({
        action: 'getMatches',
        bottleInfo: bottleInfo
      }, response => {
        if (response && response.success) {
          console.log('Matches found:', response.matches?.length || 0);
          
          // If there are savings, show a notification
          const hasSavings = response.matches?.some(match => match.listing.isCheaperThanSite);
          
          if (hasSavings) {
            // Create and show a notification UI element
            showSavingsNotification(response);
          }
        }
      });
    }
  }, 1000);
});

// Function to show a notification about savings
function showSavingsNotification(response) {
  if (!response.matches || response.matches.length === 0) return;
  
  // Find the best saving
  const bestMatch = response.matches.reduce((best, current) => {
    if (!best.listing) return current;
    return (current.listing.savingsAmount > best.listing.savingsAmount) ? current : best;
  }, { listing: null });
  
  if (!bestMatch.listing || !bestMatch.listing.isCheaperThanSite) return;
  
  // Check if existing notification and remove it
  const existingNotification = document.getElementById('honey-barrel-notification');
  if (existingNotification) {
    document.body.removeChild(existingNotification);
  }
  
  // Create the notification element
  const notification = document.createElement('div');
  notification.id = 'honey-barrel-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 320px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    transition: all 0.3s ease;
    transform: translateX(400px);
    border-left: 4px solid #4CAF50;
  `;
  
  // Create the header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  `;
  
  const title = document.createElement('h3');
  title.style.cssText = `
    margin: 0;
    color: #333;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
  `;
  
  // Add icon to title
  const titleIcon = document.createElement('span');
  titleIcon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
      <path d="M12 3L4 7.5V16.5L12 21L20 16.5V7.5L12 3Z" stroke="#f7931e" stroke-width="2" fill="#f7931e" fill-opacity="0.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 12L4 7.5" stroke="#f7931e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 12L20 7.5" stroke="#f7931e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 21V12" stroke="#f7931e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  title.prepend(titleIcon);
  title.append(document.createTextNode('The Honey Barrel'));
  
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    font-size: 20px;
    color: #999;
    padding: 0;
    line-height: 1;
  `;
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  });
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Get site and currency info
  const listing = bestMatch.listing;
  const siteCurrency = response.transparency?.siteCurrency || 'USD';
  const isGBP = siteCurrency === 'GBP';
  
  // Create the content
  const content = document.createElement('div');
  
  // Add category/region info if available
  if (listing.spiritType || listing.country || listing.region) {
    const categoryInfo = document.createElement('div');
    categoryInfo.style.cssText = `
      font-size: 11px;
      color: #666;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    
    const infoArr = [];
    if (listing.spiritType) infoArr.push(listing.spiritType);
    if (listing.region) infoArr.push(listing.region);
    if (listing.country) infoArr.push(listing.country);
    
    categoryInfo.textContent = infoArr.join(' • ');
    content.appendChild(categoryInfo);
  }
  
  // Add product name
  const productName = document.createElement('div');
  productName.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  productName.textContent = listing.name;
  content.appendChild(productName);
  
  // Add price comparison section
  const priceSection = document.createElement('div');
  priceSection.style.cssText = `
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;
  `;
  
  // BAXUS price column
  const baxusPrice = document.createElement('div');
  baxusPrice.style.cssText = `
    flex: 1;
    padding-right: 10px;
  `;
  
  const baxusLabel = document.createElement('div');
  baxusLabel.style.cssText = `
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
  `;
  baxusLabel.textContent = 'BAXUS Price';
  
  const baxusAmount = document.createElement('div');
  baxusAmount.style.cssText = `
    font-size: 20px;
    font-weight: bold;
    color: #4CAF50;
  `;
  baxusAmount.textContent = listing.siteLocalPrice;
  
  baxusPrice.appendChild(baxusLabel);
  baxusPrice.appendChild(baxusAmount);
  
  // Site price column
  const sitePrice = document.createElement('div');
  sitePrice.style.cssText = `
    flex: 1;
    padding-left: 10px;
    border-left: 1px solid #eee;
  `;
  
  const siteLabel = document.createElement('div');
  siteLabel.style.cssText = `
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
  `;
  siteLabel.textContent = 'Site Price';
  
  const siteAmount = document.createElement('div');
  siteAmount.style.cssText = `
    font-size: 16px;
    color: #666;
    text-decoration: line-through;
  `;
  siteAmount.textContent = listing.sitePrice;
  
  sitePrice.appendChild(siteLabel);
  sitePrice.appendChild(siteAmount);
  
  priceSection.appendChild(baxusPrice);
  priceSection.appendChild(sitePrice);
  content.appendChild(priceSection);
  
  // Add savings
  const savingsText = document.createElement('div');
  savingsText.style.cssText = `
    background-color: #e8f5e9;
    padding: 8px 12px;
    border-radius: 4px;
    color: #2e7d32;
    font-weight: 600;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Format the savings based on currency
  const currencySymbol = isGBP ? '£' : siteCurrency === 'EUR' ? '€' : '$';
  const savingsAmount = listing.savingsAmount.toFixed(2);
  const savingsPercent = Math.round(listing.savingsPercentage);
  
  // Add check icon
  const checkIcon = document.createElement('span');
  checkIcon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  
  savingsText.appendChild(checkIcon);
  savingsText.appendChild(document.createTextNode(`Save ${currencySymbol}${savingsAmount} (${savingsPercent}%)`));
  content.appendChild(savingsText);
  
  // Create view button
  const viewBtn = document.createElement('a');
  viewBtn.style.cssText = `
    display: block;
    background-color: #f7931e;
    color: white;
    padding: 10px 16px;
    border-radius: 4px;
    text-decoration: none;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    transition: background-color 0.2s;
  `;
  viewBtn.textContent = 'View on BAXUS';
  viewBtn.href = listing.url;
  viewBtn.target = '_blank';
  viewBtn.addEventListener('mouseover', () => {
    viewBtn.style.backgroundColor = '#e57d00';
  });
  viewBtn.addEventListener('mouseout', () => {
    viewBtn.style.backgroundColor = '#f7931e';
  });
  content.appendChild(viewBtn);
  
  // Add currency conversion info if applicable
  if (response.transparency?.conversionApplied) {
    const conversionInfo = document.createElement('div');
    conversionInfo.style.cssText = `
      font-size: 11px;
      color: #999;
      text-align: center;
      margin-top: 10px;
      font-style: italic;
    `;
    conversionInfo.textContent = `Prices shown in ${siteCurrency} based on current exchange rates`;
    content.appendChild(conversionInfo);
  }
  
  // Assemble the notification
  notification.appendChild(header);
  notification.appendChild(content);
  
  // Add to the page
  document.body.appendChild(notification);
  
  // Slide-in animation
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 15000);
} 