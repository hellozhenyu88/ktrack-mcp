import { Router, Request, Response } from 'express';

const router = Router();

interface AiMessage {
    role: 'user' | 'assistant';
    content: string;
}

/** AI 解析用工需求 → 生成结构化任务 */
router.post('/parse-task', async (req: Request, res: Response) => {
    const { messages } = req.body as { messages: AiMessage[] };
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ code: 400, message: '请输入需求描述' });
        return;
    }

    const systemPrompt = `你是开物数迹（K-Track）平台的 AI 智能发包助手。你的职责是帮助企业用户将自然语言描述的用工需求，解析为结构化的任务发布信息。

你需要从用户描述中提取以下字段：
- name: 任务名称（简短精炼）
- type: 任务类型（如：软件开发、UI设计、数据分析、文案策划、视频制作、翻译、市场营销、财务审计等）
- description: 详细的任务描述
- requirements: 技能要求数组
- peopleNeeded: 需求人数（数字）
- budget: 预算金额（数字，单位：元）
- duration: 工作周期（如：1周、2个月）
- location: 工作地点（如：远程、上海、北京）

规则：
1. 如果用户描述信息不完整，你需要友好地追问缺失的信息
2. 当信息足够时，输出 JSON 格式的任务数据，用 \`\`\`json 代码块包裹
3. 使用中文回复
4. 态度友好专业，像一个经验丰富的 HR 顾问
5. 预算要合理，如果用户没明确，给出建议范围
6. 每次回复尽量简洁`;

    try {
        // 调用 DeepSeek API（兼容 OpenAI 格式）
        const apiKey = process.env.AI_API_KEY || 'sk-placeholder';
        const apiBase = process.env.AI_API_BASE || 'https://api.deepseek.com';

        const aiResponse = await fetch(`${apiBase}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.AI_MODEL || 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                ],
                temperature: 0.7,
                max_tokens: 1000,
            }),
        });

        if (!aiResponse.ok) {
            // AI API 不可用时，使用本地智能解析
            console.warn('⚠️ AI API 不可用，使用本地解析');
            const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
            const fallbackReply = localParse(lastUserMsg, messages.length);
            res.json({ code: 0, data: { reply: fallbackReply } });
            return;
        }

        const data = await aiResponse.json() as { choices: { message: { content: string } }[] };
        const reply = data.choices?.[0]?.message?.content || '抱歉，AI 暂时无法处理您的请求。';

        res.json({ code: 0, data: { reply } });
    } catch (error) {
        console.error('AI API error:', error);
        // 降级到本地解析
        const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
        const fallbackReply = localParse(lastUserMsg, messages.length);
        res.json({ code: 0, data: { reply: fallbackReply } });
    }
});

/** 本地智能解析（AI API 不可用时的降级方案） */
function localParse(input: string, msgCount: number): string {
    // 简单关键词提取
    const typeMap: Record<string, string> = {
        '开发': '软件开发', '编程': '软件开发', '前端': '软件开发', '后端': '软件开发',
        '设计': 'UI设计', 'UI': 'UI设计', 'UX': 'UI设计',
        '分析': '数据分析', '数据': '数据分析',
        '文案': '文案策划', '写作': '文案策划', '营销': '文案策划',
        '视频': '视频制作', '剪辑': '视频制作',
        '翻译': '翻译',
    };

    const numberMatch = input.match(/(\d+)\s*(个|人|位)/);
    const budgetMatch = input.match(/(\d+)\s*(万|千|元|块)/);
    const durationMatch = input.match(/(\d+)\s*(天|周|月|年)/);
    const locationMatch = input.match(/(上海|北京|深圳|广州|杭州|成都|远程|线上)/);

    let detectedType = '';
    for (const [kw, t] of Object.entries(typeMap)) {
        if (input.includes(kw)) { detectedType = t; break; }
    }

    const people = numberMatch ? parseInt(numberMatch[1]) : 1;
    let budget = 0;
    if (budgetMatch) {
        budget = parseInt(budgetMatch[1]);
        if (budgetMatch[2] === '万') budget *= 10000;
        if (budgetMatch[2] === '千') budget *= 1000;
    }
    const duration = durationMatch ? `${durationMatch[1]}${durationMatch[2]}` : '';
    const location = locationMatch ? locationMatch[1] : '';

    // 第一轮对话：追问信息
    if (msgCount <= 2 && (!budget || !detectedType)) {
        const missing: string[] = [];
        if (!detectedType) missing.push('任务类型（如：软件开发、UI设计、数据分析）');
        if (!budget) missing.push('预算范围');
        if (!duration) missing.push('工作周期');
        if (!location) missing.push('工作地点/是否支持远程');

        return `我已理解您的需求大概方向。为了生成更精准的任务需求书，还需要确认以下几点：\n\n${missing.map((m, i) => `${i + 1}. **${m}**`).join('\n')}\n\n请补充以上信息，我会立即为您生成标准化的任务需求书 📝`;
    }

    // 信息足够，生成结构化数据
    const name = detectedType ? `${detectedType}项目` : '项目需求';
    const desc = input.length > 20 ? input : `${name}，详情待确认。`;
    if (!budget) budget = 10000;
    const finalDuration = duration || '2周';
    const finalLocation = location || '远程';

    return `好的！根据您的描述，我为您生成了以下任务需求书：

📋 **任务概览**
- **任务名称**：${name}
- **类型**：${detectedType || '待确定'}
- **需求人数**：${people} 人
- **预算**：¥${budget.toLocaleString()}
- **工期**：${finalDuration}
- **地点**：${finalLocation}

确认无误后，点击「发布任务」即可上架。如需修改任何信息，直接告诉我。

\`\`\`json
${JSON.stringify({ name, type: detectedType || '综合', description: desc, requirements: [], peopleNeeded: people, budget, duration: finalDuration, location: finalLocation }, null, 2)}
\`\`\``;
}

export default router;
