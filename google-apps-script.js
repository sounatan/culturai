// ========================================================
// GOOGLE APPS SCRIPT — Cole este código no seu Google Apps Script
// ========================================================
//
// INSTRUÇÕES DE CONFIGURAÇÃO:
//
// 1. Crie uma Google Sheets nova (ou use uma existente)
// 2. Vá em Extensões → Apps Script
// 3. Apague o conteúdo padrão e cole TODO este código
// 4. Clique em "Implantar" → "Nova implantação"
// 5. Tipo: "App da Web"
// 6. Executar como: "Eu" (sua conta)
// 7. Quem pode acessar: "Qualquer pessoa"
// 8. Clique em "Implantar" e autorize
// 9. Copie a URL gerada e cole no app.js (variável GOOGLE_SHEETS_URL)
//
// A planilha terá as colunas:
// ID | Data/Hora | Tipo | Proponente | Tipo Pessoa | Nome Projeto | 
// Modalidade | Tipo Projeto | Edital | Localidade | Valor | Projeto Gerado
// ========================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Se a planilha estiver vazia, criar cabeçalhos
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
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
      ]);
      
      // Formatar cabeçalho
      var headerRange = sheet.getRange(1, 1, 1, 12);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a148c');
      headerRange.setFontColor('#ffffff');
    }
    
    // Formatar data para fuso horário do Brasil
    var timestamp = new Date(data.timestamp);
    var formattedDate = Utilities.formatDate(timestamp, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    
    // Adicionar linha
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
    
    // Retornar sucesso
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
