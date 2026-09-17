// Keep each area's classes and order the overview by the first displayed start.
export function getHeroScheduleGroups(catalog, area, now = new Date()) {
 const firstStart = state => Math.min(...[...state.current, ...state.next]
  .map(({ date, session }) => Date.parse(date + 'T' + session.time + ':00Z')));
 return (area === 'all' ? ['fitness', 'dance'] : [area])
  .map(area => ({ area, ...getHeroSchedule(catalog, area, now) }))
  .filter(state => state.hasSchedule)
  .sort((a, b) => {
   const first = firstStart(a), second = firstStart(b);
   return first === second ? 0 : first - second;
  });
}

// Calendar comparisons use the published wall-clock times in Portugal.
export function getHeroSchedule(catalog, area, now = new Date()) {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
 }).formatToParts(now).map(part => [part.type, part.value]));
 const today = `${parts.year}-${parts.month}-${parts.day}`;
 const dayNumber = date => Date.parse(date + 'T00:00:00Z') / 86400000;
 const dateString = day => new Date(day * 86400000).toISOString().slice(0, 10);
 const todayNumber = dayNumber(today);
 const nowMinute = todayNumber * 1440 + Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60;
 const modalities = new Map(catalog.modalities.filter(m => m.published !== false && m.mode === 'schedule' &&
  m.area !== 'wellness' && (area === 'all' || m.area === area)).map(m => [m.id, m]));
 const current = [], upcoming = [];
 for (const session of catalog.sessions) {
  const modality = modalities.get(session.modalityId);
  if (!modality || session.published === false) continue;
  const [hour, minute] = session.time.split(':').map(Number);
  const startMinute = date => dayNumber(date) * 1440 + hour * 60 + minute;
  const valid = date => !(session.cancelledDates || []).includes(date) &&
   (!session.startDate || date >= session.startDate) && (!session.endDate || date <= session.endDate);
  const occursToday = session.recurrence === 'once' ? session.date === today :
   new Date(todayNumber * 86400000).getUTCDay() === session.weekday;
  if (occursToday && valid(today) && session.duration != null &&
   nowMinute >= startMinute(today) && nowMinute < startMinute(today) + session.duration) {
   current.push({ session, modality, date: today });
  }
  if (session.recurrence === 'once') {
   if (session.date && valid(session.date) && startMinute(session.date) > nowMinute)
    upcoming.push({ session, modality, date: session.date, start: startMinute(session.date) });
   continue;
  }
  let day = Math.max(todayNumber, session.startDate ? dayNumber(session.startDate) : todayNumber);
  const weekday = new Date(day * 86400000).getUTCDay();
  day += (session.weekday - weekday + 7) % 7;
  // Only explicitly cancelled occurrences can require more weekly steps.
  for (let attempt = 0; attempt <= (session.cancelledDates || []).length + 1; attempt++, day += 7) {
   const date = dateString(day);
   if (session.endDate && date > session.endDate) break;
   const start = startMinute(date);
   if (start <= nowMinute || !valid(date)) continue;
   upcoming.push({ session, modality, date, start });
   break;
  }
 }
 upcoming.sort((a, b) => a.start - b.start);
 return { today, current, next: upcoming.filter(item => item.start === upcoming[0]?.start), hasSchedule: modalities.size > 0 };
}
