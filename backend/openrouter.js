/**
 * OpenRouter client for this service.
 *
 * Several features were implemented as deterministic rule tables even though
 * their gap names explicitly asked for AI (`no-...-ai`, `...-classifier`).
 * This adds the real model call. The deterministic logic is kept as the
 * fallback and as a guard on the model's output — it is not removed.
 *
 * Rules mirror the rest of the estate: canonical OpenRouter endpoint only,
 * OPENROUTER_API_KEY + OPENROUTER_MODEL required, inputs are untrusted data.
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function providerStatus() {
  if (!process.env.OPENROUTER_API_KEY) return { ok: false, detail: 'OPENROUTER_API_KEY is not set.' };
  if (!process.env.OPENROUTER_MODEL) return { ok: false, detail: 'OPENROUTER_MODEL is not set.' };
  const base = (process.env.OPENROUTER_BASE_URL || '').replace(/\/$/, '');
  if (base && base !== 'https://openrouter.ai/api/v1') {
    return { ok: false, detail: 'OPENROUTER_BASE_URL must be the canonical OpenRouter API.' };
  }
  return { ok: true, detail: `Using ${process.env.OPENROUTER_MODEL}.` };
}

/**
 * Pull the first JSON object/array out of a model reply. Models often wrap JSON
 * in markdown fences or add a sentence before it; rejecting the whole reply for
 * that wastes a paid call.
 */
function extractJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(unfenced); } catch { /* keep trying */ }
  const start = unfenced.search(/[[{]/);
  if (start === -1) return null;
  const opener = unfenced[start];
  const closer = opener === '{' ? '}' : ']';
  const end = unfenced.lastIndexOf(closer);
  if (end <= start) return null;
  try { return JSON.parse(unfenced.slice(start, end + 1)); } catch { return null; }
}

async function askJson({ system, user, maxTokens = 700, fetcher = fetch }) {
  const status = providerStatus();
  if (!status.ok) return { usedProvider: false, data: null, raw: '', model: null, error: status.detail };

  try {
    const response = await fetcher(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': process.env.OPENROUTER_APP_TITLE || 'Domain Assistant',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL,
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'system', content: user },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return { usedProvider: false, data: null, raw: '', model: null, error: `OpenRouter ${response.status}: ${detail.slice(0, 180)}` };
    }
    const payload = await response.json();
    const raw = String(payload?.choices?.[0]?.message?.content || '').trim();
    const data = extractJson(raw);
    return {
      usedProvider: !!data,
      data,
      raw: raw.slice(0, 500),
      model: typeof payload?.model === 'string' ? payload.model : (process.env.OPENROUTER_MODEL || null),
      error: data ? null : 'Model did not return parseable JSON.',
    };
  } catch (e) {
    return { usedProvider: false, data: null, raw: '', model: null, error: e?.name === 'TimeoutError' ? 'OpenRouter timed out.' : (e?.message || 'OpenRouter call failed.') };
  }
}

module.exports = { askJson, providerStatus, extractJson, OPENROUTER_URL };
