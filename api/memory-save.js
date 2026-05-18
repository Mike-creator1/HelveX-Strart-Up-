// Save a single memory on behalf of the signed-in user. Used by the
// "Remember this" affordance on assistant messages and anywhere else
// in the platform that wants to add to the user's memory layer.
//
//   POST /api/memory-save
//   body: { content: string, tags?: string[], importance?: 1..5, source?: string }
//
// Returns 201 with the created row, or a clean error.

const SUPABASE_URL  = 'https://yjmpallrtpeinpdilptj.supabase.co';
const SUPABASE_ANON = 'sb_publishable_vx5tD4mUizuspej5-g3XlQ_PnbjXSeR';

function readToken(req) {
  const raw = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!raw) return null;
  const m = String(raw).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function resolveOwner(token) {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json().catch(() => null);
    return u && u.id ? u.id : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Sign in to save a memory.' });
  const owner = await resolveOwner(token);
  if (!owner) return res.status(401).json({ error: 'Session expired. Sign in again.' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const content = String(body.content || '').trim();
  if (!content || content.length < 4) {
    return res.status(400).json({ error: 'Memory content is required (4 characters or more).' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'Memory too long — keep it under 2000 characters.' });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter((t) => t && t.length <= 60).slice(0, 12)
    : [];
  const importance = Math.min(Math.max(parseInt(body.importance, 10) || 3, 1), 5);
  const source = body.source ? String(body.source).slice(0, 60) : 'manual';

  const r = await fetch(`${SUPABASE_URL}/rest/v1/memories`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ owner_id: owner, content, tags, importance, source }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return res.status(r.status).json({ error: 'Save failed', details: text.slice(0, 200) });
  }
  const rows = await r.json().catch(() => []);
  return res.status(201).json({ ok: true, memory: rows[0] || null });
}
