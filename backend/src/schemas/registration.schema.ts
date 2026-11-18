import { z } from 'zod';

export const createRegistrationSchema = z.object({
  body: z.object({
    eventId: z.string().uuid("Invalid event ID format"),
    attendeeName: z.string().min(1, "Name is required").optional(),
    attendeeEmail: z.string().email("Invalid email").optional()
  })
});

export const deleteRegistrationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid registration ID format")
  })
});

export const checkInSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid registration ID format")
  }),
  body: z.object({
    qrCode: z.string().uuid("Invalid QR code format")
  })
});
