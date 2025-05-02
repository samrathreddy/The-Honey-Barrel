export const SITE_SPECIFIC_SETTINGS = {
    'thewhiskyexchange.com': {
      currency: 'USD',
      selectors: {
        productName: '.product-main__name',
        productPrice: '.product-action__price',
        productBrand: '.product-main__subtitle'
      }
    },
    'whiskyexchange.com': {
      currency: 'USD',
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
