'use client';

import { useState } from 'react';

export default function ProductContainerIdentifier() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const identifyContainers = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze the page.');
      }

      const { results: analyzedResults, error: responseError } = await response.json();

      if (responseError) {
        throw new Error(responseError);
      }
      setResults(analyzedResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Product Container Identifier</h1>
      
      <form onSubmit={identifyContainers} className="mb-6">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter website URL"
            required
            className="flex-1 px-4 py-2 border rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          {error}
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Results</h2>
          
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-medium mb-2">Summary</h3>
            <p>Total containers found: {results.summary.totalFound}</p>
            <p>High confidence matches: {results.summary.highConfidence}</p>
            <p>Medium confidence matches: {results.summary.mediumConfidence}</p>
          </div>

          {results.products.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Product Containers</h3>
              <div className="space-y-2">
                {results.products.map((product, index) => (
                  <div key={index} className="p-4 border rounded">
                    <div className="flex justify-between">
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {product.selector}
                      </code>
                      <span className="text-sm text-gray-600">
                        Confidence: {Math.round(product.confidence * 100)}%
                      </span>
                    </div>
                    {Object.entries(product.characteristics).length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>Detected features:</p>
                        <ul className="list-disc list-inside">
                          {Object.keys(product.characteristics).map((key) => (
                            <li key={key}>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.layoutPattern && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium mb-2">Layout Pattern</h3>
              <p>Type: {results.layoutPattern.isGrid ? 'Grid' : results.layoutPattern.isList ? 'List' : 'Unknown'}</p>
              {results.layoutPattern.isGrid && (
                <>
                  <p>Rows: {results.layoutPattern.rowCount}</p>
                  <p>Columns: {results.layoutPattern.columnCount}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}