export const SUBJECTS = ["physics", "chemistry", "zoology", "botany"] as const;
export const STATUS_OPTIONS = ["not-started", "in-progress", "done"] as const;
export const FONT_SCALES = ["sm", "md", "lg"] as const;

export type Subject = (typeof SUBJECTS)[number];
export type RevisionStatus = (typeof STATUS_OPTIONS)[number];
export type FontScale = (typeof FONT_SCALES)[number];

export type MockTest = {
  id: string;
  date: string;
  label: string;
  physics: number;
  chemistry: number;
  zoology: number;
  botany: number;
  total: number;
  createdAt: string;
};

export type MockTestPayload = {
  id?: string;
  date: string;
  label?: string;
  physics: number;
  chemistry: number;
  zoology: number;
  botany: number;
};

export type DayEntry = {
  date: string;
  notesHtml: string;
  fontScale: FontScale;
  mockTests: MockTest[];
};

export type DaySummary = {
  date: string;
  mockTests: MockTest[];
  notesUpdatedAt?: string;
};

export type RevisionUnit = {
  id: string;
  chapterId: string;
  title: string;
  status: RevisionStatus;
  sortOrder: number;
};

export type RevisionChapter = {
  id: string;
  subject: Subject;
  title: string;
  status: RevisionStatus;
  sortOrder: number;
  units: RevisionUnit[];
};

export type RevisionBoard = Record<Subject, RevisionChapter[]>;
