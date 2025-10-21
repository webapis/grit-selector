/**
 * Identifies product container elements based on multiple characteristics
 * @param {Object} options - Configuration options
 * @returns {Array<Object>} Array of identified product elements with confidence scores
 */
function identifyProductContainers(options = {}) {
  const config = {
    // CSS selector patterns
    knownSelectors: ['.product-card', '.product-item', '.product', '[data-product]'],
    
    // Minimum confidence score (0-1)
    minConfidence: 0.6,
    
    // Structure patterns
    minChildElements: 3,
    maxDepth: 10,
    
    // Element characteristics
    imageRequired: true,
    priceRequired: true,
    titleRequired: true,
    
    ...options
  };

  const results = [];

  /**
   * Calculate confidence score for an element
   */
  function calculateConfidence(element) {
    let score = 0;
    let maxScore = 0;
    const characteristics = {};

    // 1. CSS Class/ID patterns (weight: 20)
    maxScore += 20;
    const classList = (typeof element.className === 'string') ? element.className.toLowerCase() : '';
    const idAttr = (element.id || '').toLowerCase();
    
    if (classList.includes('product')) {
      score += 15;
      characteristics.hasProductClass = true;
    }
    if (classList.includes('item') || classList.includes('card')) {
      score += 5;
      characteristics.hasContainerClass = true;
    }
    if (idAttr.includes('product')) {
      score += 10;
    }

    // 2. Data attributes (weight: 15)
    maxScore += 15;
    const dataAttrs = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => attr.name.toLowerCase());
    
    if (dataAttrs.some(attr => attr.includes('product'))) {
      score += 10;
      characteristics.hasProductDataAttr = true;
    }
    if (dataAttrs.some(attr => attr.includes('id') || attr.includes('code'))) {
      score += 5;
      characteristics.hasIdDataAttr = true;
    }

    // 3. Image presence (weight: 20)
    maxScore += 20;
    const images = element.querySelectorAll('img');
    if (images.length > 0) {
      score += 15;
      characteristics.hasImage = true;
      
      // Bonus for product-specific image attributes
      const hasProductImage = Array.from(images).some(img => {
        const alt = (img.alt || '').toLowerCase();
        const src = (img.src || '').toLowerCase();
        return alt.length > 0 || src.includes('product');
      });
      if (hasProductImage) {
        score += 5;
        characteristics.hasProductImage = true;
      }
    }

    // 4. Price pattern (weight: 20)
    maxScore += 20;
    const text = element.textContent;
    const pricePatterns = [
      /\$\s*\d+(?:\.\d{2})?/,  // $99.99
      /\d+(?:\.\d{2})?\s*TL/,   // 99.99 TL
      /\d+(?:\.\d{2})?\s*EUR/,  // 99.99 EUR
      /\d+(?:\.\d{2})?\s*USD/,  // 99.99 USD
      /\d+(?:,\d{3})*(?:\.\d{2})?/  // 1,999.99
    ];
    
    const hasPrice = pricePatterns.some(pattern => pattern.test(text));
    if (hasPrice) {
      score += 15;
      characteristics.hasPrice = true;
      
      // Check for price-specific classes
      const hasPriceElement = element.querySelector('[class*="price"], [class*="cost"]');
      if (hasPriceElement) {
        score += 5;
        characteristics.hasPriceElement = true;
      }
    }

    // 5. Title/Name pattern (weight: 15)
    maxScore += 15;
    const titles = element.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="name"]');
    if (titles.length > 0) {
      score += 10;
      characteristics.hasTitle = true;
      
      // Check if title has actual content
      const hasContent = Array.from(titles).some(t => t.textContent.trim().length > 3);
      if (hasContent) {
        score += 5;
        characteristics.hasTitleContent = true;
      }
    }

    // 6. Links to product page (weight: 10)
    maxScore += 10;
    const links = element.querySelectorAll('a[href]');
    if (links.length > 0) {
      score += 5;
      characteristics.hasLinks = true;
      
      const hasProductLink = Array.from(links).some(link => {
        const href = link.href.toLowerCase();
        return href.includes('product') || href.includes('item') || href.includes('/p/');
      });
      if (hasProductLink) {
        score += 5;
        characteristics.hasProductLink = true;
      }
    }

    // 7. Structural characteristics (weight: 10)
    maxScore += 10;
    const childCount = element.children.length;
    if (childCount >= config.minChildElements && childCount <= 20) {
      score += 5;
      characteristics.hasAppropriateStructure = true;
    }
    
    // Check for common product elements
    const hasRating = element.querySelector('[class*="rating"], [class*="star"], [class*="review"]');
    const hasButton = element.querySelector('button, [class*="cart"], [class*="buy"]');
    if (hasRating || hasButton) {
      score += 5;
      characteristics.hasInteractiveElements = true;
    }

    // 8. Dimensional characteristics (weight: 10)
    maxScore += 10;
    const rect = element.getBoundingClientRect();
    const hasReasonableSize = rect.width > 100 && rect.width < 800 && 
                              rect.height > 100 && rect.height < 1000;
    if (hasReasonableSize) {
      score += 10;
      characteristics.hasReasonableDimensions = true;
    }

    // Normalize score to 0-1 range
    const normalizedScore = maxScore > 0 ? score / maxScore : 0;

    return {
      score: normalizedScore,
      characteristics,
      rawScore: score,
      maxScore
    };
  }

  /**
   * Check if element is likely a container of multiple products
   */
  function isProductListContainer(element) {
    const potentialProducts = Array.from(element.children).filter(child => {
      const confidence = calculateConfidence(child);
      return confidence.score >= config.minConfidence;
    });
    
    return potentialProducts.length >= 2;
  }

  /**
   * Get positioning information
   */
  function getPositionInfo(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2
    };
  }

  /**
   * Analyze grid/list layout pattern
   */
  function analyzeLayout(elements) {
    if (elements.length < 2) return null;

    const positions = elements.map(el => getPositionInfo(el));
    
    // Check for grid layout (similar vertical positions)
    const rows = {};
    positions.forEach((pos, idx) => {
      const rowKey = Math.round(pos.top / 50) * 50; // Group by ~50px rows
      if (!rows[rowKey]) rows[rowKey] = [];
      rows[rowKey].push({ pos, element: elements[idx] });
    });

    const isGrid = Object.keys(rows).length > 1 && 
                   Object.values(rows).some(row => row.length > 1);

    // Check for list layout (similar horizontal positions)
    const columns = {};
    positions.forEach((pos, idx) => {
      const colKey = Math.round(pos.left / 50) * 50;
      if (!columns[colKey]) columns[colKey] = [];
      columns[colKey].push({ pos, element: elements[idx] });
    });

    const isList = Object.keys(columns).length === 1 && positions.length > 1;

    return {
      isGrid,
      isList,
      rowCount: Object.keys(rows).length,
      columnCount: Object.keys(columns).length,
      itemCount: elements.length
    };
  }

  // Main identification logic
  
  // 1. Try known selectors first
  const candidateElements = new Set();
  
  config.knownSelectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => candidateElements.add(el));
    } catch (e) {
      console.warn(`Invalid selector: ${selector}`);
    }
  });

  // 2. Scan DOM for potential product containers
  const allElements = document.querySelectorAll('div, article, li, section');
  allElements.forEach(el => {
    const confidence = calculateConfidence(el);
    if (confidence.score >= config.minConfidence) {
      candidateElements.add(el);
    }
  });

  // 3. Evaluate each candidate
  candidateElements.forEach(element => {
    const confidence = calculateConfidence(element);
    
    if (confidence.score >= config.minConfidence) {
      results.push({
        element,
        confidence: confidence.score,
        characteristics: confidence.characteristics,
        position: getPositionInfo(element),
        selector: generateSelector(element),
        isContainer: isProductListContainer(element)
      });
    }
  });

  // 4. Evaluate each candidate again to extract specific attribute selectors
  //    This is done in a separate pass to ensure 'isContainer' is determined first.
  const finalResults = [];
  candidateElements.forEach(element => {
    const confidence = calculateConfidence(element);

    if (confidence.score >= config.minConfidence) {
      const productAttributes = {};

      // Only try to find attributes if it's likely an individual product, not a list container
      // We use the previously calculated 'isProductListContainer' for this element
      const isCurrentElementAContainer = isProductListContainer(element);

      if (!isCurrentElementAContainer) {
        // --- Extract Title Selector ---
        const titleCandidates = element.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="name"]');
        let bestTitleElement = null;
        let bestTitleScore = 0;
        titleCandidates.forEach(el => {
          const textContent = el.textContent.trim();
          if (textContent.length > 5 && textContent.length < 150) { // Basic check for meaningful title length
            let score = 0;
            if (el.tagName.toLowerCase() === 'h1') score += 3;
            else if (el.tagName.toLowerCase() === 'h2') score += 2;
            else if (el.tagName.toLowerCase() === 'h3') score += 1;
            if (el.className.includes('title') || el.className.includes('name')) score += 1;
            if (score > bestTitleScore) {
              bestTitleScore = score;
              bestTitleElement = el;
            }
          }
        });
        if (bestTitleElement) {
          productAttributes.titleSelector = generateSelector(bestTitleElement);
        }

        // --- Extract Price Selector ---
        const priceCandidates = element.querySelectorAll('[class*="price"], [class*="cost"], span, div');
        let bestPriceElement = null;
        let bestPriceScore = 0;
        const priceRegex = /\$\s*\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*TL|\d+(?:\.\d{2})?\s*EUR|\d+(?:\.\d{2})?\s*USD|\d+(?:,\d{3})*(?:\.\d{2})?/;
        priceCandidates.forEach(el => {
          const textContent = el.textContent.trim();
          if (priceRegex.test(textContent)) {
            let score = 0;
            if (el.className.includes('price') || el.className.includes('cost')) score += 2;
            if (el.tagName.toLowerCase() === 'span' || el.tagName.toLowerCase() === 'div') score += 1; // Common price containers
            if (score > bestPriceScore) {
              bestPriceScore = score;
              bestPriceElement = el;
            }
          }
        });
        if (bestPriceElement) {
          productAttributes.priceSelector = generateSelector(bestPriceElement);
        }

        // --- Extract Image Selector ---
        const imageCandidates = element.querySelectorAll('img');
        // For images, we'll just take the first one that looks like a product image
        const bestImageElement = Array.from(imageCandidates).find(img => {
          const src = (img.src || '').toLowerCase();
          return src && !src.includes('data:image') && !src.includes('spacer') && (src.includes('product') || src.includes('item') || img.alt);
        });
        if (bestImageElement) {
          productAttributes.imageSelector = generateSelector(bestImageElement);
        }
      }

      finalResults.push({
        element,
        confidence: confidence.score,
        characteristics: confidence.characteristics,
        position: getPositionInfo(element),
        selector: generateSelector(element), // Selector for the product element itself
        isContainer: isCurrentElementAContainer,
        attributes: productAttributes // New: Specific attribute selectors
      });
    }
  });

  // 4. Sort by confidence (using finalResults)
  finalResults.sort((a, b) => b.confidence - a.confidence);

  // 5. Analyze layout patterns (using finalResults)
  const productElementsForLayout = finalResults.filter(r => !r.isContainer).map(r => document.querySelector(r.selector)).filter(Boolean);
  const layoutPattern = analyzeLayout(productElementsForLayout);

  return {
    products: finalResults.filter(r => !r.isContainer),
    containers: finalResults.filter(r => r.isContainer),
    layoutPattern,
    summary: {
      totalFound: finalResults.length,
      highConfidence: finalResults.filter(r => r.confidence >= 0.8).length,
      mediumConfidence: finalResults.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length
    }
  };
}

