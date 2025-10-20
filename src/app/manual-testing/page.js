'use client';

import { useState } from 'react';

const defaultQueries = {
  title: { selector: 'h1' },
  price: { selector: '.price', type: 'text' },
  description: { selector: '.desc', type: 'html' },
  productId: { selector: '[data-product-id]', type: 'attr', attribute: 'data-product-id' },
  inputValue: { selector: 'input#email', type: 'value' },
  hasStock: { selector: '.in-stock', type: 'exists' },
};

export default function ManualTesting() {
  const [url, setUrl] = useState('https://www.google.com');
  const [queries, setQueries] = useState(JSON.stringify(defaultQueries, null, 2));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    let parsedQueries;
    try {
      parsedQueries = JSON.parse(queries);
    } catch (jsonError) {
      setError('Invalid JSON in queries text area.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, queries: parsedQueries }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResult(data);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-8">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">DOM Bridge Scraper</h1>
      </div>

      <div className="w-full max-w-5xl bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Target URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="queries" className="block text-sm font-medium text-gray-700 mb-1">
              Queries (JSON)
            </label>
            <textarea
              id="queries"
              rows={10}
              value={queries}
              onChange={(e) => setQueries(e.target.value)}
              className="block w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Scraping...' : 'Scrape Page'}
            </button>
          </div>
        </form>

        {(error || result) && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800">Result</h2>
            <div className="mt-4 p-4 bg-gray-100 rounded-md border border-gray-200">
              {error && (
                <pre className="text-sm text-red-600 whitespace-pre-wrap">{`Error: ${error}`}</pre>
              )}
              {result && (
                <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
