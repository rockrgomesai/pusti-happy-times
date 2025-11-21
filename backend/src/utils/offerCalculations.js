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
 * Calculate SKU_DISCOUNT_AMOUNT offer (per-SKU unit-based discount with individual date ranges)
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Object} productPrices - Map of productId to price
 * @returns {Object} { eligible, discountedItems, totalDiscount, message }
 */
function calculateSkuDiscountAmount(cartItems, offerConfig, productPrices = {}) {
  const { skuDiscounts = [] } = offerConfig;

  if (!skuDiscounts || skuDiscounts.length === 0) {
    return {
      eligible: false,
      discountedItems: [],
      totalDiscount: 0,
      message: "No SKU discounts configured",
    };
  }

  const currentDate = new Date();
  const discountedItems = [];
  let totalDiscount = 0;
  let applicableSkusCount = 0;

  // Build cart quantity map
  const cartQuantities = {};
  cartItems.forEach((item) => {
    const productIdStr = item.productId?.toString() || item.source_id?.toString();
    if (productIdStr) {
      cartQuantities[productIdStr] = (cartQuantities[productIdStr] || 0) + (item.quantity || 0);
    }
  });

  // Process each SKU discount configuration
  for (const skuDiscount of skuDiscounts) {
    const productIdStr = skuDiscount.productId.toString();
    const quantityInCart = cartQuantities[productIdStr] || 0;

    // Skip if product not in cart
    if (quantityInCart === 0) {
      continue;
    }

    // Check if current date is within this SKU's valid date range
    const startDate = new Date(skuDiscount.startDate);
    const endDate = new Date(skuDiscount.endDate);

    if (currentDate < startDate || currentDate > endDate) {
      // SKU discount not active for current date
      continue;
    }

    // Calculate discount: unit-based (discount per unit × quantity)
    const discountPerUnit = skuDiscount.discountAmount || 0;
    const itemDiscount = discountPerUnit * quantityInCart;
    const productPrice = productPrices[productIdStr] || 0;

    discountedItems.push({
      productId: skuDiscount.productId,
      quantity: quantityInCart,
      discountPerUnit: parseFloat(discountPerUnit.toFixed(2)),
      totalDiscount: parseFloat(itemDiscount.toFixed(2)),
      unitPrice: productPrice,
      effectiveUnitPrice: Math.max(0, productPrice - discountPerUnit),
      validFrom: startDate,
      validUntil: endDate,
    });

    totalDiscount += itemDiscount;
    applicableSkusCount++;
  }

  if (discountedItems.length === 0) {
    return {
      eligible: false,
      discountedItems: [],
      totalDiscount: 0,
      message: "No applicable SKU discounts for items in cart or discounts not active",
    };
  }

  return {
    eligible: true,
    discountedItems,
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    applicableSkusCount,
    message: `${applicableSkusCount} SKU discount(s) applied, total savings: ৳${totalDiscount.toFixed(2)}`,
  };
}

/**
 * Calculate CASHBACK offer
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Array} selectedProducts - Array of product IDs
 * @returns {Object} Calculation result
 */
function calculateCashback(cartItems, offerConfig, selectedProducts = []) {
  const { cashbackPercentage, cashbackAmount, maxCashback, minOrderValue } = offerConfig;

  // Filter cart items for selected products (or all if none specified)
  const eligibleItems =
    selectedProducts.length > 0
      ? cartItems.filter((item) => selectedProducts.includes(item.productId || item.product_id))
      : cartItems;

  if (eligibleItems.length === 0) {
    return {
      eligible: false,
      discount: 0,
      cashback: 0,
      message: "No eligible products in cart for cashback offer",
    };
  }

  // Calculate total for eligible items
  const eligibleTotal = eligibleItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Check minimum order value
  if (minOrderValue && eligibleTotal < minOrderValue) {
    return {
      eligible: false,
      discount: 0,
      cashback: 0,
      message: `Minimum order value of ৳${minOrderValue} required. Current: ৳${eligibleTotal.toFixed(2)}`,
      remainingAmount: minOrderValue - eligibleTotal,
    };
  }

  // Calculate cashback
  let calculatedCashback = 0;
  if (cashbackPercentage !== undefined) {
    calculatedCashback = (eligibleTotal * cashbackPercentage) / 100;
  } else if (cashbackAmount !== undefined) {
    calculatedCashback = cashbackAmount;
  }

  // Apply maximum cashback cap
  if (maxCashback && calculatedCashback > maxCashback) {
    calculatedCashback = maxCashback;
  }

  return {
    eligible: true,
    discount: 0, // Cashback doesn't reduce order total immediately
    cashback: calculatedCashback,
    message: `You will receive ৳${calculatedCashback.toFixed(2)} cashback on this order!`,
    details: {
      eligibleAmount: eligibleTotal,
      cashbackRate: cashbackPercentage ? `${cashbackPercentage}%` : `৳${cashbackAmount}`,
      maxCashback,
    },
  };
}

