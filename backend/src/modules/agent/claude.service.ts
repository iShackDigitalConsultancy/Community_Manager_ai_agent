import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { conversationService } from './conversation.service';
import { promptBuilder, TenantContext } from './prompt.builder';
import { agentTools, toolsRegistry } from './tools.registry';
import { logger } from '../../shared/logger';

// Maximum number of tool-call rounds before we force a final answer.
// Mirroring Karpathy's "think → act → observe → repeat" research loop.
const MAX_ITERATIONS = 6;

export class ClaudeService {
    private anthropic: Anthropic;

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: env.ANTHROPIC_API_KEY || 'mock'
        });
    }

    async processMessage(
        conversationId: string, 
        schemeId: string, 
        schemeName: string, 
        userMessage: string,
        tenantContext?: TenantContext,
        onStream?: (event: { type: 'text' | 'status', content: string }) => void,
        image?: { base64: string; mimeType: string }
    ) {
        // If image exists, save a placeholder text in history, but we'll manually inject the vision block into current messages
        const textContent = image ? `[User uploaded an image]: ${userMessage}` : userMessage;
        await conversationService.addMessage(conversationId, 'user', textContent);

        const history = await conversationService.getHistory(conversationId);

        const messages: Anthropic.MessageParam[] = history
            .filter((m: any) => m.role !== 'system')
            .map((m: any) => ({
                role: m.role,
                content: m.content
            }));

        // If this exact turn has an image, inject the image block into the LAST message we just added
        if (image && messages.length > 0) {
            messages[messages.length - 1].content = [
                {
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: image.mimeType as any,
                        data: image.base64,
                    },
                },
                {
                    type: "text",
                    text: userMessage
                }
            ];
        }

        const systemPrompt = promptBuilder.buildSystemPrompt(schemeName, undefined, tenantContext);

        if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY === 'mock' || env.ANTHROPIC_API_KEY.includes('your_') || env.ANTHROPIC_API_KEY.includes('mock')) {
            console.warn('Using mock Claude response...');
            const mockResponse = "This is a mocked response because ANTHROPIC_API_KEY is missing.";
            if (onStream) {
                onStream({ type: 'status', content: 'Mock environment detected...' });
                onStream({ type: 'text', content: mockResponse });
            }
            await conversationService.addMessage(conversationId, 'assistant', mockResponse, 10);
            return mockResponse;
        }

        let totalOutputTokens = 0;
        let finalResponseText = '';

        let currentMessages = [...messages];
        let iterations = 0;

        while (iterations < MAX_ITERATIONS) {
            iterations++;

            let currentResponseText = '';
            let toolUseBlocks: Anthropic.ToolUseBlock[] = [];

            const stream = await this.anthropic.messages.stream({
                model: env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
                max_tokens: 2048,
                system: systemPrompt,
                messages: currentMessages,
                tools: agentTools as Anthropic.Tool[]
            });

            stream.on('text', (textStr) => {
                currentResponseText += textStr;
                if (onStream) onStream({ type: 'text', content: textStr });
            });

            const finalMessage = await stream.finalMessage();
            totalOutputTokens += finalMessage.usage.output_tokens;

            // Extract tool blocks
            for (const block of finalMessage.content) {
                if (block.type === 'tool_use') {
                    toolUseBlocks.push(block);
                }
            }

            finalResponseText += currentResponseText;

            if (finalMessage.stop_reason === 'tool_use' || toolUseBlocks.length > 0) {
                currentMessages.push({ role: 'assistant', content: finalMessage.content });

                const toolResults: Anthropic.ToolResultBlockParam[] = [];

                for (const block of toolUseBlocks) {
                    logger.info(`[Agent] Iteration ${iterations} — tool: ${block.name}`, { input: block.input });
                    
                    if (onStream) {
                        const statusMsg = block.name === 'search_knowledgebase' ? 'Retrieving scheme rules and documents...' :
                                          block.name === 'decompose_query' ? 'Structuring advanced research query...' :
                                          block.name === 'synthesise_research' ? 'Synthesising key findings...' :
                                          `Executing action: ${block.name.replace(/_/g, ' ')}...`;
                        onStream({ type: 'status', content: statusMsg });
                    }

                    const resultStr = await toolsRegistry.executeTool(
                        block.name, 
                        block.input, 
                        schemeId,
                        tenantContext?.unitId
                    );

                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: block.id,
                        content: resultStr
                    });
                }

                currentMessages.push({ role: 'user', content: toolResults });

            } else {
                break;
            }
        }

        if (iterations >= MAX_ITERATIONS) {
            logger.warn(`[Agent] Reached max iterations (${MAX_ITERATIONS}). Forcing final response.`);
        }

        await conversationService.addMessage(conversationId, 'assistant', finalResponseText, totalOutputTokens);
        return finalResponseText;
    }
}

export const claudeService = new ClaudeService();
