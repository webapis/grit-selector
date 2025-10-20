async function setupDOMBridge(page, options = {}) {
  const {
    refreshInterval = 30 * 60 * 1000,
    onRefresh = null,
    autoRefresh = true,
    onNavigate = null // Callback when navigating to new URL
  } = options;

  const initializeBridge = async () => {
    await page.exposeFunction('__sendDOMResponse', (requestId, result) => {
      if (!global.__domResponses) global.__domResponses = new Map();
      global.__domResponses.set(requestId, result);
    });

    await page.evaluate(() => {
      window.__domBridge = {
        initialized: Date.now(),
        handlers: {
          'query': (selector) => {
            const el = document.querySelector(selector);
            if (!el) return null;
            return {
              tagName: el.tagName.toLowerCase(),
              textContent: el.textContent.trim(),
              innerHTML: el.innerHTML,
              id: el.id,
              className: el.className,
              value: el.value,
              attributes: Object.fromEntries(
                Array.from(el.attributes).map(a => [a.name, a.value])
              )
            };
          },
          
          'text': (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : null;
          },
          
          'value': (selector) => {
            const el = document.querySelector(selector);
            return el ? (el.value || el.textContent.trim()) : null;
          },
          
          'batch': (queries) => {
            const results = {};
            for (const [key, config] of Object.entries(queries)) {
              try {
                const { selector, type = 'text' } = config;
                const el = document.querySelector(selector);
                
                if (!el) {
                  results[key] = null;
                  continue;
                }
                
                switch (type) {
                  case 'text':
                    results[key] = el.textContent.trim();
                    break;
                  case 'value':
                    results[key] = el.value || el.textContent.trim();
                    break;
                  case 'html':
                    results[key] = el.innerHTML;
                    break;
                  case 'attr':
                    results[key] = el.getAttribute(config.attribute);
                    break;
                  case 'exists':
                    results[key] = true;
                    break;
                  case 'full':
                    results[key] = {
                      tagName: el.tagName.toLowerCase(),
                      textContent: el.textContent.trim(),
                      value: el.value,
                      id: el.id,
                      className: el.className
                    };
                    break;
                  default:
                    results[key] = el.textContent.trim();
                }
              } catch (error) {
                results[key] = { error: error.message };
              }
            }
            return results;
          },
          
          'queryAll': (selector) => {
            return Array.from(document.querySelectorAll(selector)).map(el => ({
              tagName: el.tagName.toLowerCase(),
              textContent: el.textContent.trim(),
              id: el.id,
              className: el.className,
              value: el.value
            }));
          },
          
          'exists': (selector) => !!document.querySelector(selector),
          'count': (selector) => document.querySelectorAll(selector).length,
          
          'status': () => ({
            initialized: window.__domBridge.initialized,
            uptime: Date.now() - window.__domBridge.initialized,
            handlersCount: Object.keys(window.__domBridge.handlers).length
          })
        },
        
        async processMessage(requestId, command, payload) {
          try {
            const handler = this.handlers[command];
            if (!handler) {
              await window.__sendDOMResponse(requestId, {
                success: false,
                error: `Unknown command: ${command}`
              });
              return;
            }
            
            const result = await handler(payload);
            await window.__sendDOMResponse(requestId, {
              success: true,
              data: result
            });
          } catch (error) {
            await window.__sendDOMResponse(requestId, {
              success: false,
              error: error.message
            });
          }
        }
      };
      
      Object.defineProperty(window, '__domCommand', {
        set: function(cmd) {
          if (cmd?.requestId && cmd?.command) {
            window.__domBridge.processMessage(cmd.requestId, cmd.command, cmd.payload);
          }
        }
      });
      
      console.log('[DOM Bridge] Initialized at', new Date().toISOString());
    });
  };

  global.__domResponses = new Map();
  await initializeBridge();

  async function sendCommand(command, payload, timeout = 5000) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await page.evaluate((reqId, cmd, data) => {
      window.__domCommand = { requestId: reqId, command: cmd, payload: data };
    }, requestId, command, payload);
    
    const startTime = Date.now();
    while (!global.__domResponses.has(requestId)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout for ${command}`);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const response = global.__domResponses.get(requestId);
    global.__domResponses.delete(requestId);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  const refreshBridge = async () => {
    try {
      console.log('[DOM Bridge] Refreshing bridge...');
      await initializeBridge();
      
      if (onRefresh) {
        await onRefresh(page);
      }
      
      console.log('[DOM Bridge] Refresh complete');
    } catch (error) {
      console.error('[DOM Bridge] Refresh failed:', error.message);
    }
  };

  let refreshTimer = null;
  if (autoRefresh && refreshInterval > 0) {
    refreshTimer = setInterval(refreshBridge, refreshInterval);
    console.log(`[DOM Bridge] Auto-refresh enabled (every ${refreshInterval / 1000}s)`);
  }

  // Navigate to new URL with automatic bridge re-initialization
  const navigateToURL = async (url, waitOptions = { waitUntil: 'networkidle0' }) => {
    try {
      console.log(`[DOM Bridge] Navigating to: ${url}`);
      
      // Navigate to new URL
      await page.goto(url, waitOptions);
      
      // Re-initialize bridge for new page
      await initializeBridge();
      
      // Call navigation callback if provided
      if (onNavigate) {
        await onNavigate(page, url);
      }
      
      console.log(`[DOM Bridge] Navigation complete, bridge re-initialized`);
      return true;
    } catch (error) {
      console.error('[DOM Bridge] Navigation failed:', error.message);
      throw error;
    }
  };

  page.dom = {
    query: (selector) => sendCommand('query', selector),
    queryAll: (selector) => sendCommand('queryAll', selector),
    text: (selector) => sendCommand('text', selector),
    value: (selector) => sendCommand('value', selector),
    exists: (selector) => sendCommand('exists', selector),
    count: (selector) => sendCommand('count', selector),
    batch: (queries) => sendCommand('batch', queries),
    status: () => sendCommand('status', null),
    
    refresh: refreshBridge,
    
    // Navigate to new URL
    goto: navigateToURL,
    
    // Navigate and wait for specific selector
    gotoAndWait: async (url, selector, timeout = 30000) => {
      await navigateToURL(url);
      await page.waitForSelector(selector, { timeout });
    },
    
    setRefreshInterval: (newInterval) => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      if (newInterval > 0) {
        refreshTimer = setInterval(refreshBridge, newInterval);
        console.log(`[DOM Bridge] Refresh interval updated to ${newInterval / 1000}s`);
      }
    },
    
    stopAutoRefresh: () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('[DOM Bridge] Auto-refresh stopped');
      }
    },
    
    getConfig: () => ({
      refreshInterval,
      autoRefresh: !!refreshTimer,
      currentUrl: page.url()
    })
  };

  return page;
}

// Usage Examples

// Example 1: Simple URL change
(async () => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await setupDOMBridge(page, {
    refreshInterval: 10 * 60 * 1000 // 10 minutes
  });
  
  // Start with first URL
  await page.dom.goto('https://example.com');
  const data1 = await page.dom.batch({
    title: { selector: 'h1' },
    price: { selector: '.price' }
  });
  console.log('Page 1 data:', data1);
  
  // Change to different URL - bridge auto re-initializes
  await page.dom.goto('https://another-site.com');
  const data2 = await page.dom.batch({
    title: { selector: 'h1' },
    description: { selector: '.desc' }
  });
  console.log('Page 2 data:', data2);
  
  // Change again
  await page.dom.goto('https://third-site.com');
  const data3 = await page.dom.text('h1');
  console.log('Page 3 title:', data3);
})();

// Example 2: Navigate with callback
(async () => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await setupDOMBridge(page, {
    refreshInterval: 5 * 60 * 1000,
    onNavigate: async (page, url) => {
      console.log(`Navigated to: ${url}`);
      console.log(`Page title: ${await page.title()}`);
      
      // Optional: Take screenshot after each navigation
      // await page.screenshot({ path: `screenshot-${Date.now()}.png` });
    }
  });
  
  const urls = [
    'https://example.com',
    'https://another-site.com',
    'https://third-site.com'
  ];
  
  for (const url of urls) {
    await page.dom.goto(url);
    const title = await page.dom.text('h1');
    console.log(`Title at ${url}:`, title);
  }
})();

// Example 3: Interactive REPL with URL switching
const repl = require('repl');

async function startDevREPL() {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await setupDOMBridge(page, {
    refreshInterval: 15 * 60 * 1000,
    onNavigate: (page, url) => {
      console.log(`✓ Loaded: ${url}`);
    }
  });
  
  const replServer = repl.start('scraper> ');
  
  replServer.context.page = page;
  replServer.context.browser = browser;
  
  // Helper functions
  replServer.context.goto = async (url) => {
    await page.dom.goto(url);
    return `Navigated to: ${url}`;
  };
  
  replServer.context.$ = async (selector) => {
    const exists = await page.dom.exists(selector);
    const count = await page.dom.count(selector);
    const text = await page.dom.text(selector);
    return { exists, count, text };
  };
  
  replServer.context.getAll = async (selector) => {
    return await page.dom.queryAll(selector);
  };
  
  replServer.context.batch = async (queries) => {
    return await page.dom.batch(queries);
  };
  
  console.log('\n🚀 Interactive Scraper REPL Ready!');
  console.log('Commands:');
  console.log('  await goto("https://example.com")');
  console.log('  await $("h1")');
  console.log('  await getAll("a")');
  console.log('  await batch({ title: { selector: "h1" }, price: { selector: ".price" } })');
  console.log('  page.url()');
}

startDevREPL();

// Example 4: Multi-page scraper workflow
(async () => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await setupDOMBridge(page, {
    refreshInterval: 10 * 60 * 1000
  });
  
  // Scrape multiple product pages
  const productUrls = [
    'https://shop.com/product/1',
    'https://shop.com/product/2',
    'https://shop.com/product/3'
  ];
  
  const results = [];
  
  for (const url of productUrls) {
    console.log(`\nScraping: ${url}`);
    
    // Navigate to new product page
    await page.dom.goto(url);
    
    // Scrape data with same selectors
    const productData = await page.dom.batch({
      name: { selector: '.product-name' },
      price: { selector: '.price' },
      description: { selector: '.description' },
      inStock: { selector: '.stock-status' },
      rating: { selector: '.rating' }
    });
    
    results.push({
      url,
      ...productData
    });
    
    console.log('Scraped:', productData);
  }
  
  console.log('\nAll results:', results);
  await browser.close();
})();

// Example 5: Watch and reload pattern
(async () => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await setupDOMBridge(page, {
    refreshInterval: 5 * 60 * 1000,
    onNavigate: (page, url) => {
      console.log(`[${new Date().toISOString()}] Loaded: ${url}`);
    }
  });
  
  let currentUrl = 'https://example.com/live-data';
  
  // Initial load
  await page.dom.goto(currentUrl);
  
  // Monitor and reload when needed
  setInterval(async () => {
    try {
      // Check if we need to change URL (e.g., based on config file)
      const newUrl = await checkForUrlChange(); // Your custom logic
      
      if (newUrl && newUrl !== currentUrl) {
        console.log(`URL changed, navigating to: ${newUrl}`);
        await page.dom.goto(newUrl);
        currentUrl = newUrl;
      }
      
      // Scrape current page
      const data = await page.dom.batch({
        value: { selector: '.live-value' },
        timestamp: { selector: '.timestamp' }
      });
      
      console.log('Current data:', data);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }, 30 * 1000); // Check every 30 seconds
  
  function checkForUrlChange() {
    // Example: Read from config file, database, or API
    // return fs.readFileSync('current-url.txt', 'utf8').trim();
    return Promise.resolve(currentUrl);
  }
})();

// Example 6: Navigate with wait for specific element
(async () => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await setupDOMBridge(page);
  
  // Navigate and wait for specific content to load
  await page.dom.gotoAndWait('https://example.com', '.dynamic-content');
  
  const content = await page.dom.text('.dynamic-content');
  console.log('Content:', content);
})();