import Stripe from 'stripe';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiErrors';
import prisma from '../../../shared/prisma';
import config from '../../../config';
import { PaymentType } from '@prisma/client';

const getStripe = () => new Stripe(config.stripe.secretKey);

// ─── Product Catalogue ─────────────────────────────────────────
const ESSENTIAL_WILL = {
  productId: 'essential_will',
  name: 'Essential Will',
  amount: 8800,
  displayAmount: 88,
  currency: 'sgd',
  type: 'ONE_TIME' as const,
  accessDays: 30,
};

const UNLIMITED_LEGACY = {
  productId: 'unlimited_legacy',
  name: 'Unlimited Legacy',
  subscriptionAmount: 2400,
  displaySubscriptionAmount: 24,
  oneTimeAmount: 8800,
  displayOneTimeAmount: 88,
  currency: 'sgd',
  type: 'BUNDLE' as const,
};

// ─── Helper: Retry upsert on P2002 ────────────────────────────
const upsertPaymentWithRetry = async (args: {
  where: any;
  update: any;
  create: any;
  retries?: number;
  delayMs?: number;
}) => {
  const { where, update, create, retries = 3, delayMs = 100 } = args;
  for (let i = 0; i < retries; i++) {
    try {
      return await prisma.payment.upsert({ where, update, create });
    } catch (error: any) {
      if (error.code === 'P2002' && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
};

// ─── Customer Helper ──────────────────────────────────────────
const getOrCreateStripeCustomer = async (userId: string): Promise<string> => {
  const stripe = getStripe();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, stripeCustomerId: true },
  });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!existing.deleted) return existing.id;
    } catch {
      // fall through
    }
  }

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.fullName ?? undefined,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
};

// ─── Checkout: Essential Will ─────────────────────────────────
export const createEssentialWillCheckout = async (
  userId: string,
  successUrl: string,
  cancelUrl: string,
) => {
  const stripe = getStripe();

  const will = await prisma.will.findUnique({ where: { userId } });
  if (!will) throw new ApiError(httpStatus.NOT_FOUND, 'Will not found');

  // const existingPaid = await prisma.payment.findFirst({
  //   where: { userId, productId: ESSENTIAL_WILL.productId, status: 'SUCCEEDED' },
  // });
  // if (existingPaid) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Essential Will already purchased');
  // }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionExpiresAt: true,
    },
  });

  const isActive =
    user?.subscriptionTier === 'PREMIUM' &&
    !!user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt > new Date();
  console.log(user?.subscriptionExpiresAt, new Date());
  if (isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Essential Will already purchased');
  }

  // Reuse existing pending session (idempotency)
  const existingPending = await prisma.payment.findFirst({
    where: { userId, productId: ESSENTIAL_WILL.productId, status: 'PENDING' },
  });
  if (existingPending?.metadata) {
    const meta = existingPending.metadata as any;
    if (meta?.sessionId && meta?.checkoutUrl) {
      return { checkoutUrl: meta.checkoutUrl, sessionId: meta.sessionId };
    }
  }

  const customerId = await getOrCreateStripeCustomer(userId);
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: ESSENTIAL_WILL.currency,
        unit_amount: ESSENTIAL_WILL.amount,
        product_data: {
          name: ESSENTIAL_WILL.name,
          description: 'One-time payment, 30 days of unlimited edits',
        },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      metadata: { userId, productId: ESSENTIAL_WILL.productId, willId: will.id },
    },
    metadata: { userId, productId: ESSENTIAL_WILL.productId, willId: will.id },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  // Use retry helper to avoid rare race conditions
  await upsertPaymentWithRetry({
    where: { sessionId: session.id },
    update: {},
    create: {
      userId,
      stripeCustomerId: customerId,
      amount: ESSENTIAL_WILL.displayAmount,
      currency: ESSENTIAL_WILL.currency,
      status: 'PENDING',
      type: 'ONE_TIME',
      productId: ESSENTIAL_WILL.productId,
      sessionId: session.id,
      metadata: { willId: will.id, checkoutUrl: session.url },
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionType: PaymentType.ONE_TIME },
  })
  return { checkoutUrl: session.url, sessionId: session.id };
};

