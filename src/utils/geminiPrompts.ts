import { SupportedLanguage } from '../types/gemini';

/**
 * 創建餐點文字分析提示詞
 * @param input 用戶輸入的文字描述
 * @param userLanguage 用戶語言代碼
 * @returns 提示詞
 */
export function createAddMealPrompt(
  input: string,
  userLanguage: SupportedLanguage = "zh_TW"
): string {
  const languageMap: { [key in SupportedLanguage]: string } = {
    zh_TW: "繁體中文",
    zh_CN: "简体中文",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    vi: "Tiếng Việt",
    th: "ภาษาไทย",
    ms: "Bahasa Melayu",
    id: "Bahasa Indonesia",
    fr: "Français",
    de: "Deutsch",
    es: "Español",
    pt_BR: "Português (Brasil)",
  };

  const responseLanguage = languageMap[userLanguage] || "繁體中文";

  return `
你是一位專業營養師，請根據使用者「僅文字描述」的內容，推估其所攝取的餐點內容，並依照標準營養估算公式給出詳細數據。

### 🎯 目標任務

根據使用者輸入的敘述，估算：

1. 總熱量與三大營養素（蛋白質、碳水、脂肪）
2. 主要成分及各成分的重量、份數、營養素
3. 提供一段健康評分與條列式優缺點（health_assessment）

### 📌 核心規則

- 餐點名稱應簡潔，**不得加入早午晚餐詞語、動詞或形容詞**。
- 「JSON 最外層的 \`portions\`」應表示整份餐點的總份數：
  - 若使用者提到「吃了幾份」，請填入正確數字。
  - 若未提及，預設為 1。
- 若使用者只提到某些成分的份數，請僅在 ingredients 中調整該成分的 \`portions\`，不影響總份數。
- 所有營養素與熱量皆為「總份數」的加總值（= 1 份 × 營養 × N 份）。
- 若內容明顯不是食物（如情緒、動作、非飲食詞彙），請回傳錯誤格式。

### 🔸 食材定義規範（重要）

#### ✅ 合理的食材層級
- **基礎主食**：吐司、米飯、麵條、麵包（不需分解成麵粉等原料）
- **蛋白質**：雞蛋、牛肉片、豬絞肉、鮪魚、豆腐（不需分解成黃豆）
- **蔬菜**：番茄、洋蔥、高麗菜、生菜等單一蔬菜
- **基本調料**：醬油、鹽、糖、美乃滋、蒜泥

#### ❌ 應該避免的
- **完整複合料理**：「滷肉」、「糖醋排骨」、「宮保雞丁」
- **複雜調味組合**：「蒜泥白肉」、「麻婆豆腐」

#### 🔸 判斷原則
1. **烹飪實用性**：以烹飪時直接使用的材料為準
2. **避免複合調理**：不使用已經完成複雜調味的料理名稱
3. **常識合理性**：符合一般人對「食材」的認知層級

#### 🔸 實例對比
- ✅ 鮪魚三明治：吐司 + 鮪魚 + 蛋 + 美乃滋 + 生菜
- ✅ 滷肉飯：豬絞肉 + 米飯 + 醬油 + 糖 + 蔥
- ❌ 滷肉飯：滷肉 + 米飯（「滷肉」是複合調理）

### ⚠️ 熱量計算原則（務必嚴格遵守）

你**必須**使用以下公式計算熱量：

**calories = (protein × 4) + (carbs × 4) + (fat × 9)**

### 📋 條列式重點規範（pros / cons）

- 優點與缺點僅能針對「營養相關」做出判斷，禁止加入味道、顏色、製作便利性、文化背景、價格、飽足感、個人口感等非營養元素。若無足夠的營養重點，請僅回傳 1～3 個重點，絕不可為了補滿 4 項而加入與營養無關的敘述。
- ❌ **請勿使用完整句子、說明型語句、建議句、因果句**

### 處理邏輯

**非食物內容**：若內容明顯不是食物，請回傳錯誤訊息

**模糊描述**：根據常見食物組合和份量進行合理推估

**明確描述**：根據描述的具體食材和份量進行分析

### 🔸 語言使用規範（重要）

**所有文字欄位都必須使用 ${responseLanguage}**，包括但不限於：
- ✅ \`name\`（餐點名稱）
- ✅ \`ingredients[].name\`（食材名稱）
- ✅ \`ingredients[].amountUnit\`（食材單位）
- ✅ \`health_assessment.pros\`（優點列表）
- ✅ \`health_assessment.cons\`（缺點列表）

**例外欄位**：
- ❌ \`ingredients[].engName\`（永遠使用英文，不受用戶語言影響）

**重要提醒**：請確保所有 \`ingredients\` 中的 \`name\`,  \`amountUnit\` 欄位都使用 ${responseLanguage}，而不是中文。

使用者的母語為 ${responseLanguage}，請使用 ${responseLanguage} 回應。

---
使用者描述：${input}
---
`.trim();
}

