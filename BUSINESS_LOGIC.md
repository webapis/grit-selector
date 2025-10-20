# Project Goal

The purpose of this application is to streamline the web scraping workflow by decoupling the selector discovery process from the data extraction task. It provides a targeted interface for users to identify, test, and save CSS selectors for product-related information on various e-commerce sites. These selectors are then stored in a structured Supabase database, creating a reliable and easy-to-maintain "selector repository" that external web scraping projects can consume.

# Core Features

## Interactive Selector Discovery (`/interactive-selector`)

This feature now supports two distinct e-commerce page types:

### 1. Product List Pages
- **Purpose**: Capture selectors for lists of products
- **Required Selectors**:
  - Product Card Container (`.product-list-item`)
  - Product Link (`a.product-link`)
  - Product Thumbnail (`.product-thumb`)
  - Product Title (`.product-title`)
  - List Price (`.list-price`)
  - Sale Price (`.sale-price`)

### 2. Product Detail Pages
- **Purpose**: Capture selectors for individual product details
- **Required Selectors**:
  - Product Title (`.product-name`)
  - Main Price (`.main-price`)
  - Product Description (`.description`)
  - Product SKU (`.sku`)
  - Image Gallery (`.gallery-container`)
  - Variant Selectors (`.variant-options`)
  - Add to Cart Button (`.add-to-cart`)
  - Stock Status (`.stock-status`)

### Selector Type Identification
- Add a "Page Type" dropdown to specify whether the selectors are for:
  - Product List Page
  - Product Detail Page
- Store this information in the database schema
- Validate required selectors based on page type

### Database Schema Update
```sql
CREATE TYPE page_type AS ENUM ('list', 'detail');

ALTER TABLE selectors 
ADD COLUMN page_type page_type NOT NULL DEFAULT 'detail',
ADD COLUMN required_selectors_complete BOOLEAN DEFAULT false;
```

This is the primary feature of the application. It allows users to interactively discover CSS selectors from a live website.

*   **Load a Webpage:** Users can enter a URL, which is then loaded into an `iframe` within the application. A server-side proxy is used to bypass browser security restrictions (CORS, X-Frame-Options).
*   **Element Highlighting:** As the user hovers over elements on the page, they are highlighted with an overlay.
*   **Selector Generation:** When a user clicks on an element, a unique CSS selector for that element is automatically generated.
*   **Naming and Saving:** The generated selectors are displayed on the side, where the user can assign a descriptive name (e.g., "productTitle", "price"). The collection of named selectors can then be saved to the Supabase database.

## Selector History and Management (`/history`)

This page provides a view of all the selectors that have been saved to the database.

*   **View Saved Selectors:** It displays a list of all the saved selector sets, grouped by URL and ordered by creation date.
*   **Expandable Details:** Users can click on a URL to expand it and view the list of named selectors associated with it.
*   **Search:** A search bar allows users to filter the list of URLs.
*   **Edit:** An "Edit" button allows users to modify the URL and the names and values of the selectors for a given entry.
*   **Delete:** A "Delete" button allows users to remove a selector entry from the database.

## Home Page (`/`)

The home page serves as a landing page, providing links to the main features of the application:

*   **Interactive Selector:** Links to the `/interactive-selector` page.
*   **Manual Testing:** Links to the `/manual-testing` page.
*   **History:** Links to the `/history` page.

## Manual Selector Testing (`/manual-testing`)

This page provides a simple interface for manually testing CSS selectors.

*   **Manual Input:** Users can enter a URL and a JSON object of queries.
*   **Scraping and Display:** The application makes a request to the backend, scrapes the page based on the provided selectors, and displays the results.
*   **Logging:** All scrape attempts from this page are logged to a `scrape_logs` table in Supabase.

# Backend and Architecture

## API Routes

*   `/api/scrape`: Handles the manual scraping requests from the main page.
*   `/api/proxy`: A server-side proxy to fetch and return the content of external websites for the interactive selector.
*   `/api/selectors`: A RESTful endpoint for managing the saved selectors.
    *   `GET`: Fetches all saved selectors.
    *   `POST`: Saves a new set of selectors.
*   `/api/selectors/[id]`: A dynamic route for managing individual selector entries.
    *   `GET`: Fetches a single selector entry by ID.
    *   `PUT`: Updates a selector entry.
    *   `DELETE`: Deletes a selector entry.

## Database

The application uses Supabase (PostgreSQL) for data storage.

*   `selectors` table: Stores the named selectors saved from the interactive selector page. It has columns for `id`, `created_at`, `url`, and `selectors` (JSONB).
*   `scrape_logs` table: Logs all scraping attempts from the manual testing page.

# Technologies Used

*   **Frontend:** Next.js, React, Tailwind CSS
*   **Backend:** Next.js API Routes, Puppeteer
*   **Database:** Supabase (PostgreSQL)
