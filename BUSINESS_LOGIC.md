# Business Logic

This document outlines the business logic of the Grit Selector application.

## Core Functionality

The application is a web-based tool that allows users to scrape data from any website using a simple and powerful query language. The core functionality is exposed through a single-page user interface and a backend API.

### User Interface

The user interface consists of a form with two main fields:

*   **Target URL:** The URL of the website to be scraped.
*   **Queries (JSON):** A JSON object that defines the data to be extracted from the page.

When the user submits the form, the application sends a request to the backend API and displays the scraped data on the page.

### Backend API

The backend is a single API endpoint, `/api/scrape`, that accepts `POST` requests with a JSON body containing the `url` and `queries`.

The API uses `puppeteer` to launch a headless browser and navigate to the specified URL. It then injects a custom "DOM Bridge" into the page, which allows the server to execute queries against the page's DOM.

The queries are executed in a batch, and the results are returned to the client as a JSON object.

### Data Logging

All scraping attempts, both successful and failed, are logged to a `scrape_logs` table in a Supabase database. This provides a historical record of all scraping operations, which can be used for monitoring, debugging, and auditing purposes.

## Query Language

The query language is based on a simple JSON object format. Each key in the object represents a piece of data to be extracted, and the value is an object that specifies the selector and the type of data to be extracted.

The following query types are supported:

*   `text`: Extracts the text content of the selected element.
*   `html`: Extracts the HTML content of the selected element.
*   `attr`: Extracts the value of a specified attribute from the selected element.
*   `value`: Extracts the value of an input field.
*   `exists`: Checks for the existence of the selected element.

### Example Queries

```json
{
  "title": { "selector": "h1" },
  "price": { "selector": ".price", "type": "text" },
  "description": { "selector": ".desc", "type": "html" },
  "productId": { "selector": "[data-product-id]", "type": "attr", "attribute": "data-product-id" },
  "inputValue": { "selector": "input#email", "type": "value" },
  "hasStock": { "selector": ".in-stock", "type": "exists" }
}
```

## Technologies Used

*   **Frontend:** Next.js, React
*   **Backend:** Next.js API Routes, Puppeteer
*   **Database:** Supabase (PostgreSQL)


Project Goal
The primary objective of this application is to serve as a specialized tool for identifying and cataloging CSS selectors that correspond to product information on e-commerce websites. The collected selectors are stored in a Supabase database, creating a centralized repository that can be consumed by other web scraping services.

Core User Stories
Selector Discovery and Storage: As a user, I want to provide a target URL for a product page and be able to identify and save the specific CSS selectors for various product attributes (such as name, price, description, and images) into a Supabase database.

Historical Data Retrieval: As a user, I need to be able to view a comprehensive history of all the target URLs that have been previously processed.

Search and Filtering: As a user, I want the ability to search and filter through the historical data to quickly locate a specific target URL and its associated CSS selectors.

The purpose of this application is to streamline the web scraping workflow by decoupling the selector discovery process from the data extraction task. It provides a targeted interface for users to identify, test, and save CSS selectors for product-related information on various e-commerce sites. These selectors are then stored in a structured Supabase database, creating a reliable and easy-to-maintain "selector repository" that external web scraping projects can consume.