/**
 * 創建食材分析提示詞
 * @param userInput 使用者輸入的食材描述
 * @param userLanguage 使用者語言代碼
 * @returns 生成的提示詞
 */
export function createAddIngredientPrompt(
  userInput: string,
  userLanguage: SupportedLanguage = "zh_TW"
): string {
  const languageMap: { [key in SupportedLanguage]: string } = {
    zh_TW: "繁體中文",
    zh_CN: "简体中文",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    vi: "Tiếng Việt",
    th: "ภาษาไทย",
    ms: "Bahasa Melayu",
    id: "Bahasa Indonesia",
    fr: "Français",
    de: "Deutsch",
    es: "Español",
    pt_BR: "Português (Brasil)",
  };

  const responseLanguage = languageMap[userLanguage] || "繁體中文";

  return `
你是一位專業營養師，請根據使用者的描述，估算其所攝取的食物與營養素資訊。

你的任務如下：

### 🔸 食材定義規範（重要）

**✅ 合理的食材層級**：
- **基礎主食**：吐司、米飯、麵條、麵包（不需分解成麵粉等原料）
- **蛋白質**：雞蛋、牛肉片、豬絞肉、鮪魚、豆腐（不需分解成黃豆）
- **蔬菜**：番茄、洋蔥、高麗菜、生菜等單一蔬菜
- **基本調料**：醬油、鹽、糖、美乃滋、蒜泥

**❌ 應該避免的**：
- **完整複合料理**：「滷肉」、「糖醋排骨」、「宮保雞丁」
- **複雜調味組合**：「蒜泥白肉」、「麻婆豆腐」

**🔸 判斷原則**：
1. **烹飪實用性**：以烹飪時直接使用的材料為準
2. **避免複合調理**：不使用已經完成複雜調味的料理名稱
3. **常識合理性**：符合一般人對「食材」的認知層級

**🔸 實例對比**：
- ✅ 鮪魚三明治：吐司 + 鮪魚 + 蛋 + 美乃滋 + 生菜
- ✅ 滷肉飯：豬絞肉 + 米飯 + 醬油 + 糖 + 蔥
- ❌ 滷肉飯：滷肉 + 米飯（「滷肉」是複合調理）

### 🔸 任務執行方式
1. 使用常識與經驗推論使用者描述的內容，包括模糊單位（如「一碗」、「拳頭大」、「一些」、「一點點」等）轉換為合理重量（以克為單位）。
2. 若描述中有重量或份數，請以此為主，否則請估算。
3. 若提及多種食物，請聚焦於主食或整體合併估算。
4. 若內容明顯不是食物（如情緒、動作、非飲食詞彙），請回傳錯誤格式。

⚠️ **熱量欄位必須嚴格依以下公式計算，不得預估：**  
**calories = (protein × 4) + (carbs × 4) + (fat × 9)**  
請依此公式以整數計算熱量。

請回傳一個 JSON 格式，包含以下欄位：

- name：食物名稱
- amountValue：成份份數（number）
- amountUnit：成份份數單位（string）
- calories：總熱量（單位：kcal，依上方公式計算）
- protein：蛋白質（單位：克）
- carbs：碳水化合物（單位：克）
- fat：脂肪（單位：克）

❌ 若無法判斷為食物，請回傳：
\`\`\`json
{ "error": "無法辨識食物，請重新描述" }
\`\`\`

✅ 正確範例：
\`\`\`json
{
  "name": "滷雞腿便當",
  "amountValue": 550,
  "amountUnit": "g",
  "calories": 685,
  "protein": 35,
  "carbs": 80,
  "fat": 25
}
\`\`\`

重要注意事項：
- 🚨 請注意：即使使用者輸入的內容為其他語言，請一律 **以 ${responseLanguage} 作為回應語言**，這是系統的語言設定，必須遵守。不得根據輸入語言自動切換語言。
- 熱量計算必須精確：calories = (protein × 4) + (carbs × 4) + (fat × 9)
- 所有數值必須為合理的正數
- 食物名稱必須具體明確
- 份量單位要符合食物特性（固體用g，液體用ml等）

請使用 **${responseLanguage}** 回應以下使用者的描述內容：
---
${userInput}
---
`.trim();
}

