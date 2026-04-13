import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  DayEntry,
  DaySummary,
  FontScale,
  MockTest,
  MockTestPayload,
  RevisionBoard,
  RevisionChapter,
  RevisionChecklist,
  RevisionChecklistItem,
  RevisionDetailEntry,
  RevisionDetailType,
  RevisionStatus,
  RevisionUnit,
  REVISION_CHECKLIST_GROUPS,
  SUBJECTS,
  Subject
} from "@/lib/types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

type LocalDailyEntry = {
  date: string;
  notesHtml: string;
  fontScale: FontScale;
  updatedAt: string;
};

type LocalStore = {
  dailyEntries: LocalDailyEntry[];
  mockTests: MockTest[];
  revisionChapters: Array<Omit<RevisionChapter, "units">>;
  revisionUnits: RevisionUnit[];
  revisionChapterNotes: LocalRevisionNote[];
  revisionUnitNotes: LocalRevisionNote[];
};

type LocalRevisionNote = {
  id: string;
  notesHtml: string;
  checklist: RevisionChecklist;
  updatedAt: string;
};

type PartialRevisionChecklist = Partial<Record<keyof RevisionChecklist, Partial<RevisionChecklistItem>[]>>;

const localStorePath = path.join(process.cwd(), "data", "local-store.json");

function emptyStore(): LocalStore {
  return {
    dailyEntries: [],
    mockTests: [],
    revisionChapters: [],
    revisionUnits: [],
    revisionChapterNotes: [],
    revisionUnitNotes: []
  };
}

function emptyRevisionChecklist(): RevisionChecklist {
  return {
    weakPoints: [],
    formulas: [],
    mistakes: []
  };
}

function normalizeChecklistItem(item: Partial<RevisionChecklistItem>) {
  return {
    id: item.id || randomUUID(),
    text: (item.text || "").trim(),
    checked: Boolean(item.checked)
  } satisfies RevisionChecklistItem;
}

function normalizeChecklist(checklist?: PartialRevisionChecklist): RevisionChecklist {
  return Object.fromEntries(
    REVISION_CHECKLIST_GROUPS.map((group) => [
      group,
      ((checklist?.[group] || []) as Partial<RevisionChecklistItem>[])
        .map((item) => normalizeChecklistItem(item))
        .filter((item) => item.text)
    ])
  ) as RevisionChecklist;
}

function normalizeRichTextHtml(html: string) {
  const trimmed = html.trim();
  const textContent = trimmed.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  return textContent ? trimmed : "";
}

function checklistSnapshot(checklist: RevisionChecklist) {
  return JSON.stringify(normalizeChecklist(checklist));
}

function hasRevisionDetailContent(notesHtml: string, checklist: RevisionChecklist) {
  return Boolean(normalizeRichTextHtml(notesHtml)) || REVISION_CHECKLIST_GROUPS.some((group) => checklist[group].length > 0);
}

function normalizeLocalStore(store: Partial<LocalStore>): LocalStore {
  return {
    dailyEntries: store.dailyEntries || [],
    mockTests: store.mockTests || [],
    revisionChapters: store.revisionChapters || [],
    revisionUnits: store.revisionUnits || [],
    revisionChapterNotes: (store.revisionChapterNotes || []).map((note) => ({
      id: note.id,
      notesHtml: note.notesHtml || "",
      checklist: normalizeChecklist(note.checklist),
      updatedAt: note.updatedAt || new Date().toISOString()
    })),
    revisionUnitNotes: (store.revisionUnitNotes || []).map((note) => ({
      id: note.id,
      notesHtml: note.notesHtml || "",
      checklist: normalizeChecklist(note.checklist),
      updatedAt: note.updatedAt || new Date().toISOString()
    }))
  };
}

async function readLocalStore() {
  try {
    const raw = await readFile(localStorePath, "utf8");
    return normalizeLocalStore(JSON.parse(raw) as Partial<LocalStore>);
  } catch {
    return emptyStore();
  }
}

async function writeLocalStore(store: LocalStore) {
  await mkdir(path.dirname(localStorePath), { recursive: true });
  await writeFile(localStorePath, JSON.stringify(store, null, 2), "utf8");
}

