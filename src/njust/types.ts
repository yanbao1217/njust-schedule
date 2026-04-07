export type WeekRange = {
  start: number;
  end: number;
};

export type WeekExpression = {
  raw: string;
  ranges: WeekRange[];
  odd: boolean;
  even: boolean;
};

export type ScheduleEntry = {
  blockIndex: number;
  weekday: number;
  weekdayLabel: string;
  weekdayText: string;
  course: string;
  groupName: string;
  teacher: string;
  classroom: string;
  sections: string;
  timeText: string;
  weekText: string;
  weekExpr: WeekExpression | null;
};

export type CourseDetailRow = {
  course: string;
  teacher: string;
  weekday: number;
  sections: string;
  classroom: string;
};

export type SchedulePage = {
  selectedTerm: string;
  termOptions: Array<{ value: string; label: string }>;
  weekOptions: number[];
  entries: ScheduleEntry[];
};

export type ScheduleRow = {
  weekday: string;
  sections: string;
  course: string;
  teacher: string;
  classroom: string;
  time: string;
  weeks: string;
};

export type ScheduleCommandArgs = {
  week?: string | number;
  day?: string;
  term?: string;
  'term-start'?: string;
  keyword?: string;
};