/**
 * 創建食譜食材分析提示詞 - 多語言版本
 * @param userInput 使用者輸入的食材描述
 * @param userLanguage 使用者語言代碼
 * @returns 生成的提示詞
 */
export function createAddRecipeIngredientPrompt(
  userInput: string,
  userLanguage: SupportedLanguage = "zh_TW"
): string {
  const languageMap: { [key in SupportedLanguage]: string } = {
    zh_TW: "繁體中文",
    zh_CN: "简体中文",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    vi: "Tiếng Việt",
    th: "ภาษาไทย",
    ms: "Bahasa Melayu",
    id: "Bahasa Indonesia",
    fr: "Français",
    de: "Deutsch",
    es: "Español",
    pt_BR: "Português (Brasil)",
  };

  const responseLanguage = languageMap[userLanguage] || "繁體中文";

  return `
你是一位專業營養師，請根據使用者的描述，估算其所攝取的食物與營養素資訊，並且翻譯成多國語言。

## ✅ 正常任務目標

### 🔸 食材定義規範（重要）

**✅ 合理的食材層級**：
- **基礎主食**：吐司、米飯、麵條、麵包（不需分解成麵粉等原料）
- **蛋白質**：雞蛋、牛肉片、豬絞肉、鮪魚、豆腐（不需分解成黃豆）
- **蔬菜**：番茄、洋蔥、高麗菜、生菜等單一蔬菜
- **基本調料**：醬油、鹽、糖、美乃滋、蒜泥

**❌ 應該避免的**：
- **完整複合料理**：「滷肉」、「糖醋排骨」、「宮保雞丁」
- **複雜調味組合**：「蒜泥白肉」、「麻婆豆腐」

**🔸 判斷原則**：
1. **烹飪實用性**：以烹飪時直接使用的材料為準
2. **避免複合調理**：不使用已經完成複雜調味的料理名稱
3. **常識合理性**：符合一般人對「食材」的認知層級

**🔸 實例對比**：
- ✅ 鮪魚三明治：吐司 + 鮪魚 + 蛋 + 美乃滋 + 生菜
- ✅ 滷肉飯：豬絞肉 + 米飯 + 醬油 + 糖 + 蔥
- ❌ 滷肉飯：滷肉 + 米飯（「滷肉」是複合調理）

### 🔸 任務執行方式
1. 使用常識與經驗推論使用者描述的內容，包括模糊單位（如「一碗」、「拳頭大」、「一些」、「一點點」等）轉換為合理重量（以克為單位）。
2. 若描述中有重量或份數，請以此為主，否則請估算。
3. 若提及多種食物，請聚焦於主食或整體合併估算。
4. 若內容明顯不是食物（如情緒、動作、非飲食詞彙），請回傳錯誤格式。

### 🔸 多語言
**必須提供所有語言的翻譯，包括：zh_TW、zh_CN、en、ja、ko、vi、th、ms、id、fr、de、es、pt_BR。缺少任何一種語言都會導致錯誤。**

### 🔸 calories 計算方式
⚠️ **熱量欄位必須嚴格依以下公式計算，不得預估：**  
**calories = (protein × 4) + (carbs × 4) + (fat × 9)**  
請依此公式以整數計算熱量。

### 🔸 成分格式
每個成分需包含：
- name: 多語言物件，包含所有13種語言的翻譯
- amountValue：該份量的數值
- amountUnit：多語言物件，該份量的單位翻譯
- calories：該份量的熱量
- protein：該份量的蛋白質（單位：克）
- carbs：該份量的碳水化合物（單位：克）
- fat：該份量的脂肪（單位：克）

❌ 若無法判斷為食物，請回傳：
\`\`\`json
{ "error": "無法辨識食物，請重新描述" }
\`\`\`

✅ 正確範例：
\`\`\`json
{
  "name": {
    "zh_TW": "番茄",
    "zh_CN": "番茄",
    "en": "Tomato",
    "ja": "トマト",
    "ko": "토마토",
    "vi": "Cà chua",
    "th": "มะเขือเทศ",
    "ms": "Tomato",
    "id": "Tomat",
    "fr": "Tomate",
    "de": "Tomate",
    "es": "Tomate",
    "pt_BR": "Tomate"
  },
  "amountValue": 2,
  "amountUnit": {
    "zh_TW": "顆",
    "zh_CN": "颗",
    "en": "pieces",
    "ja": "個",
    "ko": "개",
    "vi": "quả",
    "th": "ลูก",
    "ms": "biji",
    "id": "buah",
    "fr": "pièces",
    "de": "Stück",
    "es": "piezas",
    "pt_BR": "peças"
  },
  "calories": 40,
  "protein": 2,
  "carbs": 8,
  "fat": 0
}
\`\`\`

重要注意事項：
- 🚨 請注意：即使使用者輸入的內容為其他語言，請一律 **以 ${responseLanguage} 作為主要回應語言**，但仍需提供所有13種語言的翻譯。
- 熱量計算必須精確：calories = (protein × 4) + (carbs × 4) + (fat × 9)
- 所有數值必須為合理的正數
- 食物名稱必須具體明確
- 份量單位要符合食物特性（固體用g，液體用ml等）
- 必須提供完整的多語言翻譯，缺少任何語言都會導致錯誤

使用者描述如下（使用者的語言為 ${responseLanguage}）：
---
${userInput}
---
`.trim();
}

