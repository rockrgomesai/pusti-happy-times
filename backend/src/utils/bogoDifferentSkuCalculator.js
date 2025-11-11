/**
 * BOGO Different SKU Calculator
 * Handles Buy X Get Y (different products) offer logic
 */

/**
 * Calculate BOGO Different SKU rewards
 * @param {Array} cartItems - Array of cart items with productId and quantity
 * @param {Object} offerConfig - Offer configuration
 * @param {Array} offerConfig.qualifierProducts - Array of {productId, minQuantity}
 * @param {Array} offerConfig.rewardProducts - Array of {productId, freeQuantity, maxValueCap}
 * @param {String} offerConfig.qualifierLogic - "AND" or "OR"
 * @param {String} offerConfig.distributionMode - "all" or "choice"
 * @param {Boolean} offerConfig.allowRepetition - Allow multiple reward sets
 * @param {Number} offerConfig.maxRewardSets - Max number of reward sets
 * @param {Object} productPrices - Map of productId to price
 * @returns {Object} { eligible, rewardSets, rewards, message }
 */
function calculateBOGODifferentSKU(cartItems, offerConfig, productPrices) {
  const {
    qualifierProducts = [],
    rewardProducts = [],
    qualifierLogic = "AND",
    distributionMode = "all",
    allowRepetition = false,
    maxRewardSets = 1,
  } = offerConfig;

  // Validate inputs
  if (!qualifierProducts || qualifierProducts.length === 0) {
    return {
      eligible: false,
      rewardSets: 0,
      rewards: [],
      message: "No qualifier products defined",
    };
  }

  if (!rewardProducts || rewardProducts.length === 0) {
    return { eligible: false, rewardSets: 0, rewards: [], message: "No reward products defined" };
  }

  // Build cart quantity map
  const cartQuantities = {};
  cartItems.forEach((item) => {
    const productIdStr = item.productId?.toString() || item.source_id?.toString();
    if (productIdStr) {
      cartQuantities[productIdStr] = (cartQuantities[productIdStr] || 0) + (item.quantity || 0);
    }
  });

  // Check qualifier logic
  let qualifierSets = 0;

  if (qualifierLogic === "AND") {
    // All qualifiers must be met
    qualifierSets = Infinity;
    let allQualifiersMet = true;

    for (const qualifier of qualifierProducts) {
      const productIdStr = qualifier.productId.toString();
      const quantityInCart = cartQuantities[productIdStr] || 0;

      if (quantityInCart < qualifier.minQuantity) {
        allQualifiersMet = false;
        break;
      }

      // Calculate how many sets this qualifier allows
      const setsFromThisQualifier = Math.floor(quantityInCart / qualifier.minQuantity);
      qualifierSets = Math.min(qualifierSets, setsFromThisQualifier);
    }

    if (!allQualifiersMet) {
      const missingQualifiers = qualifierProducts
        .filter((q) => (cartQuantities[q.productId.toString()] || 0) < q.minQuantity)
        .map((q) => `${q.minQuantity} units of product ${q.productId}`)
        .join(", ");

      return {
        eligible: false,
        rewardSets: 0,
        rewards: [],
        message: `Missing qualifiers: ${missingQualifiers}`,
      };
    }

    if (qualifierSets === Infinity) qualifierSets = 0;
  } else {
    // OR logic - any qualifier met
    let anyQualifierMet = false;

    for (const qualifier of qualifierProducts) {
      const productIdStr = qualifier.productId.toString();
      const quantityInCart = cartQuantities[productIdStr] || 0;

      if (quantityInCart >= qualifier.minQuantity) {
        anyQualifierMet = true;
        const setsFromThisQualifier = Math.floor(quantityInCart / qualifier.minQuantity);
        qualifierSets += setsFromThisQualifier;
      }
    }

    if (!anyQualifierMet) {
      return {
        eligible: false,
        rewardSets: 0,
        rewards: [],
        message: "No qualifiers met (OR logic)",
      };
    }
  }

  // Apply repetition and max sets limits
  if (!allowRepetition) {
    qualifierSets = Math.min(qualifierSets, 1);
  }

  if (maxRewardSets && qualifierSets > maxRewardSets) {
    qualifierSets = maxRewardSets;
  }

  if (qualifierSets === 0) {
    return { eligible: false, rewardSets: 0, rewards: [], message: "No complete qualifier sets" };
  }

  // Calculate rewards
  const rewards = [];

  if (distributionMode === "all") {
    // All reward products given
    for (const reward of rewardProducts) {
      const productIdStr = reward.productId.toString();
      const totalFreeQty = reward.freeQuantity * qualifierSets;
      const productPrice = productPrices[productIdStr] || 0;

      // Apply value cap if specified
      let cappedQty = totalFreeQty;
      if (reward.maxValueCap && reward.maxValueCap > 0) {
        const maxQtyByValue = Math.floor(reward.maxValueCap / productPrice);
        cappedQty = Math.min(totalFreeQty, maxQtyByValue * qualifierSets);
      }

      rewards.push({
        productId: reward.productId,
        quantity: cappedQty,
        originalQuantity: totalFreeQty,
        unitPrice: productPrice,
        totalValue: cappedQty * productPrice,
        capped: cappedQty < totalFreeQty,
      });
    }
  } else {
    // Choice mode - distributor selects one reward product
    // Return all options, frontend will let user choose
    for (const reward of rewardProducts) {
      const productIdStr = reward.productId.toString();
      const totalFreeQty = reward.freeQuantity * qualifierSets;
      const productPrice = productPrices[productIdStr] || 0;

      let cappedQty = totalFreeQty;
      if (reward.maxValueCap && reward.maxValueCap > 0) {
        const maxQtyByValue = Math.floor(reward.maxValueCap / productPrice);
        cappedQty = Math.min(totalFreeQty, maxQtyByValue * qualifierSets);
      }

      rewards.push({
        productId: reward.productId,
        quantity: cappedQty,
        originalQuantity: totalFreeQty,
        unitPrice: productPrice,
        totalValue: cappedQty * productPrice,
        capped: cappedQty < totalFreeQty,
        selectable: true, // Indicates user must choose
      });
    }
  }

  return {
    eligible: true,
    rewardSets: qualifierSets,
    rewards,
    message: `Qualified for ${qualifierSets} reward set(s)`,
    distributionMode,
  };
}

