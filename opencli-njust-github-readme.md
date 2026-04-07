# opencli-njust

NJUST schedule extension for OpenCLI.

## Overview

This project adds an `njust` site adapter to OpenCLI so you can query NJUST academic schedule data from the terminal.

Current MVP:

```bash
opencli njust schedule
opencli njust schedule --week 7
opencli njust schedule --day today
opencli njust schedule --day thu --week 7
opencli njust schedule --keyword ExampleCourseA
opencli njust schedule --term 2025-2026-2 --term-start 2026-02-23
```

## Features

- Reuses the existing OpenCLI browser session and cookies
- Fetches the logged-in NJUST schedule page from `bkjw.njust.edu.cn`
- Parses semester schedule HTML instead of depending on a hidden JSON API
- Supports filtering by week, day, term, and keyword
- Extracts course name, teacher, classroom, section range, and week range

## Command

```bash
opencli njust schedule \
  --week current \
  --day today \
  --term 2025-2026-2 \
  --term-start 2026-02-23 \
  --keyword ExampleCourseB
```

## Arguments

- `--week`: `current`, `next`, `all`, or a numeric week such as `8`
- `--day`: `today`, `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`
- `--term`: academic term such as `2025-2026-2`
- `--term-start`: explicit term start date in `YYYY-MM-DD`
- `--keyword`: fuzzy filter across course, teacher, classroom, and group name

## How it works

1. OpenCLI navigates to the NJUST schedule page with an authenticated browser session.
2. The adapter requests the semester schedule HTML with cookies included.
3. It parses:
   - `kbtable` for weekly grid data
   - `dataList` for precise weekday and section mapping
4. It merges both sources into normalized schedule rows.
5. It applies week/day/keyword filters and returns OpenCLI table output.

## Current limitation

`--week current` depends on the teaching term start date.

Priority order:

1. `--term-start YYYY-MM-DD`
2. `NJUST_TERM_START` environment variable
3. heuristic fallback inferred from the term string

If your school calendar differs from the heuristic, pass `--term-start` explicitly.

## File layout

```text
.opencli/
  clis/
    njust/
      schedule.js
      utils.js
      schedule.test.js
```

## Development status

- Implemented: `njust schedule`
- Planned: `njust exams`
- Planned: `njust grades`

## Local verification

- Command registration verified in the local OpenCLI runtime
- Parsing logic verified against sanitized and fictionalized fixture data

## Notes for GitHub

Before publishing:

1. Keep only sanitized fixtures or fictional test samples.
2. Add screenshots or terminal examples if needed.
3. Build to `dist/` before syncing back into your local OpenCLI runtime.

