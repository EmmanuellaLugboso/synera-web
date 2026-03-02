function safeNum(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + safeNum(v), 0) / values.length;
}

export function buildMindSleepDailyPayload({ date, mindLogs = [], sleepLogs = [] }) {
  const dayMind = (Array.isArray(mindLogs) ? mindLogs : []).filter((x) => x?.date === date);
  const daySleep = (Array.isArray(sleepLogs) ? sleepLogs : []).filter((x) => x?.date === date);

  const latestMind = dayMind.length ? dayMind[dayMind.length - 1] : null;
  const latestSleep = daySleep.length ? daySleep[daySleep.length - 1] : null;

  const sleepHours = avg(daySleep.map((x) => safeNum(x?.durationMins) / 60));
  const sleepQuality = avg(daySleep.map((x) => safeNum(x?.quality)));

  return {
    date,
    mood: {
      rating: dayMind.length ? Number(avg(dayMind.map((x) => x?.mood)).toFixed(1)) : 0,
      stress: dayMind.length ? Number(avg(dayMind.map((x) => x?.stress)).toFixed(1)) : 0,
      note: latestMind?.note ? String(latestMind.note).slice(0, 240) : "",
    },
    sleep: {
      hours: daySleep.length ? Number(sleepHours.toFixed(1)) : 0,
      quality: daySleep.length ? Number(sleepQuality.toFixed(1)) : 0,
      bedtime: latestSleep?.bedTime || "",
    },
  };
}

export function buildLifestyleDailyPayload({
  date,
  disciplineDays = [],
  habitLogs = [],
  habits = [],
}) {
  const todayDiscipline = (Array.isArray(disciplineDays) ? disciplineDays : []).find(
    (d) => d?.dateISO === date,
  );

  const todaysHabitLogs = (Array.isArray(habitLogs) ? habitLogs : []).filter(
    (l) => l?.dateISO === date && Number(l?.value) === 1,
  );
  const completedHabitIds = new Set(todaysHabitLogs.map((x) => x?.habitId).filter(Boolean));

  return {
    date,
    habits: {
      completed: completedHabitIds.size,
      total: Array.isArray(habits) ? habits.length : 0,
    },
    lifestyle: {
      focusMinutes: safeNum(todayDiscipline?.studyMin),
      screenTimeMinutes: safeNum(todayDiscipline?.phoneMin),
    },
  };
}