// ─── Checkout: Unlimited Legacy (bundle) ──────────────────────
export const createUnlimitedLegacyCheckout = async (
  userId: string,
  successUrl: string,
  cancelUrl: string,
) => {
  const stripe = getStripe();

  const will = await prisma.will.findUnique({ where: { userId } });
  if (!will) throw new ApiError(httpStatus.NOT_FOUND, 'Will not found');

  const existingBundle = await prisma.payment.findFirst({
    where: { userId, productId: UNLIMITED_LEGACY.productId, status: 'SUCCEEDED' },
  });
  if (existingBundle) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unlimited Legacy already active');
  }

  const priceId = config.stripe.unlimitedPriceId;
  if (!priceId) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Stripe products not initialized',
    );
  }

  const customerId = await getOrCreateStripeCustomer(userId);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: UNLIMITED_LEGACY.currency,
          unit_amount: UNLIMITED_LEGACY.oneTimeAmount,
          product_data: {
            name: `${UNLIMITED_LEGACY.name} - One-time fee`,
            description: 'One-time payment for your will',
          },
        },
        quantity: 1,
      },
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        userId,
        productId: UNLIMITED_LEGACY.productId,
        willId: will.id,
        bundle: 'true',
      },
    },
    metadata: { userId, bundle: 'true', willId: will.id },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  await upsertPaymentWithRetry({
    where: { sessionId: session.id },
    update: {},
    create: {
      userId,
      stripeCustomerId: customerId,
      amount: UNLIMITED_LEGACY.displayOneTimeAmount,
      currency: UNLIMITED_LEGACY.currency,
      status: 'PENDING',
      type: 'ONE_TIME',
      productId: UNLIMITED_LEGACY.productId,
      sessionId: session.id,
      metadata: { willId: will.id, checkoutUrl: session.url, bundle: 'true' },
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionType: PaymentType.SUBSCRIPTION },
  })
  return { checkoutUrl: session.url, sessionId: session.id };
};

// ─── Subscription Management ──────────────────────────────────
export const getSubscriptionStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionExpiresAt: true },
  });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  const isExpired = user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date();
  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    tier: isExpired ? 'FREE' : user.subscriptionTier,
    expiresAt: user.subscriptionExpiresAt,
    isActive: user.subscriptionTier === 'PREMIUM' && !isExpired,
    payments,
  };
};

