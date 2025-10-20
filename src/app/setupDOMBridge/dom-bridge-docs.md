# DOM Bridge API Documentation

## Overview

DOM Bridge is a high-performance messaging protocol for Puppeteer that enables efficient DOM querying without repeated `page.evaluate()` calls. It sets up a persistent bridge once per page load and communicates via lightweight message passing.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Configuration Options](#configuration-options)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Installation

```javascript
const puppeteer = require('puppeteer');

// Copy the setupDOMBridge function into your project
// (see Implementation section below)
```

---

## Quick Start

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Setup bridge once
  await setupDOMBridge(page);
  
  // Navigate to target page
  await page.dom.goto('https://example.com');
  
  // Query DOM elements
  const title = await page.dom.text('h1');
  console.log('Title:', title);
  
  await browser.close();
})();
```

---

## API Reference

### Setup Function

#### `setupDOMBridge(page, options)`

Initializes the DOM Bridge on a Puppeteer page instance.

**Parameters:**
- `page` (Page) - Puppeteer page instance
- `options` (Object) - Configuration options (optional)

**Returns:** Promise<Page> - The page instance with `page.dom` API attached

**Example:**
```javascript
await setupDOMBridge(page, {
  refreshInterval: 30 * 60 * 1000,  // 30 minutes
  autoRefresh: true,
  onRefresh: (page) => console.log('Bridge refreshed'),
  onNavigate: (page, url) => console.log(`Navigated to ${url}`)
});
```

---

### Query Methods

#### `page.dom.text(selector)`

Get the text content of an element.

**Parameters:**
- `selector` (string) - CSS selector

**Returns:** Promise<string|null> - Text content or null if not found

**Example:**
```javascript
const title = await page.dom.text('h1');
const price = await page.dom.text('.product-price');
```

---

#### `page.dom.value(selector)`

Get the value of an element (for inputs) or its text content.

**Parameters:**
- `selector` (string) - CSS selector

**Returns:** Promise<string|null> - Value or text content, null if not found

**Example:**
```javascript
const email = await page.dom.value('input[name="email"]');
const selectValue = await page.dom.value('select#country');
```

---

#### `page.dom.query(selector)`

Get detailed information about an element.

**Parameters:**
- `selector` (string) - CSS selector

**Returns:** Promise<Object|null> - Element details or null

**Response Object:**
```javascript
{
  tagName: 'div',
  textContent: 'Hello World',
  innerHTML: '<span>Hello World</span>',
  id: 'myElement',
  className: 'container active',
  value: '',  // For inputs
  attributes: {
    'data-id': '123',
    'class': 'container active'
  }
}
```

**Example:**
```javascript
const element = await page.dom.query('.product-card');
console.log(element.tagName);  // 'div'
console.log(element.attributes['data-id']);  // '12345'
```

---

#### `page.dom.queryAll(selector)`

Get information about all matching elements.

**Parameters:**
- `selector` (string) - CSS selector

**Returns:** Promise<Array<Object>> - Array of element details

**Example:**
```javascript
const links = await page.dom.queryAll('a.product-link');
links.forEach(link => {
  console.log(link.textContent, link.id);
});
```

---

#### `page.dom.batch(queries)`

Execute multiple queries in a single operation (most efficient).

**Parameters:**
- `queries` (Object) - Map of query names to query configurations

**Query Configuration:**
```javascript
{
  selector: 'string',           // Required: CSS selector
  type: 'text' | 'value' | 'html' | 'attr' | 'exists' | 'full',  // Optional
  attribute: 'string'           // Required only for type: 'attr'
}
```

**Returns:** Promise<Object> - Results mapped by query names

**Example:**
```javascript
const data = await page.dom.batch({
  title: { selector: 'h1' },  // Default type: 'text'
  price: { selector: '.price', type: 'text' },
  description: { selector: '.desc', type: 'html' },
  productId: { selector: '[data-product-id]', type: 'attr', attribute: 'data-product-id' },
  inputValue: { selector: 'input#email', type: 'value' },
  hasStock: { selector: '.in-stock', type: 'exists' },
  fullInfo: { selector: '.product', type: 'full' }
});

