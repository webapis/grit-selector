/**
 * Identifies product price patterns including discounts, sales, and special offers
 * @param {HTMLElement|Array<HTMLElement>} productContainers - Product container element(s)
 * @param {Object} options - Configuration options
 * @returns {Object} Price pattern analysis results
 */
function identifyProductPricePattern(productContainers, options = {}) {
  const config = {
    // Currency patterns to detect
    currencies: ['TL', 'USD', 'EUR', 'GBP', '₺', '$', '€', '£'],
    
    // Minimum confidence score
    minConfidence: 0.5,
    
    // Common price class patterns
    priceClasses: [
      'price', 'cost', 'amount', 'value', 'sale', 'discount', 
      'original', 'regular', 'special', 'offer', 'deal'
    ],
    
    // Sample size for pattern analysis
    sampleSize: 10,
    
    // Include strikethrough prices (old prices)
    includeStrikethrough: true,
    
    ...options
  };

  // Normalize input to array
  const containers = Array.isArray(productContainers) 
    ? productContainers 
    : [productContainers];

  const allPriceCandidates = [];

  /**
   * Extract numeric price from text
   */
  function extractPrice(text) {
    if (!text) return null;
    
    // Remove whitespace and normalize
    const normalized = text.trim().replace(/\s+/g, ' ');
    
    // Price patterns for different formats
    const patterns = [
      // 999.99 TL, 999,99 TL
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(TL|₺|USD|EUR|GBP|\$|€|£)/i,
      // $999.99, €999,99
      /(TL|₺|USD|EUR|GBP|\$|€|£)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
      // Just numbers: 999.99 or 999,99
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        let priceStr = match[1];
        let currency = match[2] || '';
        
        // If currency is in first group (prefix format)
        if (config.currencies.includes(match[1])) {
          currency = match[1];
          priceStr = match[2];
        }

        // Normalize price string
        // Replace , with . for decimal if it's the last separator
        const lastComma = priceStr.lastIndexOf(',');
        const lastDot = priceStr.lastIndexOf('.');
        
        if (lastComma > lastDot) {
          // European format: 1.999,99 -> 1999.99
          priceStr = priceStr.replace(/\./g, '').replace(',', '.');
        } else {
          // US format: 1,999.99 -> 1999.99
          priceStr = priceStr.replace(/,/g, '');
        }

        const numericValue = parseFloat(priceStr);
        
        if (!isNaN(numericValue) && numericValue > 0) {
          return {
            value: numericValue,
            currency: currency,
            originalText: match[0],
            formatted: `${numericValue.toFixed(2)} ${currency}`.trim()
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Determine price type based on styling and context
   */
  function determinePriceType(element) {
    const classList = (element.className || '').toLowerCase();
    const computedStyle = window.getComputedStyle(element);
    const text = element.textContent.toLowerCase();
    
    const indicators = {
      isDiscount: false,
      isOriginal: false,
      isSale: false,
      isCurrent: false,
      isSpecialOffer: false,
      confidence: 0
    };

    // Check for strikethrough (old/original price)
    const textDecoration = computedStyle.textDecoration;
    if (textDecoration.includes('line-through')) {
      indicators.isOriginal = true;
      indicators.confidence += 0.3;
    }

    // Check classes for price type
    if (classList.includes('discount') || classList.includes('sale') || 
        classList.includes('special') || classList.includes('offer')) {
      indicators.isDiscount = true;
      indicators.isSale = true;
      indicators.confidence += 0.3;
    }

    if (classList.includes('original') || classList.includes('regular') || 
        classList.includes('old') || classList.includes('was') ||
        classList.includes('lined')) {
      indicators.isOriginal = true;
      indicators.confidence += 0.3;
    }

    if (classList.includes('current') || classList.includes('final') || 
        classList.includes('now') || classList.includes('base')) {
      indicators.isCurrent = true;
      indicators.confidence += 0.2;
    }

    if (classList.includes('campaign') || classList.includes('campaing')) {
      indicators.isSpecialOffer = true;
      indicators.confidence += 0.2;
    }

    // Check text content for keywords
    if (text.includes('sepette') || text.includes('cart') || 
        text.includes('indirim') || text.includes('discount')) {
      indicators.isDiscount = true;
      indicators.isSpecialOffer = true;
      indicators.confidence += 0.2;
    }

    // Check color (red often means discount)
    const color = computedStyle.color;
    const rgb = color.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const [r, g, b] = rgb.map(Number);
      // Reddish color
      if (r > 150 && r > g * 1.5 && r > b * 1.5) {
        indicators.isDiscount = true;
        indicators.confidence += 0.1;
      }
    }

    // Check font size (larger often means current price)
    const fontSize = parseFloat(computedStyle.fontSize);
    const parentFontSize = parseFloat(window.getComputedStyle(element.parentElement).fontSize);
    if (fontSize > parentFontSize * 1.2) {
      indicators.isCurrent = true;
      indicators.confidence += 0.1;
    }

    return indicators;
  }

  /**
   * Calculate confidence score for a price candidate
   */
  function calculatePriceConfidence(element, container, priceData) {
    let score = 0;
    let maxScore = 0;
    const features = {};

    // 1. Has valid price value (weight: 30)
    maxScore += 30;
    if (priceData) {
      score += 25;
      features.hasValidPrice = true;
      
      if (priceData.currency) {
        score += 5;
        features.hasCurrency = true;
      }
    }

    // 2. Class/ID patterns (weight: 20)
    maxScore += 20;
    const classList = (element.className || '').toLowerCase();
    const idAttr = (element.id || '').toLowerCase();
    
    let hasMatchingClass = false;
    config.priceClasses.forEach(pattern => {
      if (classList.includes(pattern) || idAttr.includes(pattern)) {
        score += 15;
        hasMatchingClass = true;
        features.hasPriceClass = true;
        features.matchedClass = pattern;
      }
    });

    if (!hasMatchingClass && classList.length > 0) {
      score += 5; // Some class is better than none
    }

    // 3. Position in container (weight: 15)
    maxScore += 15;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Prices typically in lower half of product cards
    const relativePosition = (elementRect.top - containerRect.top) / containerRect.height;
    if (relativePosition >= 0.4 && relativePosition <= 0.9) {
      score += 10;
      features.isInPriceArea = true;
      
      if (relativePosition >= 0.6) {
        score += 5;
        features.isInBottomArea = true;
      }
    }

    // 4. Element structure (weight: 15)
    maxScore += 15;
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'span' || tagName === 'div') {
      score += 10;
      features.isAppropriateTag = true;
    }

    // Check parent structure
    const parent = element.parentElement;
    if (parent) {
      const parentClass = (parent.className || '').toLowerCase();
      if (parentClass.includes('price') || parentClass.includes('cost')) {
        score += 5;
        features.hasPriceParent = true;
      }
    }

    // 5. Price type indicators (weight: 15)
    maxScore += 15;
    const priceType = determinePriceType(element);
    score += priceType.confidence * 15;
    features.priceType = priceType;

    // 6. Text isolation (weight: 5)
    maxScore += 5;
    const textContent = element.textContent.trim();
    const textWithoutPrice = textContent.replace(priceData?.originalText || '', '').trim();
    
    // Price should be relatively isolated (not mixed with lots of other text)
    if (textWithoutPrice.length < 20) {
      score += 5;
      features.isIsolated = true;
    }

    // Normalize score
    const normalizedScore = maxScore > 0 ? score / maxScore : 0;

    return {
      score: normalizedScore,
      features,
      priceType: priceType,
      rawScore: score,
      maxScore
    };
  }

  /**
   * Find all price candidates in a container
   */
  function findPriceCandidates(container) {
    const candidates = [];
    
    // Strategy 1: Elements with price-related classes
    config.priceClasses.forEach(priceClass => {
      container.querySelectorAll(`[class*="${priceClass}"]`).forEach(el => {
        const priceData = extractPrice(el.textContent);
        if (priceData) {
          const analysis = calculatePriceConfidence(el, container, priceData);
          candidates.push({
            element: el,
            price: priceData,
            ...analysis,
            selector: generateDetailedSelector(el, container)
          });
        }
      });
    });

    // Strategy 2: Elements with currency symbols
    config.currencies.forEach(currency => {
      const elements = Array.from(container.querySelectorAll('*')).filter(el => {
        const text = el.textContent;
        return text.includes(currency) && 
               !el.querySelector('*')?.textContent.includes(currency); // Avoid duplicates
      });

      elements.forEach(el => {
        const priceData = extractPrice(el.textContent);
        if (priceData && !candidates.find(c => c.element === el)) {
          const analysis = calculatePriceConfidence(el, container, priceData);
          candidates.push({
            element: el,
            price: priceData,
            ...analysis,
            selector: generateDetailedSelector(el, container)
          });
        }
      });
    });

    // Strategy 3: Elements with strikethrough (old prices)
    if (config.includeStrikethrough) {
      container.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.textDecoration.includes('line-through')) {
          const priceData = extractPrice(el.textContent);
          if (priceData && !candidates.find(c => c.element === el)) {
            const analysis = calculatePriceConfidence(el, container, priceData);
            candidates.push({
              element: el,
              price: priceData,
              ...analysis,
              selector: generateDetailedSelector(el, container)
            });
          }
        }
      });
    }

    // Remove duplicates and filter by confidence
    const unique = candidates.filter((candidate, index, self) =>
      index === self.findIndex(c => c.element === candidate.element)
    );

    return unique.filter(c => c.score >= config.minConfidence);
  }

  /**
   * Group prices by type (current, original, discount)
   */
  function groupPricesByType(candidates) {
    return {
      currentPrice: candidates.find(c => 
        c.priceType.isCurrent || 
        (!c.priceType.isOriginal && c.score === Math.max(...candidates.map(x => x.score)))
      ),
      originalPrice: candidates.find(c => 
        c.priceType.isOriginal || 
        c.features.priceType.isOriginal
      ),
      discountPrice: candidates.find(c => 
        c.priceType.isDiscount || 
        c.priceType.isSale
      ),
      specialOffer: candidates.find(c => 
        c.priceType.isSpecialOffer
      ),
      allPrices: candidates.sort((a, b) => b.score - a.score)
    };
  }

  /**
   * Generate detailed selector
   */
  function generateDetailedSelector(element, container) {
    const path = [];
    let current = element;
    
    while (current && current !== container && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className) {
        const classes = current.className.trim().split(/\s+/)
          .filter(c => c.length > 0)
          .slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      if (path.length >= 4) break;
    }
    
    return path.join(' > ');
  }

  /**
   * Calculate discount percentage
   */
  function calculateDiscount(originalPrice, currentPrice) {
    if (!originalPrice || !currentPrice) return null;
    
    const discount = ((originalPrice - currentPrice) / originalPrice) * 100;
    return {
      percentage: Math.round(discount),
      amount: originalPrice - currentPrice,
      formatted: `${Math.round(discount)}% off`
    };
  }

  /**
   * Analyze pattern consistency
   */
  function analyzePricePatterns(allCandidates) {
    const patterns = {};
    
    allCandidates.forEach(candidate => {
      const priceType = candidate.priceType.isOriginal ? 'original' :
                       candidate.priceType.isDiscount ? 'discount' :
                       candidate.priceType.isCurrent ? 'current' : 'unknown';
      
      const pattern = {
        type: priceType,
        selector: candidate.selector.split(' > ').slice(-2).join(' > '),
        hasStrikethrough: candidate.priceType.isOriginal,
        hasSpecialClass: candidate.features.hasPriceClass
      };
      
      const key = JSON.stringify(pattern);
      if (!patterns[key]) {
        patterns[key] = {
          pattern,
          count: 0,
          avgConfidence: 0,
          avgValue: 0,
          examples: []
        };
      }
      
      patterns[key].count++;
      patterns[key].avgConfidence += candidate.score;
      patterns[key].avgValue += candidate.price.value;
      patterns[key].examples.push({
        price: candidate.price.formatted,
        confidence: candidate.score,
        selector: candidate.selector
      });
    });

    Object.values(patterns).forEach(p => {
      p.avgConfidence /= p.count;
      p.avgValue /= p.count;
      p.examples = p.examples.slice(0, 3);
    });

    return patterns;
  }

  // Main analysis
  const sampleContainers = containers.slice(0, config.sampleSize);
  const allResults = [];
  
  sampleContainers.forEach(container => {
    const candidates = findPriceCandidates(container);
    const grouped = groupPricesByType(candidates);
    
    // Calculate discount if both prices exist
    let discount = null;
    if (grouped.originalPrice && grouped.currentPrice) {
      discount = calculateDiscount(
        grouped.originalPrice.price.value,
        grouped.currentPrice.price.value
      );
    } else if (grouped.originalPrice && grouped.discountPrice) {
      discount = calculateDiscount(
        grouped.originalPrice.price.value,
        grouped.discountPrice.price.value
      );
    }
    
    allResults.push({
      container,
      ...grouped,
      discount,
      hasDiscount: !!discount,
      priceCount: candidates.length
    });
    
    allCandidates.push(...candidates);
  });

  // Analyze patterns
  const patterns = analyzePricePatterns(allCandidates);
  const patternArray = Object.entries(patterns)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => {
      const scoreA = a.count * a.avgConfidence;
      const scoreB = b.count * b.avgConfidence;
      return scoreB - scoreA;
    });

  // Find best patterns by type
  const currentPricePattern = patternArray.find(p => p.pattern.type === 'current' || p.pattern.type === 'discount');
  const originalPricePattern = patternArray.find(p => p.pattern.type === 'original');

  return {
    pricePatterns: {
      current: currentPricePattern || null,
      original: originalPricePattern || null,
      all: patternArray
    },
    extractedPrices: allResults,
    statistics: {
      totalContainersAnalyzed: sampleContainers.length,
      totalPricesFound: allCandidates.length,
      avgPricesPerContainer: allCandidates.length / sampleContainers.length,
      containersWithDiscount: allResults.filter(r => r.hasDiscount).length,
      discountPercentage: allResults.filter(r => r.hasDiscount).length / allResults.length,
      avgDiscountPercent: allResults
        .filter(r => r.discount)
        .reduce((sum, r) => sum + r.discount.percentage, 0) / 
        allResults.filter(r => r.discount).length || 0,
      priceRange: {
        min: Math.min(...allCandidates.map(c => c.price.value)),
        max: Math.max(...allCandidates.map(c => c.price.value)),
        avg: allCandidates.reduce((sum, c) => sum + c.price.value, 0) / allCandidates.length
      }
    }
  };
}

