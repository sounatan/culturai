// ========================================================
// CLOUDFLARE WORKER — Proxy com fallback OpenAI → Gemini
// ========================================================
//
// INSTRUÇÕES DE DEPLOY:
//
// 1. Acesse https://dash.cloudflare.com
// 2. Workers & Pages → seu worker "culturai-api"
// 3. Clique em "Edit code" e cole TODO este código
// 4. Clique em "Deploy"
// 5. Vá em "Settings" → "Variables and Secrets"
// 6. Adicione DUAS variáveis (ambas como Secret/Encrypt):
//    - OPENAI_API_KEY: sua chave sk-proj-...
//    - GEMINI_API_KEY: sua chave do Google AI Studio
//
// Para obter a chave do Gemini (grátis):
//    - Acesse https://aistudio.google.com/apikey
//    - Clique em "Create API Key"
//    - Copie a chave gerada
//
// COMPORTAMENTO:
// - Tenta OpenAI primeiro
// - Se OpenAI falhar (quota, erro, timeout), usa Gemini como fallback
// - Free tier do Gemini: ~250 requisições/dia com Gemini 2.5 Flash
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
          const openaiResult = await callOpenAI(body, env.OPENAI_API_KEY);
          if (openaiResult.ok) {
            return new Response(JSON.stringify(openaiResult.data), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (e) {
          // OpenAI falhou, tentar Gemini
          console.log('OpenAI falhou, tentando Gemini:', e.message);
        }
      }

      // Fallback: Gemini
      if (env.GEMINI_API_KEY) {
        try {
          const geminiResult = await callGemini(body, env.GEMINI_API_KEY);
          if (geminiResult.ok) {
            // Formatar resposta do Gemini no mesmo formato que OpenAI
            return new Response(JSON.stringify(geminiResult.data), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (e) {
          console.log('Gemini também falhou:', e.message);
        }
      }

      // Ambos falharam
      return new Response(JSON.stringify({
        error: { message: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.' }
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

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
      max_tokens: body.max_tokens || 16000,
      temperature: body.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return { ok: true, data };
}

// === Gemini ===
async function callGemini(body, apiKey) {
  // Converter formato OpenAI messages → Gemini contents
  const contents = convertMessagesToGemini(body.messages);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: body.temperature || 0.7,
          maxOutputTokens: body.max_tokens || 16000,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const geminiData = await response.json();

  // Extrair texto da resposta do Gemini
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Formatar no mesmo padrão da OpenAI para o frontend não precisar mudar
  const formattedData = {
    choices: [
      {
        message: {
          role: 'assistant',
          content: text,
        },
      },
    ],
  };

  return { ok: true, data: formattedData };
}

// Converter mensagens do formato OpenAI para Gemini
function convertMessagesToGemini(messages) {
  const contents = [];
  let systemInstruction = '';

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Gemini não tem "system" role — concatenar com a primeira mensagem do user
      systemInstruction += msg.content + '\n\n';
    } else if (msg.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: systemInstruction + msg.content }],
      });
      systemInstruction = ''; // Limpar após usar
    } else if (msg.role === 'assistant') {
      contents.push({
        role: 'model',
        parts: [{ text: msg.content }],
      });
    }
  }

  return contents;
}
