/**
 * Offer Calculations Utility
 * Handles all offer type calculations for Pusti Happy Times
 */

const { calculateBOGODifferentSKU } = require("./bogoDifferentSkuCalculator");

/**
 * Calculate discount for DISCOUNT_SLAB_PCT offer
 * @param {Array} cartItems - Array of cart items with productId, quantity, price
 * @param {Object} offerConfig - Offer configuration with slabs array
 * @param {Array} selectedProducts - Array of product IDs this offer applies to
 * @returns {Object} { eligible, discount, appliedSlab, message }
 */
function calculateDiscountSlabPct(cartItems, offerConfig, selectedProducts = []) {
  const { slabs = [] } = offerConfig;

  if (!slabs || slabs.length === 0) {
    return {
      eligible: false,
      discount: 0,
      appliedSlab: null,
      message: "No discount slabs configured",
    };
  }

  // Filter cart items that match selected products (if specified)
  const applicableItems =
    selectedProducts.length > 0
      ? cartItems.filter((item) => {
          const productIdStr = item.productId?.toString() || item.source_id?.toString();
          return selectedProducts.some((pid) => pid.toString() === productIdStr);
        })
      : cartItems;

  if (applicableItems.length === 0) {
    return {
      eligible: false,
      discount: 0,
      appliedSlab: null,
      message: "No applicable products in cart",
    };
  }

  // Calculate total order value for applicable items
  const totalValue = applicableItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Sort slabs by minValue ascending to find the highest applicable slab
  const sortedSlabs = [...slabs].sort((a, b) => a.minValue - b.minValue);

  // Find the applicable slab (highest slab where totalValue >= minValue and <= maxValue)
  let appliedSlab = null;
  for (const slab of sortedSlabs) {
    const minValue = slab.minValue || 0;
    const maxValue = slab.maxValue || Infinity;

    if (totalValue >= minValue && totalValue <= maxValue) {
      appliedSlab = slab;
    }
  }

  if (!appliedSlab) {
    return {
      eligible: false,
      discount: 0,
      appliedSlab: null,
      message: `Order value ৳${totalValue.toFixed(2)} does not match any slab`,
      totalValue,
    };
  }

  // Calculate discount based on percentage
  const discountPercentage = appliedSlab.discountPercentage || 0;
  const discount = (totalValue * discountPercentage) / 100;

  return {
    eligible: true,
    discount: parseFloat(discount.toFixed(2)),
    discountPercentage,
    appliedSlab: {
      minValue: appliedSlab.minValue,
      maxValue: appliedSlab.maxValue,
      discountPercentage: appliedSlab.discountPercentage,
    },
    totalValue: parseFloat(totalValue.toFixed(2)),
    message: `Applied ${discountPercentage}% discount (Slab: ৳${appliedSlab.minValue} - ৳${appliedSlab.maxValue})`,
  };
}

/**
 * Calculate discount for DISCOUNT_SLAB_AMT offer
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration with slabs array
 * @param {Array} selectedProducts - Array of product IDs this offer applies to
 * @returns {Object} { eligible, discount, appliedSlab, message }
 */
