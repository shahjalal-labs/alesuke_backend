import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import {
  createEssentialWillCheckout,
  createUnlimitedLegacyCheckout,
  getSubscriptionStatus,
  cancelSubscription,
  reactivateSubscription,
  handleWebhook,
} from './payment.service';

const checkoutEssentialWill = catchAsync(async (req: Request, res: Response) => {
  const { successUrl, cancelUrl } = req.body;
  const result = await createEssentialWillCheckout(req.user.id, successUrl, cancelUrl);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Checkout session created',
    data: result,
  });
});

const checkoutUnlimitedLegacy = catchAsync(async (req: Request, res: Response) => {
  const { successUrl, cancelUrl } = req.body;
  const result = await createUnlimitedLegacyCheckout(req.user.id, successUrl, cancelUrl);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Checkout session created',
    data: result,
  });
});


const getStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await getSubscriptionStatus(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription status fetched',
    data: result,
  });
});

const cancel = catchAsync(async (req: Request, res: Response) => {
  const result = await cancelSubscription(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const reactivate = catchAsync(async (req: Request, res: Response) => {
  const result = await reactivateSubscription(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    res.status(httpStatus.BAD_REQUEST).json({ message: 'Missing stripe-signature header' });
    return;
  }
  const result = await handleWebhook(req.body, signature);
  res.status(httpStatus.OK).json(result);
});

export const PaymentController = {
  checkoutEssentialWill,
  checkoutUnlimitedLegacy,
  getSubscriptionStatus: getStatus,
  cancelSubscription: cancel,
  reactivateSubscription: reactivate,
  stripeWebhook,
};