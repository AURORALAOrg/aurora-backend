// Placeholder chat service integrating topic-based prompts
// In a future iteration, this can call an AI provider with the constructed prompt
import { Topic } from "@prisma/client";

export default class ChatService {
  public static buildPromptFromTopic(topic: Topic, userContext?: { level?: string; name?: string }) {
    const header = `You are an English practice partner. Topic: ${topic.name} (Level: ${topic.englishLevel}).`;
    const instructions = `Have a short conversation with the user on this topic. Keep responses appropriate for the level.`;
    const seed = Array.isArray(topic.prompts) && topic.prompts.length > 0 ? topic.prompts[0] : "Start a conversation on this topic.";
    const context = userContext?.name ? `User name: ${userContext.name}.` : "";
    return [header, instructions, context, `Prompt: ${seed}`].filter(Boolean).join("\n");
  }
}