/**
 * Calculate FLASH_SALE offer
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Array} selectedProducts - Array of product IDs
 * @param {Object} offerUsage - Current usage stats (optional)
 * @returns {Object} Calculation result
 */
function calculateFlashSale(cartItems, offerConfig, selectedProducts = [], offerUsage = {}) {
  const { discountPercentage, stockLimit, orderLimit, minOrderValue, maxDiscountAmount } =
    offerConfig;
  const { totalOrders = 0, totalQuantitySold = 0 } = offerUsage;

  // Check stock limit
  if (stockLimit && totalQuantitySold >= stockLimit) {
    return {
      eligible: false,
      discount: 0,
      message: "Flash sale stock has been exhausted",
      stockExhausted: true,
    };
  }

  // Check order limit per distributor
  if (orderLimit && totalOrders >= orderLimit) {
    return {
      eligible: false,
      discount: 0,
      message: `You have reached the maximum order limit (${orderLimit}) for this flash sale`,
      limitReached: true,
    };
  }

  // Filter cart items for selected products (or all if none specified)
  const eligibleItems =
    selectedProducts.length > 0
      ? cartItems.filter((item) => selectedProducts.includes(item.productId || item.product_id))
      : cartItems;

  if (eligibleItems.length === 0) {
    return {
      eligible: false,
      discount: 0,
      message: "No eligible products in cart for flash sale",
    };
  }

  // Calculate total for eligible items
  const eligibleTotal = eligibleItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Check minimum order value
  if (minOrderValue && eligibleTotal < minOrderValue) {
    return {
      eligible: false,
      discount: 0,
      message: `Minimum order value of ৳${minOrderValue} required for flash sale. Current: ৳${eligibleTotal.toFixed(2)}`,
      remainingAmount: minOrderValue - eligibleTotal,
    };
  }

  // Calculate discount
  let discount = (eligibleTotal * discountPercentage) / 100;

  // Apply maximum discount cap
  if (maxDiscountAmount && discount > maxDiscountAmount) {
    discount = maxDiscountAmount;
  }

  return {
    eligible: true,
    discount,
    message: `Flash Sale: ${discountPercentage}% off! You save ৳${discount.toFixed(2)}`,
    details: {
      eligibleAmount: eligibleTotal,
      discountPercentage,
      stockRemaining: stockLimit ? stockLimit - totalQuantitySold : "Unlimited",
      ordersRemaining: orderLimit ? orderLimit - totalOrders : "Unlimited",
    },
  };
}

/**
 * Calculate LOYALTY_POINTS offer
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Array} selectedProducts - Array of product IDs
 * @returns {Object} Calculation result
 */
function calculateLoyaltyPoints(cartItems, offerConfig, selectedProducts = []) {
  const { pointsPerUnit, pointsValue, minOrderValue } = offerConfig;

  if (!pointsPerUnit || !pointsValue) {
    return {
      eligible: false,
      discount: 0,
      points: 0,
      message: "Invalid loyalty points configuration",
    };
  }

  // Filter cart items for selected products (or all if none specified)
  const eligibleItems =
    selectedProducts.length > 0
      ? cartItems.filter((item) => selectedProducts.includes(item.productId || item.product_id))
      : cartItems;

  if (eligibleItems.length === 0) {
    return {
      eligible: false,
      discount: 0,
      points: 0,
      message: "No eligible products in cart for loyalty points",
    };
  }

  // Calculate total quantity and value
  const totalQuantity = eligibleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const eligibleTotal = eligibleItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Check minimum order value
  if (minOrderValue && eligibleTotal < minOrderValue) {
    return {
      eligible: false,
      discount: 0,
      points: 0,
      message: `Minimum order value of ৳${minOrderValue} required for loyalty points. Current: ৳${eligibleTotal.toFixed(2)}`,
      remainingAmount: minOrderValue - eligibleTotal,
    };
  }

  // Calculate points earned
  const pointsEarned = totalQuantity * pointsPerUnit;
  const pointsMonetaryValue = pointsEarned * pointsValue;

  return {
    eligible: true,
    discount: 0, // Points don't reduce current order total
    points: pointsEarned,
    pointsValue: pointsMonetaryValue,
    message: `You will earn ${pointsEarned.toFixed(0)} loyalty points (worth ৳${pointsMonetaryValue.toFixed(2)})!`,
    details: {
      totalUnits: totalQuantity,
      pointsPerUnit,
      pointsValue,
      eligibleAmount: eligibleTotal,
    },
  };
}

