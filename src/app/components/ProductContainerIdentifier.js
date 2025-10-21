'use client';

import { useState } from 'react';

export default function ProductContainerIdentifier() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
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
                      <div
                        key={index}
                        className={`p-4 border rounded cursor-pointer ${selected === product.selector ? 'ring-2 ring-blue-300' : ''}`}
                        onClick={() => {
                          console.log('row clicked', product.selector);
                          setSelected(product.selector);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { console.log('row keydown', e.key, product.selector); setSelected(product.selector); } }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <input
                              id={`selector-${index}`}
                              type="radio"
                              name="selectedProduct"
                              value={product.selector}
                              checked={selected === product.selector}
                              onChange={(e) => { console.log('radio changed', e.target.value); setSelected(product.selector); }}
                              className="w-4 h-4"
                              onClick={(e) => e.stopPropagation()} // prevent double handling
                            />
                            <label htmlFor={`selector-${index}`} className="select-none">
                              <code className="bg-gray-100 px-2 py-1 rounded">
                                {product.selector}
                              </code>
                            </label>
                          </div>
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

              {/* Save selection area */}
              <div className="mt-4">
                <div className="mb-2 text-sm text-gray-700">Current selected: <span className="font-mono">{selected || 'none'}</span></div>
                <button
                  type="button"
                  disabled={!selected}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError(null);
                      const resp = await fetch('/api/save-selection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          url,
                          selector: selected,
                          results
                        })
                      });

                      if (!resp.ok) {
                        const err = await resp.json();
                        throw new Error(err.error || 'Failed to save selection');
                      }

                      const body = await resp.json();
                      // Optional: show a success message (simple alert for now)
                      alert('Selection saved with id: ' + (body.id || 'unknown'));
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
                >
                  Save selection
                </button>
              </div>

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