function calculateDiscountSlabAmt(cartItems, offerConfig, selectedProducts = []) {
  const { slabs = [] } = offerConfig;

  if (!slabs || slabs.length === 0) {
    return {
      eligible: false,
      discount: 0,
      appliedSlab: null,
      message: "No discount slabs configured",
    };
  }

  // Filter cart items that match selected products
  const applicableItems =
    selectedProducts.length > 0
      ? cartItems.filter((item) => {
          const productIdStr = item.productId?.toString() || item.source_id?.toString();
          return selectedProducts.some((pid) => pid.toString() === productIdStr);
        })
      : cartItems;

  if (applicableItems.length === 0) {
    return {
      eligible: false,
      discount: 0,
      appliedSlab: null,
      message: "No applicable products in cart",
    };
  }

  // Calculate total order value
  const totalValue = applicableItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Sort slabs and find applicable one
  const sortedSlabs = [...slabs].sort((a, b) => a.minValue - b.minValue);

  let appliedSlab = null;
  for (const slab of sortedSlabs) {
    const minValue = slab.minValue || 0;
    const maxValue = slab.maxValue || Infinity;

    if (totalValue >= minValue && totalValue <= maxValue) {
      appliedSlab = slab;
    }
  }

  if (!appliedSlab) {
    return {
      eligible: false,
      discount: 0,
      appliedSlab: null,
      message: `Order value ৳${totalValue.toFixed(2)} does not match any slab`,
      totalValue,
    };
  }

  // Fixed amount discount
  const discount = appliedSlab.discountAmount || 0;

  return {
    eligible: true,
    discount: parseFloat(discount.toFixed(2)),
    appliedSlab: {
      minValue: appliedSlab.minValue,
      maxValue: appliedSlab.maxValue,
      discountAmount: appliedSlab.discountAmount,
    },
    totalValue: parseFloat(totalValue.toFixed(2)),
    message: `Applied ৳${discount} discount (Slab: ৳${appliedSlab.minValue} - ৳${appliedSlab.maxValue})`,
  };
}

/**
 * Calculate discount for FLAT_DISCOUNT_PCT offer
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Array} selectedProducts - Array of product IDs this offer applies to
 * @returns {Object} { eligible, discount, message }
 */
function calculateFlatDiscountPct(cartItems, offerConfig, selectedProducts = []) {
  const { discountPercentage = 0, minOrderValue = 0, maxDiscountAmount } = offerConfig;

  // Filter applicable items
  const applicableItems =
    selectedProducts.length > 0
      ? cartItems.filter((item) => {
          const productIdStr = item.productId?.toString() || item.source_id?.toString();
          return selectedProducts.some((pid) => pid.toString() === productIdStr);
        })
      : cartItems;

  if (applicableItems.length === 0) {
    return {
      eligible: false,
      discount: 0,
      message: "No applicable products in cart",
    };
  }

  // Calculate total value
  const totalValue = applicableItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Check minimum order value
  if (totalValue < minOrderValue) {
    return {
      eligible: false,
      discount: 0,
      totalValue: parseFloat(totalValue.toFixed(2)),
      message: `Minimum order value ৳${minOrderValue} not met (Current: ৳${totalValue.toFixed(2)})`,
    };
  }

  // Calculate discount
  let discount = (totalValue * discountPercentage) / 100;

  // Apply maximum discount cap if specified
  if (maxDiscountAmount && discount > maxDiscountAmount) {
    discount = maxDiscountAmount;
  }

  return {
    eligible: true,
    discount: parseFloat(discount.toFixed(2)),
    discountPercentage,
    totalValue: parseFloat(totalValue.toFixed(2)),
    capped: maxDiscountAmount && discount === maxDiscountAmount,
    message: `Applied ${discountPercentage}% discount`,
  };
}

/**
 * Calculate discount for FLAT_DISCOUNT_AMT offer
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Array} selectedProducts - Array of product IDs
 * @returns {Object} { eligible, discount, message }
 */
function calculateFlatDiscountAmt(cartItems, offerConfig, selectedProducts = []) {
  const { discountAmount = 0, minOrderValue = 0 } = offerConfig;

  const applicableItems =
    selectedProducts.length > 0
      ? cartItems.filter((item) => {
          const productIdStr = item.productId?.toString() || item.source_id?.toString();
          return selectedProducts.some((pid) => pid.toString() === productIdStr);
        })
      : cartItems;

  if (applicableItems.length === 0) {
    return {
      eligible: false,
      discount: 0,
      message: "No applicable products in cart",
    };
  }

  const totalValue = applicableItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  if (totalValue < minOrderValue) {
    return {
      eligible: false,
      discount: 0,
      totalValue: parseFloat(totalValue.toFixed(2)),
      message: `Minimum order value ৳${minOrderValue} not met (Current: ৳${totalValue.toFixed(2)})`,
    };
  }

  return {
    eligible: true,
    discount: parseFloat(discountAmount.toFixed(2)),
    totalValue: parseFloat(totalValue.toFixed(2)),
    message: `Applied ৳${discountAmount} flat discount`,
  };
}

