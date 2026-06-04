import express from 'express';
import auth from '../../middlewares/auth';
import { adminController } from './admin.controller';
import { fileUploader } from '../../../helpars/fileUploader';

const router = express.Router();

router.get('/all-users', auth('SUPER_ADMIN'), adminController.getAllUsers);
router.get(
  '/user-details/:id',
  auth('SUPER_ADMIN'),
  adminController.userDetails,
);
router.delete('/user/:id', auth('SUPER_ADMIN'), adminController.deleteUser);
router.get(
  '/all-subscriptions',
  auth('SUPER_ADMIN'),
  adminController.allSubscriptions,
);


export const adminRoutes = router;
