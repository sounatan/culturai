# 🎭 CulturAI — Gerador de Projetos Culturais com IA

Landing page que usa inteligência artificial para gerar projetos culturais completos, prontos para submissão em editais, leis de incentivo e fundos de cultura no Brasil.

## ✨ Funcionalidades

- **Formulário inteligente** com perguntas essenciais sobre o projeto
- **Integração com IA (GPT-4o)** para gerar projetos completos e personalizados
- **Upload de materiais** — currículo, clipping, roteiro, portfólio, etc.
- **Pesquisa automática** sobre editais e leis de incentivo informados
- **Geração de**: justificativa, metas, cronograma, orçamento, plano de divulgação e mais
- **Edição direta** do projeto gerado (contenteditable)
- **Chat de refinamento** — peça ajustes à IA e ela refina o projeto
- **Copiar/Baixar** o projeto gerado
- **Disclaimer claro** sobre responsabilidade e recomendação de revisão humana
- **Responsivo** — funciona em desktop e mobile
- **Gratuito para o usuário** — a chave de API é do administrador

## 🚀 Deploy no GitHub Pages

### Passo a Passo

1. **Crie um repositório no GitHub** (ex: `cultural-project-generator`)

2. **Configure sua chave da API OpenAI:**
   - Abra o arquivo `app.js`
   - Substitua `'SUA_CHAVE_OPENAI_AQUI'` pela sua chave da OpenAI
   - ⚠️ **IMPORTANTE**: A chave ficará exposta no código client-side. Veja a seção "Segurança" abaixo para alternativas.

3. **Envie os arquivos:**
   ```bash
   cd cultural-project-generator
   git init
   git add .
   git commit -m "Initial commit - CulturAI landing page"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/cultural-project-generator.git
   git push -u origin main
   ```

4. **Ative o GitHub Pages:**
   - Vá em **Settings** → **Pages**
   - Em **Source**, selecione **Deploy from a branch**
   - Selecione a branch `main` e pasta `/ (root)`
   - Clique em **Save**

5. **Acesse seu site:**
   - O site estará disponível em: `https://SEU-USUARIO.github.io/cultural-project-generator/`

## 🔒 Segurança da API Key

Como a chave está no client-side (JavaScript), qualquer pessoa que inspecionar o código pode vê-la. Para produção, recomenda-se usar um backend intermediário:

**Opções recomendadas:**
- **Netlify Functions** — crie um endpoint serverless que faz proxy da chamada
- **Vercel Edge Functions** — similar ao Netlify, ideal para Next.js ou projetos estáticos
- **Cloudflare Workers** — proxy serverless gratuito com bom free tier
- **AWS Lambda + API Gateway** — para quem já usa AWS

Exemplo básico com Netlify Functions:
```js
// netlify/functions/generate.js
exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return { statusCode: 200, body: JSON.stringify(data) };
};
```

## 📋 Campos do Formulário

| Campo | Descrição |
|-------|-----------|
| Modalidade Artística | Teatro, Dança, Música, Artes Visuais, Literatura, Cinema, etc. |
| Tipo de Projeto | Montagem de espetáculo, Circulação, Lançamento de livro, etc. |
| Edital/Lei de Incentivo | Lei Rouanet, ProAC, Funarte, Lei Paulo Gustavo, etc. |
| Localidade | Onde o projeto será executado |
| Público-Alvo | Para quem o projeto é direcionado |
| Valor Pretendido | Quanto pretende solicitar |
| Descrição Detalhada | O que pretende fazer (quanto mais detalhes, melhor!) |
| Info Adicionais | Histórico, premiações, contrapartidas, etc. |
| Materiais de Apoio | Upload de PDFs, DOCs, imagens (currículo, clipping, roteiro) |

## 🔄 Fluxo Pós-Geração

1. **Edição direta** — o texto gerado é editável direto na página
2. **Refinamento com IA** — use o chat para pedir ajustes (ex: "melhore a justificativa", "adicione mais metas")
3. **Download/Cópia** — exporte o resultado final
4. **Disclaimer** — aviso claro de que o projeto é base e precisa de revisão humana

## 🏗️ Estrutura do Projeto Gerado

A IA gera um projeto com as seguintes seções (adaptadas ao edital informado):

1. Identificação do Projeto
2. Apresentação / Sinopse
3. Justificativa
4. Objetivos (Geral e Específicos)
5. Metas quantificáveis
6. Cronograma de Execução
7. Público-Alvo detalhado
8. Plano de Divulgação
9. Acessibilidade
10. Democratização do Acesso
11. Contrapartida Social
12. Orçamento Detalhado
13. Ficha Técnica
14. Currículo do Proponente

## 💰 Custos

- **Landing page:** Gratuita (GitHub Pages)
- **API OpenAI (para o admin):** ~R$ 0,50 a R$ 2,00 por projeto gerado (modelo GPT-4o)

## 🛠️ Tecnologias

- HTML5
- CSS3 (design responsivo, dark theme)
- JavaScript (vanilla, sem dependências)
- API OpenAI (GPT-4o)
- GitHub Pages (hospedagem)

## 📝 Licença

MIT License — use, modifique e distribua livremente.

---

Feito com 💜 para democratizar o acesso à cultura.
