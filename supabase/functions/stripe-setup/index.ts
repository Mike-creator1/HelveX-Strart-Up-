/**
 * CreateX — Stripe One-Time Setup
 * Supabase Edge Function: /functions/v1/stripe-setup
 *
 * Creates all CreateX products and prices in Stripe, then stores
 * the IDs in the stripe_products database table.
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Deploy:
 *   supabase functions deploy stripe-setup --no-verify-jwt
 *
 * Invoke ONCE from the admin panel or with:
 *   curl -X POST https://ikbdhxobdjlwirydhxym.supabase.co/functions/v1/stripe-setup \
 *        -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
 *
 * Safe to re-run — uses metadata to detect existing products.
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

interface ProductSpec {
  key:      string;
  name:     string;
  desc:     string;
  type:     'subscription' | 'credit_pack' | 'auto_topup';
  credits:  number;
  cents:    number;
  interval?: 'month';
}

const PRODUCTS: ProductSpec[] = [
  /* ── Subscriptions ── */
  {
    key: 'sub_starter', type: 'subscription',
    name: 'CreateX STARTER', credits: 150, cents: 1900, interval: 'month',
    desc: '150 AI credits per month — for individuals starting with AI tools',
  },
  {
    key: 'sub_pro', type: 'subscription',
    name: 'CreateX PRO', credits: 400, cents: 3900, interval: 'month',
    desc: '400 AI credits per month — for active job seekers and creators',
  },
  {
    key: 'sub_business', type: 'subscription',
    name: 'CreateX BUSINESS', credits: 1000, cents: 7900, interval: 'month',
    desc: '1000 AI credits per month — for teams and power users',
  },
  /* ── Credit packs ── */
  {
    key: 'pack_100', type: 'credit_pack',
    name: 'CreateX Credits — 100', credits: 100, cents: 1000,
    desc: '100 AI credits one-time top-up ($0.10/credit)',
  },
  {
    key: 'pack_300', type: 'credit_pack',
    name: 'CreateX Credits — 300', credits: 300, cents: 2500,
    desc: '300 AI credits one-time top-up ($0.083/credit)',
  },
  {
    key: 'pack_700', type: 'credit_pack',
    name: 'CreateX Credits — 700', credits: 700, cents: 5000,
    desc: '700 AI credits one-time top-up ($0.071/credit)',
  },
  {
    key: 'pack_1500', type: 'credit_pack',
    name: 'CreateX Credits — 1500', credits: 1500, cents: 9900,
    desc: '1500 AI credits one-time top-up ($0.066/credit) — BEST VALUE',
  },
  /* ── Enterprise auto top-up ── */
  {
    key: 'topup_1500', type: 'auto_topup',
    name: 'CreateX Auto Top-Up — 1500', credits: 1500, cents: 9900,
    desc: 'Enterprise auto top-up: 1500 credits for $99',
  },
  {
    key: 'topup_5000', type: 'auto_topup',
    name: 'CreateX Auto Top-Up — 5000', credits: 5000, cents: 29900,
    desc: 'Enterprise auto top-up: 5000 credits for $299',
  },
  {
    key: 'topup_12000', type: 'auto_topup',
    name: 'CreateX Auto Top-Up — 12000', credits: 12000, cents: 59900,
    desc: 'Enterprise auto top-up: 12000 credits for $599',
  },
];

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  /* Require service role key */
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return new Response(JSON.stringify({ error: 'Admin only — requires service role key' }), {
      status: 403, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  const results: Record<string, { product_id: string; price_id: string; created: boolean }> = {};
  const errors: string[] = [];

  for (const spec of PRODUCTS) {
    try {
      /* Check if already created */
      const { data: existing } = await supabase
        .from('stripe_products')
        .select('stripe_product_id, stripe_price_id')
        .eq('key', spec.key)
        .single();

      if (existing?.stripe_price_id) {
        results[spec.key] = { product_id: existing.stripe_product_id!, price_id: existing.stripe_price_id, created: false };
        continue;
      }

      /* Search Stripe for existing product by metadata key */
      const existingProducts = await stripe.products.search({
        query: `metadata['createx_key']:'${spec.key}'`,
      });

      let productId: string;
      if (existingProducts.data.length > 0) {
        productId = existingProducts.data[0].id;
      } else {
        const product = await stripe.products.create({
          name:        spec.name,
          description: spec.desc,
          metadata:    { createx_key: spec.key, type: spec.type, credits: String(spec.credits) },
        });
        productId = product.id;
      }

      /* Create price */
      const priceParams: Stripe.PriceCreateParams = {
        product:     productId,
        unit_amount: spec.cents,
        currency:    'usd',
        metadata:    { createx_key: spec.key },
      };
      if (spec.interval) {
        priceParams.recurring = { interval: spec.interval };
      }
      const price = await stripe.prices.create(priceParams);

      /* Save to DB */
      await supabase
        .from('stripe_products')
        .update({ stripe_product_id: productId, stripe_price_id: price.id })
        .eq('key', spec.key);

      results[spec.key] = { product_id: productId, price_id: price.id, created: true };
      console.log(`[stripe-setup] Created: ${spec.key} → product=${productId} price=${price.id}`);

    } catch (err) {
      console.error(`[stripe-setup] Error for ${spec.key}:`, err);
      errors.push(`${spec.key}: ${err.message}`);
    }
  }

  return new Response(JSON.stringify({ ok: errors.length === 0, results, errors }), {
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
});
