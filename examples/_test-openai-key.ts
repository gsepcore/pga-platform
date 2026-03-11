import OpenAI from 'openai';

async function main() {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
        const r = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say hello in one word.' }],
            max_tokens: 10,
        });
        console.log('SUCCESS:', r.choices[0].message.content);
    } catch (e: any) {
        console.log('ERROR:', e.status, e.message);
    }
}
main();
