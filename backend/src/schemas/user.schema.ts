import { z } from 'zod';

export const onboardingSchema = z.object({
  body: z.object({
    city: z.string().min(1, "City is required"),
    state: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    interests: z.array(z.string()).default([])
  })
});
