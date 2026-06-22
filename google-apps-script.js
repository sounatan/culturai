// ========================================================
// GOOGLE APPS SCRIPT — Registro de Projetos Culturais
// ========================================================
//
// INSTRUÇÕES DE CONFIGURAÇÃO:
//
// 1. Crie uma planilha nova no Google Sheets
//    (sugestão de nome: "CulturAI - Registro de Projetos")
//
// 2. Na planilha, vá em Extensões → Apps Script
//
// 3. Apague o conteúdo padrão e cole TODO este código
//
// 4. Clique em "Implantar" → "Nova implantação"
//    - Tipo: "App da Web"
//    - Executar como: "Eu" (sua conta Google)
//    - Quem pode acessar: "Qualquer pessoa"
//
// 5. Clique em "Implantar" e autorize o acesso
//
// 6. Copie a URL gerada (algo como:
//    https://script.google.com/macros/s/XXXXXXX/exec)
//
// 7. Cole essa URL no app.js na variável GOOGLE_SHEETS_URL
//
// COLUNAS DA PLANILHA (criadas automaticamente):
// A: ID | B: Data/Hora | C: Tipo | D: Proponente | E: Tipo Pessoa |
// F: Nome Projeto | G: Modalidade | H: Tipo Projeto | I: Edital/Lei |
// J: Localidade | K: Valor | L: Projeto Gerado
// ========================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Se a planilha estiver vazia, criar cabeçalhos
    if (sheet.getLastRow() === 0) {
      var headers = [
        'ID',
        'Data/Hora',
        'Tipo',
        'Proponente',
        'Tipo Pessoa',
        'Nome do Projeto',
        'Modalidade',
        'Tipo de Projeto',
        'Edital/Lei',
        'Localidade',
        'Valor (R$)',
        'Projeto Gerado'
      ];
      sheet.appendRow(headers);
      
      // Formatar cabeçalho
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a148c');
      headerRange.setFontColor('#ffffff');
      headerRange.setHorizontalAlignment('center');
      
      // Ajustar largura das colunas
      sheet.setColumnWidth(1, 120);  // ID
      sheet.setColumnWidth(2, 160);  // Data
      sheet.setColumnWidth(3, 120);  // Tipo
      sheet.setColumnWidth(4, 200);  // Proponente
      sheet.setColumnWidth(5, 130);  // Tipo Pessoa
      sheet.setColumnWidth(6, 250);  // Nome Projeto
      sheet.setColumnWidth(7, 150);  // Modalidade
      sheet.setColumnWidth(8, 180);  // Tipo Projeto
      sheet.setColumnWidth(9, 200);  // Edital
      sheet.setColumnWidth(10, 180); // Localidade
      sheet.setColumnWidth(11, 120); // Valor
      sheet.setColumnWidth(12, 400); // Projeto
    }
    
    // Formatar data para fuso horário do Brasil
    var timestamp = new Date(data.timestamp);
    var formattedDate = Utilities.formatDate(timestamp, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    
    // Adicionar linha com os dados
    sheet.appendRow([
      data.id || '',
      formattedDate,
      data.type || '',
      data.proponente || '',
      data.tipoPessoa || '',
      data.nomeProjeto || '',
      data.modalidade || '',
      data.tipoProjeto || '',
      data.edital || '',
      data.localidade || '',
      data.valor || '',
      data.content || ''
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Função GET para testar se o script está funcionando
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'ok', 
      message: 'CulturAI - Google Sheets integration is running.',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
