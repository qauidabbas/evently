import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { onboardingSchema } from '../schemas/user.schema';
import prisma from '../lib/prisma';

const router = Router();

// PATCH /api/users/onboarding
router.patch(
  '/onboarding',
  authenticate,
  validate(onboardingSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { city, state, country, interests } = req.body;

      // Update the user using internal ID
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          city,
          state,
          country,
          interests,
          hasCompletedOnboarding: true,
        }
      });

      res.status(200).json({ 
        message: 'Onboarding completed successfully', 
        user: updatedUser 
      });
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      // Prisma error code for 'Record to update not found.'
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'User not found in database. Please sign in again.' });
      } else {
        res.status(500).json({ error: 'Failed to complete onboarding' });
      }
    }
  }
);

export default router;
