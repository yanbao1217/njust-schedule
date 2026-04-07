import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  fetchScheduleHtml,
  filterScheduleEntries,
  formatScheduleRows,
  parseSchedulePage,
  resolveRequestedTerm,
  resolveRequestedWeek,
} from './utils.js';
import type { ScheduleCommandArgs } from './types.js';

cli({
  site: 'njust',
  name: 'schedule',
  description: 'Query NJUST weekly schedule',
  domain: 'bkjw.njust.edu.cn',
  strategy: Strategy.COOKIE,
  timeoutSeconds: 60,
  args: [
    { name: 'week', type: 'string', default: 'current', help: 'current | next | all | week number' },
    { name: 'day', type: 'string', help: 'today | mon | tue | wed | thu | fri | sat | sun' },
    { name: 'term', type: 'string', help: 'Academic term, e.g. 2025-2026-2' },
    { name: 'term-start', type: 'string', help: 'Override term start date, e.g. 2026-02-23' },
    { name: 'keyword', type: 'string', help: 'Filter by course / teacher / classroom keyword' },
  ],
  columns: ['weekday', 'sections', 'course', 'teacher', 'classroom', 'time', 'weeks'],
  func: async (page, kwargs: ScheduleCommandArgs) => {
    const initialHtml = await fetchScheduleHtml(page);
    const initialParsed = parseSchedulePage(initialHtml);
    const term = resolveRequestedTerm(kwargs.term, initialParsed);
    const targetWeek = resolveRequestedWeek(kwargs.week, initialParsed, kwargs['term-start']);

    const html = term === initialParsed.selectedTerm
      ? initialHtml
      : await fetchScheduleHtml(page, { term });
    const parsed = term === initialParsed.selectedTerm
      ? initialParsed
      : parseSchedulePage(html);

    const filtered = filterScheduleEntries(parsed.entries, {
      week: targetWeek ?? undefined,
      day: kwargs.day,
      keyword: kwargs.keyword,
    });

    return formatScheduleRows(filtered);
  },
});

