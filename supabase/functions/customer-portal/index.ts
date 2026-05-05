/**
 * CreateX — Stripe Customer Portal Session
 * Supabase Edge Function: /functions/v1/customer-portal
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY
 *
 * Deploy:
 *   supabase functions deploy customer-portal
 *
 * Returns: { url } — Stripe Customer Portal URL
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error } = await userSupabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  /* Get Stripe customer */
  const { data: uc } = await supabase
    .from('user_credits')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  const customerId = uc?.stripe_customer_id;
  if (!customerId) {
    return new Response(JSON.stringify({ error: 'No subscription found. Subscribe to a plan first.' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  const origin     = req.headers.get('origin') || 'https://createx.ai';
  const returnUrl  = `${origin}/billing.html`;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: returnUrl,
  });

  return new Response(JSON.stringify({ url: portalSession.url }), {
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
});