console.log(data.title);       // 'Product Name'
console.log(data.price);       // '$99.99'
console.log(data.productId);   // '12345'
console.log(data.hasStock);    // true
```

---

#### `page.dom.exists(selector)`

Check if an element exists in the DOM.

**Parameters:**
- `selector` (string) - CSS selector

**Returns:** Promise<boolean>

**Example:**
```javascript
const hasModal = await page.dom.exists('.modal');
if (hasModal) {
  console.log('Modal is present');
}
```

---

#### `page.dom.count(selector)`

Count matching elements.

**Parameters:**
- `selector` (string) - CSS selector

**Returns:** Promise<number>

**Example:**
```javascript
const productCount = await page.dom.count('.product-card');
console.log(`Found ${productCount} products`);
```

---

### Maintenance Methods

#### `page.dom.goto(url, waitOptions)`

Navigate to a new URL and automatically re-initialize the bridge.

**Parameters:**
- `url` (string) - Target URL
- `waitOptions` (Object) - Puppeteer navigation options (optional)
  - Default: `{ waitUntil: 'networkidle0' }`

**Returns:** Promise<boolean>

**Example:**
```javascript
await page.dom.goto('https://example.com');
await page.dom.goto('https://example.com/products', { 
  waitUntil: 'domcontentloaded' 
});
```

---

#### `page.dom.gotoAndWait(url, selector, timeout)`

Navigate to URL and wait for a specific selector to appear.

**Parameters:**
- `url` (string) - Target URL
- `selector` (string) - CSS selector to wait for
- `timeout` (number) - Timeout in milliseconds (default: 30000)

**Returns:** Promise<void>

**Example:**
```javascript
await page.dom.gotoAndWait('https://example.com', '.main-content');
```

---

### Maintenance Methods

#### `page.dom.refresh()`

Manually refresh the DOM bridge.

**Returns:** Promise<void>

**Example:**
```javascript
await page.dom.refresh();
console.log('Bridge refreshed');
```

---

#### `page.dom.status()`

Get current bridge status information.

**Returns:** Promise<Object>

**Response:**
```javascript
{
  initialized: 1234567890,  // Timestamp
  uptime: 5000,             // Milliseconds
  handlersCount: 8          // Number of available handlers
}
```

**Example:**
```javascript
const status = await page.dom.status();
console.log(`Bridge uptime: ${status.uptime}ms`);
```

---

#### `page.dom.setRefreshInterval(interval)`

Change the auto-refresh interval.

**Parameters:**
- `interval` (number) - New interval in milliseconds (0 to disable)

**Returns:** void

**Example:**
```javascript
// Change to 10 minutes
page.dom.setRefreshInterval(10 * 60 * 1000);

// Disable auto-refresh
page.dom.setRefreshInterval(0);
```

---

#### `page.dom.stopAutoRefresh()`

Stop automatic bridge refresh.

**Returns:** void

**Example:**
```javascript
page.dom.stopAutoRefresh();
```

---

#### `page.dom.getConfig()`

Get current bridge configuration.

**Returns:** Object

**Response:**
```javascript
{
  refreshInterval: 1800000,
  autoRefresh: true,
  currentUrl: 'https://example.com'
}
```

**Example:**
```javascript
const config = page.dom.getConfig();
console.log(`Auto-refresh: ${config.autoRefresh}`);
console.log(`Current URL: ${config.currentUrl}`);
```

---

## Configuration Options

### `setupDOMBridge(page, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `refreshInterval` | number | `1800000` (30 min) | Auto-refresh interval in milliseconds |
| `autoRefresh` | boolean | `true` | Enable/disable automatic bridge refresh |
| `onRefresh` | function | `null` | Callback function called after each refresh |
| `onNavigate` | function | `null` | Callback function called after navigation |

### Callback Signatures

**onRefresh:**
```javascript
async function(page) {
  // Called after bridge refresh
  console.log('Bridge refreshed');
}
```

**onNavigate:**
```javascript
async function(page, url) {
  // Called after navigation
  console.log(`Navigated to: ${url}`);
}
```

---

## Usage Examples

### Example 1: Basic Scraping

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await setupDOMBridge(page);
  await page.dom.goto('https://example.com');
  
  const title = await page.dom.text('h1');
  const description = await page.dom.text('.description');
  
  console.log({ title, description });
  
  await browser.close();
})();
```

---

### Example 2: Batch Queries (Recommended)

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await setupDOMBridge(page);
  await page.dom.goto('https://shop.com/product/123');
  
  // Get multiple values in ONE operation
  const product = await page.dom.batch({
    name: { selector: '.product-name' },
    price: { selector: '.price' },
    description: { selector: '.description', type: 'html' },
    stock: { selector: '.stock-status' },
    sku: { selector: '[data-sku]', type: 'attr', attribute: 'data-sku' },
    available: { selector: '.in-stock', type: 'exists' }
  });
  
  console.log(product);
  
  await browser.close();
})();
```

