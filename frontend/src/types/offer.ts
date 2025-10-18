/**
 * Offer Type Definitions
 * Pusti Happy Times - Offer Types Module
 */

export type ProductSegment = 'BIS' | 'BEV';

export type OfferTypeCode = 
  | 'FLAT_DISCOUNT_PCT'
  | 'FLAT_DISCOUNT_AMT'
  | 'DISCOUNT_SLAB_PCT'
  | 'DISCOUNT_SLAB_AMT'
  | 'FREE_PRODUCT'
  | 'BUNDLE_OFFER'
  | 'BOGO'
  | 'CASHBACK'
  | 'VOLUME_DISCOUNT'
  | 'CROSS_CATEGORY'
  | 'FIRST_ORDER'
  | 'LOYALTY_POINTS'
  | 'FLASH_SALE';

export interface OfferTypeDefinition {
  code: OfferTypeCode;
  name: string;
  description: string;
  icon: string;
  category: 'Discount' | 'Free Product' | 'Bundle' | 'Special';
  features: string[];
}

export interface Territory {
  _id: string;
  name: string;
  type: 'zone' | 'region' | 'area' | 'db_point';
  level: number;
  parent_id: string | null;
  ancestors: string[];
  active: boolean;
}

export interface Distributor {
  _id: string;
  name: string;
  db_point_id: string;
  product_segment: ProductSegment[];
  distributor_type: string;
  mobile: string;
  contact_number?: string;
  active: boolean;
}

export interface Product {
  _id: string;
  name: string; // This is the SKU (used as display name)
  sku: string;
  bangla_name?: string;
  product_type: 'MANUFACTURED' | 'PROCURED';
  brand_id: string;
  category_id: string;
  trade_price: number;
  unit: string;
  active: boolean;
  db_price?: number;
  mrp?: number;
  ctn_pcs?: number;
}

// Wizard Form State
export interface OfferTypeWizardState {
  // Screen 1: Offer Scope
  offerName: string;
  offerType: OfferTypeCode | null;
  productSegments: ProductSegment[];
  validFrom: string;
  validTo: string;
  
  // Screen 2: Territory & Distributors
  selectedZones: string[];
  selectedRegions: string[];
  selectedAreas: string[];
  selectedDbPoints: string[];
  selectedDistributors: string[];
  
  // Screen 3: Product Selection (BUY)
  selectedProducts: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  
  // Screen 4: Gift Selection (GET)
  selectedGifts: Array<{
    productId: string;
    quantity: number;
  }>;
  
  // Wizard Navigation
  currentScreen: number;
}

export const OFFER_TYPE_DEFINITIONS: OfferTypeDefinition[] = [
  {
    code: 'FLAT_DISCOUNT_PCT',
    name: 'Flat Discount %',
    description: 'Apply a fixed percentage discount on total purchase amount',
    icon: '📊',
    category: 'Discount',
    features: ['Simple percentage off', 'Applies to entire cart', 'Easy to understand']
  },
  {
    code: 'FLAT_DISCOUNT_AMT',
    name: 'Flat Discount Amount',
    description: 'Apply a fixed amount discount on total purchase',
    icon: '💰',
    category: 'Discount',
    features: ['Fixed amount off', 'Minimum order value', 'Instant savings']
  },
  {
    code: 'DISCOUNT_SLAB_PCT',
    name: 'Discount Slab %',
    description: 'Tiered percentage discounts based on purchase amount',
    icon: '📈',
    category: 'Discount',
    features: ['Multiple discount tiers', 'Encourages bulk buying', 'Progressive rewards']
  },
  {
    code: 'DISCOUNT_SLAB_AMT',
    name: 'Discount Slab Amount',
    description: 'Tiered amount discounts based on purchase volume',
    icon: '💵',
    category: 'Discount',
    features: ['Volume-based savings', 'Clear tier benefits', 'Scales with order size']
  },
  {
    code: 'FREE_PRODUCT',
    name: 'Buy X Get Y Free',
    description: 'Get free products when purchasing specific quantities',
    icon: '🎁',
    category: 'Free Product',
    features: ['Product-specific offers', 'Flexible ratios', 'Tangible rewards']
  },
  {
    code: 'BUNDLE_OFFER',
    name: 'Bundle Offer',
    description: 'Special pricing when buying product bundles together',
    icon: '📦',
    category: 'Bundle',
    features: ['Multi-product deals', 'Package savings', 'Cross-sell opportunity']
  },
  {
    code: 'BOGO',
    name: 'Buy One Get One',
    description: 'Classic BOGO - buy one product, get another free or discounted',
    icon: '🎯',
    category: 'Free Product',
    features: ['Popular promotion', '1:1 ratio', 'Clear value proposition']
  },
  {
    code: 'CASHBACK',
    name: 'Cashback Offer',
    description: 'Earn cashback credits on purchases for future orders',
    icon: '💸',
    category: 'Special',
    features: ['Future purchase credit', 'Customer retention', 'Flexible redemption']
  },
  {
    code: 'VOLUME_DISCOUNT',
    name: 'Volume Discount',
    description: 'Discount increases with purchase quantity of specific products',
    icon: '📊',
    category: 'Discount',
    features: ['Quantity-driven', 'Product-specific', 'Bulk purchase incentive']
  },
  {
    code: 'CROSS_CATEGORY',
    name: 'Cross Category',
    description: 'Discounts when buying from multiple product categories',
    icon: '🔄',
    category: 'Special',
    features: ['Multi-category purchase', 'Product diversity', 'Basket expansion']
  },
  {
    code: 'FIRST_ORDER',
    name: 'First Order Special',
    description: 'Exclusive offers for first-time ordering distributors',
    icon: '🌟',
    category: 'Special',
    features: ['New distributor incentive', 'One-time benefit', 'Customer acquisition']
  },
  {
    code: 'LOYALTY_POINTS',
    name: 'Loyalty Points',
    description: 'Earn points on purchases, redeem for discounts or products',
    icon: '⭐',
    category: 'Special',
    features: ['Points accumulation', 'Long-term rewards', 'Customer loyalty']
  },
  {
    code: 'FLASH_SALE',
    name: 'Flash Sale',
    description: 'Time-limited offers with aggressive discounts',
    icon: '⚡',
    category: 'Special',
    features: ['Urgency-driven', 'Limited duration', 'High discounts']
  }
];

// Export alias for compatibility
export const OFFER_TYPES = OFFER_TYPE_DEFINITIONS;
