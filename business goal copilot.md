
# **Project Overview**

This project aims to simplify and strengthen the web scraping workflow by **decoupling the selector discovery process** from **data extraction**. It provides a focused interface for identifying, testing, and storing CSS selectors for product-related information across e-commerce websites.

All verified selectors are stored in a **Supabase database**, forming a centralized and easily maintainable **"selector repository"** that other scraping applications can use seamlessly.

---

# **Project Summary**

Web scraping often becomes fragile because CSS selectors — the rules used to locate data on a webpage — are hard-coded directly into scraping scripts. When website layouts change, those scripts break, requiring manual code updates.

This project eliminates that pain point. It introduces a web application that **separates the process of discovering selectors from the actual scraping logic**, creating a robust and maintainable ecosystem for scraping tasks.

### **Key Features & Workflow**

1. **Discover & Test**
   Users can enter an e-commerce product URL and visually inspect the page using an integrated Puppeteer-driven interface. They can select and test CSS selectors for specific data points such as product name, price, or image URL.

2. **Save**
   Once verified, the selectors are saved to a structured **Supabase (PostgreSQL)** database. Each record is tied to a specific site and data type, creating an organized "selector repository."

3. **Consume**
   External scraping tools can query this repository to retrieve the latest, pre-verified selectors — without embedding selector logic in their own code.
   If a website changes, only the repository entry needs updating, and all connected scraping tools automatically benefit.


---

# **Business Value**

By separating **selector management** from **scraping execution**, this system achieves:

* Easier maintenance and reduced downtime when sites change layouts.
* Centralized control of all selectors in one reliable repository.
* Cleaner and more modular scraping scripts.
* Increased reliability and scalability for multi-site scraping projects.

In essence, the application transforms CSS selector management from a repetitive manual task into a **centralized, reusable service** that supports multiple scraping workflows.


---

# **Technologies Used**

* **Frontend:** Next.js, React, Tailwind CSS
* **Backend:** Next.js API Routes, Puppeteer
* **Database:** Supabase (PostgreSQL)