/**
 * Calculate FREE_PRODUCT offer (Buy X Get Y Free)
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Object} productPrices - Map of productId to price
 * @returns {Object} { eligible, freeProducts, totalFreeValue, message }
 */
function calculateFreeProduct(cartItems, offerConfig, productPrices = {}) {
  const { buyProducts = [], getProducts = [] } = offerConfig;

  if (!buyProducts || buyProducts.length === 0) {
    return {
      eligible: false,
      freeProducts: [],
      totalFreeValue: 0,
      message: "No buy products configured",
    };
  }

  if (!getProducts || getProducts.length === 0) {
    return {
      eligible: false,
      freeProducts: [],
      totalFreeValue: 0,
      message: "No free products configured",
    };
  }

  // Build cart quantity map
  const cartQuantities = {};
  cartItems.forEach((item) => {
    const productIdStr = item.productId?.toString() || item.source_id?.toString();
    if (productIdStr) {
      cartQuantities[productIdStr] = (cartQuantities[productIdStr] || 0) + (item.quantity || 0);
    }
  });

  // Check if all buy requirements are met
  let eligibleSets = Infinity;
  let allBuyProductsMet = true;

  for (const buyProduct of buyProducts) {
    const productIdStr = buyProduct.productId.toString();
    const quantityInCart = cartQuantities[productIdStr] || 0;
    const requiredQuantity = buyProduct.quantity || 1;

    if (quantityInCart < requiredQuantity) {
      allBuyProductsMet = false;
      break;
    }

    // Calculate how many complete sets customer qualifies for
    const setsFromThisProduct = Math.floor(quantityInCart / requiredQuantity);
    eligibleSets = Math.min(eligibleSets, setsFromThisProduct);
  }

  if (!allBuyProductsMet) {
    const missingProducts = buyProducts
      .filter((bp) => (cartQuantities[bp.productId.toString()] || 0) < (bp.quantity || 1))
      .map((bp) => `${bp.quantity} units of product ${bp.productId}`)
      .join(", ");

    return {
      eligible: false,
      freeProducts: [],
      totalFreeValue: 0,
      message: `Missing buy products: ${missingProducts}`,
    };
  }

  if (eligibleSets === Infinity || eligibleSets === 0) {
    eligibleSets = 1; // Default to 1 set if calculation fails
  }

  // Calculate free products
  const freeProducts = [];
  let totalFreeValue = 0;

  for (const getProduct of getProducts) {
    const productIdStr = getProduct.productId.toString();
    const freeQuantity = (getProduct.quantity || 1) * eligibleSets;
    const productPrice = productPrices[productIdStr] || 0;
    const isPromotionalGift = getProduct.isPromotionalGift || false;

    // For promotional gifts (PROCURED products), they're added to cart with ৳0 value
    // For regular products, apply discount percentage
    let discountPercentage = getProduct.discountPercentage || 100; // Default 100% = fully free

    // Promotional gifts are always 100% free (shown as ৳0 in cart)
    if (isPromotionalGift) {
      discountPercentage = 100;
    }

    const discountAmount = (productPrice * freeQuantity * discountPercentage) / 100;

    freeProducts.push({
      productId: getProduct.productId,
      quantity: freeQuantity,
      unitPrice: productPrice,
      discountPercentage,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      totalValue: productPrice * freeQuantity,
      isPromotionalGift, // Flag to mark as gift item in cart
      displayPrice: isPromotionalGift ? 0 : productPrice, // Show ৳0 for gifts
    });

    totalFreeValue += discountAmount;
  }

  return {
    eligible: true,
    eligibleSets,
    freeProducts,
    totalFreeValue: parseFloat(totalFreeValue.toFixed(2)),
    message: `Qualified for ${eligibleSets} set(s) of free products`,
  };
}

