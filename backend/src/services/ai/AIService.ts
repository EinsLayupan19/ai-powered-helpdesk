export type ConversationTurn = { role: "user" | "assistant"; content: string };

export type GenerateAnswerInput = {
  message: string;
  history?: ConversationTurn[];
  verifiedContext?: Array<{
    id: string;
    title: string;
    category: string;
    content: string;
  }>;
};

export interface AIService {
  generateAnswer(input: GenerateAnswerInput): Promise<string>;
}
