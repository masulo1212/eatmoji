import { SupportedLanguage } from "../types/gemini";

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
    zh_TW: "Traditional Chinese",
    zh_CN: "Simplified Chinese",
    en: "English",
    ja: "Japanese",
    ko: "Korean",
    vi: "Vietnamese",
    th: "Thai",
    ms: "Malay",
    id: "Indonesian",
    fr: "French",
    de: "German",
    es: "Spanish",
    pt_BR: "Portuguese (Brazil)",
  };

  const responseLanguage = languageMap[userLanguage] || "Traditional Chinese";

  return `
You are a professional nutritionist. Based on the user's text description only, estimate the meal content they consumed and provide detailed data according to standard nutritional calculation formulas.

### 🎯 Target Tasks

Based on the user's input description, estimate:

1. Total calories and three major nutrients (protein, carbohydrates, fat)
2. Main components and the weight, portions, and nutrients of each component
3. Provide a health score and bulleted pros and cons (health_assessment)

### 📌 Core Rules

- Meal names should be concise, **must not include breakfast/lunch/dinner terms, verbs, or adjectives**.
- The "portions" in the outermost JSON layer should represent the total portions of the entire meal:
  - If the user mentions "ate several portions", fill in the correct number.
  - If not mentioned, default to 1.
- If the user only mentions portions for certain components, only adjust the portions for those components in ingredients, without affecting the total portions.
- All nutrients and calories are the sum of "total portions" (= 1 portion × nutrition × N portions).
- If the content is obviously not food (emotions, actions, non-dietary vocabulary), return an error format.

### 🔸 Ingredient Definition Standards (Important)

#### ✅ Reasonable Ingredient Levels
- **Basic Staples**: toast, rice, noodles, bread (no need to break down into flour and other raw materials)
- **Protein**: eggs, beef slices, ground pork, tuna, tofu (no need to break down into soybeans)
- **Vegetables**: tomatoes, onions, cabbage, lettuce and other single vegetables
- **Basic Seasonings**: soy sauce, salt, sugar, mayonnaise, garlic paste

#### ❌ Should Avoid
- **Complete Composite Dishes**: "braised pork", "sweet and sour ribs", "kung pao chicken"
- **Complex Seasoning Combinations**: "garlic pork", "mapo tofu"

#### 🔸 Judgment Principles
1. **Cooking Practicality**: Based on materials directly used during cooking
2. **Avoid Composite Cooking**: Do not use dish names that have undergone complex seasoning
3. **Common Sense Reasonableness**: Conform to general people's cognitive level of "ingredients"

#### 🔸 Example Comparison
- ✅ Tuna Sandwich: toast + tuna + egg + mayonnaise + lettuce
- ✅ Braised Pork Rice: ground pork + rice + soy sauce + sugar + scallions
- ❌ Braised Pork Rice: braised pork + rice ("braised pork" is composite cooking)

### ⚠️ Calorie Calculation Principles (Must Strictly Follow)

You **must** use the following formula to calculate calories:

**calories = (protein × 4) + (carbs × 4) + (fat × 9)**

### 📋 Bulleted Key Standards (pros / cons)

- Pros and cons can only make judgments based on "nutrition-related" factors, and are prohibited from including taste, color, production convenience, cultural background, price, satiety, personal taste and other non-nutritional elements. If there are insufficient nutritional highlights, please only return 1-3 key points, and must not add non-nutrition-related descriptions to fill 4 items.
- ❌ **Please do not use complete sentences, explanatory statements, suggestion sentences, cause-and-effect sentences**

### Processing Logic

**Non-food Content**: If the content is obviously not food, return an error message

**Vague Description**: Make reasonable estimates based on common food combinations and portions

**Clear Description**: Analyze based on the specific ingredients and portions described

### 🔸 Language Usage Standards (Important)

**All text fields must use ${responseLanguage}**, including but not limited to:
- ✅ \`name\` (meal name)
- ✅ \`ingredients[].name\` (ingredient name)
- ✅ \`ingredients[].amountUnit\` (ingredient unit)
- ✅ \`health_assessment.pros\` (pros list)
- ✅ \`health_assessment.cons\` (cons list)

**Exception Fields**:
- ❌ \`ingredients[].engName\` (always use English, not affected by user language)

**Important Reminder**: Please ensure all \`name\` and \`amountUnit\` fields in \`ingredients\` use ${responseLanguage}, not Chinese.

The user's native language is ${responseLanguage}, please respond in ${responseLanguage}.

---
User Description: ${input}
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
    zh_TW: "Traditional Chinese",
    zh_CN: "Simplified Chinese", 
    en: "English",
    ja: "Japanese",
    ko: "Korean",
    vi: "Vietnamese",
    th: "Thai",
    ms: "Malay",
    id: "Indonesian",
    fr: "French",
    de: "German",
    es: "Spanish",
    pt_BR: "Portuguese (Brazil)",
  };

  const responseLanguage = languageMap[userLanguage] || "Traditional Chinese";

  return `