/**
 * This is a modified version of identifyProductContainers for use inside Puppeteer.
 * It removes the non-serializable `element` property from the results.
 */
function identifyProductContainersSerializable() {
  const result = identifyProductContainers();
  
  // Remove non-serializable element property
  result.products.forEach(p => {
    delete p.element;
    // No need to delete p.attributes as they contain only serializable strings (selectors)
  });
  result.containers.forEach(c => delete c.element);

  return result;
}

/**
 * Generate a unique CSS selector for an element
 */
function generateSelector(element) {
  if (element.id) return `#${element.id}`;
  
  const path = [];
  let current = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.className) {
      const classes = current.className.trim().split(/\s+/).filter(Boolean).slice(0, 2); // Filter out empty strings
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    // Add nth-child if necessary for uniqueness, but only for direct children
    if (current.parentElement && !current.id && !current.className) {
      const siblings = Array.from(current.parentElement.children);
      const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
      if (sameTagSiblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
    
    if (path.length >= 4) break; // Increased depth limit slightly for attribute selectors
  }
  
  return path.join(' > ');
}

// export { identifyProductContainers, identifyProductContainersSerializable };
        confidence: confidence.score,
        characteristics: confidence.characteristics,
        position: getPositionInfo(element),
        selector: generateSelector(element),
        isContainer: isProductListContainer(element)
      });
    }
  });

  // 4. Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  // 5. Analyze layout patterns
  const productElements = results.filter(r => !r.isContainer).map(r => document.querySelector(r.selector)).filter(Boolean);
  const layoutPattern = analyzeLayout(productElements);

  return {
    products: results.filter(r => !r.isContainer),
    containers: results.filter(r => r.isContainer),
    layoutPattern,
    summary: {
      totalFound: results.length,
      highConfidence: results.filter(r => r.confidence >= 0.8).length,
      mediumConfidence: results.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length
    }
  };
}

/**
 * This is a modified version of identifyProductContainers for use inside Puppeteer.
 * It removes the non-serializable `element` property from the results.
 */
function identifyProductContainersSerializable() {
  const result = identifyProductContainers();
  
  // Remove non-serializable element property
  result.products.forEach(p => delete p.element);
  result.containers.forEach(c => delete c.element);

  return result;
}

/**
 * Generate a unique CSS selector for an element
 */
function generateSelector(element) {
  if (element.id) return `#${element.id}`;
  
  const path = [];
  let current = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.className) {
      const classes = current.className.trim().split(/\s+/).slice(0, 2);
      selector += '.' + classes.join('.');
    }
    
    path.unshift(selector);
    current = current.parentElement;
    
    if (path.length >= 3) break; // Limit depth
  }
  
  return path.join(' > ');
}

// export { identifyProductContainers, identifyProductContainersSerializable };