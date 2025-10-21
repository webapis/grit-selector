/**
 * Identifies product image patterns within product containers
 * @param {HTMLElement|Array<HTMLElement>} productContainers - Product container element(s)
 * @param {Object} options - Configuration options
 * @returns {Object} Image pattern analysis results
 */
function identifyProductImagePattern(productContainers, options = {}) {
  const config = {
    // Minimum image dimensions to be considered a product image
    minWidth: 50,
    minHeight: 50,
    
    // Maximum dimensions (exclude hero images, banners)
    maxWidth: 1200,
    maxHeight: 1200,
    
    // Minimum confidence score
    minConfidence: 0.5,
    
    // Common image class patterns
    imageClasses: ['product-image', 'product-img', 'item-image', 'thumb', 'thumbnail'],
    
    // Analyze multiple containers to find pattern
    sampleSize: 10,
    
    // Include lazy-loaded images
    includeLazyLoaded: true,
    
    ...options
  };

  // Normalize input to array
  const containers = Array.isArray(productContainers) 
    ? productContainers 
    : [productContainers];

  const allCandidates = [];

  /**
   * Get actual or potential image source
   */
  function getImageSource(img) {
    const sources = {
      current: img.src || img.currentSrc,
      lazy: img.dataset.src || img.getAttribute('data-src'),
      lazySrcset: img.dataset.srcset || img.getAttribute('data-srcset'),
      srcset: img.srcset,
      backgroundImage: null
    };

    // Check for background image on parent
    const parent = img.parentElement;
    if (parent) {
      const bgImage = window.getComputedStyle(parent).backgroundImage;
      if (bgImage && bgImage !== 'none') {
        sources.backgroundImage = bgImage.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1');
      }
    }

    return sources;
  }

  /**
   * Get image dimensions (actual or natural)
   */
  function getImageDimensions(img) {
    const rect = img.getBoundingClientRect();
    
    return {
      displayWidth: rect.width,
      displayHeight: rect.height,
      naturalWidth: img.naturalWidth || 0,
      naturalHeight: img.naturalHeight || 0,
      aspectRatio: rect.width / rect.height,
      area: rect.width * rect.height
    };
  }

  /**
   * Calculate confidence score for an image candidate
   */
  function calculateImageConfidence(img, container) {
    let score = 0;
    let maxScore = 0;
    const features = {};

    // 1. Element attributes (weight: 20)
    maxScore += 20;
    const alt = (img.alt || '').toLowerCase();
    const classList = (img.className || '').toLowerCase();
    const imgSrc = (img.src || '').toLowerCase();

    // Check alt text
    if (alt.length > 0) {
      score += 5;
      features.hasAlt = true;
      
      if (alt.includes('product') || alt.includes('item')) {
        score += 5;
        features.hasProductAlt = true;
      }
    }

    // Check classes
    config.imageClasses.forEach(pattern => {
      if (classList.includes(pattern)) {
        score += 10;
        features.hasImageClass = true;
        features.matchedClass = pattern;
      }
    });

    // 2. Image source characteristics (weight: 15)
    maxScore += 15;
    const sources = getImageSource(img);
    
    if (sources.current && sources.current !== '' && !sources.current.includes('placeholder')) {
      score += 5;
      features.hasValidSrc = true;
    }

    if (sources.lazy || sources.lazySrcset) {
      score += 5;
      features.isLazyLoaded = true;
    }

    if (imgSrc.includes('product') || imgSrc.includes('item') || imgSrc.includes('/p/')) {
      score += 5;
      features.hasProductPath = true;
    }

    // 3. Image dimensions (weight: 25)
    maxScore += 25;
    const dims = getImageDimensions(img);
    
    if (dims.displayWidth >= config.minWidth && 
        dims.displayHeight >= config.minHeight &&
        dims.displayWidth <= config.maxWidth &&
        dims.displayHeight <= config.maxHeight) {
      score += 15;
      features.hasAppropriateSize = true;
      
      // Bonus for typical product image sizes
      if (dims.displayWidth >= 150 && dims.displayWidth <= 500) {
        score += 5;
        features.hasOptimalSize = true;
      }
      
      // Check aspect ratio (product images often square or portrait)
      if (dims.aspectRatio >= 0.7 && dims.aspectRatio <= 1.5) {
        score += 5;
        features.hasGoodAspectRatio = true;
      }
    }

    // 4. Position in container (weight: 20)
    maxScore += 20;
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    // Product images are typically prominent and in upper portion
    const relativePosition = (imgRect.top - containerRect.top) / containerRect.height;
    if (relativePosition <= 0.5) {
      score += 10;
      features.isInUpperHalf = true;
      
      if (relativePosition <= 0.3) {
        score += 5;
        features.isAtTop = true;
      }
    }

    // Check if image is prominent (takes significant space)
    const imageArea = dims.area;
    const containerArea = containerRect.width * containerRect.height;
    const areaRatio = imageArea / containerArea;
    
    if (areaRatio >= 0.2 && areaRatio <= 0.8) {
      score += 5;
      features.isProminent = true;
    }

    // 5. Parent/wrapper structure (weight: 15)
    maxScore += 15;
    const parent = img.parentElement;
    const parentClass = (parent?.className || '').toLowerCase();
    
    if (parentClass.includes('image') || 
        parentClass.includes('picture') || 
        parentClass.includes('photo') ||
        parentClass.includes('media')) {
      score += 10;
      features.hasImageWrapper = true;
    }

    // Check if wrapped in a link
    const linkParent = img.closest('a[href]');
    if (linkParent) {
      score += 5;
      features.isWrappedInLink = true;
      
      const href = linkParent.href.toLowerCase();
      if (href.includes('product') || href.includes('item')) {
        features.hasProductLink = true;
      }
    }

    // 6. Image gallery/slider indicators (weight: 10)
    maxScore += 10;
    const sliderParent = img.closest('[class*="slider"], [class*="swiper"], [class*="carousel"], [class*="gallery"]');
    if (sliderParent) {
      score += 10;
      features.isInSlider = true;
    }

    // 7. Z-index and visibility (weight: 5)
    maxScore += 5;
    const computedStyle = window.getComputedStyle(img);
    const visibility = computedStyle.visibility;
    const display = computedStyle.display;
    const opacity = parseFloat(computedStyle.opacity);
    
    if (visibility !== 'hidden' && display !== 'none' && opacity > 0.5) {
      score += 5;
      features.isVisible = true;
    }

    // 8. Loading priority (weight: 5)
    maxScore += 5;
    const loading = img.loading;
    const fetchPriority = img.fetchPriority || img.getAttribute('fetchpriority');
    
    if (loading === 'eager' || fetchPriority === 'high' || fetchPriority === 'highest') {
      score += 5;
      features.hasHighPriority = true;
    }

    // 9. Exclusion patterns (negative scoring)
    // Exclude icons, logos, badges
    if (dims.displayWidth < config.minWidth || 
        dims.displayHeight < config.minHeight ||
        classList.includes('icon') || 
        classList.includes('logo') ||
        classList.includes('badge') ||
        alt.includes('icon') ||
        alt.includes('logo')) {
      score -= 20;
      features.hasExclusionPattern = true;
    }

    // Normalize score
    const normalizedScore = maxScore > 0 ? Math.max(0, score) / maxScore : 0;

    return {
      score: normalizedScore,
      features,
      dimensions: dims,
      sources: sources,
      rawScore: score,
      maxScore
    };
  }

  /**
   * Find all image candidates in a container
   */
  function findImageCandidates(container) {
    const candidates = [];
    
    // Find all img elements
    const images = container.querySelectorAll('img');
    
    images.forEach(img => {
      const analysis = calculateImageConfidence(img, container);
      
      if (analysis.score >= config.minConfidence) {
        candidates.push({
          element: img,
          ...analysis,
          selector: generateDetailedSelector(img, container),
          containerDepth: getDepthInContainer(img, container)
        });
      }
    });

    // Also check for background images on divs
    if (config.includeLazyLoaded) {
      const divsWithBg = container.querySelectorAll('div[style*="background-image"], div[data-bg]');
      divsWithBg.forEach(div => {
        const bgImage = window.getComputedStyle(div).backgroundImage;
        if (bgImage && bgImage !== 'none') {
          // Create virtual image object for consistency
          const rect = div.getBoundingClientRect();
          candidates.push({
            element: div,
            isBackgroundImage: true,
            score: 0.6, // Lower confidence for bg images
            features: { isBackgroundImage: true },
            dimensions: {
              displayWidth: rect.width,
              displayHeight: rect.height,
              aspectRatio: rect.width / rect.height
            },
            sources: { backgroundImage: bgImage },
            selector: generateDetailedSelector(div, container)
          });
        }
      });
    }

    return candidates;
  }

  /**
   * Get depth of element within container
   */
  function getDepthInContainer(element, container) {
    let depth = 0;
    let current = element;
    
    while (current && current !== container) {
      depth++;
      current = current.parentElement;
    }
    
    return depth;
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
        const classes = current.className.trim().split(/\s+/)
          .filter(c => c.length > 0 && !c.includes('swiper-slide-active'))
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
   * Analyze pattern consistency across containers
   */
  function analyzeImagePatterns(allCandidates) {
    const patterns = {};
    
    allCandidates.forEach(candidate => {
      const pattern = {
        tagName: candidate.element.tagName.toLowerCase(),
        isInSlider: candidate.features.isInSlider || false,
        hasImageWrapper: candidate.features.hasImageWrapper || false,
        isWrappedInLink: candidate.features.isWrappedInLink || false,
        isLazyLoaded: candidate.features.isLazyLoaded || false,
        isBackgroundImage: candidate.isBackgroundImage || false,
        depth: candidate.containerDepth,
        // Simplified selector pattern
        simpleSelector: candidate.selector.split(' > ').slice(-2).join(' > ')
      };
      
      const key = JSON.stringify(pattern);
      if (!patterns[key]) {
        patterns[key] = {
          pattern,
          count: 0,
          avgConfidence: 0,
          avgWidth: 0,
          avgHeight: 0,
          examples: []
        };
      }
      
      patterns[key].count++;
      patterns[key].avgConfidence += candidate.score;
      patterns[key].avgWidth += candidate.dimensions.displayWidth;
      patterns[key].avgHeight += candidate.dimensions.displayHeight;
      patterns[key].examples.push({
        src: candidate.sources.current || candidate.sources.lazy || 'background-image',
        dimensions: candidate.dimensions,
        confidence: candidate.score,
        selector: candidate.selector
      });
    });

    // Calculate averages
    Object.values(patterns).forEach(p => {
      p.avgConfidence /= p.count;
      p.avgWidth /= p.count;
      p.avgHeight /= p.count;
      p.examples = p.examples.slice(0, 3);
    });

    return patterns;
  }

  /**
   * Detect multiple images (gallery/slider)
   */
  function detectMultipleImages(candidates) {
    const containers = {};
    
    candidates.forEach(candidate => {
      const parent = candidate.element.closest('[class*="slider"], [class*="swiper"], [class*="gallery"], [class*="images"]');
      if (parent) {
        const key = parent.className;
        if (!containers[key]) {
          containers[key] = [];
        }
        containers[key].push(candidate);
      }
    });

    return Object.entries(containers)
      .filter(([_, imgs]) => imgs.length > 1)
      .map(([className, imgs]) => ({
        type: 'gallery',
        className,
        imageCount: imgs.length,
        pattern: imgs[0].selector
      }));
  }

  // Main analysis
  const sampleContainers = containers.slice(0, config.sampleSize);
  
  sampleContainers.forEach(container => {
    const candidates = findImageCandidates(container);
    allCandidates.push(...candidates);
  });

  // Sort by confidence
  allCandidates.sort((a, b) => b.score - a.score);

  // Analyze patterns
  const patterns = analyzeImagePatterns(allCandidates);
  const galleries = detectMultipleImages(allCandidates);
  
  // Find the best pattern
  const patternArray = Object.entries(patterns)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => {
      const scoreA = a.count * a.avgConfidence;
      const scoreB = b.count * b.avgConfidence;
      return scoreB - scoreA;
    });

  const bestPattern = patternArray[0];

  // Generate extraction strategy
  const extractionStrategy = bestPattern ? {
    selector: bestPattern.pattern.simpleSelector,
    fullSelector: bestPattern.examples[0]?.selector,
    tagName: bestPattern.pattern.tagName,
    isInSlider: bestPattern.pattern.isInSlider,
    isLazyLoaded: bestPattern.pattern.isLazyLoaded,
    isBackgroundImage: bestPattern.pattern.isBackgroundImage,
    alternativeSelectors: patternArray.slice(1, 3).map(p => p.pattern.simpleSelector),
    confidence: bestPattern.avgConfidence,
    frequency: bestPattern.count / sampleContainers.length,
    avgDimensions: {
      width: Math.round(bestPattern.avgWidth),
      height: Math.round(bestPattern.avgHeight)
    },
    description: generateImagePatternDescription(bestPattern.pattern),
    hasGallery: galleries.length > 0,
    galleryPattern: galleries[0] || null
  } : null;

  return {
    bestPattern: extractionStrategy,
    allPatterns: patternArray,
    topCandidates: allCandidates.slice(0, 10),
    galleries: galleries,
    statistics: {
      totalContainersAnalyzed: sampleContainers.length,
      totalImagesFound: allCandidates.length,
      avgImagesPerContainer: allCandidates.length / sampleContainers.length,
      highConfidenceCount: allCandidates.filter(c => c.score >= 0.8).length,
      lazyLoadedCount: allCandidates.filter(c => c.features.isLazyLoaded).length,
      sliderCount: allCandidates.filter(c => c.features.isInSlider).length,
      uniquePatterns: patternArray.length
    }
  };
}