function sortMockTests(tests: MockTest[]) {
  return [...tests].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function buildBoard(chapters: Array<Omit<RevisionChapter, "units">>, units: RevisionUnit[]): RevisionBoard {
  const grouped: RevisionBoard = {
    physics: [],
    chemistry: [],
    zoology: [],
    botany: []
  };

  const unitsByChapter = units.reduce<Record<string, RevisionUnit[]>>((accumulator, unit) => {
    accumulator[unit.chapterId] ??= [];
    accumulator[unit.chapterId].push(unit);
    return accumulator;
  }, {});

  for (const subject of SUBJECTS) {
    grouped[subject] = chapters
      .filter((chapter) => chapter.subject === subject)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title))
      .map((chapter) => ({
        ...chapter,
        units: (unitsByChapter[chapter.id] || []).sort(
          (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title)
        )
      }));
  }

  return grouped;
}

function deriveChapterStatusFromUnits(units: RevisionUnit[]): RevisionStatus {
  if (!units.length) {
    return "not-started";
  }

  if (units.every((unit) => unit.status === "done")) {
    return "done";
  }

  if (units.every((unit) => unit.status === "not-started")) {
    return "not-started";
  }

  return "in-progress";
}

function buildRevisionDetailEntry(
  entityType: RevisionDetailType,
  entity: RevisionChapter | RevisionUnit,
  note: LocalRevisionNote | null,
  subject: Subject,
  chapterTitle?: string
): RevisionDetailEntry {
  const baseChecklist = note?.checklist || emptyRevisionChecklist();

  if (entityType === "chapter") {
    const chapter = entity as RevisionChapter;
    return {
      entityType,
      id: chapter.id,
      subject,
      title: chapter.title,
      status: chapter.status,
      notesHtml: note?.notesHtml || "",
      checklist: baseChecklist,
      updatedAt: note?.updatedAt
    };
  }

  const unit = entity as RevisionUnit;
  return {
    entityType,
    id: unit.id,
    subject,
    title: unit.title,
    status: unit.status,
    notesHtml: note?.notesHtml || "",
    checklist: baseChecklist,
    updatedAt: note?.updatedAt,
    chapterId: unit.chapterId,
    chapterTitle
  };
}

function normalizeLabel(label?: string) {
  const value = (label || "").trim();
  return value.slice(0, 10);
}

function totalFromPayload(payload: MockTestPayload) {
  return payload.physics + payload.chemistry + payload.zoology + payload.botany;
}

function normalizeMockTest(payload: MockTestPayload): MockTest {
  return {
    id: payload.id || randomUUID(),
    date: payload.date,
    label: normalizeLabel(payload.label),
    physics: payload.physics,
    chemistry: payload.chemistry,
    zoology: payload.zoology,
    botany: payload.botany,
    total: totalFromPayload(payload),
    createdAt: new Date().toISOString()
  };
}

async function getDailyEntriesLocal() {
  const store = await readLocalStore();
  return store.dailyEntries;
}

