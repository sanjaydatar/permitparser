export const maxDuration = 60;

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

export async function POST(request) {
  try {
    const body = await request.json();
    const { key, content, filename, test } = body;

    if (!key) {
      return Response.json({ error: 'Missing API key' }, { status: 400 });
    }

    const apiKey = key || process.env.ANTHROPIC_API_KEY;

    // Test ping
    if (test) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say OK' }],
        }),
      });
      const data = await res.json();
      if (data.error) return Response.json({ error: data.error.message });
      return Response.json({ ok: true });
    }

    // Full analysis
    let messages;
    if (content?.type === 'pdf') {
      messages = [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: content.data },
          },
          { type: 'text', text: `Extract all compliance obligations from this permit (${filename}) as JSON.` },
        ],
      }];
    } else {
      const text = (content?.data || '').slice(0, 90000);
      messages = [{
        role: 'user',
        content: `Extract all compliance obligations from this permit (${filename}) as JSON.\n\nPERMIT TEXT:\n${text}`,
      }];
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: SYSTEM,
        messages,
      }),
    });

    const data = await res.json();
    if (data.error) return Response.json({ error: data.error.message });

    const raw = (data.content || []).map(b => b.text || '').join('').trim();

    // Robust JSON extraction
    let jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const s = jsonStr.indexOf('{');
    const e = jsonStr.lastIndexOf('}');
    if (s !== -1 && e !== -1) jsonStr = jsonStr.slice(s, e + 1);

    try {
      const result = JSON.parse(jsonStr);
      return Response.json({ result });
    } catch {
      return Response.json({ error: 'Could not parse AI response. Please try again.' });
    }

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
