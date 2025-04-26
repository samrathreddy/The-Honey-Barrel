// The Honey Barrel - Content Script

let SITE_SPECIFIC_SETTINGS = {};

// Function to get settings from background script
async function getSiteSpecificSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'getSiteSpecificSettings' },
      response => {
        if (response && response.success) {
          SITE_SPECIFIC_SETTINGS = response.SITE_SPECIFIC_SETTINGS;
          console.log('Received site specific settings:', SITE_SPECIFIC_SETTINGS);
          resolve(response.SITE_SPECIFIC_SETTINGS);
        } else {
          console.error('Failed to get site specific settings:', response);
          resolve({});
        }
      }
    );
  });
}

// Function to extract text from an element
function extractText(selector) {
  const element = document.querySelector(selector);
  return element ? element.textContent.trim() : 'N/A';
}

// Main function to extract product information from the current page
async function extractProductInfo() {
  try {
    await getSiteSpecificSettings();
    const hostname = window.location.hostname.replace('www.', '');
    const domain = SITE_SPECIFIC_SETTINGS[hostname];
    
    console.log('Current SITE_SPECIFIC_SETTINGS:', SITE_SPECIFIC_SETTINGS);
    console.log('Extracting product info for:', hostname);
    console.log('Domain specific settings:', domain);

    if (domain) {
      const name = extractText(domain.selectors.productName);
      const price = extractText(domain.selectors.productPrice);
      const brand = extractText(domain.selectors.productBrand);
      
      console.log('Extracted site-specific info:', { name, price, brand });
      
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
                        
    const productPrice = extractText('.price') || 
      extractText('.product-price') || 
      extractText('[data-testid="price"]');
                        
    const productBrand = extractText('.brand') || 
      extractText('.manufacturer') || 
      extractText('.vendor');
    
    console.log('Extracted generic info:', { productName, productPrice, productBrand });
                          
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

// Main function to check if we're on a product page and find matches
async function checkForBottleMatches() {
  // Don't run on BAXUS own site
  const hostname = window.location.hostname.replace('www.', '');
  
  if (hostname.includes('baxus.co')) {
    return;
  }

  // Simple check if we're on a product page - look for price elements
  const priceElements = document.querySelectorAll('.price, [class*="price"], [id*="price"]');
  if (!SITE_SPECIFIC_SETTINGS[hostname] && priceElements.length === 0) {
    return;
  }

  // Extract product information
  const bottleInfo = await extractProductInfo();
  
  // Only proceed if we have at least a name\
  console.log('bootleINfo',bottleInfo)
  if (!bottleInfo || !bottleInfo.name || bottleInfo.name === 'N/A') {
    return;
  }
  
  // Send message to background script to find matches
  chrome.runtime.sendMessage(
    { action: 'getMatches', bottleInfo },
    response => {
      console.log('')
      if (response && response.success && response.matches) {
        const { matches, transparency } = response;
        console.log(matches)
        // Show notification if we have matches
        if (matches.length > 0) {
          showSavingsNotification(matches, transparency);
        }
      }
    }
  );
}

// Run the main function after page load
window.addEventListener('load', () => {
  // Small delay to make sure all elements are loaded
  setTimeout(checkForBottleMatches, 3000);
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
    // Handle the async extractProductInfo
    extractProductInfo()
      .then(bottleInfo => {
        console.log('Sending bottle info to popup:', bottleInfo);
        sendResponse(bottleInfo);
      })
      .catch(error => {
        console.error('Error extracting product info:', error);
        sendResponse(null);
      });
    return true; // Will respond asynchronously
  }
});

// Function to show a notification about savings
function showSavingsNotification(savingsMatches, transparency) {
  // Use the first match directly
  const listing = savingsMatches[0].listing;
  // Check if existing notification and remove it
  const existingNotification = document.getElementById('honey-barrel-notification');
  if (existingNotification) {
    console.log('notification exists')
    document.body.removeChild(existingNotification);
  }
  
  console.log('Creating notification')
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
  const siteCurrency = transparency?.siteCurrency || 'USD';
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
  if (transparency?.conversionApplied) {
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