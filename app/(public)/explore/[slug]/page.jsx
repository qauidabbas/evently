"use client"
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Info, Clock, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarLoader } from 'react-spinners';
import { toast } from 'sonner';

const EventDetailPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // We need to fetch the event by slug first to get its ID for the socket hook
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/events/${slug}`);
        if (!res.ok) throw new Error('Event not found');
        const data = await res.json();
        setEvent(data.event);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug]);

  // Pass event.id to useSocket, which will return liveSeatCount if updated via websockets
  const { liveSeatCount } = useSocket(event?.id);

  // The actual displayed capacity is either the real-time one from socket, or the initial one fetched
  const currentCapacity = liveSeatCount !== null 
    ? liveSeatCount 
    : event ? Math.max(0, event.capacity - event.registrationCount) : 0;

  const isSoldOut = currentCapacity === 0;

  const handleRegister = async () => {
    if (!user) {
      toast.error('You must be signed in to register');
      router.push('/sign-in');
      return;
    }

    setIsRegistering(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:5000/api/registrations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ eventId: event.id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      toast.success('Successfully registered! Check your email for tickets.');
      // The socket event will automatically tick down the seat count for us!
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-32"><BarLoader color="#ec4899" width={200} /></div>;
  }

  if (error || !event) {
    return <div className="text-center py-32 text-red-400">{error || 'Event not found'}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
        {event.coverImage ? (
          <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-600/30 to-orange-500/30 flex items-center justify-center">
            <h1 className="text-6xl font-bold opacity-30">{event.title.charAt(0)}</h1>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <Badge className="bg-background/80 backdrop-blur-md text-white px-4 py-1 text-lg border-zinc-700">{event.category}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.title}</h1>
            <div className="flex items-center gap-4 text-zinc-400 mb-6">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-pink-500" /> {new Date(event.startDate).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-pink-500" /> {event.city}, {event.state}</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Info className="text-pink-500"/> About this event</h3>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        </div>

        {/* Right Column / Sticky Sidebar */}
        <div>
          <div className="sticky top-32 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-6">Ticket Details</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <span className="text-zinc-400 flex items-center gap-2"><DollarSign className="w-4 h-4 text-pink-500"/> Price</span>
                <span className="font-semibold text-lg">{event.ticketPrice > 0 ? `$${event.ticketPrice}` : 'Free'}</span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <span className="text-zinc-400 flex items-center gap-2"><Clock className="w-4 h-4 text-pink-500"/> Timezone</span>
                <span className="font-semibold text-right">{event.timezone || 'Local'}</span>
              </div>

              <div className="flex justify-between items-center pb-4">
                <span className="text-zinc-400 flex items-center gap-2"><Users className="w-4 h-4 text-pink-500"/> Remaining Seats</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="font-bold text-xl">{currentCapacity}</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full text-lg py-6 bg-gradient-to-r from-pink-600 to-orange-500 hover:opacity-90 transition-all border-0"
              disabled={isSoldOut || isRegistering}
              onClick={handleRegister}
            >
              {isRegistering ? <BarLoader color="#ffffff" width={50} /> : isSoldOut ? 'Sold Out' : 'Register Now'}
            </Button>
            
            {!user && <p className="text-xs text-center text-zinc-500 mt-4">You must be signed in to register</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;