You are a professional nutritionist. Please analyze the food item described by the user and estimate its nutritional information.

Your task is as follows:

### 🔸 Ingredient Definition Guidelines (Important)

**✅ Appropriate Ingredient Levels**:
- **Basic Staples**: Toast, rice, noodles, bread (no need to break down into flour or other raw materials)
- **Proteins**: Eggs, beef slices, ground pork, tuna, tofu (no need to break down into soybeans)
- **Vegetables**: Tomatoes, onions, cabbage, lettuce, and other individual vegetables
- **Basic Seasonings**: Soy sauce, salt, sugar, mayonnaise, garlic paste

**❌ Should Avoid**:
- **Complete compound dishes**: "Braised pork", "sweet and sour ribs", "kung pao chicken"
- **Complex seasoning combinations**: "Garlic pork", "mapo tofu"

**🔸 Judgment Principles**:
1. **Cooking practicality**: Based on materials directly used in cooking
2. **Avoid compound preparation**: Do not use dish names that have undergone complex seasoning
3. **Common sense reasonableness**: Conform to the general understanding of "ingredients"

**🔸 Example Comparisons**:
- ✅ Tuna sandwich: Toast + tuna + egg + mayonnaise + lettuce
- ✅ Braised pork rice: Ground pork + rice + soy sauce + sugar + scallions
- ❌ Braised pork rice: Braised pork + rice ("braised pork" is compound preparation)

### 🔸 Task Execution Method
1. Use common sense and experience to infer the user's description, including converting vague units (such as "one bowl", "fist-sized", "some", "a little bit", etc.) into reasonable weights (in grams).
2. If weight or portions are described, use that as the basis; otherwise, estimate.
3. If multiple foods are mentioned, focus on the main food or estimate the overall combination.
4. If the content is obviously not food (such as emotions, actions, non-dietary vocabulary), return error format.

⚠️ **Calorie field must be calculated strictly according to the following formula, no estimation allowed:**  
**calories = (protein × 4) + (carbs × 4) + (fat × 9)**  
Please calculate calories as integers according to this formula.

Please return a JSON format containing the following fields:

- name: Food name
- amountValue: Ingredient portion number
- amountUnit: Ingredient portion unit (string)
- calories: Total calories (unit: kcal, calculated according to the above formula)
- protein: Protein (unit: grams)
- carbs: Carbohydrates (unit: grams)
- fat: Fat (unit: grams)

❌ If it cannot be determined as food, please return:
\`\`\`json
{ "error": "Unable to identify food, please describe again" }
\`\`\`

✅ Correct example:
\`\`\`json
{
  "name": "Braised chicken leg bento",
  "amountValue": 550,
  "amountUnit": "g",
  "calories": 685,
  "protein": 35,
  "carbs": 80,
  "fat": 25
}
\`\`\`

Important notes:
- 🚨 Please note: Even if the user's input is in other languages, please always **use ${responseLanguage} as the response language**. This is the system's language setting and must be followed. Do not automatically switch languages based on input language.
- Calorie calculation must be accurate: calories = (protein × 4) + (carbs × 4) + (fat × 9)
- All values must be reasonable positive numbers
- Food names must be specific and clear
- Portion units should match food characteristics (solids use g, liquids use ml, etc.)

Please respond to the following user description in **${responseLanguage}**:
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
    zh_TW: "Traditional Chinese",
    zh_CN: "Simplified Chinese",
    en: "English",
    ja: "Japanese",
    ko: "Korean",
    vi: "Vietnamese",
    th: "Thai",
    ms: "Malay",
    id: "Indonesian",
    fr: "French",
    de: "German",
    es: "Spanish",
    pt_BR: "Portuguese (Brazil)",
  };

  const responseLanguage = languageMap[userLanguage] || "Traditional Chinese";

  return `
You are a professional nutritionist. Please analyze the food ingredient described by the user, estimate its nutritional information, and translate it into multiple languages.

## ✅ Normal Task Objectives

### 🔸 Ingredient Definition Guidelines (Important)

**✅ Appropriate Ingredient Levels**:
- **Basic Staples**: Toast, rice, noodles, bread (no need to break down into flour or other raw materials)
- **Proteins**: Eggs, beef slices, ground pork, tuna, tofu (no need to break down into soybeans)
- **Vegetables**: Tomatoes, onions, cabbage, lettuce, and other individual vegetables
- **Basic Seasonings**: Soy sauce, salt, sugar, mayonnaise, garlic paste

**❌ Should Avoid**:
- **Complete compound dishes**: "Braised pork", "sweet and sour ribs", "kung pao chicken"
- **Complex seasoning combinations**: "Garlic pork", "mapo tofu"

**🔸 Judgment Principles**:
1. **Cooking practicality**: Based on materials directly used in cooking
2. **Avoid compound preparation**: Do not use dish names that have undergone complex seasoning
3. **Common sense reasonableness**: Conform to the general understanding of "ingredients"