export async function getMonthSummaries(monthKey: string): Promise<DaySummary[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const start = `${monthKey}-01`;
    const endDate = new Date(`${monthKey}-01T00:00:00`);
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);

    const [{ data: tests, error: testsError }, { data: entries, error: entriesError }] = await Promise.all([
      supabase
        .from("mock_tests")
        .select("id, test_date, label, physics, chemistry, zoology, botany, total, created_at")
        .gte("test_date", start)
        .lt("test_date", end)
        .order("created_at", { ascending: true }),
      supabase
        .from("daily_entries")
        .select("entry_date, updated_at")
        .gte("entry_date", start)
        .lt("entry_date", end)
    ]);

    if (testsError) {
      throw new Error(testsError.message);
    }

    if (entriesError) {
      throw new Error(entriesError.message);
    }

    const testsByDate = (tests || []).reduce<Record<string, MockTest[]>>((accumulator, row) => {
      accumulator[row.test_date] ??= [];
      accumulator[row.test_date].push({
        id: row.id,
        date: row.test_date,
        label: row.label || "",
        physics: row.physics,
        chemistry: row.chemistry,
        zoology: row.zoology,
        botany: row.botany,
        total: row.total,
        createdAt: row.created_at
      });
      return accumulator;
    }, {});

    return Object.keys(testsByDate)
      .concat((entries || []).map((entry) => entry.entry_date))
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort()
      .map((date) => ({
        date,
        mockTests: testsByDate[date] || [],
        notesUpdatedAt: entries?.find((entry) => entry.entry_date === date)?.updated_at
      }));
  }

  const [store, dailyEntries] = await Promise.all([readLocalStore(), getDailyEntriesLocal()]);
  const dates = new Set<string>();

  for (const test of store.mockTests) {
    if (test.date.startsWith(monthKey)) {
      dates.add(test.date);
    }
  }

  for (const entry of dailyEntries) {
    if (entry.date.startsWith(monthKey)) {
      dates.add(entry.date);
    }
  }

  return [...dates].sort().map((date) => ({
    date,
    mockTests: sortMockTests(store.mockTests.filter((test) => test.date === date)),
    notesUpdatedAt: dailyEntries.find((entry) => entry.date === date)?.updatedAt
  }));
}

export async function getDayEntry(date: string): Promise<DayEntry> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const [{ data: entry, error: entryError }, { data: tests, error: testsError }] = await Promise.all([
      supabase.from("daily_entries").select("entry_date, notes_html, font_scale").eq("entry_date", date).maybeSingle(),
      supabase
        .from("mock_tests")
        .select("id, test_date, label, physics, chemistry, zoology, botany, total, created_at")
        .eq("test_date", date)
        .order("created_at", { ascending: true })
    ]);

    if (entryError) {
      throw new Error(entryError.message);
    }

    if (testsError) {
      throw new Error(testsError.message);
    }

    return {
      date,
      notesHtml: entry?.notes_html || "",
      fontScale: (entry?.font_scale as FontScale) || "md",
      mockTests: (tests || []).map((row) => ({
        id: row.id,
        date: row.test_date,
        label: row.label || "",
        physics: row.physics,
        chemistry: row.chemistry,
        zoology: row.zoology,
        botany: row.botany,
        total: row.total,
        createdAt: row.created_at
      }))
    };
  }

  const store = await readLocalStore();
  const entry = store.dailyEntries.find((item) => item.date === date);

  return {
    date,
    notesHtml: entry?.notesHtml || "",
    fontScale: entry?.fontScale || "md",
    mockTests: sortMockTests(store.mockTests.filter((test) => test.date === date))
  };
}

export async function saveDayNotes(date: string, notesHtml: string, fontScale: FontScale) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { error } = await supabase.from("daily_entries").upsert(
      {
        entry_date: date,
        notes_html: notesHtml,
        font_scale: fontScale,
        updated_at: new Date().toISOString()
      },
      { onConflict: "entry_date" }
    );

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const store = await readLocalStore();
  const existing = store.dailyEntries.find((entry) => entry.date === date);

  if (existing) {
    existing.notesHtml = notesHtml;
    existing.fontScale = fontScale;
    existing.updatedAt = new Date().toISOString();
  } else {
    store.dailyEntries.push({
      date,
      notesHtml,
      fontScale,
      updatedAt: new Date().toISOString()
    });
  }

  await writeLocalStore(store);
}

