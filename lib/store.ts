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
  RevisionStatus,
  RevisionUnit,
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
};

const localStorePath = path.join(process.cwd(), "data", "local-store.json");

function emptyStore(): LocalStore {
  return {
    dailyEntries: [],
    mockTests: [],
    revisionChapters: [],
    revisionUnits: []
  };
}

async function readLocalStore() {
  try {
    const raw = await readFile(localStorePath, "utf8");
    return JSON.parse(raw) as LocalStore;
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

    return {
      id: data.id,
      chapterId: data.chapter_id,
      title: data.title,
      status: data.status as RevisionStatus,
      sortOrder: data.sort_order
    } satisfies RevisionUnit;
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
  await writeLocalStore(store);
  return unit;
}

export async function updateRevisionUnit(id: string, payload: Partial<Pick<RevisionUnit, "title" | "status" | "sortOrder">>) {
  if (payload.title !== undefined && !payload.title.trim()) {
    throw new Error("Unit title is required.");
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

    const { error } = await supabase.from("revision_units").update(updateData).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
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

  await writeLocalStore(store);
}
