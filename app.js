// ===== CulturAI - Gerador de Projetos Culturais com IA =====

// URL do Cloudflare Worker (proxy seguro para a API da OpenAI)
// Substitua pela URL do seu worker após o deploy
const WORKER_URL = 'https://culturai-api.SEU-USUARIO.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cultural-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const resultSection = document.getElementById('resultado');
    const resultContent = document.getElementById('result-content');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const newProjectBtn = document.getElementById('new-project-btn');
    const refinementBtn = document.getElementById('refinement-btn');
    const refinementInput = document.getElementById('refinement-input');

    // Estado
    let conversationHistory = [];
    let uploadedFiles = [];

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
            if (uploadedFiles.length >= maxFiles) {
                alert(`Máximo de ${maxFiles} arquivos permitidos.`);
                break;
            }
            if (file.size > maxSize) {
                alert(`O arquivo "${file.name}" excede o limite de 10MB.`);
                continue;
            }
            const ext = file.name.split('.').pop().toLowerCase();
            if (!allowedExts.includes(ext)) {
                alert(`Formato não suportado: "${file.name}". Use PDF, DOC, DOCX, TXT, RTF, JPG ou PNG.`);
                continue;
            }
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
            const icon = getFileIcon(file.name);
            item.innerHTML = `
                <span class="file-item-name">${icon} ${file.name} <small>(${sizeKB}KB)</small></span>
                <button class="file-item-remove" data-index="${index}" title="Remover">✕</button>
            `;
            fileList.appendChild(item);
        });

        fileList.querySelectorAll('.file-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                uploadedFiles.splice(idx, 1);
                renderFileList();
            });
        });
    }

    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = { pdf: '📕', doc: '📘', docx: '📘', txt: '📄', rtf: '📄', jpg: '🖼️', jpeg: '��️', png: '🖼️' };
        return icons[ext] || '��';
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
                    resolve(text || `[PDF anexado: ${file.name} — conteúdo não extraível diretamente]`);
                };
                reader.onerror = () => resolve(`[PDF anexado: ${file.name}]`);
                reader.readAsArrayBuffer(file);
            } else {
                resolve(`[Documento anexado: ${file.name}. Inclua informações relevantes na descrição.]`);
            }
        });
    }

    function extractTextFromPDF(arrayBuffer) {
        try {
            const bytes = new Uint8Array(arrayBuffer);
            let text = '';
            let inText = false;
            let buffer = '';
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

    // === Ações do resultado ===
    copyBtn.addEventListener('click', () => {
        const text = resultContent.innerText;
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = '✅ Copiado!';
            setTimeout(() => { copyBtn.textContent = '📋 Copiar Texto'; }, 2000);
        });
    });

    downloadBtn.addEventListener('click', () => {
        const text = resultContent.innerText;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'projeto-cultural.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    newProjectBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        conversationHistory = [];
        document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' });
    });

    // === Refinamento ===
    refinementBtn.addEventListener('click', async () => {
        const feedback = refinementInput.value.trim();
        if (!feedback) {
            alert('Por favor, descreva o ajuste que deseja.');
            return;
        }

        const refineBtnText = refinementBtn.querySelector('.refine-btn-text');
        const refineBtnLoading = refinementBtn.querySelector('.refine-btn-loading');

        refinementBtn.disabled = true;
        refineBtnText.classList.add('hidden');
        refineBtnLoading.classList.remove('hidden');

        try {
            conversationHistory.push({
                role: 'user',
                content: `O usuário pediu o seguinte ajuste no projeto gerado:\n\n"${feedback}"\n\nPor favor, gere o projeto completo novamente com esse ajuste incorporado. Mantenha toda a estrutura e detalhes, aplicando apenas as mudanças solicitadas.`
            });

            const response = await callAI(conversationHistory);
            conversationHistory.push({ role: 'assistant', content: response });

            resultContent.innerText = response;
            refinementInput.value = '';

            // Salvar versão refinada
            await saveProject(response, 'refinamento');

            resultContent.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Erro no refinamento:', error);
            alert(`Erro ao refinar o projeto: ${error.message}`);
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

        // Ler arquivos
        let materiaisTexto = '';
        if (uploadedFiles.length > 0) {
            const fileContents = await Promise.all(uploadedFiles.map(readFileAsText));
            materiaisTexto = fileContents
                .map((content, i) => `--- Arquivo: ${uploadedFiles[i].name} ---\n${content}`)
                .join('\n\n');
        }

        const prompt = buildPrompt({
            proponenteNome, tipoPessoaText, nomeProjeto, modalidade,
            tipoProjeto, edital, localidade, publicoAlvo, valor,
            descricao, infoAdicional, materiaisTexto
        });

        conversationHistory = [
            {
                role: 'system',
                content: 'Você é um especialista em elaboração de projetos culturais brasileiros. Gere projetos completos, profissionais e adequados aos editais solicitados. Responda sempre em português brasileiro. Quando o usuário pedir ajustes, gere o projeto completo novamente com as mudanças incorporadas.'
            },
            { role: 'user', content: prompt }
        ];

        setLoading(true);

        try {
            const response = await callAI(conversationHistory);
            conversationHistory.push({ role: 'assistant', content: response });

            resultContent.innerText = response;
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth' });

            // Salvar projeto nos registros
            await saveProject(response, 'geração inicial', {
                proponente: proponenteNome,
                tipoPessoa: tipoPessoaText,
                nomeProjeto: nomeProjeto || '(sugerido pela IA)',
                modalidade, tipoProjeto, edital, localidade, valor
            });

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
            prompt += `\n\nMATERIAIS DE APOIO ENVIADOS PELO PROPONENTE (use estas informações para enriquecer o projeto, especialmente currículo, histórico e dados relevantes):\n${materiaisTexto}`;
        }

        prompt += `\n\nINSTRUÇÕES:
1. Pesquise em seu conhecimento sobre o edital/lei "${edital}" para entender os requisitos, critérios de seleção, e formato exigido.
2. Elabore o projeto seguindo a estrutura padrão exigida pelo mecanismo de fomento indicado.
3. O projeto deve ser coerente, bem justificado e adequado à realidade cultural brasileira.
4. Se materiais de apoio foram fornecidos, use-os para enriquecer o currículo, histórico e contextualização.
5. Use o nome do proponente "${proponenteNome}" na identificação e currículo do projeto.

ESTRUTURA DO PROJETO (adapte conforme as exigências do edital):

1. IDENTIFICAÇÃO DO PROJETO
   - Nome do Projeto${nomeProjeto ? ': ' + nomeProjeto : ' (sugira um nome criativo)'}
   - Proponente: ${proponenteNome} (${tipoPessoaText})
   - Modalidade
   - Área cultural

2. APRESENTAÇÃO / SINOPSE
   - Descrição clara e objetiva do projeto

3. JUSTIFICATIVA
   - Por que este projeto é relevante?
   - Contexto cultural e social
   - Lacuna que o projeto preenche
   - Impacto esperado na comunidade

4. OBJETIVOS
   - Objetivo Geral
   - Objetivos Específicos (mínimo 4)

5. METAS
   - Metas quantificáveis e mensuráveis (mínimo 5)

6. ETAPAS / CRONOGRAMA DE EXECUÇÃO
   - Detalhamento mês a mês das atividades

7. PÚBLICO-ALVO
   - Descrição detalhada e estimativa de público

8. PLANO DE DIVULGAÇÃO
   - Estratégias de comunicação e marketing

9. ACESSIBILIDADE
   - Medidas de acessibilidade física, comunicacional e atitudinal

10. DEMOCRATIZAÇÃO DO ACESSO
    - Como o projeto garante acesso democrático à cultura

11. CONTRAPARTIDA SOCIAL
    - Ações de contrapartida à sociedade

12. PLANO DE DISTRIBUIÇÃO / CIRCULAÇÃO (se aplicável)

13. ORÇAMENTO DETALHADO
    - Planilha orçamentária com itens, quantidades e valores
    - Adequado ao valor solicitado

14. FICHA TÉCNICA
    - Profissionais envolvidos e suas funções

15. CURRÍCULO DO PROPONENTE / HISTÓRICO
    - Baseado nas informações adicionais e materiais fornecidos

IMPORTANTE:
- Use linguagem formal e técnica adequada a editais culturais
- Seja específico e detalhado em cada seção
- Os valores do orçamento devem ser realistas e somar o total pretendido
- Adapte o formato às exigências específicas do edital "${edital}"
- Inclua métricas e indicadores sempre que possível
- O cronograma deve ser realista (geralmente 6 a 12 meses)`;

        return prompt;
    }

    // === Chamada à IA via Cloudflare Worker ===
    async function callAI(messages) {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messages,
                model: 'gpt-4o',
                max_tokens: 8000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (response.status === 401) throw new Error('Erro de autenticação. Entre em contato com o administrador.');
            if (response.status === 429) throw new Error('Muitas requisições. Aguarde um momento e tente novamente.');
            if (response.status === 402 || error?.error?.code === 'insufficient_quota') throw new Error('Serviço temporariamente indisponível. Tente mais tarde.');
            throw new Error(error?.error?.message || `Erro ${response.status}. Tente novamente.`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // === Salvar Projeto (Google Sheets) ===
    const GOOGLE_SHEETS_URL = 'COLE_A_URL_DO_SEU_GOOGLE_APPS_SCRIPT_AQUI';

    async function saveProject(projectContent, type, metadata = null) {
        try {
            const record = {
                id: generateId(),
                timestamp: new Date().toISOString(),
                type: type,
                proponente: metadata?.proponente || '',
                tipoPessoa: metadata?.tipoPessoa || '',
                nomeProjeto: metadata?.nomeProjeto || '',
                modalidade: metadata?.modalidade || '',
                tipoProjeto: metadata?.tipoProjeto || '',
                edital: metadata?.edital || '',
                localidade: metadata?.localidade || '',
                valor: metadata?.valor || '',
                content: projectContent
            };

            // Backup local
            const savedProjects = JSON.parse(localStorage.getItem('culturai_projects') || '[]');
            savedProjects.push(record);
            localStorage.setItem('culturai_projects', JSON.stringify(savedProjects));

            // Enviar para Google Sheets
            if (GOOGLE_SHEETS_URL && GOOGLE_SHEETS_URL !== 'COLE_A_URL_DO_SEU_GOOGLE_APPS_SCRIPT_AQUI') {
                await fetch(GOOGLE_SHEETS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                });
                console.log(`Projeto salvo no Google Sheets (${type}):`, record.id);
            }
        } catch (error) {
            console.warn('Erro ao salvar registro do projeto:', error);
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
