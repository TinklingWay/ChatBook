// -----------------------------------------------------
// Helper Functions
// -----------------------------------------------------
function translateMessage(speaker, language, message) {
  const payloadService = new PayloadService();
  const { messagesHeader, translationInstruction } = prepareMessage(speaker, language);

  const model = getSetting("OPENAI_API_MODEL");
  const temperature = 0.3;

  // 翻訳の準備をします。
  const translationBody = [
    { "role": "user", "content": translationInstruction + "\n\n" + message }
  ];

  postLog(['ヘッダのトークン数', payloadService.checkPayloadToken(messagesHeader)]);
  postLog(['ボディのトークン数', payloadService.checkPayloadToken(translationBody)]);

  // APIへのリクエストを作成します。
  const request = payloadService.createExploratoryPayload(model, messagesHeader, translationBody, temperature);
  postLog(['APIへのリクエスト', JSON.stringify(request)]);

  // OpenAI API に問い合わせます。
  const response = callOpenAiChatApi(request);
  postLog(['APIからのレスポンス', JSON.stringify(response)]);

  // メッセージをポストします。
  const topics = response.choices[0].message.content.trim();

  return topics;
}

function postMessage(speaker, message, originalLanguage, translatedLanguage) {
  const currentTime = new Date();
  const spreadsheetDatabase = new SpreadsheetDB();
  spreadsheetDatabase.insert(SHEET_CHAT, [currentTime, speaker, originalLanguage, message]);

  if(getSetting("BILINGUAL_MODE")){
    const translatedMessage = translateMessage(speaker, translatedLanguage, message);
    spreadsheetDatabase.insert(SHEET_CHAT, [currentTime, speaker, translatedLanguage, translatedMessage]);
  }
}

function getSettingHelper(key, columnIndex) {
  const spreadsheetDatabase = new SpreadsheetDB();
  const dataRow = spreadsheetDatabase.select(SHEET_SETTING, "key", key);
  return dataRow[columnIndex];
}


function filterMessagesByLanguage(messages, language) {
  return messages
    .filter(row => row[2] === language)
    .map(row => [row[0], row[1], row[3]]);
}

function prepareMessage(speaker, language) {
  let settingGetter;
  let userSetting;
  let description;
  const speakerName = getAnimalData(speaker, "名前"); // USER_SETTING の内部で使用

  if (language == LANG_JA) {
    settingGetter = getSetting;
    description = getAnimalData(speaker, "設定"); // USER_SETTING の内部で使用
    userSetting = `あなたは${speakerName}だよ！
あなたはこんな役割だよ！あなたらしい返事をしてね！
${description}`;
  } else {
    settingGetter = getEnSetting;
    description = getAnimalData(speaker, "設定（英語）"); // USER_SETTING の内部で使用
    userSetting = `You are ${speakerName} !
Here's your role! Reply in your own way!
${description}`;
  }

  const translationInstruction = settingGetter("TRANSLATION_INSTRUCTION");
  const commonSetting = settingGetter("COMMON_SETTING");

  // メッセージのヘッダを作成します。
  const payloadService = new PayloadService();
  const messagesHeader = payloadService.makeMessageHeader(
    commonSetting,
    userSetting
  );

  return { messagesHeader, translationInstruction };
}
