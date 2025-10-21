
# Project Goal

The purpose of this application is to streamline the web scraping workflow by decoupling the selector discovery process from the data extraction task. It provides a targeted interface for users to identify, test, and save CSS selectors for product-related information on various e-commerce sites. These selectors are then stored in a structured Supabase database, creating a reliable and easy-to-maintain "selector repository" that external web scraping projects can consume.


Project Summary
This is a sophisticated web application designed to solve a common and often tedious problem in web scraping: finding and maintaining the correct CSS selectors to extract data.

Instead of mixing selector logic directly into a scraping script, this tool decouples the discovery process from the extraction task. It acts as a centralized "selector repository" where a user can visually identify, test, and save selectors for specific e-commerce sites. These saved selectors are then stored in a Supabase database, ready to be consumed by other, separate scraping applications.


The main goal of this project is to make web scraping easier and more reliable by separating two key tasks: finding the data on a webpage and actually scraping that data.

Think of it this way: normally, when you write a web scraper, you have to hard-code the CSS selectors (like div.product-title or #price) directly into your scraping script. If the website changes its layout, your scraper breaks, and you have to go back into your code, find the new selectors, and update the script. This is tedious and error-prone.

This project solves that problem by creating a dedicated application that acts as a "selector repository."

Here's the workflow it enables:

Discover & Test: A user opens the application, enters a URL for an e-commerce product page, and gets a visual interface to find and test CSS selectors for specific pieces of information (e.g., product name, price, image URL).
Save: Once the user confirms a selector works correctly, they save it to a central database (Supabase). This database stores the selectors for different websites and data points.
Consume: Now, any separate web scraping script that needs to get data from that website can simply query the database to get the correct, pre-verified selectors. The scraping script itself doesn't need to contain any selector logic.
In short, the project's purpose is to create a centralized, easy-to-maintain library of CSS selectors that can be used by any number of external web scraping tools, making the overall scraping process more robust and streamlined.

# Technologies

*   **Frontend:** Next.js, React, Tailwind CSS
*   **Backend:** Next.js API Routes, Puppeteer
*   **Database:** Supabase (PostgreSQL)
