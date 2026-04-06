import { Client } from 'pg';
import { env } from './src/config/env';
import { openaiService } from './src/modules/agent/openai.service';
import crypto from 'crypto';

import { conversationService } from './src/modules/agent/conversation.service';

async function run() {
    console.log("Testing Thorntree Chat...");
    const schemeId = "af3f665d-28c1-47b4-829d-c3eb386954e6";
    let sessionId = crypto.randomUUID();
    
    try {
        sessionId = await conversationService.createConversation("guest-test", schemeId);
        
        const result = await openaiService.processMessage(sessionId, schemeId, 'Thorntree', "hey what are the rules regarding dogs?", {}, (event) => {
            console.log("EVENT:", event);
        });
        console.log("Final:", result);
    } catch (e) {
        console.error("\n[Error Caught]:", e);
    }
}
run();
