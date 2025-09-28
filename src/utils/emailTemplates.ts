/**
 * 郵件模板管理系統
 */

export interface EmailTemplate {
  subject: string;
  content: string;
}

export interface TemplateVariables {
  userName: string;
  resubscribeUrl?: string;
  customContent?: string;
}

// 讀取模板文件並解析為 JavaScript 對象
// 在 Cloudflare Workers 環境中，我們需要將模板內容內嵌到代碼中

const CANCELLATION_TEMPLATES: Record<string, EmailTemplate> = {
  'zh-TW': {
    subject: '感謝您使用 Eatmoji - 希望聽到您的想法',
    content: `親愛的 {{userName}}，

感謝您曾經選擇 Eatmoji 作為您的飲食追蹤夥伴。

我們知道您取消了訂閱服務。雖然不捨，但我們完全理解每個人的需求都不盡相同。

如果您方便的話，我們非常希望能聽到您的想法和建議。無論是關於功能、使用體驗，或是任何讓您決定離開的原因，您的回饋對我們都極其珍貴，將幫助我們持續改進，為更多用戶提供更好的服務。

您可以直接回覆這封郵件與我們分享，我們會仔細聆聽每一個意見。

{{#resubscribeUrl}}
如果未來您想要重新體驗我們的服務，隨時歡迎您回來：
{{resubscribeUrl}}

{{/resubscribeUrl}}
{{#customContent}}
{{customContent}}

{{/customContent}}
再次感謝您對 Eatmoji 的支持與信任。祝您身體健康，生活愉快！

此致，
Eatmoji 團隊`
  },

  'zh-CN': {
    subject: '感谢您使用 Eatmoji - 希望听到您的想法',
    content: `亲爱的 {{userName}}，

感谢您曾经选择 Eatmoji 作为您的饮食跟踪伙伴。

我们知道您取消了订阅服务。虽然不舍，但我们完全理解每个人的需求都不尽相同。

如果您方便的话，我们非常希望能听到您的想法和建议。无论是关于功能、使用体验，或是任何让您决定离开的原因，您的反馈对我们都极其珍贵，将帮助我们持续改进，为更多用户提供更好的服务。

您可以直接回复这封邮件与我们分享，我们会仔细聆听每一个意见。

{{#resubscribeUrl}}
如果未来您想要重新体验我们的服务，随时欢迎您回来：
{{resubscribeUrl}}

{{/resubscribeUrl}}
{{#customContent}}
{{customContent}}

{{/customContent}}
再次感谢您对 Eatmoji 的支持与信任。祝您身体健康，生活愉快！

此致，
Eatmoji 团队`
  },

  'en': {
    subject: 'Thank you for using Eatmoji - We\'d appreciate your feedback',
    content: `Dear {{userName}},

Thank you for choosing Eatmoji as your dietary tracking companion.

We know that you cancelled your subscription. While we're sad to see you go, we completely understand that everyone's needs are different.

If you have a moment, we would greatly appreciate hearing your thoughts and feedback. Whether it's about features, user experience, or any reasons that led to your decision to leave, your insights are incredibly valuable to us and will help us continue improving our service for all users.

You can simply reply to this email to share your thoughts with us - we read and consider every piece of feedback we receive.

{{#resubscribeUrl}}
If you ever want to give Eatmoji another try in the future, you're always welcome back:
{{resubscribeUrl}}

{{/resubscribeUrl}}
{{#customContent}}
{{customContent}}

{{/customContent}}
Once again, thank you for your trust and support in Eatmoji. We wish you all the best on your health journey!

Best regards,
The Eatmoji Team`
  },

  'ja': {
    subject: 'Eatmoji をご利用いただき、ありがとうございました - ご意見をお聞かせください',
    content: `{{userName}} 様

Eatmoji を食事記録のパートナーとしてお選びいただき、ありがとうございました。

サブスクリプションをキャンセルされたことを承知しております。お別れするのは寂しいですが、皆様それぞれのニーズが異なることを十分理解しております。

お時間があるときに、ご意見やフィードバックをいただけますでしょうか。機能について、ユーザー体験について、またはサービスを離れることを決定された理由について、お聞かせいただけるご意見は私たちにとって非常に貴重で、すべてのユーザーの皆様により良いサービスを提供するために役立ちます。

このメールに直接返信していただければ、いただいたフィードバックはすべて読ませていただき、検討いたします。

{{#resubscribeUrl}}
今後再び Eatmoji をお試しいただきたくなりましたら、いつでも歓迎いたします：
{{resubscribeUrl}}

{{/resubscribeUrl}}
{{#customContent}}
{{customContent}}

{{/customContent}}
改めて、Eatmoji へのご信頼とご支援をありがとうございました。皆様の健康への取り組みを応援しております！

敬具，
Eatmoji チーム`
  },

  'ko': {
    subject: 'Eatmoji를 이용해 주셔서 감사합니다 - 의견을 듣고 싶습니다',
    content: `{{userName}} 님께，

Eatmoji를 식단 추적 파트너로 선택해 주셔서 감사합니다.

구독을 취소하신 것을 알고 있습니다. 아쉽긴 하지만, 모든 사람의 요구가 다르다는 것을 충분히 이해합니다.

시간이 되시면 귀하의 생각과 피드백을 듣고 싶습니다. 기능에 대한 것이든, 사용자 경험에 대한 것이든, 또는 서비스를 떠나기로 결정하게 된 이유든, 귀하의 의견은 저희에게 매우 소중하며 모든 사용자에게 더 나은 서비스를 제공하는 데 도움이 될 것입니다.

이 이메일에 직접 답장해 주시면 됩니다 - 저희는 받은 모든 피드백을 읽고 검토합니다.

{{#resubscribeUrl}}
앞으로 Eatmoji를 다시 시도해보고 싶으시면 언제든 환영입니다:
{{resubscribeUrl}}

{{/resubscribeUrl}}
{{#customContent}}
{{customContent}}

{{/customContent}}
다시 한 번 Eatmoji에 대한 신뢰와 지원에 감사드립니다. 건강한 여정에서 모든 것이 잘 되기를 바랍니다!

감사합니다，
Eatmoji 팀`
  }
};