/**
 * Calculate VOLUME_DISCOUNT offer
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Array} selectedProducts - Array of product IDs
 * @returns {Object} Calculation result
 */
function calculateVolumeDiscount(cartItems, offerConfig, selectedProducts = []) {
  const { volumeTiers, applyToAllProducts } = offerConfig;

  if (!volumeTiers || volumeTiers.length === 0) {
    return {
      eligible: false,
      discount: 0,
      message: "No volume tiers configured",
    };
  }

  // Filter cart items for selected products (or all if applyToAllProducts is true)
  const eligibleItems =
    applyToAllProducts || selectedProducts.length === 0
      ? cartItems
      : cartItems.filter((item) => selectedProducts.includes(item.productId || item.product_id));

  if (eligibleItems.length === 0) {
    return {
      eligible: false,
      discount: 0,
      message: "No eligible products in cart for volume discount",
    };
  }

  // Calculate total quantity
  const totalQuantity = eligibleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Find applicable tier (highest tier where minQuantity is met)
  const sortedTiers = [...volumeTiers].sort((a, b) => b.minQuantity - a.minQuantity);
  const applicableTier = sortedTiers.find((tier) => totalQuantity >= tier.minQuantity);

  if (!applicableTier) {
    const lowestTier = [...volumeTiers].sort((a, b) => a.minQuantity - b.minQuantity)[0];
    return {
      eligible: false,
      discount: 0,
      message: `Buy ${lowestTier.minQuantity} or more units to unlock volume discount`,
      remainingQuantity: lowestTier.minQuantity - totalQuantity,
      nextTier: lowestTier,
    };
  }

  // Calculate discount based on tier type
  const eligibleTotal = eligibleItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  let discount = 0;
  if (applicableTier.discountPercentage !== undefined) {
    discount = (eligibleTotal * applicableTier.discountPercentage) / 100;
  } else if (applicableTier.discountAmount !== undefined) {
    discount = applicableTier.discountAmount;
  }

  // Apply maximum discount cap if specified
  if (applicableTier.maxDiscount && discount > applicableTier.maxDiscount) {
    discount = applicableTier.maxDiscount;
  }

  // Find next tier for upsell message
  const nextTier = sortedTiers.reverse().find((tier) => tier.minQuantity > totalQuantity);

  return {
    eligible: true,
    discount,
    message: `Volume Discount: ${totalQuantity} units qualify for ${applicableTier.discountPercentage || applicableTier.discountAmount}${applicableTier.discountPercentage ? "%" : "৳"} off!`,
    details: {
      totalQuantity,
      currentTier: applicableTier,
      nextTier: nextTier
        ? {
            minQuantity: nextTier.minQuantity,
            discount: nextTier.discountPercentage || nextTier.discountAmount,
            remaining: nextTier.minQuantity - totalQuantity,
          }
        : null,
      eligibleAmount: eligibleTotal,
    },
  };
}

/**
 * Calculate CROSS_CATEGORY offer
 * @param {Array} cartItems - Array of cart items with category information
 * @param {Object} offerConfig - Offer configuration
 * @returns {Object} Calculation result
 */
