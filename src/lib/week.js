// A level is one "week": its lessons are spread over Day 1 to Day 5 (lesson.day_no).
// The teacher opens each day; a day with no open lessons is locked.
export const DAY_NUMBERS = [1, 2, 3, 4, 5];

const hasDay = (l) => Number(l.day_no) >= 1 && Number(l.day_no) <= 5;

// Until the database update has run, lessons have no day yet. Spread them
// evenly over the five days, the same way the update does.
export function withDays(lessons) {
  const list = lessons ?? [];
  if (list.every(hasDay)) return list;

  const byLevel = new Map();
  [...list]
    .sort((a, b) => a.lesson_id - b.lesson_id)
    .forEach((l) => byLevel.set(l.level_no, [...(byLevel.get(l.level_no) ?? []), l.lesson_id]));

  const assigned = new Map();
  byLevel.forEach((ids) => ids.forEach((id, i) => assigned.set(id, Math.floor((i * 5) / ids.length) + 1)));

  return list.map((l) => (hasDay(l) ? l : { ...l, day_no: assigned.get(l.lesson_id) }));
}

export const daysMissing = (lessons) => (lessons ?? []).some((l) => !hasDay(l));

export function weekPlan(lessons) {
  const list = withDays(lessons);
  const unfinished = list.filter((l) => Number(l.completion_pct) < 100).map((l) => Number(l.level_no));
  const level = unfinished.length
    ? Math.min(...unfinished)
    : list.length
      ? Math.max(...list.map((l) => Number(l.level_no)))
      : 1;
  const inLevel = list.filter((l) => Number(l.level_no) === level);

  let currentTaken = false;
  const days = DAY_NUMBERS.map((n) => {
    const items = inLevel.filter((l) => Number(l.day_no) === n);
    const done = items.length > 0 && items.every((l) => Number(l.completion_pct) >= 100);
    let state = "locked"; // the teacher has not opened this day
    if (done) {
      state = "done";
    } else if (items.length > 0) {
      state = currentTaken ? "open" : "current";
      currentTaken = true;
    }
    return { n, items, done, state };
  });

  return { level, days, finished: list.length > 0 && unfinished.length === 0 };
}
