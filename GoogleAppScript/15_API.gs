// -----------------------------------------------------------------
// OpenAI に問い合わせる
// -----------------------------------------------------------------
/**
 * OpenAI API の共通設定を生成する
 */
function createApiConfig() {
  const openaiApiKey = getSetting("OPENAI_API_KEY");
  const apiUrl = "https://api.openai.com/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + openaiApiKey
  };

  return { apiUrl, headers };
}

/**
 * OpenAI の API をコールし、結果を返却する
 */
function callOpenAiChatApi(requestPayload) {

  function fetchWithRetry(apiUrl, options, maxRetries = 3, delay = 30000) {
    let retries = 0;
    while (retries <= maxRetries) {
      try {
        const response = UrlFetchApp.fetch(apiUrl, options);
        return response;
      } catch (error) {
        postLog(['エラー', error.message]);
        postEnMessage("zero", error.message);
        retries++;
        if (retries > maxRetries) {
          postLog(['エラー', msg]);
          postEnMessage("zero", msg);
          throw error;
        }
        Utilities.sleep(delay);
      }
    }
  }

  const { apiUrl, headers } = createApiConfig();
  const options = {
    "method": "post",
    "headers": headers,
    "payload": JSON.stringify(requestPayload)
  };

  const response = fetchWithRetry(apiUrl, options);

  const context = response.getContentText();
  const data = JSON.parse(context);

  return data;
}