export async function upsertMockTest(payload: MockTestPayload) {
  const normalized = normalizeMockTest(payload);

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;

    if (payload.id) {
      const { data, error } = await supabase
        .from("mock_tests")
        .update({
          test_date: normalized.date,
          label: normalized.label || null,
          physics: normalized.physics,
          chemistry: normalized.chemistry,
          zoology: normalized.zoology,
          botany: normalized.botany,
          total: normalized.total
        })
        .eq("id", payload.id)
        .select("id, test_date, label, physics, chemistry, zoology, botany, total, created_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        id: data.id,
        date: data.test_date,
        label: data.label || "",
        physics: data.physics,
        chemistry: data.chemistry,
        zoology: data.zoology,
        botany: data.botany,
        total: data.total,
        createdAt: data.created_at
      } satisfies MockTest;
    }

    const { data, error } = await supabase
      .from("mock_tests")
      .insert({
        test_date: normalized.date,
        label: normalized.label || null,
        physics: normalized.physics,
        chemistry: normalized.chemistry,
        zoology: normalized.zoology,
        botany: normalized.botany,
        total: normalized.total
      })
      .select("id, test_date, label, physics, chemistry, zoology, botany, total, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      date: data.test_date,
      label: data.label || "",
      physics: data.physics,
      chemistry: data.chemistry,
      zoology: data.zoology,
      botany: data.botany,
      total: data.total,
      createdAt: data.created_at
    } satisfies MockTest;
  }

  const store = await readLocalStore();

  if (payload.id) {
    const existing = store.mockTests.find((test) => test.id === payload.id);

    if (!existing) {
      throw new Error("Mock test not found.");
    }

    existing.date = normalized.date;
    existing.label = normalized.label;
    existing.physics = normalized.physics;
    existing.chemistry = normalized.chemistry;
    existing.zoology = normalized.zoology;
    existing.botany = normalized.botany;
    existing.total = normalized.total;

    await writeLocalStore(store);
    return existing;
  }

  store.mockTests.push(normalized);
  await writeLocalStore(store);
  return normalized;
}

export async function deleteMockTest(id: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { error } = await supabase.from("mock_tests").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const store = await readLocalStore();
  const nextTests = store.mockTests.filter((test) => test.id !== id);

  if (nextTests.length === store.mockTests.length) {
    throw new Error("Mock test not found.");
  }

  store.mockTests = nextTests;
  await writeLocalStore(store);
}

export async function getRevisionBoard(): Promise<RevisionBoard> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const [{ data: chapters, error: chaptersError }, { data: units, error: unitsError }] = await Promise.all([
      supabase.from("revision_chapters").select("id, subject, title, status, sort_order").order("sort_order", { ascending: true }),
      supabase.from("revision_units").select("id, chapter_id, title, status, sort_order").order("sort_order", { ascending: true })
    ]);

    if (chaptersError) {
      throw new Error(chaptersError.message);
    }

    if (unitsError) {
      throw new Error(unitsError.message);
    }

    return buildBoard(
      (chapters || []).map((chapter) => ({
        id: chapter.id,
        subject: chapter.subject as Subject,
        title: chapter.title,
        status: chapter.status as RevisionStatus,
        sortOrder: chapter.sort_order
      })),
      (units || []).map((unit) => ({
        id: unit.id,
        chapterId: unit.chapter_id,
        title: unit.title,
        status: unit.status as RevisionStatus,
        sortOrder: unit.sort_order
      }))
    );
  }

  const store = await readLocalStore();
  return buildBoard(store.revisionChapters, store.revisionUnits);
}

function getRevisionNoteTable(entityType: RevisionDetailType) {
  return entityType === "chapter" ? "revision_chapter_notes" : "revision_unit_notes";
}

function isMissingSupabaseTableError(message: string | undefined, table: string) {
  if (!message) {
    return false;
  }

  return (
    message.includes(`relation "${table}" does not exist`) ||
    message.includes(`relation "public.${table}" does not exist`) ||
    message.includes(`Could not find the table 'public.${table}' in the schema cache`)
  );
}

function getRevisionNoteKey(entityType: RevisionDetailType) {
  return entityType === "chapter" ? "chapter_id" : "unit_id";
}

function getLocalRevisionNotes(store: LocalStore, entityType: RevisionDetailType) {
  return entityType === "chapter" ? store.revisionChapterNotes : store.revisionUnitNotes;
}