---

### Example 3: Multi-Page Scraping

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await setupDOMBridge(page, {
    refreshInterval: 10 * 60 * 1000  // 10 minutes
  });
  
  const urls = [
    'https://shop.com/product/1',
    'https://shop.com/product/2',
    'https://shop.com/product/3'
  ];
  
  const results = [];
  
  for (const url of urls) {
    await page.dom.goto(url);
    
    const data = await page.dom.batch({
      name: { selector: '.product-name' },
      price: { selector: '.price' }
    });
    
    results.push({ url, ...data });
  }
  
  console.log(results);
  await browser.close();
})();
```

---

### Example 4: Custom Refresh Intervals

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await setupDOMBridge(page, {
    refreshInterval: 5 * 60 * 1000,  // 5 minutes
    onRefresh: async (page) => {
      console.log('[Bridge] Refreshed at', new Date().toISOString());
    },
    onNavigate: async (page, url) => {
      console.log('[Bridge] Navigated to', url);
    }
  });
  
  await page.dom.goto('https://example.com/live-data');
  
  // Long-running scraper
  setInterval(async () => {
    const data = await page.dom.batch({
      price: { selector: '.live-price' },
      timestamp: { selector: '.last-updated' }
    });
    
    console.log('Current data:', data);
  }, 30 * 1000);  // Query every 30 seconds
  
  // Bridge auto-refreshes every 5 minutes
})();
```

---

### Example 5: Conditional Element Checking

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await setupDOMBridge(page);
  await page.dom.goto('https://example.com');
  
  // Check if element exists before querying
  if (await page.dom.exists('.error-message')) {
    const error = await page.dom.text('.error-message');
    console.error('Error:', error);
  }
  
  // Count elements
  const linkCount = await page.dom.count('a');
  console.log(`Found ${linkCount} links`);
  
  // Get all matching elements
  if (linkCount > 0) {
    const links = await page.dom.queryAll('a');
    links.forEach(link => {
      console.log(link.textContent, link.attributes.href);
    });
  }
  
  await browser.close();
})();
```

---

### Example 6: Development REPL

```javascript
const puppeteer = require('puppeteer');
const repl = require('repl');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await setupDOMBridge(page);
  await page.dom.goto('https://example.com');
  
  const replServer = repl.start('scraper> ');
  
  // Add helpers to REPL
  replServer.context.page = page;
  replServer.context.goto = (url) => page.dom.goto(url);
  replServer.context.$ = async (sel) => ({
    exists: await page.dom.exists(sel),
    count: await page.dom.count(sel),
    text: await page.dom.text(sel)
  });
  
  console.log('Interactive scraper ready!');
  console.log('Try: await goto("https://example.com")');
  console.log('Try: await $("h1")');
})();
```

---

## Best Practices

### 1. Use Batch Queries

**❌ Bad - Multiple separate queries:**
```javascript
const title = await page.dom.text('h1');
const price = await page.dom.text('.price');
const stock = await page.dom.text('.stock');
const rating = await page.dom.text('.rating');
// 4 messages sent
```

**✅ Good - Single batch query:**
```javascript
const data = await page.dom.batch({
  title: { selector: 'h1' },
  price: { selector: '.price' },
  stock: { selector: '.stock' },
  rating: { selector: '.rating' }
});
// 1 message sent
```

---

### 2. Check Existence Before Querying

```javascript
// Check if element exists first
if (await page.dom.exists('.optional-field')) {
  const value = await page.dom.text('.optional-field');
  console.log('Optional field:', value);
}
```

---

### 3. Set Appropriate Refresh Intervals

```javascript
// Fast-changing content
await setupDOMBridge(page, {
  refreshInterval: 5 * 60 * 1000  // 5 minutes
});

