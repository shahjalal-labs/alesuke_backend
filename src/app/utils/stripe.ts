import Stripe from 'stripe';
import config from '../../config';
import prisma from '../../shared/prisma';

const stripe = new Stripe(config.stripe.secretKey);

const KEYS = {
  essentialPriceId: 'stripe_essential_will_price_id',
  unlimitedSubscriptionPriceId: 'stripe_unlimited_legacy_subscription_price_id',
} as const;

 const safeUpsertStoreKey = async (key: string, value: string, name?: string) => {
  try {
    return await prisma.storePaymentInfo.upsert({
      where: { key },
      update: { value, name },
      create: { key, value, name },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return await prisma.storePaymentInfo.findUnique({ where: { key } });
    }
    throw err;
  }
};

export const initializeStripeProducts = async () => {
  try {
    const essentialPriceId = await ensureEssentialWillPrice();
    const unlimitedSubscriptionPriceId = await ensureUnlimitedLegacySubscriptionPrice();

    config.stripe.essentialPriceId = essentialPriceId;
    config.stripe.unlimitedPriceId = unlimitedSubscriptionPriceId;

    console.log('✅ Stripe products initialized');
    console.log(`Essential Will Price: ${essentialPriceId}`);
    console.log(`Unlimited Legacy Subscription Price: ${unlimitedSubscriptionPriceId}`);

    return { essentialPriceId, unlimitedSubscriptionPriceId };
  } catch (error) {
    console.error('❌ Failed to initialize Stripe products:', error);
    throw error;
  }
};

const ensureEssentialWillPrice = async (): Promise<string> => {
  const stored = await prisma.storePaymentInfo.findUnique({ where: { key: KEYS.essentialPriceId } });
  if (stored?.value) {
    try {
      const price = await stripe.prices.retrieve(stored.value);
      if (price.active) return price.id;
    } catch { /* recreate */ }
  }

  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find(p => p.name === 'Essential Will');
  if (!product) {
    product = await stripe.products.create({
      name: 'Essential Will',
      description: 'One-time payment. Includes 30 days unlimited edits.',
    });
    console.log('✅ Created Essential Will product');
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find(p => p.type === 'one_time' && p.currency === 'sgd' && p.unit_amount === 8800);
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: 'sgd',
      unit_amount: 8800,
      nickname: 'Essential Will - SGD 88 one-time',
    });
    console.log('✅ Created Essential Will price (SGD 88 one-time)');
  }



await safeUpsertStoreKey(KEYS.essentialPriceId, price.id, 'Essential Will Price ID');
  return price.id;
};

const ensureUnlimitedLegacySubscriptionPrice = async (): Promise<string> => {
  const stored = await prisma.storePaymentInfo.findUnique({ where: { key: KEYS.unlimitedSubscriptionPriceId } });
  if (stored?.value) {
    try {
      const price = await stripe.prices.retrieve(stored.value);
      if (price.active) return price.id;
    } catch { /* recreate */ }
  }

  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find(p => p.name === 'Unlimited Legacy Subscription');
  if (!product) {
    product = await stripe.products.create({
      name: 'Unlimited Legacy Subscription',
      description: 'Unlimited changes and digital memorandum in will.',
    });
    console.log('✅ Created Unlimited Legacy Subscription product');
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find(p => p.currency === 'sgd' && p.unit_amount === 2400 && p.recurring?.interval === 'year');
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: 'sgd',
      unit_amount: 2400,
      recurring: { interval: 'year' },
      nickname: 'Unlimited Legacy - SGD 2/month billed annually',
    });
    console.log('✅ Created Unlimited Legacy subscription (SGD 24/year)');
  }

  await prisma.storePaymentInfo.upsert({
    where: { key: KEYS.unlimitedSubscriptionPriceId },
    update: { value: price.id, name: 'Unlimited Legacy Subscription Price ID' },
    create: { key: KEYS.unlimitedSubscriptionPriceId, value: price.id, name: 'Unlimited Legacy Subscription Price ID' },
  });
  return price.id;
};

export default stripe;