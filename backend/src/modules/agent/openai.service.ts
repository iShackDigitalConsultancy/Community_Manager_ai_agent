import OpenAI from 'openai';
import { env } from '../../config/env';
import { conversationService } from './conversation.service';
import { promptBuilder, TenantContext } from './prompt.builder';
import { agentTools, toolsRegistry } from './tools.registry';
import { logger } from '../../shared/logger';

// Maximum number of tool-call rounds before we force a final answer.
const MAX_ITERATIONS = 6;

// Convert Anthropic tool schema dynamically to OpenAI Function Calling schema
const openAITools = agentTools.map(tool => ({
    type: 'function' as const,
    function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema
    }
}));

export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY || 'mock'
        });
    }

    async processMessage(
        conversationId: string, 
        schemeId: string, 
        schemeName: string, 
        userMessage: string,
        tenantContext?: TenantContext,
        onStream?: (event: { type: 'text' | 'status' | 'ui_action' | 'complete' | 'error', content?: string, actionType?: string, actionData?: any }) => void,
        attachment?: string
    ) {
        await conversationService.addMessage(conversationId, 'user', userMessage);

        const history = await conversationService.getHistory(conversationId);

        // Map DB message history directly into OpenAI array format
        const messages: any[] = [
            { role: 'system', content: promptBuilder.buildSystemPrompt(schemeName, undefined, tenantContext) },
            ...history.filter((m: any) => m.role !== 'system').map((m: any, index: number) => {
                // If this is the very last user message and there is an attachment included,
                // we convert the content into an array format suitable for gpt-4o vision.
                if (index === history.length - 1 && m.role === 'user' && attachment) {
                    return {
                        role: 'user',
                        content: [
                            { type: 'text', text: m.content },
                            { type: 'image_url', image_url: { url: attachment } }
                        ]
                    };
                }
                return { role: m.role, content: m.content };
            })
        ];

        // Ensure robust mock fallback detection for empty or placeholder keys
        if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'mock' || env.OPENAI_API_KEY.includes('your_') || env.OPENAI_API_KEY.includes('mock')) {
            console.warn('Using mock OpenAI response...');
            const mockResponse = "This is a mocked response because OPENAI_API_KEY is missing. Please add it to your .env file.";
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
            let toolCalls: any[] = [];

            const stream = await this.openai.chat.completions.create({
                model: env.OPENAI_MODEL || 'gpt-4o',
                messages: currentMessages,
                tools: openAITools,
                stream: true,
            });

            // Parse chunked SSE packets natively coming from OpenAI
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                
                if (delta?.content) {
                    currentResponseText += delta.content;
                    if (onStream) onStream({ type: 'text', content: delta.content });
                }

                if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        // Initialize tool parameter array block natively from SSE chunk index
                        if (!toolCalls[tc.index]) {
                            toolCalls[tc.index] = {
                                id: tc.id,
                                type: tc.type,
                                function: { name: tc.function?.name || '', arguments: '' }
                            };
                        }
                        // Append streaming JSON arguments
                        if (tc.function?.arguments) {
                            toolCalls[tc.index].function.arguments += tc.function.arguments;
                        }
                    }
                }
            }

            finalResponseText += currentResponseText;

            // Wait, OpenAI does not guarantee output tokens tracking on stream responses easily without stream_options
            // We'll estimate or just keep it 0 as token_count in the DB isn't strictly enforced for business logic.
            totalOutputTokens += 0; 

            // Cleanly filter out any corrupted or null tool calls from the builder array
            toolCalls = toolCalls.filter(Boolean);

            if (toolCalls.length > 0) {
                // OpenAI requires the assistant message that spawned the tool calls to be appended back
                currentMessages.push({
                    role: 'assistant',
                    content: currentResponseText || null,
                    tool_calls: toolCalls
                });

                // Execute each requested tool in parallel or sequence
                for (const toolCall of toolCalls) {
                    const block = toolCall.function;
                    logger.info(`[Agent] Iteration ${iterations} — tool: ${block.name}`);
                    
                    if (onStream) {
                        const statusMsg = block.name === 'search_knowledgebase' ? 'Retrieving scheme rules and documents...' :
                                          block.name === 'decompose_query' ? 'Structuring advanced research query...' :
                                          block.name === 'synthesise_research' ? 'Synthesising key findings...' :
                                          `Executing action: ${block.name.replace(/_/g, ' ')}...`;
                        onStream({ type: 'status', content: statusMsg });
                    }

                    // Parse arguments 
                    let args: any = {};
                    try {
                        args = JSON.parse(block.arguments || '{}');
                    } catch(e) {
                        logger.error('[Agent] OpenAI streamed malformed tool JSON', e);
                    }

                    let resultStr = '';
                    
                    if (block.name === 'render_ui_component') {
                        if (onStream && args.componentType) {
                            // Send out a special SSE event containing the UI payload
                            onStream({ type: 'ui_action', actionType: args.componentType, actionData: args.data } as any);
                        }
                        resultStr = `Successfully rendered the ${args.componentType} UI component to the user. Wait for their response or end your turn.`;
                    } else {
                        resultStr = await toolsRegistry.executeTool(
                            block.name, 
                            args, 
                            schemeId,
                            tenantContext?.unitId
                        );
                    }

                    // Provide the tool result back into the OpenAI stack
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: resultStr
                    });
                }
            } else {
                // Standard text response terminated
                break;
            }
        }

        if (iterations >= MAX_ITERATIONS) {
            logger.warn(`[Agent] Reached max iterations (${MAX_ITERATIONS}). Forcing final response.`);
        }

        await conversationService.addMessage(conversationId, 'assistant', finalResponseText, totalOutputTokens);

        if (onStream) {
            onStream({ type: 'complete', content: finalResponseText });
        }

        return finalResponseText;
    }
}

export const openaiService = new OpenAIService();
