// ========================================================
// CLOUDFLARE WORKER — Proxy para API da OpenAI
// ========================================================
//
// INSTRUÇÕES DE DEPLOY:
//
// 1. Acesse https://dash.cloudflare.com (crie conta gratuita se não tiver)
// 2. No menu lateral, vá em "Workers & Pages"
// 3. Clique em "Create" → "Create Worker"
// 4. Dê um nome (ex: "culturai-api")
// 5. Apague o código padrão e cole TODO este código
// 6. Clique em "Deploy"
// 7. Depois do deploy, vá em "Settings" → "Variables and Secrets"
// 8. Adicione uma variável:
//    - Nome: OPENAI_API_KEY
//    - Valor: sua chave sk-proj-...
//    - Marque como "Encrypt" (criptografada)
// 9. Copie a URL do worker (ex: https://culturai-api.SEU-USUARIO.workers.dev)
// 10. Cole essa URL no app.js (variável WORKER_URL)
//
// Free tier: 100.000 requisições/dia — mais que suficiente.
// ========================================================

export default {
  async fetch(request, env) {
    // Permitir CORS para sua landing page
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Responder preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Apenas POST é permitido
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.json();

      // Validar que tem messages no body
      if (!body.messages || !Array.isArray(body.messages)) {
        return new Response(JSON.stringify({ error: 'Requisição inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Chamar a OpenAI com a chave segura (do ambiente)
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: body.model || 'gpt-4o',
          messages: body.messages,
          max_tokens: body.max_tokens || 8000,
          temperature: body.temperature || 0.7,
        }),
      });

      const data = await openaiResponse.json();

      // Repassar a resposta (incluindo erros da OpenAI)
      return new Response(JSON.stringify(data), {
        status: openaiResponse.status,
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