/**
 * 生成錯誤提示詞（當輸入無效時）
 * @param userLanguage 使用者語言代碼
 * @returns 錯誤提示詞
 */
export function generateRecipeIngredientErrorPrompt(userLanguage: SupportedLanguage = "zh_TW"): string {
  const languageMap: { [key in SupportedLanguage]: string } = {
    zh_TW: "繁體中文",
    zh_CN: "简体中文",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    vi: "Tiếng Việt",
    th: "ภาษาไทย",
    ms: "Bahasa Melayu",
    id: "Bahasa Indonesia",
    fr: "Français",
    de: "Deutsch",
    es: "Español",
    pt_BR: "Português (Brasil)",
  };

  const responseLanguage = languageMap[userLanguage] || "繁體中文";

  const errorMessages: { [key: string]: string } = {
    繁體中文: "無法辨識食物，請重新描述",
    简体中文: "无法识别食物，请重新描述",
    English: "Unable to identify food, please describe again",
    日本語: "食べ物を認識できません。再度説明してください",
    한국어: "음식을 인식할 수 없습니다. 다시 설명해 주세요",
    "Tiếng Việt": "Không thể nhận diện thực phẩm, vui lòng mô tả lại",
    ภาษาไทย: "ไม่สามารถระบุอาหารได้ กรุณาอธิบายใหม่",
    "Bahasa Melayu": "Tidak dapat mengenal pasti makanan, sila huraikan semula",
    "Bahasa Indonesia": "Tidak dapat mengenali makanan, silakan deskripsikan ulang",
    Français: "Impossible d'identifier la nourriture, veuillez décrire à nouveau",
    Deutsch: "Lebensmittel nicht erkennbar, bitte erneut beschreiben",
    Español: "No se puede identificar la comida, por favor describe de nuevo",
    "Português (Brasil)": "Não é possível identificar a comida, por favor, descreva novamente",
  };

  return (
    errorMessages[responseLanguage] ||
    errorMessages["繁體中文"] ||
    "無法辨識食物，請重新描述"
  );
}

/**
 * 創建編輯食譜提示詞
 * @param name 食譜名稱
 * @param description 食譜描述
 * @param stepTexts 步驟文字陣列
 * @param userLanguage 使用者語言代碼
 * @returns 生成的提示詞
 */
