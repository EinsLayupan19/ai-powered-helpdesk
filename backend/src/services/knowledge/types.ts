export type KnowledgeDocument = {
  id: string;
  title: string;
  category: string;
  content: string;
  source: string;
  schedule?: {
    section: string;
    entries: ScheduleEntry[];
  };
};

export type ScheduleEntry = {
  section: string;
  day: string;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  room: string;
};

export type ScheduleMatch = {
  request: "full" | "specific";
  section: string | null;
  entries: ScheduleEntry[];
};

export type KnowledgeResult = {
  document: KnowledgeDocument;
  relevance: number;
};

export interface KnowledgeService {
  search(query: string): Promise<KnowledgeResult[]>;
  findSchedule(query: string): Promise<ScheduleMatch | null>;
}
