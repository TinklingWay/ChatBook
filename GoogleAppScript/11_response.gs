// -----------------------------------------------------
// HTTP Method Functions
// -----------------------------------------------------
function doGet(request) {
  return HtmlService.createTemplateFromFile('01_Chat').evaluate();
}

function doPost(request) {
  return 200;
}

function include(filename) {
  return HtmlService.createTemplateFromFile(filename).getRawContent();
}

// -----------------------------------------------------
// Data Access Functions
// -----------------------------------------------------
function getSetting(key) {
  return getSettingHelper(key, 1);
}

function getEnSetting(key) {
  return getSettingHelper(key, 2);
}

function getAnimalData(animalType, dataType) {
  const spreadsheetDatabase = new SpreadsheetDB();
  const dataRow = spreadsheetDatabase.select(SHEET_PROFILE, "列名", dataType);
  const animalColumnIndex = spreadsheetDatabase.getColumnIndex(SHEET_PROFILE, animalType) - 1;
  return dataRow[animalColumnIndex];
}

// -----------------------------------------------------
// Message Functions
// -----------------------------------------------------
function getMessages() {
  const chatSheet = SpreadsheetApp.getActive().getSheetByName(SHEET_CHAT);
  const chatData = chatSheet.getDataRange().getValues();

  if (chatData.length === 0) {
    return [];
  }

  const chatDataWithTimeStrings = chatData
    .filter(row => row.length >= 4 && row[0])  // only include rows with sufficient data and a timestamp
    .map(row => [row[0].toISOString(), row[1], row[2], row[3]]);  // transform rows

  return chatDataWithTimeStrings.slice(-OPENAI_API_CONVERSATIN_ARRAY_SIZE);
}

function getChatMessages() {
  const messages = getMessages();
  return filterMessagesByLanguage(messages, LANG_JA);
}

function getAnalyzeMessages(langMode) {
  const messages = getMessages();
  return filterMessagesByLanguage(messages, langMode);
}

function postJaMessage(speaker, message) {
  postMessage(speaker, message, LANG_JA, LANG_EN);
}

function postEnMessage(speaker, message) {
  postMessage(speaker, message, LANG_EN, LANG_JA);
}

function postLog(logMessages) {
  const currentTime = new Date();
  const spreadsheetDatabase = new SpreadsheetDB();
  spreadsheetDatabase.insert(SHEET_LOG, [currentTime, ...logMessages]);
}

function changeLangMode(langMode) {
  const spreadsheetDatabase = new SpreadsheetDB();
  spreadsheetDatabase.update(SHEET_SETTING, "key", "LANG_MODE", "value", langMode == true ? LANG_JA : LANG_EN);
}

// -----------------------------------------------------
// AI Related Functions
// -----------------------------------------------------
function getAIContents() {
  // AIのコンテンツを処理します。
  function processAiContent(speaker) {
    const payloadService = new PayloadService();
    const langMode = getSetting("BILINGUAL_MODE") == true ? getSetting("LANG_MODE") : "JA"
    const { messagesHeader, translationInstruction } = prepareMessage(speaker, langMode);

    const model = getSetting("OPENAI_API_MODEL");
    const temperature = getSetting("OPENAI_API_TEMPERATURE");;


    // 回答の準備をします。
    const message = getAnalyzeMessages(langMode);
    const messagesBody = payloadService.makeMessageBody(speaker, langMode, message);

    // メッセージの長さを調整します。
    const maxLength = OPENAI_API_MESSAGE_SIZE;
    const adjustedMessagesBody = payloadService.adjustMessageLength(messagesBody, maxLength);

    postLog(['ヘッダのトークン数', payloadService.checkPayloadToken(messagesHeader)]);
    postLog(['ボディのトークン数', payloadService.checkPayloadToken(adjustedMessagesBody)]);

    // APIへのリクエストを作成します。
    const request = payloadService.createExploratoryPayload(model, messagesHeader, adjustedMessagesBody, temperature);
    postLog(['APIへのリクエスト', JSON.stringify(request)]);

    // OpenAI API に問い合わせます。
    const response = callOpenAiChatApi(request);
    postLog(['APIからのレスポンス', JSON.stringify(response)]);

    // メッセージをポストします。
    const topics = response.choices[0].message.content.trim();
    if (langMode == LANG_JA) {
      postJaMessage(speaker, topics);
    }
    else {
      postEnMessage(speaker, topics);
    }
  }
  archiveRows();

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_LOG);
  sheet.clearContents();

  const animals = ["first", "second", "third"];
  animals.forEach(animal => processAiContent(animal));
}

function archiveRows() {
  const MAX_ROWS = 300;   // 行の上限数
  const ARCHIVE_ROWS = 100;  // 退避する行数
  const HEADER_ROWS = 1; // 退避しないヘッダの行

  // スプレッドシートの取得
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CHAT);

  // シートの行数がMAX_ROWS行を超えているかチェック（HEADER_ROWS行目はヘッダーなのでカウントに含まない）
  if (sheet.getLastRow() > MAX_ROWS + HEADER_ROWS) {
    // 元のシートからHEADER_ROWS+1行目からのARCHIVE_ROWS行を削除
    sheet.deleteRows(HEADER_ROWS + 1, ARCHIVE_ROWS);

    // 削除した分だけ末尾に行を追加
    sheet.insertRowsAfter(sheet.getLastRow(), ARCHIVE_ROWS);
  }
}

function updateAnimalDescription(animalType, description) {
  const spreadsheetDatabase = new SpreadsheetDB();
  spreadsheetDatabase.update(SHEET_PROFILE, "列名", "設定", animalType, description);

  if (getSetting("BILINGUAL_MODE")) {
    const translatedDescription = translateMessage(animalType, LANG_EN, description);
    spreadsheetDatabase.update(SHEET_PROFILE, "列名", "設定（英語）", animalType, translatedDescription);
  }
}

