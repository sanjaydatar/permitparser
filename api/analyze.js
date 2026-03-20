const SYSTEM = `You are an expert environmental compliance attorney and permit analyst.
Extract EVERY actionable compliance obligation from the permit provided.

Respond with ONLY a raw JSON object — no markdown fences, no text before or after, just JSON.

{
  "permit_name": "...",
  "permit_type": "Air Quality | NPDES | Title V | RCRA | Stormwater | Other",
  "permit_number": "...",
  "issuing_authority": "...",
  "summary": "2-3 sentence overview of the permit and key regulatory framework",
  "items": [
    {
      "id": 1,
      "citation": "e.g. Part II, Section B.1",
      "subsection": "Specific condition number",
      "requirement": "Plain-English description of the obligation",
      "category": "Monitoring|Reporting|Operational|Recordkeeping|Inspection|Notification|Emissions|Discharge|Waste Management|Training|Contingency|Other",
      "frequency": "Continuous|Daily|Weekly|Monthly|Quarterly|Annual|One-time|As-needed|[specific date]",
      "priority": "High|Medium|Low",
      "responsible_party": "Permittee|Operator|etc.",
      "notes": "Limits, thresholds, or caveats"
    }
  ]
}

Priority: High=risk of penalty/shutdown/health risk. Medium=regular monitoring/reporting deadlines. Low=recordkeeping/BMPs.
Be exhaustive — most permits have 20-60+ items.`;

function parseJSON(text) {
  // Try 1: direct parse
  try { return JSON.parse(text); } catch {}

  // Try 2: strip markdown fences
  let s = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
  try { return JSON.parse(s); } catch {}

  // Try 3: extract outermost { ... }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch {}
  }

  // Try 4: fix common JSON issues — trailing commas
  let fixed = s.slice(start, end + 1)
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');
  try { return JSON.parse(fixed); } catch {}

  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let body = '';
  for await (const chunk of req) body += chunk;

  let payload;
  try { payload = JSON.parse(body); }
  catch { res.status(400).json({ error: 'Invalid JSON body' }); return; }

  const { key, content, filename, test } = payload;
  const apiKey = key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(400).json({ error: 'Missing API key' }); return; }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };

  // ── Test ping ─────────────────────────────────────────────────────────────
  if (test) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers,
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
      });
      const data = await r.json();
      if (data.error) { res.status(200).json({ error: data.error.message }); return; }
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(200).json({ error: 'Connection failed: ' + e.message });
    }
    return;
  }

  // ── Build messages ────────────────────────────────────────────────────────
  let messages;
  if (content?.type === 'pdf') {
    messages = [{ role: 'user', content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: content.data } },
      { type: 'text', text: `Extract all compliance obligations from this permit (${filename}) as JSON.` },
    ]}];
  } else {
    const text = (content?.data || '').slice(0, 90000);
    messages = [{ role: 'user', content: `Extract all compliance obligations from this permit (${filename}) as JSON.\n\nPERMIT TEXT:\n${text}` }];
  }

  // ── NON-STREAMING: simpler and more reliable for parsing ─────────────────
  // We use a 10s keepalive ping to stay within Vercel's limits while waiting
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const emit = (obj) => {
    try { res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch {}
  };

  // Send a heartbeat every 8 seconds so Vercel doesn't close the connection
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch {}
  }, 8000);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: SYSTEM,
        messages,
        // Non-streaming — wait for full response, much easier to parse
      }),
    });

    clearInterval(heartbeat);

    if (!r.ok) {
      let errMsg = `Anthropic error (${r.status})`;
      try { const j = await r.json(); errMsg = j.error?.message || errMsg; } catch {}
      emit({ error: errMsg });
      res.end();
      return;
    }

    const data = await r.json();

    if (data.error) {
      emit({ error: data.error.message || 'Anthropic API error' });
      res.end();
      return;
    }

    const rawText = (data.content || []).map(b => b.text || '').join('').trim();
    console.log('Raw response length:', rawText.length);
    console.log('Raw response preview:', rawText.slice(0, 200));

    const result = parseJSON(rawText);

    if (!result) {
      console.error('FULL RAW RESPONSE:', rawText);
      emit({ error: `AI response could not be parsed. Stop reason: ${data.stop_reason}. Response started with: ${rawText.slice(0, 100)}` });
    } else {
      emit({ result });
    }

  } catch (e) {
    clearInterval(heartbeat);
    emit({ error: 'Server error: ' + e.message });
  }

  res.end();
};