export async function getRevisionDetail(entityType: RevisionDetailType, id: string): Promise<RevisionDetailEntry> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const noteTable = getRevisionNoteTable(entityType);

    if (entityType === "chapter") {
      const { data: chapter, error: chapterError } = await supabase
        .from("revision_chapters")
        .select("id, subject, title, status")
        .eq("id", id)
        .maybeSingle();

      if (chapterError) {
        throw new Error(chapterError.message);
      }

      if (!chapter) {
        throw new Error("Chapter not found.");
      }

      const { data: note, error: noteError } = await supabase
        .from("revision_chapter_notes")
        .select("notes_html, weak_points, formulas, mistakes, updated_at")
        .eq("chapter_id", id)
        .maybeSingle();

      if (noteError && !isMissingSupabaseTableError(noteError.message, noteTable)) {
        throw new Error(noteError.message);
      }

      return {
        entityType,
        id: chapter.id,
        subject: chapter.subject as Subject,
        title: chapter.title,
        status: chapter.status as RevisionStatus,
        notesHtml: note?.notes_html || "",
        checklist: normalizeChecklist({
          weakPoints: (note?.weak_points as Partial<RevisionChecklistItem>[] | null) || [],
          formulas: (note?.formulas as Partial<RevisionChecklistItem>[] | null) || [],
          mistakes: (note?.mistakes as Partial<RevisionChecklistItem>[] | null) || []
        }),
        updatedAt: note?.updated_at
      };
    }

    const { data: unit, error: unitError } = await supabase
      .from("revision_units")
      .select("id, chapter_id, title, status")
      .eq("id", id)
      .maybeSingle();

    if (unitError) {
      throw new Error(unitError.message);
    }

    if (!unit) {
      throw new Error("Unit not found.");
    }

    const { data: chapter, error: chapterError } = await supabase
      .from("revision_chapters")
      .select("id, subject, title")
      .eq("id", unit.chapter_id)
      .maybeSingle();

    if (chapterError) {
      throw new Error(chapterError.message);
    }

    if (!chapter) {
      throw new Error("Chapter not found.");
    }

    const { data: note, error: noteError } = await supabase
      .from("revision_unit_notes")
      .select("notes_html, weak_points, formulas, mistakes, updated_at")
      .eq("unit_id", id)
      .maybeSingle();

    if (noteError && !isMissingSupabaseTableError(noteError.message, noteTable)) {
      throw new Error(noteError.message);
    }

    return {
      entityType,
      id: unit.id,
      subject: chapter.subject as Subject,
      title: unit.title,
      status: unit.status as RevisionStatus,
      notesHtml: note?.notes_html || "",
      checklist: normalizeChecklist({
        weakPoints: (note?.weak_points as Partial<RevisionChecklistItem>[] | null) || [],
        formulas: (note?.formulas as Partial<RevisionChecklistItem>[] | null) || [],
        mistakes: (note?.mistakes as Partial<RevisionChecklistItem>[] | null) || []
      }),
      updatedAt: note?.updated_at,
      chapterId: chapter.id,
      chapterTitle: chapter.title
    };
  }

  const store = await readLocalStore();

  if (entityType === "chapter") {
    const chapter = store.revisionChapters.find((item) => item.id === id);

    if (!chapter) {
      throw new Error("Chapter not found.");
    }

    const note = store.revisionChapterNotes.find((item) => item.id === id) || null;

    return buildRevisionDetailEntry(entityType, { ...chapter, units: [] }, note, chapter.subject);
  }

  const unit = store.revisionUnits.find((item) => item.id === id);

  if (!unit) {
    throw new Error("Unit not found.");
  }

  const chapter = store.revisionChapters.find((item) => item.id === unit.chapterId);

  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  const note = store.revisionUnitNotes.find((item) => item.id === id) || null;

  return buildRevisionDetailEntry(entityType, unit, note, chapter.subject, chapter.title);
}

