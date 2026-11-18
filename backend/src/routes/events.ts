import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createEventSchema } from '../schemas/event.schema';
import prisma from '../lib/prisma';
import { cacheMiddleware, invalidateCachePattern } from '../middleware/cache';

const router = Router();

// POST /api/events
router.post(
  '/',
  authenticate,
  validate(createEventSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const data = req.body;

      // Find the user to get their name
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found in database. Please sign in again.' });
        return;
      }

      const data = req.body;

      // Generate a basic slug (in a real app, you might want to ensure it's unique)
      const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${baseSlug}-${uniqueSuffix}`;

      const newEvent = await prisma.event.create({
        data: {
          title: data.title,
          description: data.description,
          slug,
          organizerId: user.id, // Our DB internal ID
          organizerName: user.name,
          category: data.category,
          tags: data.tags,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          timezone: data.timezone,
          locationType: data.locationType,
          venue: data.venue,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          capacity: data.capacity,
          ticketType: data.ticketType,
          ticketPrice: data.ticketPrice,
          coverImage: data.coverImage,
          themeColor: data.themeColor,
        },
      });

      await invalidateCachePattern('/api/events*');

      res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// PUT /api/events/:id
import { updateEventSchema } from '../schemas/event.schema';

router.put(
  '/:id',
  authenticate,
  validate(updateEventSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const eventId = req.params.id;
      const data = req.body;

      // Check if event exists
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!existingEvent) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      // Check if the event belongs to the authenticated user
      if (existingEvent.organizerId !== userId) {
        res.status(403).json({ error: 'You are not authorized to update this event' });
        return;
      }

      // Prepare update data (handle dates explicitly if provided)
      const updateData: any = { ...data };
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      
      // Update slug if title changed
      if (data.title && data.title !== existingEvent.title) {
        const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const uniqueSuffix = Math.random().toString(36).substring(2, 8);
        updateData.slug = `${baseSlug}-${uniqueSuffix}`;
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: updateData,
      });

      await invalidateCachePattern('/api/events*');

      res.status(200).json({ message: 'Event updated successfully', event: updatedEvent });
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// DELETE /api/events/:id
import { deleteEventSchema } from '../schemas/event.schema';

router.delete(
  '/:id',
  authenticate,
  validate(deleteEventSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const eventId = req.params.id;

      // Check if event exists
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!existingEvent) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      if (existingEvent.organizerId !== userId) {
        res.status(403).json({ error: 'You are not authorized to delete this event' });
        return;
      }

      // Delete the event
      await prisma.event.delete({
        where: { id: eventId }
      });

      await invalidateCachePattern('/api/events*');

      res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
);

// GET /api/events/:idOrSlug
router.get(
  '/:idOrSlug',
  cacheMiddleware(60),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const idOrSlug = req.params.idOrSlug;
      
      // Try finding by ID first if it looks like a UUID (simplistic regex check), otherwise find by slug
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);
      
      const event = await prisma.event.findFirst({
        where: isUUID ? { id: idOrSlug } : { slug: idOrSlug }
      });

      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      res.status(200).json({ event });
    } catch (error) {
      console.error('Error fetching event details:', error);
      res.status(500).json({ error: 'Failed to fetch event details' });
    }
  }
);

// GET /api/events/categories (To replace getCategoryCounts)
router.get(
  '/categories',
  cacheMiddleware(60),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const now = new Date();
      // Group by category where event is in the future
      const categories = await prisma.event.groupBy({
        by: ['category'],
        where: {
          startDate: {
            gte: now,
          },
        },
        _count: {
          category: true,
        },
      });

      const counts: Record<string, number> = {};
      categories.forEach((cat) => {
        counts[cat.category] = cat._count.category;
      });

      res.status(200).json({ categories: counts });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
);

// GET /api/events
import { getEventsQuerySchema } from '../schemas/event.schema';

router.get(
  '/',
  validate(getEventsQuerySchema),
  cacheMiddleware(60),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Since it's validated, req.query is correctly typed (though TS might not know it perfectly without a custom middleware type, we can assert or cast)
      const { category, city, state, search, sort, limit } = req.query as any;

      const now = new Date();

      const where: any = {
        startDate: {
          gte: now, // Only future events by default
        }
      };

      if (category) where.category = category;
      if (city) where.city = { equals: city, mode: 'insensitive' };
      if (state) where.state = { equals: state, mode: 'insensitive' };
      if (search) {
        where.title = { contains: search, mode: 'insensitive' };
      }

      let orderBy: any = { startDate: 'asc' }; // default 'upcoming'
      if (sort === 'popular') {
        orderBy = { registrationCount: 'desc' };
      }

      const events = await prisma.event.findMany({
        where,
        orderBy,
        take: parseInt(limit),
      });

      res.status(200).json({ events });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }
);

export default router;
