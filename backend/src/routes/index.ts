import { Router } from 'express';
import authRoutes from './auth';
import eventRoutes from './events';
import registrationRoutes from './registrations';
import userRoutes from './users';

const router = Router();

// Mount feature-specific routes
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/users', userRoutes);

export default router;
