import { AuthRequiredError, CliError } from '@jackwener/opencli/errors';
import type { CourseDetailRow, ScheduleCommandArgs, ScheduleEntry, SchedulePage, ScheduleRow, WeekExpression } from './types.js';

const SCHEDULE_URL = 'http://bkjw.njust.edu.cn/njlgdx/xskb/xskb_list.do?Ves632DSdyV=NEW_XSD_PYGL';
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CHINESE_WEEKDAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

type OpenCliPage = {
  goto: (url: string) => Promise<unknown>;
  evaluate: (script: string) => Promise<unknown>;
};

type ParsedCellRecord = {
  course: string;
  teacher: string;
  classroom: string;
  weekText: string;
  groupName: string;
};

export async function fetchScheduleHtml(
  page: OpenCliPage,
  { term, week }: { term?: string; week?: string | number | null } = {},
): Promise<string> {
  await page.goto(SCHEDULE_URL);
  const body = new URLSearchParams();
  if (term) {
    body.set('xnxq01id', String(term));
  }
  if (week != null && week !== '') {
    body.set('zc', String(week));
  }

  const html = await page.evaluate(`
    (async () => {
      const response = await fetch(${JSON.stringify(SCHEDULE_URL)}, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: ${JSON.stringify(body.toString())}
      });
      return await response.text();
    })()
  `);

  if (typeof html !== 'string' || !html.trim()) {
    throw new CliError(
      'FETCH_ERROR',
      'NJUST schedule request returned empty HTML',
      'Retry after opening the 教务系统课表页面 in a logged-in browser session.',
    );
  }

  if (!html.includes('id="kbtable"')) {
    if (isAuthLikeHtml(html)) {
      throw new AuthRequiredError('bkjw.njust.edu.cn', 'NJUST schedule requires an active logged-in browser session');
    }
    throw new CliError(
      'PARSE_ERROR',
      'NJUST schedule page did not contain kbtable',
      'The 教务系统 page structure may have changed.',
    );
  }

  return html;
}

export function parseSchedulePage(html: string): SchedulePage {
  const selectedTerm = extractSelectedTerm(html);
  const termOptions = extractSelectOptions(html, 'xnxq01id');
  const weekOptions = extractSelectOptions(html, 'zc')
    .map(({ value }) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const courseDetails = parseCourseDetailTable(html);
  const entries = parseKbTable(html, courseDetails);

  return {
    selectedTerm,
    termOptions,
    weekOptions,
    entries,
  };
}

export function filterScheduleEntries(entries: ScheduleEntry[], args: Pick<ScheduleCommandArgs, 'week' | 'day' | 'keyword'>): ScheduleEntry[] {
  const dayIndex = normalizeDayFilter(args.day);
  const targetWeek = normalizeWeekFilter(args.week);
  const normalizedKeyword = typeof args.keyword === 'string' ? args.keyword.trim().toLowerCase() : '';

  return entries.filter((entry) => {
    if (dayIndex != null && entry.weekday !== dayIndex) {
      return false;
    }
    if (targetWeek != null && !matchesWeek(entry.weekExpr, targetWeek)) {
      return false;
    }
    if (normalizedKeyword) {
      const haystack = [entry.course, entry.teacher, entry.classroom, entry.groupName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedKeyword)) {
        return false;
      }
    }
    return true;
  });
}

export function formatScheduleRows(entries: ScheduleEntry[]): ScheduleRow[] {
  return entries
    .slice()
    .sort((a, b) => {
      if (a.weekday !== b.weekday) {
        return a.weekday - b.weekday;
      }
      return compareSections(a.sections, b.sections);
    })
    .map((entry) => ({
      weekday: entry.weekdayLabel,
      sections: entry.sections || `Block ${entry.blockIndex}`,
      course: entry.groupName ? `${entry.course} [${entry.groupName}]` : entry.course,
      teacher: entry.teacher || '',
      classroom: entry.classroom || '',
      time: entry.timeText || '',
      weeks: entry.weekText || '',
    }));
}