/**
 * Generate human-readable pattern description
 */
function generateImagePatternDescription(pattern) {
  const parts = [];
  
  if (pattern.isBackgroundImage) {
    parts.push('Background image on DIV');
  } else {
    parts.push('IMG element');
  }
  
  if (pattern.isInSlider) {
    parts.push('inside image slider/gallery');
  }
  
  if (pattern.hasImageWrapper) {
    parts.push('wrapped in image container');
  }
  
  if (pattern.isWrappedInLink) {
    parts.push('inside product link');
  }
  
  if (pattern.isLazyLoaded) {
    parts.push('with lazy loading');
  }
  
  parts.push(`at depth ${pattern.depth}`);
  
  return parts.join(', ');
}

/**
 * Extract images from containers using identified pattern
 */
function extractImages(productContainers, pattern) {
  const containers = Array.isArray(productContainers) 
    ? productContainers 
    : [productContainers];
  
  return containers.map(container => {
    let imageElement = null;
    let allImages = [];
    
    // Try primary selector
    if (pattern.isInSlider && pattern.galleryPattern) {
      // Get all images in gallery
      const gallery = container.querySelector(`[class*="${pattern.galleryPattern.className}"]`);
      if (gallery) {
        allImages = Array.from(gallery.querySelectorAll('img'));
        imageElement = allImages[0];
      }
    } else {
      imageElement = container.querySelector(pattern.fullSelector || pattern.selector);
      
      // Try alternative selectors if primary fails
      if (!imageElement && pattern.alternativeSelectors) {
        for (const altSelector of pattern.alternativeSelectors) {
          imageElement = container.querySelector(altSelector);
          if (imageElement) break;
        }
      }
      
      // Fallback: get first image
      if (!imageElement) {
        imageElement = container.querySelector('img');
      }
    }
    
    // Extract source
    let src = null;
    if (imageElement) {
      if (pattern.isBackgroundImage) {
        const bgImage = window.getComputedStyle(imageElement).backgroundImage;
        src = bgImage.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1');
      } else {
        src = imageElement.src || 
              imageElement.dataset.src || 
              imageElement.getAttribute('data-src');
      }
    }
    
    return {
      element: imageElement,
      src: src,
      allImages: allImages,
      alt: imageElement?.alt || '',
      container: container
    };
  });
}

// Example usage:
/*
// Identify image pattern
const result = identifyProductImagePattern(productContainers);
console.log('Best pattern:', result.bestPattern);
console.log('Has gallery:', result.bestPattern.hasGallery);

// Extract images using the pattern
const images = extractImages(productContainers, result.bestPattern);
images.forEach(img => {
  console.log('Main image:', img.src);
  console.log('Gallery images:', img.allImages.length);
});
*/

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    identifyProductImagePattern,
    extractImages
  };
}