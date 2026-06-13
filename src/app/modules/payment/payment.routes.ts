import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentController } from './payment.controller';
import { paymentValidation } from './payment.validation';

const router = express.Router();

// Webhook – must be raw body
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.stripeWebhook, // you need to add this controller method (optional – see note)
);

// Checkout endpoints
router.post(
  '/checkout/essential-will',
  auth(),
  validateRequest(paymentValidation.checkoutSchema),
  PaymentController.checkoutEssentialWill,
);

router.post(
  '/checkout/unlimited-legacy',
  auth(),
  validateRequest(paymentValidation.checkoutSchema),
  PaymentController.checkoutUnlimitedLegacy,
);



// Subscription management
router.get('/subscription', auth(), PaymentController.getSubscriptionStatus);
router.delete('/subscription', auth(), PaymentController.cancelSubscription);
router.post('/subscription/reactivate', auth(), PaymentController.reactivateSubscription);

export const PaymentRoutes = router;