export function resolveRequestedWeek(rawWeek: string | number | undefined, parsedPage: SchedulePage, rawTermStart?: string): number | null {
  const normalized = rawWeek == null || rawWeek === '' ? 'current' : String(rawWeek).trim().toLowerCase();
  if (normalized === 'all') {
    return null;
  }
  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }
  if (normalized !== 'current' && normalized !== 'next') {
    throw new CliError('ARGUMENT', `Invalid week "${rawWeek}"`, 'Use current, next, all, or a numeric week such as --week 8.');
  }

  const termStart = resolveTermStart(parsedPage.selectedTerm, rawTermStart);
  if (!termStart) {
    throw new CliError('CONFIG', 'Unable to determine the current teaching week', 'Pass --term-start YYYY-MM-DD or set NJUST_TERM_START.');
  }

  const currentWeek = calcWeekNumber(termStart, new Date());
  return normalized === 'next' ? currentWeek + 1 : currentWeek;
}

export function resolveRequestedTerm(rawTerm: string | undefined, parsedPage: SchedulePage): string {
  if (rawTerm) {
    return String(rawTerm);
  }
  if (parsedPage.selectedTerm) {
    return parsedPage.selectedTerm;
  }
  return parsedPage.termOptions[0]?.value ?? '';
}

export function resolveTermStart(term: string, rawTermStart?: string): Date | null {
  const explicit = String(rawTermStart ?? process.env.NJUST_TERM_START ?? '').trim();
  if (explicit) {
    const parsed = parseDateOnly(explicit);
    if (!parsed) {
      throw new CliError('ARGUMENT', `Invalid term start date: ${explicit}`, 'Use YYYY-MM-DD, for example --term-start 2026-02-23.');
    }
    return parsed;
  }
  return inferTermStart(term);
}

export function inferTermStart(term: string): Date | null {
  const match = String(term ?? '').match(/^(\d{4})-(\d{4})-(\d)$/);
  if (!match) {
    return null;
  }

  const [, startYear, endYear, semester] = match;
  if (semester === '1') {
    return parseDateOnly(`${startYear}-09-01`);
  }
  if (semester === '2') {
    return parseDateOnly(`${endYear}-02-24`);
  }
  if (semester === '3') {
    return parseDateOnly(`${endYear}-07-01`);
  }
  return null;
}

