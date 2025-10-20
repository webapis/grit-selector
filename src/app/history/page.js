'use client';

import { useState, useEffect } from 'react';

export default function History() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/selectors');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const [editingId, setEditingId] = useState(null);

  const [editedItem, setEditedItem] = useState(null);

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditedItem({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedItem(null);
  };

  const handleUpdateItem = async () => {
    if (!editedItem) return;

    try {
      const response = await fetch(`/api/selectors/${editedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedItem),
      });

      if (!response.ok) {
        throw new Error('Failed to update the item.');
      }

      const updatedItem = await response.json();

      setData((prevData) =>
        prevData.map((item) => (item.id === updatedItem[0].id ? updatedItem[0] : item))
      );

      setEditingId(null);
      setEditedItem(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (e, field) => {
    setEditedItem((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelectorChange = (e, index, field) => {
    const newSelectors = [...editedItem.selectors];
    newSelectors[index][field] = e.target.value;
    setEditedItem((prev) => ({ ...prev, selectors: newSelectors }));
  };


  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`/api/selectors/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete the item.');
        }

        setData((prevData) => prevData.filter((item) => item.id !== id));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <p className="p-12">Loading...</p>;
  if (error) return <p className="p-12 text-red-600">{`Error: ${error}`}</p>;

  const filteredData = data.filter((item) =>
    item.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-8">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Selector History</h1>
      </div>

      <div className="w-full max-w-5xl bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="space-y-4">
          {filteredData.map((item) => (
            <div key={item.id} className="border-b border-gray-200 pb-4">
              {editingId === item.id ? (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">URL</label>
                    <input
                      type="text"
                      value={editedItem.url}
                      onChange={(e) => handleInputChange(e, 'url')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    {editedItem.selectors.map((selector, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={selector.name}
                          onChange={(e) => handleSelectorChange(e, index, 'name')}
                          className="px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm w-1/3"
                        />
                        <input
                          type="text"
                          value={selector.selector}
                          onChange={(e) => handleSelectorChange(e, index, 'selector')}
                          className="px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm w-2/3"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end gap-4">
                    <button onClick={handleCancelEdit} className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleUpdateItem} className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button onClick={() => toggleExpand(item.id)} className="w-full text-left">
                    <h2 className="text-lg font-semibold text-indigo-600 truncate">{item.url}</h2>
                    <p className="text-sm text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
                  </button>
                  <div className="flex">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="ml-2 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="ml-4 px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
              {expanded[item.id] && editingId !== item.id && (
                <div className="mt-4 pl-4 border-l-2 border-indigo-200">
                  <h3 className="text-md font-semibold text-gray-700 mb-2">Selectors:</h3>
                  <ul className="space-y-2">
                    {item.selectors.map((selector, index) => (
                      <li key={index} className="flex items-center gap-4">
                        <span className="font-semibold text-gray-800">{selector.name}:</span>
                        <code className="text-sm text-gray-900 bg-gray-200 px-2 py-1 rounded-md">{selector.selector}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
