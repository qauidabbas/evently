"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BarLoader } from 'react-spinners';
import { toast } from 'sonner';
import { Calendar, MapPin, Tag, Image as ImageIcon } from 'lucide-react';

const CreateEventPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    startDate: '',
    endDate: '',
    timezone: 'UTC',
    locationType: 'in-person',
    venue: '',
    address: '',
    city: '',
    state: '',
    country: '',
    capacity: '',
    ticketType: 'paid',
    ticketPrice: '',
    coverImage: ''
  });

  // Redirect if not logged in
  React.useEffect(() => {
    if (user === null) {
      router.push('/sign-in');
    }
  }, [user, router]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      
      const payload = {
        ...formData,
        capacity: parseInt(formData.capacity),
        ticketPrice: formData.ticketType === 'free' ? 0 : parseFloat(formData.ticketPrice || '0'),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      const res = await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      toast.success('Event created successfully!');
      router.push(`/explore/${data.event.slug}`);
      
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">Create New Event</h1>
        <p className="text-zinc-400">Fill out the details below to host your next amazing event.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-900/50 backdrop-blur-md p-8 rounded-3xl border border-zinc-800">
        
        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Tag className="text-pink-500 w-5 h-5"/> Basic Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Event Title</label>
              <Input name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Next.js Conf 2026" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea name="description" value={formData.description} onChange={handleChange} required rows={4} placeholder="Describe your event..." className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Input name="category" value={formData.category} onChange={handleChange} required placeholder="e.g. Technology" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tags (comma separated)</label>
              <Input name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g. react, nextjs, web" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
          </div>
        </section>

        <div className="border-t border-zinc-800"></div>

        {/* Date & Time */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="text-pink-500 w-5 h-5"/> Date & Time</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date & Time</label>
              <Input type="datetime-local" name="startDate" value={formData.startDate} onChange={handleChange} required className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500 block w-full"/>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date & Time</label>
              <Input type="datetime-local" name="endDate" value={formData.endDate} onChange={handleChange} required className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500 block w-full"/>
            </div>
          </div>
        </section>

        <div className="border-t border-zinc-800"></div>

        {/* Location */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="text-pink-500 w-5 h-5"/> Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="col-span-1 md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Venue Name</label>
              <Input name="venue" value={formData.venue} onChange={handleChange} required placeholder="e.g. Moscone Center" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input name="address" value={formData.address} onChange={handleChange} required placeholder="123 Event Way" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">City</label>
              <Input name="city" value={formData.city} onChange={handleChange} required placeholder="San Francisco" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">State / Region</label>
              <Input name="state" value={formData.state} onChange={handleChange} required placeholder="CA" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Country</label>
              <Input name="country" value={formData.country} onChange={handleChange} required placeholder="USA" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
          </div>
        </section>

        <div className="border-t border-zinc-800"></div>

        {/* Ticketing & Media */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><ImageIcon className="text-pink-500 w-5 h-5"/> Ticketing & Media</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Capacity (Total Seats)</label>
              <Input type="number" min="1" name="capacity" value={formData.capacity} onChange={handleChange} required placeholder="500" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ticket Price ($)</label>
              <Input type="number" step="0.01" min="0" name="ticketPrice" value={formData.ticketPrice} onChange={handleChange} placeholder="0 for free" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
             <div className="col-span-1 md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Cover Image URL</label>
              <Input type="url" name="coverImage" value={formData.coverImage} onChange={handleChange} placeholder="https://example.com/image.jpg" className="bg-zinc-800 border-zinc-700 focus-visible:ring-pink-500"/>
            </div>
          </div>
        </section>

        <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-pink-600 to-orange-500 hover:opacity-90 py-6 text-lg border-0 shadow-lg">
          {loading ? <BarLoader color="#fff" width={100} /> : 'Publish Event'}
        </Button>
      </form>
    </div>
  );
};

export default CreateEventPage;
