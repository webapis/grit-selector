/**
 * Identifies product title/name patterns within product containers
 * @param {HTMLElement|Array<HTMLElement>} productContainers - Product container element(s)
 * @param {Object} options - Configuration options
 * @returns {Object} Title pattern analysis results
 */
function identifyProductTitlePattern(productContainers, options = {}) {
  const config = {
    // Minimum text length to be considered a title
    minTextLength: 5,
    maxTextLength: 200,
    
    // Minimum confidence score
    minConfidence: 0.5,
    
    // Common title element patterns
    headingTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    titleClasses: ['title', 'name', 'product-title', 'product-name', 'heading'],
    
    // Analyze multiple containers to find pattern
    sampleSize: 10,
    
    ...options
  };

  // Normalize input to array
  const containers = Array.isArray(productContainers) 
    ? productContainers 
    : [productContainers];

  const allCandidates = [];
  const patternFrequency = {};

  /**
   * Calculate confidence score for a title candidate
   */
  function calculateTitleConfidence(element, container) {
    let score = 0;
    let maxScore = 0;
    const features = {};

    // 1. Element type (weight: 25)
    maxScore += 25;
    const tagName = element.tagName.toLowerCase();
    
    if (config.headingTags.includes(tagName)) {
      score += 20;
      features.isHeading = true;
      features.headingLevel = tagName;
      
      // Bonus for h2/h3 (most common for product titles)
      if (tagName === 'h2' || tagName === 'h3') {
        score += 5;
        features.isOptimalHeading = true;
      }
    } else if (tagName === 'a') {
      score += 10;
      features.isLink = true;
    } else if (tagName === 'span' || tagName === 'div') {
      score += 5;
      features.isGenericContainer = true;
    }

    // 2. Class/ID patterns (weight: 20)
    maxScore += 20;
    const classList = (element.className || '').toLowerCase();
    const idAttr = (element.id || '').toLowerCase();
    
    config.titleClasses.forEach(pattern => {
      if (classList.includes(pattern)) {
        score += 15;
        features.hasTitleClass = true;
        features.matchedClass = pattern;
        return;
      }
    });
    
    if (idAttr.includes('title') || idAttr.includes('name')) {
      score += 10;
      features.hasTitleId = true;
    }
    
    if (classList.includes('product')) {
      score += 5;
      features.hasProductClass = true;
    }

    // 3. Text content characteristics (weight: 20)
    maxScore += 20;
    const text = element.textContent.trim();
    const textLength = text.length;
    
    if (textLength >= config.minTextLength && textLength <= config.maxTextLength) {
      score += 10;
      features.hasAppropriateLength = true;
      
      // Bonus for typical product title length (20-80 chars)
      if (textLength >= 20 && textLength <= 80) {
        score += 5;
        features.hasOptimalLength = true;
      }
      
      // Check for meaningful content (not just numbers/symbols)
      const wordCount = text.split(/\s+/).length;
      if (wordCount >= 2 && wordCount <= 15) {
        score += 5;
        features.hasGoodWordCount = true;
      }
    }

    // 4. Position in container (weight: 15)
    maxScore += 15;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Titles are typically in the upper portion of product cards
    const relativePosition = (elementRect.top - containerRect.top) / containerRect.height;
    if (relativePosition <= 0.6) {
      score += 10;
      features.isInUpperPortion = true;
      
      if (relativePosition <= 0.3) {
        score += 5;
        features.isInTopThird = true;
      }
    }

    // 5. Link characteristics (weight: 10)
    maxScore += 10;
    const parentLink = element.closest('a[href]');
    const childLink = element.querySelector('a[href]');
    
    if (parentLink || childLink) {
      score += 5;
      features.hasAssociatedLink = true;
      
      const link = parentLink || childLink;
      const href = link.href.toLowerCase();
      if (href.includes('product') || href.includes('item') || href.includes('/p/')) {
        score += 5;
        features.hasProductLink = true;
      }
    }

    // 6. Font size (weight: 10)
    maxScore += 10;
    const computedStyle = window.getComputedStyle(element);
    const fontSize = parseFloat(computedStyle.fontSize);
    const containerFontSize = parseFloat(window.getComputedStyle(container).fontSize);
    
    // Titles typically have larger font than average
    if (fontSize >= containerFontSize * 1.1) {
      score += 5;
      features.hasLargerFont = true;
      
      if (fontSize >= 14 && fontSize <= 24) {
        score += 5;
        features.hasOptimalFontSize = true;
      }
    }

    // 7. Uniqueness in container (weight: 10)
    maxScore += 10;
    const selector = generateSimpleSelector(element);
    const similarElements = container.querySelectorAll(selector);
    
    if (similarElements.length === 1) {
      score += 10;
      features.isUnique = true;
    } else if (similarElements.length <= 3) {
      score += 5;
      features.isRelativelyUnique = true;
    }

    // 8. Exclusion patterns (negative scoring)
    const text_lower = text.toLowerCase();
    if (text_lower.match(/^\d+[\.\,]\d+/) || // Starts with price
        text_lower.match(/^(add|buy|cart|checkout)/i) || // Button text
        text_lower.includes('rating') ||
        text_lower.includes('review') ||
        textLength < config.minTextLength) {
      score -= 10;
      features.hasExclusionPattern = true;
    }

    // Normalize score
    const normalizedScore = maxScore > 0 ? Math.max(0, score) / maxScore : 0;

    return {
      score: normalizedScore,
      features,
      text,
      rawScore: score,
      maxScore
    };
  }

  /**
   * Find all title candidates in a container
   */
  function findTitleCandidates(container) {
    const candidates = [];
    
    // Search for heading tags
    config.headingTags.forEach(tag => {
      container.querySelectorAll(tag).forEach(el => {
        if (el.textContent.trim().length >= config.minTextLength) {
          candidates.push(el);
        }
      });
    });

    // Search for elements with title-related classes
    config.titleClasses.forEach(titleClass => {
      container.querySelectorAll(`[class*="${titleClass}"]`).forEach(el => {
        if (el.textContent.trim().length >= config.minTextLength) {
          candidates.push(el);
        }
      });
    });

    // Search for links that might be titles
    container.querySelectorAll('a[href]').forEach(link => {
      const text = link.textContent.trim();
      if (text.length >= config.minTextLength && 
          text.length <= config.maxTextLength &&
          !link.querySelector('img')) { // Exclude image-only links
        candidates.push(link);
      }
    });

    // Remove duplicates (same element found multiple ways)
    const unique = [...new Set(candidates)];
    
    return unique.map(el => ({
      element: el,
      ...calculateTitleConfidence(el, container),
      selector: generateDetailedSelector(el, container)
    }));
  }

  /**
   * Generate a simple selector for pattern matching
   */
  function generateSimpleSelector(element) {
    const tag = element.tagName.toLowerCase();
    const classes = (element.className || '').trim().split(/\s+/).filter(c => c.length > 0);
    
    if (classes.length > 0) {
      return `${tag}.${classes[0]}`;
    }
    return tag;
  }

  /**
   * Generate a detailed selector path
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
        const classes = current.className.trim().split(/\s+/).slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      // Add nth-child if needed for uniqueness
      const siblings = Array.from(current.parentElement?.children || []);
      const index = siblings.indexOf(current);
      if (siblings.filter(s => s.tagName === current.tagName).length > 1) {
        selector += `:nth-child(${index + 1})`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  /**
   * Analyze pattern consistency across containers
   */
  function analyzePatternConsistency(allCandidates) {
    const patterns = {};
    
    allCandidates.forEach(candidate => {
      const pattern = {
        tagName: candidate.element.tagName.toLowerCase(),
        hasHeading: candidate.features.isHeading || false,
        hasTitleClass: candidate.features.hasTitleClass || false,
        hasLink: candidate.features.hasAssociatedLink || false,
        selector: generateSimpleSelector(candidate.element)
      };
      
      const key = JSON.stringify(pattern);
      if (!patterns[key]) {
        patterns[key] = {
          pattern,
          count: 0,
          avgConfidence: 0,
          examples: []
        };
      }
      
      patterns[key].count++;
      patterns[key].avgConfidence += candidate.score;
      patterns[key].examples.push({
        text: candidate.text,
        confidence: candidate.score,
        selector: candidate.selector
      });
    });

    // Calculate averages
    Object.values(patterns).forEach(p => {
      p.avgConfidence /= p.count;
      p.examples = p.examples.slice(0, 3); // Keep only top 3 examples
    });

    return patterns;
  }

  // Main analysis
  const sampleContainers = containers.slice(0, config.sampleSize);
  
  sampleContainers.forEach(container => {
    const candidates = findTitleCandidates(container);
    
    // Keep only high confidence candidates
    const filtered = candidates.filter(c => c.score >= config.minConfidence);
    
    allCandidates.push(...filtered);
  });

  // Sort candidates by confidence
  allCandidates.sort((a, b) => b.score - a.score);

  // Analyze patterns
  const patterns = analyzePatternConsistency(allCandidates);
  
  // Find the most common pattern
  const patternArray = Object.entries(patterns)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => {
      // Sort by combination of frequency and confidence
      const scoreA = a.count * a.avgConfidence;
      const scoreB = b.count * b.avgConfidence;
      return scoreB - scoreA;
    });

  const bestPattern = patternArray[0];

  // Generate extraction strategy
  const extractionStrategy = bestPattern ? {
    selector: bestPattern.pattern.selector,
    tagName: bestPattern.pattern.tagName,
    alternativeSelectors: patternArray.slice(1, 3).map(p => p.pattern.selector),
    confidence: bestPattern.avgConfidence,
    frequency: bestPattern.count / sampleContainers.length,
    description: generatePatternDescription(bestPattern.pattern)
  } : null;

  return {
    bestPattern: extractionStrategy,
    allPatterns: patternArray,
    topCandidates: allCandidates.slice(0, 10),
    statistics: {
      totalContainersAnalyzed: sampleContainers.length,
      totalCandidatesFound: allCandidates.length,
      avgCandidatesPerContainer: allCandidates.length / sampleContainers.length,
      highConfidenceCount: allCandidates.filter(c => c.score >= 0.8).length,
      uniquePatterns: patternArray.length
    }
  };
}

