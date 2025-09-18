import { getFreeAIProvider } from "@/lib/freeAI";
import UsageTracker from "@/lib/usageTracker";

export const runtime = "edge";

export async function POST(req: Request) {
    try {
        const tracker = UsageTracker.getInstance();
        
        // Check if we can make a request
        if (!tracker.canMakeRequest()) {
            const stats = tracker.getUsageStats();
            return new Response(
                JSON.stringify({
                    error: 'Daily usage limit reached',
                    message: `You've used ${stats.used}/${stats.limit} requests today. Limit resets at ${stats.resetTime.toLocaleString()}`,
                    stats
                }),
                { 
                    status: 429, 
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const { messages } = await req.json();
        
        // Record the request
        tracker.recordRequest();

        // Use free AI provider
        const aiProvider = getFreeAIProvider();
        console.log(`Using AI provider: ${aiProvider.name}`);
        
        const aiResponse = await aiProvider.chat(messages);
        
        // Return as streaming response to match frontend expectations
        const stream = new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder();
                const words = aiResponse.split(' ');
                let i = 0;
                
                const sendWord = () => {
                    if (i < words.length) {
                        // Use the exact format the frontend expects
                        const jsonChunk = JSON.stringify(`${words[i]} `);
                        controller.enqueue(encoder.encode(`0:${jsonChunk}\n`));
                        i++;
                        setTimeout(sendWord, 50); // Simulate typing effect
                    } else {
                        controller.close();
                    }
                };
                sendWord();
            }
        });
        
        return new Response(stream, {
            headers: { 'Content-Type': 'text/plain' }
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}

