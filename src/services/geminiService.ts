import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function askTaxAdvisor(question: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: question,
      config: {
        systemInstruction: `你是一个专业的中国个人所得税及灵活用工政策专家。
        你的名字叫“灵工小助手”。
        你需要用专业、亲切且易懂的语言回答用户关于个税、累计预扣法、年度汇算、专项附加扣除等问题。
        如果用户的问题不相关，请礼貌地引导回税务和灵工话题。
        回答时请尽量分点陈述。
        请务必参考最新的政策信息进行回答。`,
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "抱歉，我现在无法回答您的问题，请稍后再试。";
  }
}