/**
 * Calculate BOGO (Buy One Get One - Same SKU)
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Array} selectedProducts - Product IDs this offer applies to
 * @param {Object} productPrices - Map of productId to price
 * @returns {Object} { eligible, bogoItems, totalDiscount, message }
 */
function calculateBOGO(cartItems, offerConfig, selectedProducts = [], productPrices = {}) {
  const { buyQuantity = 1, getQuantity = 1, discountPercentage = 100 } = offerConfig;

  // Filter cart items for applicable products
  const applicableItems =
    selectedProducts.length > 0
      ? cartItems.filter((item) => {
          const productIdStr = item.productId?.toString() || item.source_id?.toString();
          return selectedProducts.some((pid) => pid.toString() === productIdStr);
        })
      : cartItems;

  if (applicableItems.length === 0) {
    return {
      eligible: false,
      bogoItems: [],
      totalDiscount: 0,
      message: "No applicable products in cart",
    };
  }

  const bogoItems = [];
  let totalDiscount = 0;

  // Process each applicable product
  for (const item of applicableItems) {
    const productIdStr = item.productId?.toString() || item.source_id?.toString();
    const quantity = item.quantity || 0;
    const productPrice = productPrices[productIdStr] || item.price || item.unit_price || 0;

    // Calculate how many complete BOGO sets
    const requiredForSet = buyQuantity + getQuantity;
    const completeSets = Math.floor(quantity / requiredForSet);

    if (completeSets > 0) {
      // Calculate free quantity and discount
      const freeQuantity = completeSets * getQuantity;
      const discountAmount = (productPrice * freeQuantity * discountPercentage) / 100;

      bogoItems.push({
        productId: productIdStr,
        totalQuantity: quantity,
        buyQuantity: completeSets * buyQuantity,
        freeQuantity,
        unitPrice: productPrice,
        discountPercentage,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        completeSets,
      });

      totalDiscount += discountAmount;
    }
  }

  if (bogoItems.length === 0) {
    return {
      eligible: false,
      bogoItems: [],
      totalDiscount: 0,
      message: `Not enough quantity for BOGO (Need: Buy ${buyQuantity} Get ${getQuantity})`,
    };
  }

  return {
    eligible: true,
    bogoItems,
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    message:
      discountPercentage === 100
        ? `Buy ${buyQuantity} Get ${getQuantity} Free (${bogoItems.length} product(s))`
        : `Buy ${buyQuantity} Get ${getQuantity} at ${discountPercentage}% off (${bogoItems.length} product(s))`,
  };
}

/**
 * Calculate BUNDLE_OFFER (Buy bundle of products at special price)
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Object} productPrices - Map of productId to price
 * @returns {Object} { eligible, bundleDiscount, bundlePrice, message }
 */