// Stable content
await setupDOMBridge(page, {
  refreshInterval: 30 * 60 * 1000  // 30 minutes
});

// Disable if not needed
await setupDOMBridge(page, {
  autoRefresh: false
});
```

---

### 4. Use Navigation Callbacks for Logging

```javascript
await setupDOMBridge(page, {
  onNavigate: async (page, url) => {
    console.log(`[${new Date().toISOString()}] Navigated to: ${url}`);
    
    // Optional: Take screenshots
    await page.screenshot({ 
      path: `screenshots/${Date.now()}.png` 
    });
  }
});
```

---

### 5. Handle Errors Gracefully

```javascript
try {
  const data = await page.dom.batch({
    title: { selector: 'h1' },
    price: { selector: '.price' }
  });
  
  if (data.title === null) {
    console.warn('Title not found');
  }
  
  console.log(data);
} catch (error) {
  console.error('Scraping failed:', error.message);
}
```

---

## Troubleshooting

### Bridge Not Responding

**Problem:** Queries timeout or fail

**Solutions:**
1. Check if bridge is initialized:
   ```javascript
   const status = await page.dom.status();
   console.log(status);
   ```

2. Manually refresh:
   ```javascript
   await page.dom.refresh();
   ```

3. Check current URL:
   ```javascript
   console.log(page.url());
   ```

---

### Element Not Found

**Problem:** Query returns `null`

**Solutions:**
1. Verify selector is correct:
   ```javascript
   const count = await page.dom.count('your-selector');
   console.log(`Found ${count} elements`);
   ```

2. Check if element exists:
   ```javascript
   const exists = await page.dom.exists('your-selector');
   console.log(`Element exists: ${exists}`);
   ```

3. Get all matching elements:
   ```javascript
   const all = await page.dom.queryAll('your-selector');
   console.log(all);
   ```

---

### Navigation Issues

**Problem:** Navigation fails or times out

**Solutions:**
1. Use different wait options:
   ```javascript
   await page.dom.goto(url, { 
     waitUntil: 'domcontentloaded' 
   });
   ```

2. Wait for specific element:
   ```javascript
   await page.dom.gotoAndWait(url, '.main-content');
   ```

3. Increase timeout:
   ```javascript
   await page.dom.gotoAndWait(url, '.content', 60000);
   ```

---

### Performance Issues

**Problem:** Queries are slow

**Solutions:**
1. Use batch queries instead of individual queries
2. Reduce refresh interval if too frequent
3. Disable auto-refresh if not needed:
   ```javascript
   page.dom.stopAutoRefresh();
   ```

---

## Performance Comparison

### Traditional Approach
```javascript
// 100 products × 5 fields = 500 page.evaluate() calls
for (let i = 0; i < 100; i++) {
  await page.goto(urls[i]);
  await page.evaluate(() => document.querySelector('h1').textContent);
  await page.evaluate(() => document.querySelector('.price').textContent);
  await page.evaluate(() => document.querySelector('.desc').textContent);
  await page.evaluate(() => document.querySelector('.stock').textContent);
  await page.evaluate(() => document.querySelector('.rating').textContent);
}
// Total: 500 evaluate calls
```

### With DOM Bridge
```javascript
// 1 setup + 100 products × 1 batch = 101 operations (80% reduction!)
await setupDOMBridge(page);
for (let i = 0; i < 100; i++) {
  await page.dom.goto(urls[i]);
  await page.dom.batch({
    title: { selector: 'h1' },
    price: { selector: '.price' },
    desc: { selector: '.desc' },
    stock: { selector: '.stock' },
    rating: { selector: '.rating' }
  });
}
// Total: 101 operations
```

---

## License

MIT

---

## Support

For issues and questions, please refer to the troubleshooting section or check the examples provided in this documentation.