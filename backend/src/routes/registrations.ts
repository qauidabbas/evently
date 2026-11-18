import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRegistrationSchema } from '../schemas/registration.schema';
import prisma from '../lib/prisma';
import { randomUUID } from 'crypto';
import { emailQueue } from '../queues/email.queue';

const router = Router();

// POST /api/registrations
router.post(
  '/',
  authenticate,
  validate(createRegistrationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { eventId, attendeeName, attendeeEmail } = req.body;

      // Find the user to get their name and email
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found in database. Please sign in again.' });
        return;
      }

      // Check if already registered
      const existing = await prisma.registration.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId: user.id
          }
        }
      });

      if (existing) {
        res.status(400).json({ error: 'You are already registered for this event' });
        return;
      }

      // Execute transaction with row-level locking to prevent overselling
      const { registration, updatedEvent } = await prisma.$transaction(async (tx) => {
        // 1. Lock the event row. 
        // Using Prisma $queryRaw for 'FOR UPDATE' which grabs an exclusive row-level lock.
        // This ensures no other concurrent transaction can read or modify this event's capacity until we commit.
        const events: any[] = await tx.$queryRaw`
          SELECT capacity, "registrationCount" 
          FROM "Event" 
          WHERE id = ${eventId} 
          FOR UPDATE
        `;

        if (events.length === 0) {
          throw new Error("Event not found");
        }

        const event = events[0];

        // 2. Enforce capacity safely
        if (event.registrationCount >= event.capacity) {
          throw new Error("Event is sold out");
        }

        // 3. Create the registration ticket
        const qrCode = randomUUID();
        
        const registration = await tx.registration.create({
          data: {
            eventId,
            userId: user.id,
            attendeeName: attendeeName || user.name,
            attendeeEmail: attendeeEmail || user.email,
            qrCode,
            status: "confirmed"
          }
        });

        // 4. Safely increment the registration count
        const updatedEvent = await tx.event.update({
          where: { id: eventId },
          data: {
            registrationCount: {
              increment: 1
            }
          }
        });

        return { registration, updatedEvent };
      });

      // 5. Emit socket event for real-time capacity updates
      const io = req.app.get('io');
      if (io) {
        io.to(`event-${eventId}`).emit('seat-update', {
          eventId,
          registrationCount: updatedEvent.registrationCount,
          capacity: updatedEvent.capacity
        });
      }

      // 6. Enqueue an email job in the background
      await emailQueue.add('registration-confirmation', {
        to: attendeeEmail || user.email,
        subject: 'Registration Confirmed',
        body: `You have successfully registered for the event. Your ticket QR code is ${qrCode}`
      });

      res.status(201).json({ message: 'Successfully registered', registration });
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.message === "Event not found" || error.message === "Event is sold out") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  }
);

// DELETE /api/registrations/:id
import { deleteRegistrationSchema } from '../schemas/registration.schema';

router.delete(
  '/:id',
  authenticate,
  validate(deleteRegistrationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const registrationId = req.params.id;

      // Check if registration exists and belongs to the user
      const existingRegistration = await prisma.registration.findUnique({
        where: { id: registrationId }
      });

      if (!existingRegistration) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }

      if (existingRegistration.userId !== userId) {
        res.status(403).json({ error: 'You are not authorized to cancel this registration' });
        return;
      }

      // Execute transaction to delete registration and decrement event capacity
      const updatedEvent = await prisma.$transaction(async (tx) => {
        // 1. Delete the registration
        await tx.registration.delete({
          where: { id: registrationId }
        });

        // 2. Decrement the event registration count
        const updatedEvent = await tx.event.update({
          where: { id: existingRegistration.eventId },
          data: {
            registrationCount: {
              decrement: 1
            }
          }
        });
        
        return updatedEvent;
      });

      // 3. Emit socket event for real-time capacity updates
      const io = req.app.get('io');
      if (io) {
        io.to(`event-${existingRegistration.eventId}`).emit('seat-update', {
          eventId: existingRegistration.eventId,
          registrationCount: updatedEvent.registrationCount,
          capacity: updatedEvent.capacity
        });
      }

      res.status(200).json({ message: 'Registration cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling registration:', error);
      res.status(500).json({ error: 'Failed to cancel registration' });
    }
  }
);

// POST /api/registrations/:id/check-in
import { checkInSchema } from '../schemas/registration.schema';

router.post(
  '/:id/check-in',
  authenticate,
  validate(checkInSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const registrationId = req.params.id;
      const { qrCode } = req.body;

      // Find the registration and include the event to check organizerId
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { event: true }
      });

      if (!registration) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }

      // Check if the current user is the host of the event
      if (registration.event.organizerId !== userId) {
        res.status(403).json({ error: 'You are not authorized to check in attendees for this event' });
        return;
      }

      // Validate the QR code
      if (registration.qrCode !== qrCode) {
        res.status(400).json({ error: 'Invalid QR code' });
        return;
      }

      // Check if already checked in
      if (registration.checkedIn) {
        res.status(400).json({ error: 'Attendee is already checked in' });
        return;
      }

      // Update the registration
      const updatedRegistration = await prisma.registration.update({
        where: { id: registrationId },
        data: {
          checkedIn: true,
          checkedInAt: new Date()
        }
      });

      res.status(200).json({ 
        message: 'Attendee checked in successfully', 
        registration: updatedRegistration 
      });
    } catch (error) {
      console.error('Error checking in attendee:', error);
      res.status(500).json({ error: 'Failed to check in attendee' });
    }
  }
);

export default router;
