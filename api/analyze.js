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

module.exports = async function handler(req, res) {
  // CORS headers
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

  // ── Stream response ───────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const emit = (obj) => res.write('data: ' + JSON.stringify(obj) + '\n\n');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        stream: true,
        system: SYSTEM,
        messages,
      }),
    });

    if (!r.ok) {
      let errMsg = `Anthropic error (${r.status})`;
      try { const j = await r.json(); errMsg = j.error?.message || errMsg; } catch {}
      emit({ error: errMsg });
      res.end();
      return;
    }

    let accumulated = '';
    const reader = r.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.slice(5).trim();
        if (raw === '[DONE]') continue;

        let evt;
        try { evt = JSON.parse(raw); } catch { continue; }

        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          accumulated += evt.delta.text;
          emit({ progress: accumulated.length });
        }
        if (evt.type === 'message_stop') {
          let js = accumulated.trim()
            .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          const si = js.indexOf('{'), ei = js.lastIndexOf('}');
          if (si !== -1 && ei !== -1) js = js.slice(si, ei + 1);
          try {
            emit({ result: JSON.parse(js) });
          } catch {
            emit({ error: 'Could not parse AI response. Try a smaller file.' });
          }
        }
        if (evt.type === 'error') {
          emit({ error: evt.error?.message || 'Stream error' });
        }
      }
    }
  } catch (e) {
    emit({ error: 'Server error: ' + e.message });
  }

  res.end();
};
