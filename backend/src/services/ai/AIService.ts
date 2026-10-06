export type ConversationTurn = { role: "user" | "assistant"; content: string };

export type GenerateAnswerInput = {
  message: string;
  history?: ConversationTurn[];
};

export interface AIService {
  generateAnswer(input: GenerateAnswerInput): Promise<string>;
}