/**
 * 獲取指定語言的郵件模板
 * @param language 語言代碼
 * @param templateType 模板類型
 * @returns 郵件模板
 */
export function getEmailTemplate(language: string, templateType: 'cancellation'): EmailTemplate | null {
  switch (templateType) {
    case 'cancellation':
      return CANCELLATION_TEMPLATES[language] || null;
    default:
      return null;
  }
}

/**
 * 處理模板變數替換
 * @param template 模板內容
 * @param variables 變數對象
 * @returns 處理後的內容
 */
export function processTemplate(template: string, variables: TemplateVariables): string {
  let processedTemplate = template;

  // 替換基本變數
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, String(value));
    }
  });

  // 處理條件塊 (基本的 Mustache 風格)
  // 處理 {{#variableName}} ... {{/variableName}}
  Object.entries(variables).forEach(([key, value]) => {
    const startTag = `{{#${key}}}`;
    const endTag = `{{/${key}}}`;
    
    if (value && processedTemplate.includes(startTag)) {
      // 如果變數有值，保留內容但移除標籤
      const regex = new RegExp(`${escapeRegExp(startTag)}([\\s\\S]*?)${escapeRegExp(endTag)}`, 'g');
      processedTemplate = processedTemplate.replace(regex, '$1');
    } else {
      // 如果變數沒有值，移除整個塊
      const regex = new RegExp(`${escapeRegExp(startTag)}[\\s\\S]*?${escapeRegExp(endTag)}`, 'g');
      processedTemplate = processedTemplate.replace(regex, '');
    }
  });

  // 清理剩餘的未替換變數
  processedTemplate = processedTemplate.replace(/{{[^}]*}}/g, '');

  return processedTemplate.trim();
}

/**
 * 轉義正則表達式特殊字符
 * @param string 要轉義的字符串
 * @returns 轉義後的字符串
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 獲取所有支持的語言列表
 * @returns 語言代碼數組
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(CANCELLATION_TEMPLATES);
}

/**
 * 檢查是否支持指定語言
 * @param language 語言代碼
 * @returns 是否支持
 */
export function isLanguageSupported(language: string): boolean {
  return language in CANCELLATION_TEMPLATES;
}