function calculateBundleOffer(cartItems, offerConfig, productPrices = {}) {
  const { buyProducts = [], discountPercentage = 0, bundlePrice = 0 } = offerConfig;

  if (!buyProducts || buyProducts.length === 0) {
    return {
      eligible: false,
      bundleDiscount: 0,
      message: "No bundle products configured",
    };
  }

  // Build cart quantity map
  const cartQuantities = {};
  cartItems.forEach((item) => {
    const productIdStr = item.productId?.toString() || item.source_id?.toString();
    if (productIdStr) {
      cartQuantities[productIdStr] = (cartQuantities[productIdStr] || 0) + (item.quantity || 0);
    }
  });

  // Check if all bundle products are present
  let eligibleBundles = Infinity;
  let allBundleProductsPresent = true;
  let totalBundleValue = 0;

  for (const bundleProduct of buyProducts) {
    const productIdStr = bundleProduct.productId.toString();
    const quantityInCart = cartQuantities[productIdStr] || 0;
    const requiredQuantity = bundleProduct.quantity || 1;

    if (quantityInCart < requiredQuantity) {
      allBundleProductsPresent = false;
      break;
    }

    // Calculate how many complete bundles customer has
    const bundlesFromThisProduct = Math.floor(quantityInCart / requiredQuantity);
    eligibleBundles = Math.min(eligibleBundles, bundlesFromThisProduct);

    // Calculate total value of this product in bundle
    const productPrice = productPrices[productIdStr] || 0;
    totalBundleValue += productPrice * requiredQuantity;
  }

  if (!allBundleProductsPresent) {
    const missingProducts = buyProducts
      .filter((bp) => (cartQuantities[bp.productId.toString()] || 0) < (bp.quantity || 1))
      .map((bp) => `${bp.quantity} units of product ${bp.productId}`)
      .join(", ");

    return {
      eligible: false,
      bundleDiscount: 0,
      message: `Missing bundle products: ${missingProducts}`,
    };
  }

  if (eligibleBundles === Infinity || eligibleBundles === 0) {
    eligibleBundles = 1;
  }

  // Calculate discount based on configuration
  let discountPerBundle = 0;

  if (bundlePrice && bundlePrice > 0) {
    // Fixed bundle price specified
    discountPerBundle = Math.max(0, totalBundleValue - bundlePrice);
  } else if (discountPercentage && discountPercentage > 0) {
    // Percentage discount on bundle
    discountPerBundle = (totalBundleValue * discountPercentage) / 100;
  }

  const totalDiscount = discountPerBundle * eligibleBundles;

  return {
    eligible: true,
    eligibleBundles,
    bundleDiscount: parseFloat(totalDiscount.toFixed(2)),
    discountPerBundle: parseFloat(discountPerBundle.toFixed(2)),
    totalBundleValue: parseFloat(totalBundleValue.toFixed(2)),
    effectiveBundlePrice: parseFloat((totalBundleValue - discountPerBundle).toFixed(2)),
    message:
      bundlePrice > 0
        ? `${eligibleBundles} bundle(s) at ৳${bundlePrice} each (Save ৳${totalDiscount.toFixed(2)})`
        : `${eligibleBundles} bundle(s) with ${discountPercentage}% off (Save ৳${totalDiscount.toFixed(2)})`,
  };
}

/**
 * Main function to calculate offer discount based on offer type
 * @param {Object} offer - The offer object with type and config
 * @param {Array} cartItems - Array of cart items
 * @param {Object} productPrices - Map of productId to price (for BOGO_DIFFERENT_SKU)
 * @returns {Object} Calculation result
 */
function calculateOfferDiscount(offer, cartItems, productPrices = {}) {
  if (!offer || !offer.offer_type) {
    return {
      eligible: false,
      discount: 0,
      message: "Invalid offer",
    };
  }

  const { offer_type, config = {} } = offer;
  const selectedProducts = config.selectedProducts || [];

  switch (offer_type) {
    case "DISCOUNT_SLAB_PCT":
      return calculateDiscountSlabPct(cartItems, config, selectedProducts);

    case "DISCOUNT_SLAB_AMT":
      return calculateDiscountSlabAmt(cartItems, config, selectedProducts);

    case "FLAT_DISCOUNT_PCT":
      return calculateFlatDiscountPct(cartItems, config, selectedProducts);

    case "FLAT_DISCOUNT_AMT":
      return calculateFlatDiscountAmt(cartItems, config, selectedProducts);

    case "FREE_PRODUCT":
      return calculateFreeProduct(cartItems, config, productPrices);

    case "BUNDLE_OFFER":
      return calculateBundleOffer(cartItems, config, productPrices);

    case "BOGO":
      return calculateBOGO(cartItems, config, selectedProducts, productPrices);

    case "BOGO_DIFFERENT_SKU":
      return calculateBOGODifferentSKU(cartItems, config, productPrices);

    default:
      return {
        eligible: false,
        discount: 0,
        message: `Offer type ${offer_type} calculation not yet implemented`,
      };
  }
}

module.exports = {
  calculateDiscountSlabPct,
  calculateDiscountSlabAmt,
  calculateFlatDiscountPct,
  calculateFlatDiscountAmt,
  calculateFreeProduct,
  calculateBundleOffer,
  calculateBOGO,
  calculateOfferDiscount,
};
