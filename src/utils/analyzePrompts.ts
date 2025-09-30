import { SupportedLanguage } from '../types/gemini';

/**
 * 創建圖片分析提示詞
 * @param userLanguage 用戶語言代碼
 * @param userInput 用戶額外輸入
 * @returns 提示詞
 */
export function createAnalyzePrompt(
  userLanguage: SupportedLanguage = "zh_TW",
  userInput: string | null = null
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
You are a professional nutritionist and image recognition expert. Your task is to analyze food images uploaded by users.

### 🎯 Objective

Based on the image content, estimate:
1. Total calories and three major nutrients (protein, carbohydrates, fat)
2. Main components and their weight, portions, and nutritional values
3. Provide health score and bullet-point pros/cons
4. For multiple images, analyze them as different angles of the same meal

### 📌 Core Rules

- Meal names should be concise, without breakfast/lunch/dinner words, verbs or adjectives
- **Calorie calculation formula**: calories = (protein × 4) + (carbs × 4) + (fat × 9)

### 🔸 Ingredient Definition Guidelines (Important)

**✅ Reasonable ingredient levels**:
- **Basic staples**: Toast, rice, noodles, bread (no need to break down into flour ingredients)
- **Proteins**: Eggs, beef slices, ground pork, tuna, tofu (no need to break down into soybeans)
- **Vegetables**: Tomato, onion, cabbage, lettuce and other single vegetables
- **Basic seasonings**: Soy sauce, salt, sugar, mayonnaise, garlic paste

**❌ Should avoid**:
- **Complete composite dishes**: "Braised pork", "sweet and sour ribs", "Kung Pao chicken"
- **Complex seasoning combinations**: "Garlic pork", "Mapo tofu"

**🔸 Judgment principles**:
1. **Cooking practicality**: Based on materials directly used in cooking
2. **Avoid composite cooking**: Don't use dish names that are already complex seasoned
3. **Common sense reasonableness**: Conform to general understanding of "ingredients"

**🔸 Example comparison**:
- ✅ Tuna sandwich: Toast + tuna + egg + mayonnaise + lettuce
- ✅ Braised pork rice: Ground pork + rice + soy sauce + sugar + scallion
- ❌ Braised pork rice: Braised pork + rice ("braised pork" is composite cooking)

### Processing Logic

**Non-food images**: Return error message

**With nutrition labels**: Prioritize reading nutrition label tables, use per-serving nutrition information

**Fresh food**: Analyze images to determine main ingredients and portions

${
  userInput
    ? `### 📝 Additional Information Provided by User

User provided additional description for this meal: "${userInput}"

Please refer to this information to adjust your analysis:
- If user provided portion information (e.g.: one bowl, half plate, 200g, etc.), use this to adjust nutrition calculations
- If user pointed out specific ingredients, ensure these ingredients are included in component analysis
- If user provided nutrition-related information, consider and apply it in the analysis
- Prioritize specific information provided by user, but still maintain consistency with image content

`
    : ""
}### Health Assessment Guidelines

- Pros and cons focus only on nutrition-related aspects, not including taste, color, cooking convenience, etc.
- If insufficient nutrition points, can be less than 4 items, don't add non-nutrition content just to fill up
- **Pros and cons descriptions must be concise**: Directly point out nutrition key points, no excessive explanations
- Example format: "Rich in high-quality protein" "Diverse vegetable types" "High cooking oil content" "High sodium content"

### 🔸 Language Usage Guidelines (Important)

**All text fields must use ${responseLanguage}**, including but not limited to:
- ✅ name (meal name)
- ✅ ingredients[].name (ingredient name)
- ✅ ingredients[].amountUnit (ingredient unit)
- ✅ health_assessment.pros (advantages list)
- ✅ health_assessment.cons (disadvantages list)

**Exception fields**:
- ❌ ingredients[].engName (always use English, not affected by user language)

**Important reminder**: Please ensure all name and amountUnit fields in ingredients use ${responseLanguage}, not Chinese.

The user's native language is ${responseLanguage}, please respond in ${responseLanguage}.
`.trim();
}

/**
 * 生成食譜創建提示詞
 * @param userLanguage 用戶語言代碼
 * @param userInput 用戶額外輸入
 * @returns 提示詞
 */
export function generateAddRecipePrompt(
  userLanguage: SupportedLanguage = "zh_TW",
  userInput: string | null = null
): string {
  const languageMap: { [key in SupportedLanguage]: string } = {
    zh_TW: "繁體中文",
    zh_CN: "简体中文",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    vi: "Tiếng Việt",
    th: "ภاษาไทย",
    ms: "Bahasa Melayu",
    id: "Bahasa Indonesia",
    fr: "Français",
    de: "Deutsch",
    es: "Español",
    pt_BR: "Português (Brasil)",
  };

  const responseLanguage = languageMap[userLanguage] || "繁體中文";

  return `
You are a professional image recognition and nutrition expert. Please analyze the images uploaded by users. Fresh meals include beverages, soups, main dishes, desserts, salads and other foods. **If the image is not a fresh meal, please return error**, otherwise provide complete recipe information.

${
  userInput
    ? `### 📝 Additional Information Provided by User

User provided additional description for this recipe: "${userInput}"

Please refer to this information to adjust your analysis:
- If user provided recipe name, prioritize or reference it
- If user pointed out specific ingredients or quantities, ensure these ingredients are included in component analysis
- If user provided serving information (e.g.: 2 servings, 4 servings), adjust nutrition calculations and servings accordingly
- If user provided information related to preparation steps, reference and integrate it into step analysis
- If user provided information about preparation time or difficulty, reference and adjust duration and difficulty
- Prioritize specific information provided by user, but still maintain consistency with image content

`
    : ""
}---
## 🚫 Error Condition Rules
Return errors in the following situations:
- Non-food images (e.g. landscapes, faces, desktops, etc.)
- Packaged foods, industrial foods with nutrition labels, outer boxes
- Cartoon images, text images, non-physical photos

When error occurs, please return: { "error": "Unable to identify food, please re-upload fresh meal photos" }

---
## ✅ Normal Task Objectives
If the image is "fresh meal", please generate corresponding data according to the following rules:

### 🔸 Multilingual Settings
**Please provide complete multilingual translation**, including the following 13 languages:
- zh_TW (Traditional Chinese)
- zh_CN (Simplified Chinese)  
- en (English)
- ja (Japanese)
- ko (Korean)
- vi (Vietnamese)
- th (Thai)
- ms (Malay)
- id (Indonesian)
- fr (French)
- de (German)
- es (Spanish)
- pt_BR (Portuguese (Brazil))

### 🔸 name, description (Multilingual)
- name: **Meal name**, concise, without verbs or decorative words (like "delicious", "my favorite")
- description should be a short (about 1-2 sentences) introduction to the dish, describing the main ingredients and cooking method
- Provide accurate translation for each language

### 🔸 calories 計算方式
- calories = ingredients[] 所有成分的熱量加總
- 不可獨立估算總熱量，必須與 ingredients 熱量加總一致
- ⚠️ **每個成分的熱量必須嚴格依以下公式計算：**
  - 成分熱量 = (成分蛋白質 × 4) + (成分碳水 × 4) + (成分脂肪 × 9)
  - 總熱量必須等於所有成分熱量的總和

### 🔸 servings、calories 與 ingredients 的一致性要求
- \`servings\` 表示整道菜可分成幾份，例如 \`servings: 8\` 表示此蛋糕總共可切成 8 份
- \`calories\`、\`protein\`、\`carbs\`、\`fat\` 皆表示「整道食譜的總營養素值」，非每一份的值
- ingredients[] 中列出的所有材料與熱量 **應為總量（可製作出 servings 份）**，不可為單人份
- AI 須確保 \`ingredients[].calories\` 加總 = \`calories\`
- 若使用者希望知道每份營養，則應由前端計算：\`每份熱量 = calories ÷ servings\`

### 🔸 三大營養素計算
⚠️ **必須嚴格按照以下公式計算熱量，不得估算：**
\`\`\`
calories = (protein × 4) + (carbs × 4) + (fat × 9)
\`\`\`
- 對於每個成分和整體食譜，熱量必須精確等於按上述公式計算的結果
- 請確保每個成分的三大營養素加總與該成分的熱量一致
- 請確保所有成分的三大營養素加總與整體食譜的三大營養素一致
- 請確保所有成分的熱量加總與整體食譜的熱量一致

### 🔸 ingredients（多語言）

#### 食材定義規範（重要）

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

#### 每個成分需包含：
- 多語言 name（食材名稱）
- amountValue：該份量的數值
- 多語言 amountUnit（份量單位）
- calories：該份量的熱量
- protein：該份量的蛋白質（單位：克）
- carbs：該份量的碳水化合物（單位：克）
- fat：該份量的脂肪（單位：克）

### 🔸 recipe Information
- duration: Estimated cooking time (minutes)
- difficulty: choose one from easy / medium / hard
- servings: How many servings this recipe makes
- steps: List cooking steps in order, each step contains multi-language stepDescription

### 🔸 recipeHealthAssessment (Multi-language)
- score: Health score for this recipe (1-10), higher is healthier
- pros: Multi-language advantages, list up to 4 items, but can be fewer than 4, list fewer if there aren't enough nutritional points
- cons: Multi-language disadvantages same as above
- Advantages and disadvantages can only be judged on "nutrition-related" aspects, forbidden to include taste, color, cooking convenience, cultural background, price, satiety, personal taste preferences and other non-nutritional elements
- ❌ **Do not use complete sentences, explanatory statements, suggestion sentences, or causal sentences**

### 🔸 tags (RecipeTag Classification)
Please determine which tags this recipe should contain based on the following classification rules:

#### ✅ Categories & Recommended Quantities:
| Category | Recommended Tag Count | Enum Values |
|----------|----------------------|-------------|
| Meal Category | 0~1 | breakfast, lunch, dinner, dessert, beverage |
| Dietary Preference | 1~3 | vegan, vegetarian, highProtein, keto, mediterranean, lowGi, lowCarb, lowFat |
| Cooking Style | 0~2 | soup, salad, snack, bento, hotPot, friedFood, grilled, noodles, mainCourse |
| Regional Flavor | 0~2 | taiwanese, chinese, japanese, korean, vietnam, italian, american, indian, mexican, france, malaysia, singapore, german, spanish, thai, brazilian |

Please determine the most reasonable tags based on ingredient names, steps, description, and overall logic.

---
## 📋 Important Reminders
1. **Multi-language completeness**: name, description, ingredients.name, ingredients.amountUnit, steps.stepDescription, recipeHealthAssessment must provide translations for all 13 languages
2. **Nutritional calculation accuracy**: Strictly calculate according to formulas, ensure data consistency
3. **Recipe practicality**: Provide clear cooking steps and reasonable portion estimates
4. **Health assessment professionalism**: Only evaluate nutrition-related content

Please return structured data using function calling.
`.trim();
}