export async function saveRevisionDetail(
  entityType: RevisionDetailType,
  id: string,
  payload: { notesHtml: string; checklist: RevisionChecklist }
) {
  const checklist = normalizeChecklist(payload.checklist);
  const notesHtml = normalizeRichTextHtml(payload.notesHtml || "");
  const updatedAt = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const noteKey = getRevisionNoteKey(entityType);
    const table = getRevisionNoteTable(entityType);
    const { data: existingNote, error: existingError } = await supabase
      .from(table)
      .select("notes_html, weak_points, formulas, mistakes, updated_at")
      .eq(noteKey, id)
      .maybeSingle();

    if (existingError && !isMissingSupabaseTableError(existingError.message, table)) {
      throw new Error(existingError.message);
    }

    const existingChecklist = normalizeChecklist({
      weakPoints: (existingNote?.weak_points as Partial<RevisionChecklistItem>[] | null) || [],
      formulas: (existingNote?.formulas as Partial<RevisionChecklistItem>[] | null) || [],
      mistakes: (existingNote?.mistakes as Partial<RevisionChecklistItem>[] | null) || []
    });
    const existingNotesHtml = normalizeRichTextHtml(existingNote?.notes_html || "");

    if (!existingNote && !hasRevisionDetailContent(notesHtml, checklist)) {
      return { updatedAt: undefined };
    }

    if (
      existingNote &&
      existingNotesHtml === notesHtml &&
      checklistSnapshot(existingChecklist) === checklistSnapshot(checklist)
    ) {
      return { updatedAt: existingNote.updated_at };
    }

    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          [noteKey]: id,
          notes_html: notesHtml,
          weak_points: checklist.weakPoints,
          formulas: checklist.formulas,
          mistakes: checklist.mistakes,
          updated_at: updatedAt
        },
        { onConflict: noteKey }
      )
      .select("updated_at")
      .single();

    if (error) {
      if (isMissingSupabaseTableError(error.message, table)) {
        throw new Error("Revision note tables are missing in Supabase. Run the latest supabase/schema.sql and try again.");
      }

      throw new Error(error.message);
    }

    return { updatedAt: data.updated_at };
  }

  const store = await readLocalStore();
  const entityExists =
    entityType === "chapter"
      ? store.revisionChapters.some((item) => item.id === id)
      : store.revisionUnits.some((item) => item.id === id);

  if (!entityExists) {
    throw new Error(`${entityType === "chapter" ? "Chapter" : "Unit"} not found.`);
  }

  const noteCollection = getLocalRevisionNotes(store, entityType);
  const existing = noteCollection.find((item) => item.id === id);

  if (!existing && !hasRevisionDetailContent(notesHtml, checklist)) {
    return { updatedAt: undefined };
  }

  if (existing && normalizeRichTextHtml(existing.notesHtml) === notesHtml && checklistSnapshot(existing.checklist) === checklistSnapshot(checklist)) {
    return { updatedAt: existing.updatedAt };
  }

  if (existing) {
    existing.notesHtml = notesHtml;
    existing.checklist = checklist;
    existing.updatedAt = updatedAt;
  } else {
    noteCollection.push({
      id,
      notesHtml,
      checklist,
      updatedAt
    });
  }

  await writeLocalStore(store);
  return { updatedAt };
}

export async function createRevisionChapter(subject: Subject, title: string) {
  const cleanedTitle = title.trim();

  if (!cleanedTitle) {
    throw new Error("Chapter title is required.");
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const board = await getRevisionBoard();
    const sortOrder = board[subject].length;
    const { data, error } = await supabase
      .from("revision_chapters")
      .insert({ subject, title: cleanedTitle, status: "not-started", sort_order: sortOrder })
      .select("id, subject, title, status, sort_order")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      subject: data.subject as Subject,
      title: data.title,
      status: data.status as RevisionStatus,
      sortOrder: data.sort_order,
      units: []
    } satisfies RevisionChapter;
  }

  const store = await readLocalStore();
  const chapter = {
    id: randomUUID(),
    subject,
    title: cleanedTitle,
    status: "not-started" as RevisionStatus,
    sortOrder: store.revisionChapters.filter((item) => item.subject === subject).length
  };
  store.revisionChapters.push(chapter);
  await writeLocalStore(store);

  return { ...chapter, units: [] };
}

