// ===== CulturAI - Gerador de Projetos Culturais com IA =====

// URL do Cloudflare Worker (proxy seguro)
const WORKER_URL = 'https://culturai-api.sounatan1.workers.dev';

// Google Sheets (registro de projetos)


document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cultural-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const resultSection = document.getElementById('resultado');
    const resultContent = document.getElementById('result-content');
    const copyBtn = document.getElementById('copy-btn');
    const downloadDocxBtn = document.getElementById('download-docx-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const newProjectBtn = document.getElementById('new-project-btn');
    const refinementBtn = document.getElementById('refinement-btn');
    const refinementInput = document.getElementById('refinement-input');

    // Estado
    let conversationHistory = [];
    let uploadedFiles = [];
    let projectVersion = 0;
    let currentMetadata = null;

    // === Campos condicionais ===
    const modalidadeSelect = document.getElementById('modalidade');
    const modalidadeOutraGroup = document.getElementById('modalidade-outra-group');
    modalidadeSelect.addEventListener('change', () => {
        modalidadeOutraGroup.classList.toggle('hidden', modalidadeSelect.value !== 'outra');
    });

    const tipoSelect = document.getElementById('tipo-projeto');
    const tipoOutroGroup = document.getElementById('tipo-outro-group');
    tipoSelect.addEventListener('change', () => {
        tipoOutroGroup.classList.toggle('hidden', tipoSelect.value !== 'outro');
    });

    // === Upload de Materiais ===
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('materiais');
    const fileList = document.getElementById('file-list');

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = '';
    });

    function handleFiles(files) {
        const maxFiles = 5;
        const maxSize = 10 * 1024 * 1024;
        const allowedExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'jpg', 'jpeg', 'png'];

        for (const file of files) {
            if (uploadedFiles.length >= maxFiles) { alert(`Máximo de ${maxFiles} arquivos.`); break; }
            if (file.size > maxSize) { alert(`"${file.name}" excede 10MB.`); continue; }
            const ext = file.name.split('.').pop().toLowerCase();
            if (!allowedExts.includes(ext)) { alert(`Formato não suportado: "${file.name}".`); continue; }
            uploadedFiles.push(file);
        }
        renderFileList();
    }

    function renderFileList() {
        fileList.innerHTML = '';
        uploadedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            const sizeKB = (file.size / 1024).toFixed(0);
            const icons = { pdf:'📕', doc:'📘', docx:'📘', txt:'📄', rtf:'📄', jpg:'🖼️', jpeg:'🖼️', png:'🖼️' };
            const ext = file.name.split('.').pop().toLowerCase();
            const icon = icons[ext] || '📎';
            item.innerHTML = `
                <span class="file-item-name">${icon} ${file.name} <small>(${sizeKB}KB)</small></span>
                <button class="file-item-remove" data-index="${index}" title="Remover">✕</button>
            `;
            fileList.appendChild(item);
        });
        fileList.querySelectorAll('.file-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                uploadedFiles.splice(parseInt(e.target.dataset.index), 1);
                renderFileList();
            });
        });
    }

    async function readFileAsText(file) {
        return new Promise((resolve) => {
            const ext = file.name.split('.').pop().toLowerCase();
            if (['txt', 'rtf'].includes(ext)) {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => resolve(`[Não foi possível ler: ${file.name}]`);
                reader.readAsText(file);
            } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
                resolve(`[Imagem anexada: ${file.name}]`);
            } else if (ext === 'pdf') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = extractTextFromPDF(e.target.result);
                    resolve(text || `[PDF anexado: ${file.name}]`);
                };
                reader.onerror = () => resolve(`[PDF: ${file.name}]`);
                reader.readAsArrayBuffer(file);
            } else {
                resolve(`[Documento: ${file.name}. Inclua info relevante na descrição.]`);
            }
        });
    }

    function extractTextFromPDF(arrayBuffer) {
        try {
            const bytes = new Uint8Array(arrayBuffer);
            let text = '', inText = false, buffer = '';
            for (let i = 0; i < bytes.length; i++) {
                const char = String.fromCharCode(bytes[i]);
                if (char === '(' && !inText) { inText = true; buffer = ''; }
                else if (char === ')' && inText) { inText = false; text += buffer + ' '; }
                else if (inText) { buffer += char; }
            }
            const cleaned = text.replace(/\s+/g, ' ').trim();
            return cleaned.length > 50 ? cleaned.substring(0, 5000) : null;
        } catch { return null; }
    }

    // === Submissão ===
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await generateProject();
    });

    // === Copiar ===
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(resultContent.innerText).then(() => {
            copyBtn.textContent = '✅ Copiado!';
            setTimeout(() => { copyBtn.textContent = '📋 Copiar Texto'; }, 2000);
        });
    });

    // === Download DOCX ===
    downloadDocxBtn.addEventListener('click', async () => {
        const text = resultContent.innerText;
        projectVersion++;

        try {
            const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;

            // Converter texto em parágrafos DOCX
            const lines = text.split('\n');
            const children = [];

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) {
                    children.push(new Paragraph({ text: '' }));
                    continue;
                }

                // Detectar títulos (linhas em CAPS ou que começam com número seguido de ponto)
                const isHeading = /^\d+[\.\)]\s/.test(trimmed) || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 80);

                if (isHeading) {
                    children.push(new Paragraph({
                        text: trimmed,
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 240, after: 120 },
                    }));
                } else {
                    children.push(new Paragraph({
                        children: [new TextRun({ text: trimmed, size: 24 })],
                        spacing: { after: 80 },
                    }));
                }
            }

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: children,
                }],
            });

            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `projeto-cultural-v${projectVersion}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Salvar na planilha ao fazer download
            await saveProject(text, `download-v${projectVersion}`);

            downloadDocxBtn.textContent = '✅ DOCX baixado!';
            setTimeout(() => { downloadDocxBtn.textContent = '⬇️ Baixar DOCX'; }, 2000);
        } catch (error) {
            console.error('Erro ao gerar DOCX:', error);
            // Fallback: baixar como TXT
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `projeto-cultural-v${projectVersion}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            await saveProject(text, `download-v${projectVersion}`);
        }
    });

    // === Download PDF (via impressão do navegador) ===
    downloadPdfBtn.addEventListener('click', async () => {
        const text = resultContent.innerText;
        projectVersion++;

        // Salvar na planilha
        await saveProject(text, `download-v${projectVersion}`);

        // Abrir janela de impressão com o conteúdo formatado
        const printWindow = window.open('', '_blank');
        const lines = text.split('\n');
        let htmlContent = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { htmlContent += '<br>'; continue; }
            const isHeading = /^\d+[\.\)]\s/.test(trimmed) || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 80);
            if (isHeading) {
                htmlContent += `<h2 style="margin-top:20px;margin-bottom:8px;font-size:14px;">${trimmed}</h2>`;
            } else {
                htmlContent += `<p style="margin:4px 0;font-size:12px;line-height:1.6;">${trimmed}</p>`;
            }
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Projeto Cultural</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #000; }
                h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
                @media print { body { padding: 20px; } }
            </style>
            </head><body>${htmlContent}</body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);

        downloadPdfBtn.textContent = '✅ PDF aberto!';
        setTimeout(() => { downloadPdfBtn.textContent = '⬇️ Baixar PDF'; }, 2000);
    });

    // === Novo Projeto ===
    newProjectBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        conversationHistory = [];
        projectVersion = 0;
        currentMetadata = null;
        document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' });
    });

    // === Refinamento ===
    refinementBtn.addEventListener('click', async () => {
        const feedback = refinementInput.value.trim();
        if (!feedback) { alert('Descreva o ajuste desejado.'); return; }

        const refineBtnText = refinementBtn.querySelector('.refine-btn-text');
        const refineBtnLoading = refinementBtn.querySelector('.refine-btn-loading');
        refinementBtn.disabled = true;
        refineBtnText.classList.add('hidden');
        refineBtnLoading.classList.remove('hidden');

        try {
            conversationHistory.push({
                role: 'user',
                content: `O usuário pediu o seguinte ajuste no projeto gerado:\n\n"${feedback}"\n\nGere o projeto completo novamente com esse ajuste incorporado. Mantenha toda a estrutura e detalhes, aplicando apenas as mudanças solicitadas.`
            });

            const response = await callAI(conversationHistory);
            conversationHistory.push({ role: 'assistant', content: response });
            resultContent.innerText = response;
            refinementInput.value = '';
            resultContent.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Erro:', error);
            alert(`Erro ao refinar: ${error.message}`);
            conversationHistory.pop();
        } finally {
            refinementBtn.disabled = false;
            refineBtnText.classList.remove('hidden');
            refineBtnLoading.classList.add('hidden');
        }
    });

    // === Geração do Projeto ===
    async function generateProject() {
        const proponenteNome = document.getElementById('proponente-nome').value.trim();
        const tipoPessoa = document.getElementById('tipo-pessoa');
        const tipoPessoaText = tipoPessoa.options[tipoPessoa.selectedIndex].text;
        const nomeProjeto = document.getElementById('nome-projeto').value.trim();

        const modalidade = modalidadeSelect.value === 'outra'
            ? document.getElementById('modalidade-outra').value
            : modalidadeSelect.options[modalidadeSelect.selectedIndex].text;

        const tipoProjeto = tipoSelect.value === 'outro'
            ? document.getElementById('tipo-outro').value
            : tipoSelect.options[tipoSelect.selectedIndex].text;

        const edital = document.getElementById('edital').value.trim();
        const localidade = document.getElementById('localidade').value.trim();
        const publicoAlvo = document.getElementById('publico-alvo').value.trim();
        const valor = document.getElementById('valor').value.trim();
        const descricao = document.getElementById('descricao').value.trim();
        const infoAdicional = document.getElementById('info-adicional').value.trim();

        let materiaisTexto = '';
        if (uploadedFiles.length > 0) {
            const fileContents = await Promise.all(uploadedFiles.map(readFileAsText));
            materiaisTexto = fileContents.map((c, i) => `--- ${uploadedFiles[i].name} ---\n${c}`).join('\n\n');
        }

        // Salvar metadata para uso no download
        currentMetadata = { proponente: proponenteNome, tipoPessoa: tipoPessoaText, nomeProjeto: nomeProjeto || '(sugerido pela IA)', modalidade, tipoProjeto, edital, localidade, valor };

        const prompt = buildPrompt({ proponenteNome, tipoPessoaText, nomeProjeto, modalidade, tipoProjeto, edital, localidade, publicoAlvo, valor, descricao, infoAdicional, materiaisTexto });

        conversationHistory = [
            { role: 'system', content: 'Você é um especialista em elaboração de projetos culturais brasileiros. Gere projetos completos, profissionais e adequados aos editais solicitados. Responda sempre em português brasileiro. Quando o usuário pedir ajustes, gere o projeto completo novamente com as mudanças incorporadas.' },
            { role: 'user', content: prompt }
        ];

        projectVersion = 0;
        setLoading(true);

        try {
            const response = await callAI(conversationHistory);
            conversationHistory.push({ role: 'assistant', content: response });
            resultContent.innerText = response;
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Erro:', error);
            alert(`Erro ao gerar o projeto: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    function buildPrompt({ proponenteNome, tipoPessoaText, nomeProjeto, modalidade, tipoProjeto, edital, localidade, publicoAlvo, valor, descricao, infoAdicional, materiaisTexto }) {
        let prompt = `Você é um especialista em elaboração de projetos culturais no Brasil, com profundo conhecimento sobre leis de incentivo, editais de fomento à cultura e mecanismos de financiamento cultural (Lei Rouanet/Lei Federal de Incentivo à Cultura, ProAC, Lei Paulo Gustavo, Lei Aldir Blanc, Funarte, editais municipais e estaduais, entre outros).

TAREFA: Gerar um projeto cultural completo, profissional e pronto para submissão, baseado nas informações fornecidas pelo proponente.

INFORMAÇÕES DO PROPONENTE:
- Nome do Proponente: ${proponenteNome}
- Tipo: ${tipoPessoaText}
${nomeProjeto ? '- Nome do Projeto (definido pelo proponente): ' + nomeProjeto : '- Nome do Projeto: Sugira um nome criativo e adequado'}
- Modalidade Artística: ${modalidade}
- Tipo de Projeto: ${tipoProjeto}
- Edital/Lei de Incentivo: ${edital}
- Localidade de Execução: ${localidade || 'Não informada'}
- Público-Alvo: ${publicoAlvo || 'Não informado'}
- Valor Pretendido: ${valor ? 'R$ ' + valor : 'Não informado'}
- Descrição do Projeto: ${descricao}
${infoAdicional ? '- Informações Adicionais: ' + infoAdicional : ''}`;

        if (materiaisTexto) {
            prompt += `\n\nMATERIAIS DE APOIO ENVIADOS PELO PROPONENTE:\n${materiaisTexto}`;
        }

        prompt += `\n\nINSTRUÇÕES:
1. Pesquise em seu conhecimento sobre o edital/lei "${edital}" para entender os requisitos, critérios de seleção, e formato exigido.
2. Elabore o projeto seguindo a estrutura padrão exigida pelo mecanismo de fomento indicado.
3. O projeto deve ser coerente, bem justificado e adequado à realidade cultural brasileira.
4. Se materiais de apoio foram fornecidos, use-os para enriquecer o currículo e contextualização.
5. Use o nome do proponente "${proponenteNome}" na identificação e currículo do projeto.

ESTRUTURA DO PROJETO (adapte conforme as exigências do edital):

1. IDENTIFICAÇÃO DO PROJETO
   - Nome do Projeto${nomeProjeto ? ': ' + nomeProjeto : ' (sugira um nome criativo)'}
   - Proponente: ${proponenteNome} (${tipoPessoaText})
   - Modalidade / Área cultural

2. APRESENTAÇÃO / SINOPSE

3. JUSTIFICATIVA
   - Relevância, contexto cultural/social, lacuna preenchida, impacto

4. OBJETIVOS
   - Objetivo Geral
   - Objetivos Específicos (mínimo 4)

5. METAS (mínimo 5, quantificáveis e mensuráveis)

6. ETAPAS / CRONOGRAMA DE EXECUÇÃO (mês a mês)

7. PÚBLICO-ALVO (descrição detalhada + estimativa)

8. PLANO DE DIVULGAÇÃO

9. ACESSIBILIDADE (física, comunicacional, atitudinal)

10. DEMOCRATIZAÇÃO DO ACESSO

11. CONTRAPARTIDA SOCIAL

12. PLANO DE DISTRIBUIÇÃO / CIRCULAÇÃO (se aplicável)

13. ORÇAMENTO DETALHADO (itens, quantidades, valores — somar total pretendido)

14. FICHA TÉCNICA

15. CURRÍCULO DO PROPONENTE / HISTÓRICO

16. SUGESTÕES DE OUTROS EDITAIS, FUNDOS E OPORTUNIDADES
    - Sugira pelo menos 8 outros editais, leis de incentivo, fundos, prêmios ou residências (nacionais E internacionais) compatíveis com este projeto
    - PRIORIZE editais e oportunidades que costumam abrir inscrições periodicamente (informe o período típico de abertura, ex: "abre inscrições geralmente entre março e maio")
    - Inclua editais internacionais/globais quando a obra puder atender os critérios (ex: tradução para inglês, caráter inovador, ineditismo)
    - Para cada sugestão, informe obrigatoriamente:
      * Nome do edital/fundo/prêmio
      * Instituição responsável
      * País/região
      * Site oficial (URL completa para o proponente pesquisar)
      * Período típico de inscrições (quando costuma abrir)
      * Valor médio disponível (se conhecido)
      * Requisitos principais
      * Por que este projeto se encaixa
    - Considere fontes como: British Council, Goethe-Institut, Iberescena, UNESCO, APAP, National Endowment for the Arts, Fondo Nacional de las Artes, Fondation de France, Prins Claus Fund, Ford Foundation, Itaú Cultural, SESC, SESI, Funarte, editais estaduais, municipais, etc.
    - Inclua também plataformas de crowdfunding cultural se relevante (Catarse, Benfeitoria, etc.)

IMPORTANTE:
- Linguagem formal e técnica adequada a editais culturais
- Valores do orçamento realistas, somando o total pretendido
- Adapte ao edital "${edital}"
- Inclua métricas e indicadores
- Cronograma realista (6 a 12 meses)
- IMPORTANTE: Você tem um limite de 12.000 tokens para a resposta. Gere TODAS as 16 seções, mas seja objetivo e direto em cada uma. Priorize conteúdo útil sem ser prolixo. Cada seção deve ter substância suficiente para uso real, mas sem repetições ou preenchimento desnecessário. NÃO corte seções — é melhor ser conciso em cada uma do que deixar alguma de fora.`;

        return prompt;
    }

    // === Chamada à IA (via Worker) ===
    async function callAI(messages, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, model: 'gpt-4o', max_tokens: 12000, temperature: 0.7 })
            });

            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content;
            }

            const error = await response.json().catch(() => ({}));

            if (response.status === 401) throw new Error('Erro de autenticação. Contate o administrador.');

            // Rate limit ou indisponível: retry com espera
            if ((response.status === 429 || response.status === 503) && attempt < retries) {
                const wait = attempt * 5; // 5s, 10s, 15s
                console.log(`Tentativa ${attempt} falhou (${response.status}). Aguardando ${wait}s...`);
                await new Promise(r => setTimeout(r, wait * 1000));
                continue;
            }

            // Última tentativa falhou
            if (response.status === 429) {
                throw new Error(error?.error?.code === 'insufficient_quota'
                    ? 'Serviço indisponível no momento. Contate o administrador.'
                    : 'Muitas requisições. Aguarde 1 minuto e tente novamente.');
            }
            if (response.status === 503) throw new Error('Serviço ocupado. Aguarde 1 minuto e tente novamente.');
            throw new Error(error?.error?.message || `Erro ${response.status}. Tente novamente.`);
        }
    }

    // === Salvar na Planilha (apenas no download) ===
    async function saveProject(projectContent, type) {
        try {
            const record = {
                id: generateId(),
                timestamp: new Date().toISOString(),
                type: type,
                version: projectVersion,
                proponente: currentMetadata?.proponente || '',
                tipoPessoa: currentMetadata?.tipoPessoa || '',
                nomeProjeto: currentMetadata?.nomeProjeto || '',
                modalidade: currentMetadata?.modalidade || '',
                tipoProjeto: currentMetadata?.tipoProjeto || '',
                edital: currentMetadata?.edital || '',
                localidade: currentMetadata?.localidade || '',
                valor: currentMetadata?.valor || '',
                content: projectContent
            };

            // Enviar para Google Sheets via Worker (rota /save)
            try {
                await fetch(WORKER_URL + '/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                });
                console.log(`Projeto salvo (${type}, v${projectVersion})`);
            } catch (saveErr) {
                console.warn('Falha ao salvar na planilha:', saveErr);
            }
        } catch (error) {
            console.warn('Erro ao salvar:', error);
        }
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    function setLoading(loading) {
        submitBtn.disabled = loading;
        btnText.classList.toggle('hidden', loading);
        btnLoading.classList.toggle('hidden', !loading);
    }
});
