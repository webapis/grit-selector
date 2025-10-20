'use client';

import { useState, useRef, useEffect } from 'react';

export default function InteractiveSelector() {
  const [url, setUrl] = useState('https://www.google.com');
  const [iframeSrc, setIframeSrc] = useState('');
  const iframeRef = useRef(null);
  const [selectors, setSelectors] = useState([]);

  const handleLoadUrl = () => {
    setIframeSrc(`/api/proxy?url=${encodeURIComponent(url)}`);
  };

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (iframe) {
      const script = iframe.contentDocument.createElement('script');
      script.src = '/selector-script.js';
      iframe.contentDocument.body.appendChild(script);
    }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'selector') {
        setSelectors((prev) => [...prev, { name: '', selector: event.data.selector }]);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleSelectorNameChange = (index, newName) => {
    const newSelectors = [...selectors];
    newSelectors[index].name = newName;
    setSelectors(newSelectors);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSaveSelectors = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/selectors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, selectors }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save selectors');
      }

      // Optionally, you could clear the selectors or show a success message
      console.log('Selectors saved successfully!');
      setSelectors([]); // Clear selectors on successful save

    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      <div className="z-10 w-full max-w-7xl items-center justify-between font-mono text-sm lg:flex mb-8">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Interactive Selector</h1>
      </div>

      <div className="w-full max-w-7xl bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <div className="flex gap-4 mb-6">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="https://example.com"
          />
          <button
            onClick={handleLoadUrl}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Load Page
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="w-full h-[600px] border border-gray-300 rounded-md overflow-hidden">
            {iframeSrc ? (
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                className="w-full h-full"
                title="Interactive Selector"
                onLoad={handleIframeLoad}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">Enter a URL and click "Load Page" to begin.</p>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Selected Selectors</h2>
            <div className="space-y-4">
              {selectors.map((s, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md border">
                  <input
                    type="text"
                    placeholder="Enter name" 
                    value={s.name}
                    onChange={(e) => handleSelectorNameChange(index, e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm w-1/3"
                  />
                  <code className="text-sm text-gray-900 bg-gray-200 px-2 py-1 rounded-md flex-grow">{s.selector}</code>
                </div>
              ))}
            </div>
            {selectors.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={handleSaveSelectors}
                  disabled={isSaving}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                >
                  {isSaving ? 'Saving...' : 'Save Selectors'}
                </button>
                {saveError && (
                  <p className="mt-2 text-sm text-red-600">{`Error: ${saveError}`}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
