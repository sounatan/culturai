// ========================================================
// GOOGLE APPS SCRIPT — Registro de Projetos Culturais
// ========================================================
//
// INSTRUÇÕES:
// 1. Na planilha, vá em Extensões → Apps Script
// 2. Apague tudo e cole este código
// 3. Implantar → Nova implantação → App da Web
//    - Executar como: Eu | Acesso: Qualquer pessoa
// 4. Copie a URL e cole no app.js (GOOGLE_SHEETS_URL)
// ========================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Criar cabeçalhos se planilha vazia
    if (sheet.getLastRow() === 0) {
      var headers = [
        'ID', 'Data/Hora', 'Tipo', 'Versão', 'Proponente',
        'Tipo Pessoa', 'Nome do Projeto', 'Modalidade',
        'Tipo de Projeto', 'Edital/Lei', 'Localidade',
        'Valor (R$)', 'Projeto Gerado'
      ];
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a148c');
      headerRange.setFontColor('#ffffff');
      headerRange.setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }
    
    var timestamp = new Date(data.timestamp);
    var formattedDate = Utilities.formatDate(timestamp, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    
    sheet.appendRow([
      data.id || '',
      formattedDate,
      data.type || '',
      data.version || 0,
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

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'CulturAI running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