/**
 * Generate human-readable pattern description
 */
function generatePatternDescription(pattern) {
  const parts = [];
  
  if (pattern.hasHeading) {
    parts.push(`${pattern.tagName.toUpperCase()} heading tag`);
  } else {
    parts.push(`${pattern.tagName.toUpperCase()} element`);
  }
  
  if (pattern.hasTitleClass) {
    parts.push('with title-related class');
  }
  
  if (pattern.hasLink) {
    parts.push('containing or wrapped in a link');
  }
  
  return parts.join(', ');
}

/**
 * Extract titles from containers using identified pattern
 */
function extractTitles(productContainers, pattern) {
  const containers = Array.isArray(productContainers) 
    ? productContainers 
    : [productContainers];
  
  return containers.map(container => {
    // Try primary selector
    let titleElement = container.querySelector(pattern.selector);
    
    // Try alternative selectors if primary fails
    if (!titleElement && pattern.alternativeSelectors) {
      for (const altSelector of pattern.alternativeSelectors) {
        titleElement = container.querySelector(altSelector);
        if (titleElement) break;
      }
    }
    
    return {
      element: titleElement,
      text: titleElement ? titleElement.textContent.trim() : null,
      container: container
    };
  });
}

// Example usage:
/*
// Identify title pattern
const result = identifyProductTitlePattern(productContainers);
console.log('Best pattern:', result.bestPattern);
console.log('Description:', result.bestPattern.description);

// Extract titles using the pattern
const titles = extractTitles(productContainers, result.bestPattern);
titles.forEach(t => console.log(t.text));
*/

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    identifyProductTitlePattern,
    extractTitles
  };
}