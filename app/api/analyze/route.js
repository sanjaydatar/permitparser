// Streaming keeps the connection alive — no timeout issues on free Vercel plan

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

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid request body' }, 400); }

  const { key, content, filename, test } = body;
  const apiKey = key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return jsonResponse({ error: 'Missing API key' }, 400);

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };

  // ── Quick test ping ──────────────────────────────────────────────────────
  if (test) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers,
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
      });
      const data = await res.json();
      if (data.error) return jsonResponse({ error: data.error.message });
      return jsonResponse({ ok: true });
    } catch (e) {
      return jsonResponse({ error: 'Connection failed: ' + e.message });
    }
  }

  // ── Build Anthropic messages ─────────────────────────────────────────────
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

  // ── Stream the response back to the browser ──────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {

      const emit = (obj) => {
        controller.enqueue(encoder.encode('data: ' + JSON.stringify(obj) + '\n\n'));
      };

      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            stream: true,
            system: SYSTEM,
            messages,
          }),
        });

        if (!res.ok) {
          let errMsg = `Anthropic API error (${res.status})`;
          try {
            const t = await res.text();
            const j = JSON.parse(t);
            errMsg = j.error?.message || errMsg;
          } catch {}
          emit({ error: errMsg });
          controller.close();
          return;
        }

        let accumulated = '';
        const reader = res.body.getReader();
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
              // Send progress so browser knows we're alive
              emit({ progress: accumulated.length });
            }

            if (evt.type === 'message_stop') {
              // Extract JSON from accumulated text
              let js = accumulated.trim()
                .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
              const si = js.indexOf('{'), ei = js.lastIndexOf('}');
              if (si !== -1 && ei !== -1) js = js.slice(si, ei + 1);
              try {
                emit({ result: JSON.parse(js) });
              } catch {
                emit({ error: 'Could not parse AI response. Try a smaller file or plain text version.' });
              }
            }

            if (evt.type === 'error') {
              emit({ error: evt.error?.message || 'Stream error from Anthropic' });
            }
          }
        }
      } catch (e) {
        emit({ error: 'Server error: ' + e.message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
