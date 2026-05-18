// HelveX Memory — server-side helper that fetches the user's
// top memories and renders them as a short, deterministic block the
// assistant gets in its system prompt. Keeps the assistant
// "remembering" things across conversations without exposing the
// memories table to the model directly.

const SUPABASE_URL  = 'https://yjmpallrtpeinpdilptj.supabase.co';
const SUPABASE_ANON = 'sb_publishable_vx5tD4mUizuspej5-g3XlQ_PnbjXSeR';

/**
 * Pull the 10 most-relevant memories for the user and return a short
 * deterministic block ready to append to the system prompt. Returns
 * null if there are no memories or the lookup fails — callers should
 * fall back to the base system prompt unchanged.
 */
export async function buildMemoryBlock(token, ownerId) {
  if (!token || !ownerId) return null;
  try {
    const params = new URLSearchParams({
      select: 'content,tags,importance',
      owner_id: `eq.${ownerId}`,
      order: 'importance.desc,updated_at.desc',
      limit: '10',
    });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/memories?${params}`, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!r.ok) return null;
    const rows = await r.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const lines = rows.map((m) => {
      const tags = Array.isArray(m.tags) && m.tags.length ? ` [${m.tags.join(', ')}]` : '';
      return `  • ${String(m.content).trim()}${tags}`;
    });

    // Touch last_used_at in the background so the memory page can show
    // "recently used" without blocking the response. Fire-and-forget.
    fetch(`${SUPABASE_URL}/rest/v1/memories?owner_id=eq.${ownerId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    }).catch(() => {});

    return [
      'What you know about this user (their saved memories — apply when relevant, do not list back):',
      ...lines,
    ].join('\n');
  } catch {
    return null;
  }
}
