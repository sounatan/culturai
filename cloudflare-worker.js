// ========================================================
// CLOUDFLARE WORKER — Proxy OpenAI/Gemini + Google Sheets
// ========================================================
//
// VARIÁVEIS DE AMBIENTE (Settings → Variables and Secrets):
//   - OPENAI_API_KEY: chave OpenAI (Secret)
//   - GEMINI_API_KEY: chave Google Gemini (Secret)
//   - GOOGLE_SHEETS_URL: URL do Google Apps Script (pode ser plain text)
//
// ROTAS:
//   POST / → gera projeto (proxy para OpenAI/Gemini)
//   POST /save → salva projeto no Google Sheets
// ========================================================

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);

    // Rota: salvar no Google Sheets
    if (url.pathname === '/save') {
      return await handleSaveToSheets(request, env, corsHeaders);
    }

    // Rota padrão: gerar projeto via IA
    return await handleGenerate(request, env, corsHeaders);
  },
};

// === GERAR PROJETO ===
async function handleGenerate(request, env, corsHeaders) {
  try {
    const body = await request.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: 'Requisição inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tentar OpenAI primeiro
    if (env.OPENAI_API_KEY) {
      try {
        const result = await callOpenAI(body, env.OPENAI_API_KEY);
        if (result.ok) {
          return new Response(JSON.stringify(result.data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        console.log('OpenAI falhou:', e.message);
      }
    }

    // Fallback: Gemini
    if (env.GEMINI_API_KEY) {
      try {
        const result = await callGemini(body, env.GEMINI_API_KEY);
        if (result.ok) {
          return new Response(JSON.stringify(result.data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        console.log('Gemini falhou:', e.message);
      }
    }

    return new Response(JSON.stringify({
      error: { message: 'Serviço temporariamente indisponível.' }
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// === SALVAR NO GOOGLE SHEETS ===
async function handleSaveToSheets(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const sheetsUrl = env.GOOGLE_SHEETS_URL;

    if (!sheetsUrl) {
      return new Response(JSON.stringify({ error: 'Google Sheets não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enviar para o Google Apps Script via POST (server-to-server, sem CORS)
    const response = await fetch(sheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });

    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch { result = { status: 'ok', raw: text }; }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao salvar: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// === OpenAI ===
async function callOpenAI(body, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model || 'gpt-4o',
      messages: body.messages,
      max_tokens: body.max_tokens || 32000,
      temperature: body.temperature || 0.7,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI: ${response.status}`);
  const data = await response.json();
  return { ok: true, data };
}

// === Gemini ===
async function callGemini(body, apiKey) {
  const contents = convertMessagesToGemini(body.messages);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: body.temperature || 0.7,
          maxOutputTokens: body.max_tokens || 32000,
        },
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini: ${response.status}`);
  const geminiData = await response.json();
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    ok: true,
    data: {
      choices: [{ message: { role: 'assistant', content: text } }],
    },
  };
}

function convertMessagesToGemini(messages) {
  const contents = [];
  let systemInstruction = '';

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction += msg.content + '\n\n';
    } else if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: systemInstruction + msg.content }] });
      systemInstruction = '';
    } else if (msg.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  }

  return contents;
}
