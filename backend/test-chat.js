"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_service_1 = require("./src/modules/agent/openai.service");
const crypto_1 = __importDefault(require("crypto"));
const conversation_service_1 = require("./src/modules/agent/conversation.service");
async function run() {
    console.log("Testing Thorntree Chat...");
    const schemeId = "af3f665d-28c1-47b4-829d-c3eb386954e6";
    let sessionId = crypto_1.default.randomUUID();
    try {
        sessionId = await conversation_service_1.conversationService.createConversation("guest-test", schemeId);
        const result = await openai_service_1.openaiService.processMessage(sessionId, schemeId, 'Thorntree', "hey what are the rules regarding dogs?", {}, (event) => {
            console.log("EVENT:", event);
        });
        console.log("Final:", result);
    }
    catch (e) {
        console.error("\n[Error Caught]:", e);
    }
}
run();
