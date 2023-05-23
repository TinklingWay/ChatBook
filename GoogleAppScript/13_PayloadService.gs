class PayloadService {
  constructor() {
  }

  // 送出トークンの擬似チェック
  checkPayloadToken(messages) {
    const words = messages.reduce((acc, row) => {
      return acc + row.content.length;
    }, 0);

    // 100 tokens ≒ 75 words
    const tokens = Math.trunc((words / 3) * 4);
    return tokens;
  }

  // 会話履歴のtoken数の調整
  adjustMessageLength(messagesBody, maxLength) {
    let tokenCount = this.checkPayloadToken(messagesBody);
    postLog(['調整前トークン数', tokenCount]);

    while (tokenCount > maxLength) {
      messagesBody.shift();
      messagesBody.shift();
      tokenCount = this.checkPayloadToken(messagesBody);
    }
    postLog(['調整後トークン数', tokenCount]);
    return messagesBody;
  }

  // 登場人物の設定情報を準備
  makeMessageHeader(systemDescription, userDescription) {
    const messagesHeader = [
      { "role": "system", "content": systemDescription },
      { "role": "user", "content": userDescription },
    ];

    return messagesHeader;
  }

  // 会話情報を準備
  makeMessageBody(speaker, langMode, filteredData) {
    // 異なるメッセージを保持するための配列を作成
    let uniqueMessages = [];

    // データを走査してメッセージを作成
    filteredData.forEach(([, talkerId, talkerContent]) => {
      if (talkerContent) {
        const name = getAnimalData(talkerId, "名前");
        const role = (speaker === talkerId) ? "assistant" : "user";
        const message = {
          role,
          ...(role !== "assistant" && { name: talkerId }),
          content: langMode == LANG_JA ? `わたしは${name}! ${talkerContent}` : `I am ${name}! ${talkerContent}`
        };

        // メッセージがすでに存在するかチェック
        const isMessageExists = uniqueMessages.some(
          e => e.role === message.role && e.content === message.content
        );

        // メッセージが存在しない場合にのみ追加
        if (!isMessageExists) {
          uniqueMessages.push(message);
        }
      }
    });

    return uniqueMessages;
  }


  createExploratoryPayload(model, messagesHeader, messagesBody, temperature, maxTokens = OPENAI_API_MAX_TOKENS) {
    const requestPayload = {
      "model": model,
      "messages": messagesHeader.concat(messagesBody),
      "temperature": temperature,
      "max_tokens": maxTokens,
      "frequency_penalty": 1
    };
    return requestPayload;
  }

}