/**
 * Validate BOGO Different SKU configuration
 * @param {Object} offerConfig - Offer configuration
 * @param {Object} productPrices - Map of productId to price
 * @returns {Object} { valid, errors }
 */
function validateBOGODifferentSKUConfig(offerConfig, productPrices) {
  const errors = [];

  if (!offerConfig.qualifierProducts || offerConfig.qualifierProducts.length === 0) {
    errors.push("At least one qualifier product is required");
  }

  if (!offerConfig.rewardProducts || offerConfig.rewardProducts.length === 0) {
    errors.push("At least one reward product is required");
  }

  // Validate that reward value cap is >= cheapest reward price
  if (offerConfig.rewardProducts && offerConfig.rewardProducts.length > 0) {
    for (const reward of offerConfig.rewardProducts) {
      const productIdStr = reward.productId.toString();
      const productPrice = productPrices[productIdStr] || 0;

      if (reward.maxValueCap && reward.maxValueCap > 0 && reward.maxValueCap < productPrice) {
        errors.push(
          `Reward product ${productIdStr}: value cap (${reward.maxValueCap}) is less than product price (${productPrice})`
        );
      }
    }
  }

  // Validate qualifier logic
  if (offerConfig.qualifierLogic && !["AND", "OR"].includes(offerConfig.qualifierLogic)) {
    errors.push("Qualifier logic must be either AND or OR");
  }

  // Validate distribution mode
  if (offerConfig.distributionMode && !["all", "choice"].includes(offerConfig.distributionMode)) {
    errors.push("Distribution mode must be either 'all' or 'choice'");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  calculateBOGODifferentSKU,
  validateBOGODifferentSKUConfig,
};
