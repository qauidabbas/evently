"use client"
import Link from 'next/link';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export function EventCard({ event }) {
  const { title, slug, startDate, city, state, capacity, registrationCount, coverImage, category, themeColor } = event;
  const isSoldOut = registrationCount >= capacity;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all group border-zinc-800 bg-zinc-900/50">
      <div className="relative h-48 w-full overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center">
            <span className="text-4xl font-bold text-zinc-700">{title.charAt(0)}</span>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <Badge className="bg-background/80 backdrop-blur-md text-white hover:bg-background/90">{category}</Badge>
        </div>
      </div>
      <CardHeader className="p-4">
        <h3 className="text-xl font-bold line-clamp-1 group-hover:text-pink-400 transition-colors">{title}</h3>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2 text-sm text-zinc-400">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-pink-500" />
          <span>{new Date(startDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-pink-500" />
          <span>{city}, {state}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-pink-500" />
          <span>{registrationCount} / {capacity} Registered</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full" variant={isSoldOut ? "secondary" : "default"}>
          <Link href={`/explore/${slug}`}>
            {isSoldOut ? 'Waitlist' : 'View Details'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