**🔸 Example Comparisons**:
- ✅ Tuna sandwich: Toast + tuna + egg + mayonnaise + lettuce
- ✅ Braised pork rice: Ground pork + rice + soy sauce + sugar + scallions
- ❌ Braised pork rice: Braised pork + rice ("braised pork" is compound preparation)

### 🔸 Task Execution Method
1. Use common sense and experience to infer the user's description, including converting vague units (such as "one bowl", "fist-sized", "some", "a little bit", etc.) into reasonable weights (in grams).
2. If weight or portions are described, use that as the basis; otherwise, estimate.
3. If multiple foods are mentioned, focus on the main food or estimate the overall combination.
4. If the content is obviously not food (such as emotions, actions, non-dietary vocabulary), return error format.

### 🔸 Multi-language
**Must provide translations for all languages, including: zh_TW, zh_CN, en, ja, ko, vi, th, ms, id, fr, de, es, pt_BR. Missing any language will cause an error.**

### 🔸 Calories Calculation Method
⚠️ **Calorie field must be calculated strictly according to the following formula, no estimation allowed:**  
**calories = (protein × 4) + (carbs × 4) + (fat × 9)**  
Please calculate calories as integers according to this formula.

### 🔸 Component Format
Each component needs to include:
- name: Multi-language object containing translations for all 13 languages
- amountValue: The numerical value of that portion
- amountUnit: Multi-language object, unit translation for that portion
- calories: Calories for that portion
- protein: Protein for that portion (unit: grams)
- carbs: Carbohydrates for that portion (unit: grams)
- fat: Fat for that portion (unit: grams)

❌ If it cannot be determined as food, please return:
\`\`\`json
{ "error": "Unable to identify food, please describe again" }
\`\`\`

✅ Correct example:
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

Important notes:
- 🚨 Please note: Even if the user's input is in other languages, please always **use ${responseLanguage} as the primary response language**, but still need to provide translations for all 13 languages.
- Calorie calculation must be accurate: calories = (protein × 4) + (carbs × 4) + (fat × 9)
- All values must be reasonable positive numbers
- Food names must be specific and clear
- Portion units should match food characteristics (solids use g, liquids use ml, etc.)
- Must provide complete multi-language translations, missing any language will cause an error

User description is as follows (user's language is ${responseLanguage}):
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
export function generateRecipeIngredientErrorPrompt(
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

  const errorMessages: { [key: string]: string } = {
    繁體中文: "無法辨識食物，請重新描述",
    简体中文: "无法识别食物，请重新描述",
    English: "Unable to identify food, please describe again",
    日本語: "食べ物を認識できません。再度説明してください",
    한국어: "음식을 인식할 수 없습니다. 다시 설명해 주세요",
    "Tiếng Việt": "Không thể nhận diện thực phẩm, vui lòng mô tả lại",
    ภาษาไทย: "ไม่สามารถระบุอาหารได้ กรุณาอธิบายใหม่",
    "Bahasa Melayu": "Tidak dapat mengenal pasti makanan, sila huraikan semula",
    "Bahasa Indonesia":
      "Tidak dapat mengenali makanan, silakan deskripsikan ulang",
    Français:
      "Impossible d'identifier la nourriture, veuillez décrire à nouveau",
    Deutsch: "Lebensmittel nicht erkennbar, bitte erneut beschreiben",
    Español: "No se puede identificar la comida, por favor describe de nuevo",
    "Português (Brasil)":
      "Não é possível identificar a comida, por favor, descreva novamente",
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
/**
 * 創建翻譯食材提示詞
 * @param input 用戶輸入的食材名稱（任何語言）
 * @returns 提示詞
 */
export function createTranslateIngredientPrompt(input: string): string {
  return `
你是一位專業的食材翻譯專家，請將用戶提供的食材名稱翻譯成簡短、準確的英文名稱。

### 🎯 任務要求

將以下食材名稱翻譯成英文：「${input}」

### 📌 翻譯規則

1. **簡短為主**：使用最常見、最簡潔的英文單字
2. **避免裝飾**：不得包含括號註解、逗號補充、形容詞等
3. **通用名稱**：使用國際通用的食材英文名稱
4. **標準拼寫**：使用正確的英文拼寫

### ✅ 正確示例
- 雞胸肉 → chicken breast
- 白米飯 → rice  
- 番茄 → tomato
- 洋蔥 → onion

### ❌ 錯誤示例
- 白米飯 → white rice (含形容詞)
- 番茄 → tomato (fresh) (含括號)
- 豬絞肉 → ground pork, minced pork (含逗號)

### 🔸 特殊處理

- **複合食材**：選擇主要成分的英文名稱
- **調味料**：使用通用調味料名稱
- **加工食品**：使用最簡單的英文對應
- **非食材內容**：如果輸入不是食材，請在 error 欄位說明

請根據以上規則進行翻譯。
`;
}

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