/**
 * Extract prices from containers using identified patterns
 */
function extractPrices(productContainers, patterns) {
  const containers = Array.isArray(productContainers) 
    ? productContainers 
    : [productContainers];
  
  return containers.map(container => {
    const result = {
      container,
      currentPrice: null,
      originalPrice: null,
      discount: null,
      currency: null
    };
    
    // Extract current price
    if (patterns.current) {
      const currentEl = container.querySelector(patterns.current.examples[0]?.selector);
      if (currentEl) {
        const priceData = extractPrice(currentEl.textContent);
        if (priceData) {
          result.currentPrice = priceData.value;
          result.currency = priceData.currency;
        }
      }
    }
    
    // Extract original price
    if (patterns.original) {
      const originalEl = container.querySelector(patterns.original.examples[0]?.selector);
      if (originalEl) {
        const priceData = extractPrice(originalEl.textContent);
        if (priceData) {
          result.originalPrice = priceData.value;
          if (!result.currency) {
            result.currency = priceData.currency;
          }
        }
      }
    }
    
    // Calculate discount
    if (result.originalPrice && result.currentPrice) {
      const discountPercent = ((result.originalPrice - result.currentPrice) / result.originalPrice) * 100;
      result.discount = {
        percentage: Math.round(discountPercent),
        amount: result.originalPrice - result.currentPrice
      };
    }
    
    return result;
  });
  
  function extractPrice(text) {
    if (!text) return null;
    const normalized = text.trim().replace(/\s+/g, ' ');
    const patterns = [
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(TL|₺|USD|EUR|GBP|\$|€|£)/i,
      /(TL|₺|USD|EUR|GBP|\$|€|£)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/
    ];
    
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        let priceStr = match[1];
        let currency = match[2] || '';
        
        if (['TL', '₺', 'USD', 'EUR', 'GBP', '$', '€', '£'].includes(match[1])) {
          currency = match[1];
          priceStr = match[2];
        }
        
        const lastComma = priceStr.lastIndexOf(',');
        const lastDot = priceStr.lastIndexOf('.');
        
        if (lastComma > lastDot) {
          priceStr = priceStr.replace(/\./g, '').replace(',', '.');
        } else {
          priceStr = priceStr.replace(/,/g, '');
        }
        
        const numericValue = parseFloat(priceStr);
        if (!isNaN(numericValue) && numericValue > 0) {
          return { value: numericValue, currency: currency };
        }
      }
    }
    return null;
  }
}

// Example usage:
/*
const result = identifyProductPricePattern(productContainers);
console.log('Current price pattern:', result.pricePatterns.current);
console.log('Original price pattern:', result.pricePatterns.original);
console.log('Discount statistics:', result.statistics);

const prices = extractPrices(productContainers, result.pricePatterns);
prices.forEach(p => {
  console.log('Current:', p.currentPrice, p.currency);
  console.log('Original:', p.originalPrice, p.currency);
  console.log('Discount:', p.discount?.percentage + '%');
});
*/

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    identifyProductPricePattern,
    extractPrices
  };
}