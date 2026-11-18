"use client"
import React, { useEffect, useState } from 'react';
import { EventCard } from '@/components/EventCard';
import { BarLoader } from 'react-spinners';
import { Button } from '@/components/ui/button';

const ExplorePage = () => {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Categories
        const catRes = await fetch('http://localhost:5000/api/events/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || {});
        }

        // Fetch Events
        const url = activeCategory 
          ? `http://localhost:5000/api/events?category=${activeCategory}`
          : 'http://localhost:5000/api/events';

        const evRes = await fetch(url);
        if (!evRes.ok) throw new Error('Failed to fetch events');
        
        const evData = await evRes.json();
        setEvents(evData.events || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Explore Events</h1>
        <p className="text-zinc-400 max-w-2xl mx-auto">Discover the best events happening around you. Filter by category to find exactly what you're looking for.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        <Button 
          variant={activeCategory === null ? "default" : "outline"} 
          onClick={() => setActiveCategory(null)}
          className="rounded-full"
        >
          All
        </Button>
        {Object.keys(categories).map(cat => (
          <Button 
            key={cat} 
            variant={activeCategory === cat ? "default" : "outline"} 
            onClick={() => setActiveCategory(cat)}
            className="rounded-full"
          >
            {cat} <span className="ml-2 text-xs opacity-70">({categories[cat]})</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <BarLoader color="#ec4899" width={200} />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-10">{error}</div>
      ) : events.length === 0 ? (
        <div className="text-center text-zinc-500 py-20 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
          No events found for this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;