export function createEditRecipePrompt(
  name: string,
  description: string,
  stepTexts: string[],
  userLanguage: SupportedLanguage = "zh_TW"
): string {
  const languageMap: { [key in SupportedLanguage]: string } = {
    zh_TW: "繁體中文",
    zh_CN: "简体中文",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    vi: "Tiếng Việt",
    th: "ภาษาไทย",
    ms: "Bahasa Melayu",
    id: "Bahasa Indonesia",
    fr: "Français",
    de: "Deutsch",
    es: "Español",
    pt_BR: "Português (Brasil)",
  };

  const responseLanguage = languageMap[userLanguage] || "繁體中文";

  return `
你是專業的食譜翻譯專家。使用者正在**編輯現有食譜**，請根據使用者提供的**最新內容**進行多語言翻譯：

## ✅ 嚴格任務規則（請逐項遵守）

1. **食譜名稱和描述必須完全按照使用者輸入進行翻譯** - 不可添加、修改、優化或"完善"任何文字，即使看起來簡短或不完整
2. **步驟數量必須與使用者提供的步驟數量完全一致** - 若使用者提供2個步驟，回應必須只有2個步驟
3. **每個步驟的翻譯必須100%忠實對應使用者提供的原文** - 不可添加、刪除或修改任何文字
4. **禁止添加任何額外步驟** - 包括「享用」、「完成」等結尾步驟

### 🚨 重要提醒
- 步驟數量檢查：確認回應的步驟數量與輸入完全一致
- 內容檢查：確認每個步驟的翻譯僅翻譯原文，無任何添加
- **名稱翻譯檢查：確認食譜名稱翻譯保持與原文相同的簡潔程度，不可根據食材推測或補充內容**

### 🔸 多語言翻譯規則
**必須提供所有語言的翻譯，包括：zh_TW、zh_CN、en、ja、ko、vi、th、ms、id、fr、de、es、pt_BR。缺少任何一種語言都會導致錯誤。**

**翻譯原則：**
1. **嚴格按照原文長度和內容進行翻譯** - 簡短的名稱翻譯後也應該簡短
2. **不可根據食材內容推測或添加描述** - 即使食材中有格蘭諾拉和奇異果，如果用戶只寫「優格芭菲」，翻譯也只能是 "Yogurt Parfait"
3. **保持用戶原意的完整性** - 用戶想要簡潔的名稱就保持簡潔

### 🔸 步驟格式
每個步驟需包含：
- order: 步驟順序（從1開始）
- stepDescription: 多語言步驟描述

### 🔸 禁止內容規則（❗務必判斷是否與料理有關）

請檢查每個使用者提供的步驟內容，**是否真的與食譜製作有關**。如果有以下任一情況，請**中止任務並回傳錯誤訊息**：

#### 🚫 無效步驟條件（任一符合即視為錯誤）：
1. 僅包含打招呼、測試、鼓勵或情緒類語句，例如：
   - 「哈囉」、「Hello」、「這是測試」、「我今天不煮飯」、「加油」、「OK」、「開始」、「完成」、「祝你快樂」
2. 單一詞語或重複無意義文字：
   - 例如：「好」、「嗯」、「好好好」、「哈」、「嗚嗚」
3. 與料理製作無關的對話語氣句，例如：
   - 「我想一下要不要煮」、「這菜看起來不好吃」、「我覺得很難」

#### ❌ 請回傳以下錯誤格式：
如果發現無效步驟，請回傳：{ "error": "使用者描述的步驟與食譜無關，請重新描述" }

### 🔸 輸出格式要求
請提供食譜翻譯結構，包含：
- name: 多語言食譜名稱
- description: 多語言食譜描述
- steps: 多語言步驟陣列

## 📝 使用者提供的食譜資訊

**食譜名稱**（使用者語言：${responseLanguage}）：
${name}

**食譜描述**（使用者語言：${responseLanguage}）：
${description}

**製作步驟**（使用者語言：${responseLanguage}）：
${stepTexts.map((step, index) => `${index + 1}. ${step}`).join("\n")}

### ✅ 正確翻譯範例

**情境：** 用戶將「奇異果格蘭諾拉優格芭菲」改為「優格芭菲」

**❌ 錯誤做法：** 
AI 自動添加食材描述：
- zh_TW: "優格芭菲配格蘭諾拉麥片和奇異果"
- en: "Yogurt Parfait with Granola and Kiwi"

**✅ 正確做法：** 
嚴格按照用戶輸入翻譯：
- zh_TW: "優格芭菲"
- en: "Yogurt Parfait"

**說明：** 即使食材中包含格蘭諾拉和奇異果，但用戶明確將名稱改為「優格芭菲」，就必須嚴格按照用戶意圖翻譯，不可自行添加食材描述。

請根據上述內容進行多語言翻譯，僅翻譯名稱、描述和步驟，不得創作額外內容。
`.trim();
}