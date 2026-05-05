/**
 * CreateX — Stripe Webhook Handler
 * Supabase Edge Function: /functions/v1/stripe-webhook
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY         — sk_live_...  or sk_test_...
 *   STRIPE_WEBHOOK_SECRET     — whsec_...  (from Stripe Dashboard → Webhooks)
 *   SUPABASE_URL              — auto-injected
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Stripe webhook events handled:
 *   checkout.session.completed          → grant credits for credit pack / subscription
 *   invoice.payment_succeeded           → monthly credit refresh for subscriptions
 *   customer.subscription.updated       → plan change
 *   customer.subscription.deleted       → downgrade to free
 *   payment_intent.payment_failed       → notify (log)
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PLAN_CREDITS: Record<string, number> = {
  sub_starter:  150,
  sub_pro:      400,
  sub_business: 1000,
};

const PLAN_NAMES: Record<string, string> = {
  sub_starter:  'starter',
  sub_pro:      'pro',
  sub_business: 'business',
};

const PACK_CREDITS: Record<string, number> = {
  pack_100:  100,
  pack_300:  300,
  pack_700:  700,
  pack_1500: 1500,
};

const TOPUP_CREDITS: Record<string, number> = {
  topup_1500:  1500,
  topup_5000:  5000,
  topup_12000: 12000,
};

/* ── Helper: find user_id from stripe_customer_id ──────────────── */
async function getUserIdByCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_credits')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.user_id ?? null;
}

/* ── Helper: find product key from stripe price_id ─────────────── */
async function getProductKey(priceId: string): Promise<string | null> {
  const { data } = await supabase
    .from('stripe_products')
    .select('key')
    .eq('stripe_price_id', priceId)
    .single();
  return data?.key ?? null;
}

/* ── Handler: checkout.session.completed ───────────────────────── */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId     = session.metadata?.user_id;
  const productKey = session.metadata?.product_key;
  const customerId = session.customer as string;

  if (!userId) { console.error('No user_id in checkout session metadata'); return; }

  /* Always store customer ID */
  await supabase
    .from('user_credits')
    .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' });

  if (!productKey) { console.error('No product_key in metadata'); return; }

  const idempotencyKey = `checkout_${session.id}`;

  /* Subscription checkout — activate plan */
  if (session.mode === 'subscription') {
    const credits  = PLAN_CREDITS[productKey];
    const planName = PLAN_NAMES[productKey];
    if (!credits || !planName) { console.error('Unknown plan key:', productKey); return; }

    await supabase.from('user_credits').upsert({
      user_id:                userId,
      plan:                   planName,
      stripe_customer_id:     customerId,
      stripe_subscription_id: session.subscription as string,
      subscription_status:    'active',
    }, { onConflict: 'user_id' });

    await supabase.rpc('add_credits', {
      p_user_id:         userId,
      p_credits:         credits,
      p_type:            'subscription_grant',
      p_description:     `${planName} plan — initial credit grant`,
      p_amount_usd:      (session.amount_total ?? 0) / 100,
      p_idempotency_key: idempotencyKey,
      p_stripe_payment:  session.payment_intent as string,
    });

    console.log(`[webhook] Subscription activated: user=${userId} plan=${planName} credits=${credits}`);
    return;
  }

  /* One-time credit pack */
  if (session.mode === 'payment') {
    const packCredits  = PACK_CREDITS[productKey];
    const topupCredits = TOPUP_CREDITS[productKey];
    const credits      = packCredits ?? topupCredits;
    const type         = packCredits ? 'credit_pack' : 'auto_topup';

    if (!credits) { console.error('Unknown pack key:', productKey); return; }

    await supabase.rpc('add_credits', {
      p_user_id:         userId,
      p_credits:         credits,
      p_type:            type,
      p_description:     `${credits} credits purchase (${productKey})`,
      p_amount_usd:      (session.amount_total ?? 0) / 100,
      p_idempotency_key: idempotencyKey,
      p_stripe_payment:  session.payment_intent as string,
    });

    console.log(`[webhook] Credits purchased: user=${userId} credits=${credits} type=${type}`);
  }
}

/* ── Handler: invoice.payment_succeeded ────────────────────────── */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== 'subscription_cycle') return; // only renewals

  const customerId = invoice.customer as string;
  const userId = await getUserIdByCustomer(customerId);
  if (!userId) { console.error('No user found for customer:', customerId); return; }

  /* Find which plan */
  const { data: uc } = await supabase
    .from('user_credits')
    .select('plan')
    .eq('user_id', userId)
    .single();

  const planKey = `sub_${uc?.plan ?? 'starter'}`;
  const credits = PLAN_CREDITS[planKey];
  if (!credits) return;

  /* Reset monthly counter and add monthly credits */
  await supabase.from('user_credits').update({
    monthly_used:            0,
    current_month_spend_usd: 0,
    monthly_reset_at:        new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    subscription_status:     'active',
  }).eq('user_id', userId);

  await supabase.rpc('add_credits', {
    p_user_id:         userId,
    p_credits:         credits,
    p_type:            'subscription_grant',
    p_description:     `Monthly credit renewal — ${uc?.plan} plan`,
    p_amount_usd:      (invoice.amount_paid ?? 0) / 100,
    p_idempotency_key: `invoice_${invoice.id}`,
    p_stripe_invoice:  invoice.id,
  });

  console.log(`[webhook] Monthly renewal: user=${userId} plan=${uc?.plan} credits=${credits}`);
}

/* ── Handler: subscription.updated ─────────────────────────────── */
async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;
  const userId = await getUserIdByCustomer(customerId);
  if (!userId) return;

  const status = sub.status === 'active' ? 'active' : sub.status;
  await supabase.from('user_credits').update({
    subscription_status:    status,
    stripe_subscription_id: sub.id,
  }).eq('user_id', userId);

  console.log(`[webhook] Subscription updated: user=${userId} status=${status}`);
}

/* ── Handler: subscription.deleted ─────────────────────────────── */
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;
  const userId = await getUserIdByCustomer(customerId);
  if (!userId) return;

  await supabase.from('user_credits').update({
    plan:                'free',
    subscription_status: 'cancelled',
  }).eq('user_id', userId);

  console.log(`[webhook] Subscription cancelled: user=${userId}`);
}

/* ── Main handler ───────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing stripe signature', { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`[webhook] Event: ${event.type} id=${event.id}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'payment_intent.payment_failed':
        console.warn('[webhook] Payment failed:', (event.data.object as Stripe.PaymentIntent).id);
        break;
      default:
        console.log(`[webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error(`[webhook] Handler error for ${event.type}:`, err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
