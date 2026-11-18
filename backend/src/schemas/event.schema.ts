import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.string().min(1, "Category is required"),
    tags: z.array(z.string()).default([]),
    
    // Dates can be passed as ISO strings
    startDate: z.string().datetime({ message: "Invalid startDate format" }),
    endDate: z.string().datetime({ message: "Invalid endDate format" }),
    timezone: z.string().min(1, "Timezone is required"),
    
    locationType: z.enum(["physical", "online"], {
      errorMap: () => ({ message: "locationType must be 'physical' or 'online'" })
    }),
    venue: z.string().optional(),
    address: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    
    capacity: z.number().int().positive("Capacity must be greater than 0"),
    ticketType: z.enum(["free", "paid"], {
      errorMap: () => ({ message: "ticketType must be 'free' or 'paid'" })
    }),
    ticketPrice: z.number().nonnegative("Ticket price cannot be negative").optional(),
    
    coverImage: z.string().url("Must be a valid URL").optional().or(z.literal('')),
    themeColor: z.string().optional()
  }).refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "endDate must be after startDate",
    path: ["endDate"]
  }).refine((data) => {
    if (data.ticketType === 'paid' && (data.ticketPrice === undefined || data.ticketPrice <= 0)) {
      return false;
    }
    return true;
  }, {
    message: "Paid events must have a valid ticket price",
    path: ["ticketPrice"]
  })
});

export type CreateEventInput = z.infer<typeof createEventSchema>['body'];

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid event ID format")
  }),
  body: createEventSchema.shape.body.partial()
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>['body'];

export const deleteEventSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid event ID format")
  })
});

export const getEventsQuerySchema = z.object({
  query: z.object({
    category: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    search: z.string().optional(),
    sort: z.enum(['popular', 'upcoming']).optional().default('upcoming'),
    limit: z.coerce.number().int().positive().optional().default(10),
  })
});