export function calcWeekNumber(termStart: Date, currentDate: Date): number {
  const start = startOfDay(termStart);
  const current = startOfDay(currentDate);
  const diffDays = Math.floor((current.getTime() - start.getTime()) / 86400000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export function normalizeDayFilter(day: string | undefined): number | null {
  if (day == null || day === '') {
    return null;
  }

  const normalized = String(day).trim().toLowerCase();
  if (normalized === 'today') {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
  }

  const mapping: Record<string, number> = {
    mon: 1,
    monday: 1,
    tue: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
    sun: 7,
    sunday: 7,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
  };

  if (!(normalized in mapping)) {
    throw new CliError('ARGUMENT', `Invalid day "${day}"`, 'Use today, mon..sun, or 1..7.');
  }

  return mapping[normalized];
}

export function parseWeekExpression(raw: string): WeekExpression | null {
  const text = decodeHtml(stripTags(String(raw ?? ''))).replace(/\s+/g, '');
  if (!text) {
    return null;
  }

  const odd = /单/.test(text);
  const even = /双/.test(text);
  const ranges = [...text.matchAll(/(\d+)(?:-(\d+))?/g)]
    .map((match) => ({
      start: Number(match[1]),
      end: Number(match[2] ?? match[1]),
    }))
    .filter((range) => Number.isInteger(range.start) && Number.isInteger(range.end));

  return {
    raw: text,
    ranges,
    odd,
    even,
  };
}

export function matchesWeek(weekExpr: WeekExpression | null, week: number | null): boolean {
  if (!weekExpr || week == null) {
    return true;
  }
  if (weekExpr.odd && week % 2 === 0) {
    return false;
  }
  if (weekExpr.even && week % 2 === 1) {
    return false;
  }
  if (!weekExpr.ranges.length) {
    return true;
  }
  return weekExpr.ranges.some((range) => week >= range.start && week <= range.end);
}

export function normalizeWeekFilter(week: string | number | undefined): number | null {
  if (week == null || week === '') {
    return null;
  }
  const text = String(week).trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }
  return Number(text);
}

function parseKbTable(html: string, courseDetails: CourseDetailRow[]): ScheduleEntry[] {
  const tableHtml = extractTableHtml(html, 'kbtable');
  if (!tableHtml) {
    return [];
  }

  const rowMatches = [...tableHtml.matchAll(/<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi)];
  if (rowMatches.length < 2) {
    return [];
  }

  const entries: ScheduleEntry[] = [];
  const weekdayLabels = extractWeekdayHeaders(rowMatches[0][1]);

  for (let rowIndex = 1; rowIndex < rowMatches.length; rowIndex += 1) {
    const rowHtml = rowMatches[rowIndex][1];
    const cells = [...rowHtml.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);

    for (let weekday = 1; weekday <= Math.min(7, cells.length); weekday += 1) {
      const cellHtml = cells[weekday - 1];
      const detailedDivs = [...cellHtml.matchAll(/<div[^>]*class="kbcontent"[^>]*>([\s\S]*?)<\/div>/gi)];
      for (const divMatch of detailedDivs) {
        const records = parseCellDetail(divMatch[1]);
        for (const record of records) {
          if (!record.course) {
            continue;
          }
          const detail = matchCourseDetail(courseDetails, record, weekday);
          entries.push({
            blockIndex: rowIndex,
            weekday,
            weekdayLabel: WEEKDAY_LABELS[weekday - 1],
            weekdayText: weekdayLabels[weekday - 1] ?? CHINESE_WEEKDAYS[weekday - 1],
            course: record.course,
            groupName: record.groupName || '',
            teacher: record.teacher || detail?.teacher || '',
            classroom: record.classroom || detail?.classroom || '',
            sections: detail?.sections || '',
            timeText: detail?.sections || '',
            weekText: record.weekText || '',
            weekExpr: parseWeekExpression(record.weekText),
          });
        }
      }
    }
  }

  return dedupeEntries(entries);
}

function parseCellDetail(cellHtml: string): ParsedCellRecord[] {
  const records = splitCellRecords(cellHtml);
  return records.map((recordHtml) => {
    const normalized = recordHtml.replace(/<br\s*\/?>/gi, '\n');
    const course = decodeHtml(stripTags(normalized.split('\n')[0] ?? '')).trim();
    const fonts = [...recordHtml.matchAll(/<font[^>]*title=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/font>/gi)];

    let teacher = '';
    let classroom = '';
    let weekText = '';
    let groupName = '';

    for (const [, titleRaw, valueRaw] of fonts) {
      const title = decodeHtml(titleRaw).trim();
      const value = decodeHtml(stripTags(valueRaw)).trim();
      if (!value) {
        continue;
      }
      if (title.includes('老师')) {
        teacher = value;
      } else if (title.includes('教室')) {
        classroom = value;
      } else if (title.includes('周次')) {
        weekText = value;
      } else if (title.includes('分组')) {
        groupName = value;
      }
    }

    return { course, teacher, classroom, weekText, groupName };
  });
}

function splitCellRecords(cellHtml: string): string[] {
  return cellHtml
    .split(/-{10,}/)
    .map((part) => part.trim())
    .filter((part) => /[^\s]/.test(stripTags(part).replace(/&nbsp;/g, '')));
}

function parseCourseDetailTable(html: string): CourseDetailRow[] {
  const tableHtml = extractTableHtml(html, 'dataList');
  if (!tableHtml) {
    return [];
  }

  const rowMatches = [...tableHtml.matchAll(/<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi)];
  if (rowMatches.length <= 1) {
    return [];
  }

  const details: CourseDetailRow[] = [];
  for (let index = 1; index < rowMatches.length; index += 1) {
    const cells = [...rowMatches[index][1].matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
    if (cells.length < 8) {
      continue;
    }
    const course = decodeHtml(stripTags(cells[3])).trim();
    const teacher = decodeHtml(stripTags(cells[4])).trim();
    const timeParts = splitHtmlLines(cells[5]).map(parseTimeOccurrence).filter(Boolean) as Array<{ weekday: number; sections: string }>;
    const classroomParts = splitHtmlComma(cells[7]);

    timeParts.forEach((occurrence, occurrenceIndex) => {
      details.push({
        course,
        teacher,
        weekday: occurrence.weekday,
        sections: occurrence.sections,
        classroom: classroomParts[occurrenceIndex] ?? classroomParts[0] ?? '',
      });
    });
  }

  return details;
}

function matchCourseDetail(details: CourseDetailRow[], record: ParsedCellRecord, weekday: number): CourseDetailRow | undefined {
  const exact = details.find((item) => item.course === record.course && item.teacher === record.teacher && item.weekday === weekday);
  if (exact) {
    return exact;
  }
  const sameTeacher = details.find((item) => item.course === record.course && item.teacher === record.teacher);
  if (sameTeacher) {
    return sameTeacher;
  }
  return details.find((item) => item.course === record.course && item.weekday === weekday);
}

function parseTimeOccurrence(text: string): { weekday: number; sections: string } | null {
  const normalized = decodeHtml(stripTags(text)).replace(/\s+/g, '');
  if (!normalized) {
    return null;
  }
  const weekday = CHINESE_WEEKDAYS.findIndex((label) => normalized.includes(label)) + 1;
  if (!weekday) {
    return null;
  }
  const sectionsMatch = normalized.match(/\((\d{2}-\d{2})小节\)/);
  return {
    weekday,
    sections: sectionsMatch?.[1] ?? '',
  };
}

function extractTableHtml(html: string, id: string): string {
  const match = html.match(new RegExp(`<table[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/table>`, 'i'));
  return match?.[1] ?? '';
}

function extractWeekdayHeaders(headerRowHtml: string): string[] {
  return [...headerRowHtml.matchAll(/<th[\s\S]*?>([\s\S]*?)<\/th>/gi)]
    .slice(1)
    .map((match) => decodeHtml(stripTags(match[1])).trim());
}

function extractSelectedTerm(html: string): string {
  const selectHtml = extractSelectHtml(html, 'xnxq01id');
  if (!selectHtml) {
    return '';
  }
  const selected = selectHtml.match(/<option[^>]*value="([^"]+)"[^>]*selected/i);
  return selected?.[1] ?? '';
}

function extractSelectOptions(html: string, id: string): Array<{ value: string; label: string }> {
  const selectHtml = extractSelectHtml(html, id);
  if (!selectHtml) {
    return [];
  }
  return [...selectHtml.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)].map((match) => ({
    value: decodeHtml(match[1]).trim(),
    label: decodeHtml(stripTags(match[2])).trim(),
  }));
}

function extractSelectHtml(html: string, id: string): string {
  const match = html.match(new RegExp(`<select[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/select>`, 'i'));
  return match?.[1] ?? '';
}

function splitHtmlLines(html: string): string[] {
  return html
    .split(/<br\s*\/?>/i)
    .map((part) => decodeHtml(stripTags(part)).trim())
    .filter(Boolean);
}

function splitHtmlComma(html: string): string[] {
  return decodeHtml(stripTags(html))
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripTags(value: string): string {
  return String(value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .trim();
}

function decodeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isAuthLikeHtml(html: string): boolean {
  return /统一身份认证|用户登录|LoginToXk|登录/.test(html) && !html.includes('id="kbtable"');
}

function compareSections(left: string, right: string): number {
  const leftStart = Number(String(left).split('-')[0]) || 999;
  const rightStart = Number(String(right).split('-')[0]) || 999;
  if (leftStart !== rightStart) {
    return leftStart - rightStart;
  }
  return String(left).localeCompare(String(right));
}

function parseDateOnly(text: string): Date | null {
  const match = String(text).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dedupeEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = [
      entry.weekday,
      entry.sections,
      entry.course,
      entry.groupName,
      entry.teacher,
      entry.classroom,
      entry.weekText,
    ].join('|');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