export async function updateRevisionChapter(
  id: string,
  payload: Partial<Pick<RevisionChapter, "title" | "status" | "sortOrder">>
) {
  if (payload.title !== undefined && !payload.title.trim()) {
    throw new Error("Chapter title is required.");
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const updateData: Record<string, string | number> = {};

    if (payload.title !== undefined) {
      updateData.title = payload.title.trim();
    }

    if (payload.status !== undefined) {
      updateData.status = payload.status;
    }

    if (payload.sortOrder !== undefined) {
      updateData.sort_order = payload.sortOrder;
    }

    const { error } = await supabase.from("revision_chapters").update(updateData).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const store = await readLocalStore();
  const chapter = store.revisionChapters.find((item) => item.id === id);

  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  if (payload.title !== undefined) {
    chapter.title = payload.title.trim();
  }

  if (payload.status !== undefined) {
    chapter.status = payload.status;
  }

  if (payload.sortOrder !== undefined) {
    chapter.sortOrder = payload.sortOrder;
  }

  await writeLocalStore(store);
}

export async function deleteRevisionChapter(id: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { error } = await supabase.from("revision_chapters").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const store = await readLocalStore();
  const chapterExists = store.revisionChapters.some((item) => item.id === id);

  if (!chapterExists) {
    throw new Error("Chapter not found.");
  }

  const unitIds = store.revisionUnits.filter((item) => item.chapterId === id).map((item) => item.id);
  store.revisionChapters = store.revisionChapters.filter((item) => item.id !== id);
  store.revisionUnits = store.revisionUnits.filter((item) => item.chapterId !== id);
  store.revisionChapterNotes = store.revisionChapterNotes.filter((item) => item.id !== id);
  store.revisionUnitNotes = store.revisionUnitNotes.filter((item) => !unitIds.includes(item.id));
  await writeLocalStore(store);
}

export async function createRevisionUnit(chapterId: string, title: string) {
  const cleanedTitle = title.trim();

  if (!cleanedTitle) {
    throw new Error("Unit title is required.");
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { count, error: countError } = await supabase
      .from("revision_units")
      .select("*", { count: "exact", head: true })
      .eq("chapter_id", chapterId);

    if (countError) {
      throw new Error(countError.message);
    }

    const { data, error } = await supabase
      .from("revision_units")
      .insert({
        chapter_id: chapterId,
        title: cleanedTitle,
        status: "not-started",
        sort_order: count || 0
      })
      .select("id, chapter_id, title, status, sort_order")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const unit = {
      id: data.id,
      chapterId: data.chapter_id,
      title: data.title,
      status: data.status as RevisionStatus,
      sortOrder: data.sort_order
    } satisfies RevisionUnit;

    const { data: units, error: unitsError } = await supabase
      .from("revision_units")
      .select("id, chapter_id, title, status, sort_order")
      .eq("chapter_id", chapterId)
      .order("sort_order", { ascending: true });

    if (unitsError) {
      throw new Error(unitsError.message);
    }

    const chapterStatus = deriveChapterStatusFromUnits(
      (units || []).map((item) => ({
        id: item.id,
        chapterId: item.chapter_id,
        title: item.title,
        status: item.status as RevisionStatus,
        sortOrder: item.sort_order
      }))
    );

    const { error: chapterError } = await supabase
      .from("revision_chapters")
      .update({ status: chapterStatus })
      .eq("id", chapterId);

    if (chapterError) {
      throw new Error(chapterError.message);
    }

    return { unit, chapterId, chapterStatus };
  }

  const store = await readLocalStore();
  const unit = {
    id: randomUUID(),
    chapterId,
    title: cleanedTitle,
    status: "not-started" as RevisionStatus,
    sortOrder: store.revisionUnits.filter((item) => item.chapterId === chapterId).length
  };
  store.revisionUnits.push(unit);
  const chapter = store.revisionChapters.find((item) => item.id === chapterId);

  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  chapter.status = deriveChapterStatusFromUnits(store.revisionUnits.filter((item) => item.chapterId === chapterId));
  await writeLocalStore(store);
  return { unit, chapterId, chapterStatus: chapter.status };
}

export async function updateRevisionUnit(id: string, payload: Partial<Pick<RevisionUnit, "title" | "status" | "sortOrder">>) {
  if (payload.title !== undefined && !payload.title.trim()) {
    throw new Error("Unit title is required.");
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { data: existingUnit, error: existingUnitError } = await supabase
      .from("revision_units")
      .select("chapter_id")
      .eq("id", id)
      .single();

    if (existingUnitError || !existingUnit) {
      throw new Error(existingUnitError?.message || "Unit not found.");
    }

    const updateData: Record<string, string | number> = {};

    if (payload.title !== undefined) {
      updateData.title = payload.title.trim();
    }

    if (payload.status !== undefined) {
      updateData.status = payload.status;
    }

    if (payload.sortOrder !== undefined) {
      updateData.sort_order = payload.sortOrder;
    }

    const { error } = await supabase.from("revision_units").update(updateData).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const { data: units, error: unitsError } = await supabase
      .from("revision_units")
      .select("id, chapter_id, title, status, sort_order")
      .eq("chapter_id", existingUnit.chapter_id)
      .order("sort_order", { ascending: true });

    if (unitsError) {
      throw new Error(unitsError.message);
    }

    const chapterStatus = deriveChapterStatusFromUnits(
      (units || []).map((item) => ({
        id: item.id,
        chapterId: item.chapter_id,
        title: item.title,
        status: item.status as RevisionStatus,
        sortOrder: item.sort_order
      }))
    );

    const { error: chapterError } = await supabase
      .from("revision_chapters")
      .update({ status: chapterStatus })
      .eq("id", existingUnit.chapter_id);

    if (chapterError) {
      throw new Error(chapterError.message);
    }

    return { chapterId: existingUnit.chapter_id, chapterStatus };
  }

  const store = await readLocalStore();
  const unit = store.revisionUnits.find((item) => item.id === id);

  if (!unit) {
    throw new Error("Unit not found.");
  }

  if (payload.title !== undefined) {
    unit.title = payload.title.trim();
  }

  if (payload.status !== undefined) {
    unit.status = payload.status;
  }

  if (payload.sortOrder !== undefined) {
    unit.sortOrder = payload.sortOrder;
  }

  const chapter = store.revisionChapters.find((item) => item.id === unit.chapterId);

  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  chapter.status = deriveChapterStatusFromUnits(store.revisionUnits.filter((item) => item.chapterId === unit.chapterId));
  await writeLocalStore(store);
  return { chapterId: unit.chapterId, chapterStatus: chapter.status };
}

export async function deleteRevisionUnit(id: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { data: existingUnit, error: existingUnitError } = await supabase
      .from("revision_units")
      .select("chapter_id")
      .eq("id", id)
      .single();

    if (existingUnitError || !existingUnit) {
      throw new Error(existingUnitError?.message || "Unit not found.");
    }

    const { error } = await supabase.from("revision_units").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const { data: units, error: unitsError } = await supabase
      .from("revision_units")
      .select("id, chapter_id, title, status, sort_order")
      .eq("chapter_id", existingUnit.chapter_id)
      .order("sort_order", { ascending: true });

    if (unitsError) {
      throw new Error(unitsError.message);
    }

    const chapterStatus = deriveChapterStatusFromUnits(
      (units || []).map((item) => ({
        id: item.id,
        chapterId: item.chapter_id,
        title: item.title,
        status: item.status as RevisionStatus,
        sortOrder: item.sort_order
      }))
    );

    const { error: chapterError } = await supabase
      .from("revision_chapters")
      .update({ status: chapterStatus })
      .eq("id", existingUnit.chapter_id);

    if (chapterError) {
      throw new Error(chapterError.message);
    }

    return { chapterId: existingUnit.chapter_id, chapterStatus };
  }

  const store = await readLocalStore();
  const unit = store.revisionUnits.find((item) => item.id === id);

  if (!unit) {
    throw new Error("Unit not found.");
  }

  store.revisionUnits = store.revisionUnits.filter((item) => item.id !== id);
  store.revisionUnitNotes = store.revisionUnitNotes.filter((item) => item.id !== id);

  const chapter = store.revisionChapters.find((item) => item.id === unit.chapterId);

  if (chapter) {
    chapter.status = deriveChapterStatusFromUnits(store.revisionUnits.filter((item) => item.chapterId === unit.chapterId));
  }

  await writeLocalStore(store);
  return { chapterId: unit.chapterId, chapterStatus: chapter?.status || "not-started" };
}