export const cancelSubscription = async (userId: string) => {
  const stripe = getStripe();
  const payment = await prisma.payment.findFirst({
    where: { userId, productId: UNLIMITED_LEGACY.productId, status: 'SUCCEEDED' },
  });
  if (!payment?.stripeSubscriptionId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No active Unlimited Legacy subscription found');
  }

  const subscription = await stripe.subscriptions.update(payment.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  return {
    message: 'Subscription will be cancelled at the end of the current billing period',
    cancelAt: new Date(subscription.cancel_at! * 1000),
  };
};

export const reactivateSubscription = async (userId: string) => {
  const stripe = getStripe();
  const payment = await prisma.payment.findFirst({
    where: { userId, productId: UNLIMITED_LEGACY.productId, status: 'SUCCEEDED' },
  });
  if (!payment?.stripeSubscriptionId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No subscription found');
  }

  await stripe.subscriptions.update(payment.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  return { message: 'Subscription reactivated successfully' };
};

// ─── Webhook Handler (Idempotent) ─────────────────────────────
export const handleWebhook = async (rawBody: Buffer, signature: string) => {
  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  } catch (err: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Webhook signature verification failed: ${err.message}`);
  }

  // 🔁 Idempotency: skip if already processed
  const existingEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { eventId: event.id },
  });
  if (existingEvent) {
    console.log(`[Stripe] Duplicate event ${event.id} – skipping`);
    return { received: true, skipped: true };
  }

  console.log(`[Stripe] Processing event: ${event.type} (${event.id})`);

  switch (event.type) {
    case 'checkout.session.completed':
      await onCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'payment_intent.succeeded':
      await onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'invoice.payment_succeeded':
      await onInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.updated':
      await onSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  await prisma.stripeWebhookEvent.create({ data: { eventId: event.id } });
  return { received: true };
};

// ─── Webhook Event Handlers ───────────────────────────────────
const onCheckoutSessionCompleted = async (session: Stripe.Checkout.Session) => {
  const { userId, productId, willId, bundle } = session.metadata ?? {};
  if (!userId) return;

  // Essential Will (one‑time)
  if (session.mode === 'payment') {
    const paymentIntentId = session.payment_intent as string;
    await prisma.payment.updateMany({
      where: { userId, productId: ESSENTIAL_WILL.productId, status: 'PENDING' },
      data: { stripePaymentIntentId: paymentIntentId, status: 'SUCCEEDED' },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ESSENTIAL_WILL.accessDays);
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: 'PREMIUM', subscriptionExpiresAt: expiresAt },
    });
    if (willId) {
      await prisma.will.update({ where: { id: willId }, data: { status: 'COMPLETED' } });
    }
    console.log(`[Payment] Essential Will purchased — user ${userId}`);
  }

  // Unlimited Legacy Bundle
  if (session.mode === 'subscription') {
    const subscriptionId = session.subscription as string;
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as any;

    if (bundle === 'true') {
      const paymentIntentId = session.payment_intent as string;
      await prisma.payment.updateMany({
        where: { sessionId: session.id, status: 'PENDING' },
        data: { stripePaymentIntentId: paymentIntentId, status: 'SUCCEEDED' },
      });
    }

    await upsertPaymentWithRetry({
      where: {
        sessionId: session.id,
        status: { not: 'SUCCEEDED' },
      },
      update: { status: 'SUCCEEDED' },
      create: {
        userId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: session.customer as string,
        amount: UNLIMITED_LEGACY.displaySubscriptionAmount,
        currency: UNLIMITED_LEGACY.currency,
        status: 'SUCCEEDED',
        type: 'SUBSCRIPTION',
        productId: UNLIMITED_LEGACY.productId,
        metadata: { sessionId: session.id, willId, bundle },
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: 'PREMIUM',
        subscriptionExpiresAt: new Date(subscription.current_period_end * 1000),
      },
    });
    console.log(`[Payment] Unlimited Legacy bundle — user ${userId}`);
  }
};

const onPaymentIntentSucceeded = async (pi: Stripe.PaymentIntent) => {
  const { userId, productId } = pi.metadata ?? {};
  if (!userId || !productId) return;
  await prisma.payment.updateMany({
    where: { userId, productId, stripePaymentIntentId: pi.id },
    data: { status: 'SUCCEEDED' },
  });
};

const onPaymentIntentFailed = async (pi: Stripe.PaymentIntent) => {
  const { userId, productId } = pi.metadata ?? {};
  if (!userId || !productId) return;
  await prisma.payment.updateMany({
    where: { userId, productId, stripePaymentIntentId: pi.id },
    data: { status: 'FAILED' },
  });
};

const onInvoicePaymentSucceeded = async (invoice: Stripe.Invoice) => {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as any;
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: 'PREMIUM',
      subscriptionExpiresAt: new Date(subscription.current_period_end * 1000),
    },
  });
  await prisma.payment.updateMany({
    where: { userId, stripeSubscriptionId: subscriptionId },
    data: { status: 'SUCCEEDED' },
  });
  console.log(`[Payment] Subscription renewed — user ${userId}`);
};

const onInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  await prisma.payment.updateMany({
    where: { userId, stripeSubscriptionId: subscriptionId },
    data: { status: 'FAILED' },
  });
  console.log(`[Payment] Invoice failed — user ${userId} (Stripe will retry)`);
};

const onSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  if (subscription.status === 'active') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: 'PREMIUM',
        subscriptionExpiresAt: new Date(subscription.current_period_end * 1000),
      },
    });
  }
  if (subscription.cancel_at_period_end) {
    console.log(`[Payment] Cancellation scheduled — user ${userId}`);
  }
};

const onSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionTier: 'FREE', subscriptionExpiresAt: null },
  });
  await prisma.payment.updateMany({
    where: { userId, stripeSubscriptionId: subscription.id },
    data: { status: 'REFUNDED' },
  });
  console.log(`[Payment] Subscription deleted — user ${userId} downgraded to FREE`);
};