function calculateCrossCategory(cartItems, offerConfig) {
  const {
    triggerCategories,
    rewardCategories,
    minTriggerAmount,
    discountPercentage,
    discountAmount,
    maxDiscountAmount,
  } = offerConfig;

  if (
    !triggerCategories ||
    triggerCategories.length === 0 ||
    !rewardCategories ||
    rewardCategories.length === 0
  ) {
    return {
      eligible: false,
      discount: 0,
      message: "Invalid cross-category offer configuration",
    };
  }

  // Calculate trigger category total
  const triggerItems = cartItems.filter((item) =>
    triggerCategories.includes(item.categoryId || item.category_id)
  );

  const triggerTotal = triggerItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Check if trigger amount is met
  if (triggerTotal < minTriggerAmount) {
    return {
      eligible: false,
      discount: 0,
      message: `Spend ৳${minTriggerAmount} in trigger categories to unlock discount on reward categories`,
      remainingAmount: minTriggerAmount - triggerTotal,
      triggerTotal,
    };
  }

  // Calculate reward category total
  const rewardItems = cartItems.filter((item) =>
    rewardCategories.includes(item.categoryId || item.category_id)
  );

  if (rewardItems.length === 0) {
    return {
      eligible: true,
      discount: 0,
      message: "Trigger amount met! Add products from reward categories to get discount",
      triggerMet: true,
      rewardTotal: 0,
    };
  }

  const rewardTotal = rewardItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Calculate discount on reward categories
  let discount = 0;
  if (discountPercentage !== undefined) {
    discount = (rewardTotal * discountPercentage) / 100;
  } else if (discountAmount !== undefined) {
    discount = discountAmount;
  }

  // Apply maximum discount cap
  if (maxDiscountAmount && discount > maxDiscountAmount) {
    discount = maxDiscountAmount;
  }

  return {
    eligible: true,
    discount,
    message: `Cross-Category Discount: ${discountPercentage || discountAmount}${discountPercentage ? "%" : "৳"} off reward categories!`,
    details: {
      triggerTotal,
      rewardTotal,
      discountApplied: discount,
      triggerCategories,
      rewardCategories,
    },
  };
}

/**
 * Calculate FIRST_ORDER offer
 * @param {Array} cartItems - Array of cart items
 * @param {Object} offerConfig - Offer configuration
 * @param {Array} selectedProducts - Array of product IDs
 * @param {Boolean} isFirstOrder - Whether this is distributor's first order
 * @returns {Object} Calculation result
 */
function calculateFirstOrder(cartItems, offerConfig, selectedProducts = [], isFirstOrder = false) {
  const { discountPercentage, discountAmount, minOrderValue, maxDiscountAmount } = offerConfig;

  // Check if this is actually a first order
  if (!isFirstOrder) {
    return {
      eligible: false,
      discount: 0,
      message: "This offer is only valid for first-time orders",
    };
  }

  // Filter cart items for selected products (or all if none specified)
  const eligibleItems =
    selectedProducts.length > 0
      ? cartItems.filter((item) => selectedProducts.includes(item.productId || item.product_id))
      : cartItems;

  if (eligibleItems.length === 0) {
    return {
      eligible: false,
      discount: 0,
      message: "No eligible products in cart for first order discount",
    };
  }

  // Calculate total for eligible items
  const eligibleTotal = eligibleItems.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Check minimum order value
  if (minOrderValue && eligibleTotal < minOrderValue) {
    return {
      eligible: false,
      discount: 0,
      message: `Minimum order value of ৳${minOrderValue} required for first order discount. Current: ৳${eligibleTotal.toFixed(2)}`,
      remainingAmount: minOrderValue - eligibleTotal,
    };
  }

  // Calculate discount
  let discount = 0;
  if (discountPercentage !== undefined) {
    discount = (eligibleTotal * discountPercentage) / 100;
  } else if (discountAmount !== undefined) {
    discount = discountAmount;
  }

  // Apply maximum discount cap
  if (maxDiscountAmount && discount > maxDiscountAmount) {
    discount = maxDiscountAmount;
  }

  return {
    eligible: true,
    discount,
    message: `Welcome! First Order Discount: ${discountPercentage || discountAmount}${discountPercentage ? "%" : "৳"} off! You save ৳${discount.toFixed(2)}`,
    details: {
      eligibleAmount: eligibleTotal,
      isFirstOrder: true,
      discountApplied: discount,
    },
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

    case "SKU_DISCOUNT_AMOUNT":
      return calculateSkuDiscountAmount(cartItems, config, productPrices);

    case "CASHBACK":
      return calculateCashback(cartItems, config, selectedProducts);

    case "FLASH_SALE":
      return calculateFlashSale(cartItems, config, selectedProducts);

    case "LOYALTY_POINTS":
      return calculateLoyaltyPoints(cartItems, config, selectedProducts);

    case "VOLUME_DISCOUNT":
      return calculateVolumeDiscount(cartItems, config, selectedProducts);

    case "CROSS_CATEGORY":
      return calculateCrossCategory(cartItems, config);

    case "FIRST_ORDER":
      return calculateFirstOrder(cartItems, config, selectedProducts);

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
  calculateBOGODifferentSKU,
  calculateSkuDiscountAmount,
  calculateCashback,
  calculateFlashSale,
  calculateLoyaltyPoints,
  calculateVolumeDiscount,
  calculateCrossCategory,
  calculateFirstOrder,
  calculateOfferDiscount,
};
