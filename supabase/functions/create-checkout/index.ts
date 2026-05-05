/**
 * CreateX — Create Stripe Checkout Session
 * Supabase Edge Function: /functions/v1/create-checkout
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY         — sk_live_... or sk_test_...
 *   SUPABASE_URL              — auto-injected
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected
 *
 * Deploy:
 *   supabase functions deploy create-checkout
 *
 * Request body:
 *   { type: 'subscription' | 'credit_pack' | 'auto_topup', key: string }
 *   e.g. { type: 'subscription', key: 'sub_pro' }
 *        { type: 'credit_pack',  key: 'pack_300' }
 *
 * Returns:
 *   { url: string }  — Stripe Checkout URL to redirect to
 */

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe           from 'https://esm.sh/stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  /* ── Verify JWT ── */
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  /* ── Parse body ── */
  let body: { type: string; key: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const { type, key } = body;
  if (!type || !key) {
    return new Response(JSON.stringify({ error: 'Missing type or key' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  /* ── Lookup product in DB ── */
  const { data: product, error: productError } = await supabase
    .from('stripe_products')
    .select('stripe_price_id, stripe_product_id, credits, price_cents, type, plan, key')
    .eq('key', key)
    .eq('active', true)
    .single();

  if (productError || !product) {
    return new Response(JSON.stringify({ error: 'Product not found. Please run Stripe Setup in the admin panel first.' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  if (!product.stripe_price_id) {
    return new Response(JSON.stringify({ error: 'Stripe price not configured. Run the Stripe Setup function first, or enter the price ID in the admin panel.' }), {
      status: 422, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  /* ── Get or create Stripe customer ── */
  const { data: uc } = await supabase
    .from('user_credits')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  let customerId = uc?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('user_credits').upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: 'user_id' });
  }

  /* ── Determine success / cancel URLs ── */
  const origin      = req.headers.get('origin') || 'https://createx.ai';
  const successUrl  = `${origin}/billing.html?session_id={CHECKOUT_SESSION_ID}&status=success`;
  const cancelUrl   = `${origin}/pricing.html?status=cancelled`;

  /* ── Create Stripe Checkout Session ── */
  let session: Stripe.Checkout.Session;
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer:   customerId,
    line_items: [{ price: product.stripe_price_id, quantity: 1 }],
    success_url: successUrl,
    cancel_url:  cancelUrl,
    metadata: {
      user_id:     user.id,
      product_key: key,
    },
    customer_update: { address: 'auto' },
  };

  if (product.type === 'subscription') {
    sessionParams.mode = 'subscription';
    sessionParams.subscription_data = {
      metadata: { user_id: user.id, product_key: key },
    };
  } else {
    /* credit_pack or auto_topup — one-time payment */
    sessionParams.mode = 'payment';
    sessionParams.payment_intent_data = {
      metadata: { user_id: user.id, product_key: key },
      /* idempotency is handled in the webhook via checkout.session.id */
    };
  }

  try {
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err) {
    console.error('[create-checkout] Stripe error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
});
