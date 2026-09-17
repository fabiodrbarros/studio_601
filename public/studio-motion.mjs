// Motion enhances the existing page; every element stays visible without this module.
export function createSiteMotion(doc = document) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(0.16,1,0.3,1)';
  const active = new Map();
  const roots = new Map();
  let seen = new WeakSet(), currentArea;
  const $ = selector => doc.querySelector(selector);
  const $$ = selector => [...doc.querySelectorAll(selector)];
  const visible = el => {
    if (!el?.isConnected || !el.getClientRects().length || el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  function cancelAll() {
    for (const animation of active.values()) animation.cancel();
    active.clear();
  }
  function run(el, frames, duration = 840, delay = 0) {
    if (!visible(el) || preference.matches || doc.hidden || !el.animate) return;
    active.get(el)?.cancel();
    const animation = el.animate(frames, { duration, delay, easing, fill: 'none' });
    active.set(el, animation);
    const clean = () => { if (active.get(el) === animation) active.delete(el); };
    animation.finished.then(clean, clean);
  }
  const copy = (el, delay = 0, distance = 10) => run(el, [
    { opacity: .65, transform: `translateY(${distance}px)` },
    { opacity: 1, transform: 'translateY(0)' },
  ], 760, delay);
  const heading = el => run(el, [
    { opacity: .7, clipPath: 'inset(0 9% 0 0)', transform: 'translateX(-10px)' },
    { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'translateX(0)' },
  ], 960);
  const photograph = (el, delay = 0) => run(el, [
    { opacity: .8, clipPath: 'inset(0 6% 0 0 round 12px)' },
    { opacity: 1, clipPath: 'inset(0 0 0 0 round 12px)' },
  ], 1120, delay);
  const fade = el => run(el, [{ opacity: .6 }, { opacity: 1 }], 520);
  function watch(root, tasks) {
    if (!root || root.closest('[hidden]') || preference.matches) return;
    const pending = tasks.filter(([el]) => el && !seen.has(el));
    if (!pending.length) return;
    // Observe each target so lower text and off-screen carousel cards reveal
    // when they themselves arrive, even after their section has appeared.
    for (const [el, play] of pending) {
      roots.set(el, [[el, play]]);
      observer?.observe(el);
    }
  }
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || doc.hidden) continue;
      for (const [el, play] of roots.get(entry.target) || []) {
        if (!visible(el)) continue;
        seen.add(el); play(el);
      }
      observer.unobserve(entry.target); roots.delete(entry.target);
    }
  }, { threshold: 0, rootMargin: '0px' }) : null;
  function scheduleTasks() {
    return $$('#timetable-body .daily-lesson').map((el, i) => [el, item => run(item, [
      { opacity: .65, transform: 'translateX(-8px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ], 420, Math.min(i * 40, 180))]);
  }
  function refresh(area) {
    if (area !== currentArea) { cancelAll(); seen = new WeakSet(); currentArea = area; }
    // Cancel removed catalog nodes, without restarting the brand's entrance on data load.
    for (const [el, animation] of active) if (!el.isConnected) { animation.cancel(); active.delete(el); }
    observer?.disconnect(); roots.clear();
    if (preference.matches || doc.hidden || !observer) return;
    watch($('#inicio'), [
      [$('.hero-brand'), el => run(el, [
        { opacity: .55, clipPath: 'inset(0 12% 0 0)', transform: 'translateX(-18px) scale(.985)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'translateX(0) scale(1)' },
      ], 1440)],
      [$('.hero-schedule'), el => copy(el, 150)],
      [$('.hero-bottom'), el => copy(el, 220, 6)],
    ]);
    watch($('#studio'), [[$('#studio h2'), heading], [$('#studio-intro'), el => copy(el, 50)], [$('.studio-visual'), el => photograph(el, 70)]]);
    watch($('#areas .section-heading'), [[$('#areas h2'), heading], [$('.studio-overview-intro'), el => copy(el, 60)]]);
    $$('.area-card').forEach((card, i) => watch(card, [[card.querySelector('.media-placeholder'), el => photograph(el, i * 100)]]));
    watch($('#aulas .center-heading'), [[$('#aulas h2'), heading]]);
    $$('.series-card').forEach(card => watch(card, [[card.querySelector('.series-copy'), copy], [card.querySelector('.series-visual'), el => photograph(el, 60)]]));
    watch($('#equipa .center-heading'), [[$('#equipa h2'), heading], [$('.team-toolbar'), el => copy(el, 40, 6)]]);
    $$('.team-portrait').forEach(card => watch(card, [
      [card.querySelector('.portrait-info'), el => copy(el, 30, 8)],
      [card.querySelector('.managed-photo'), el => run(el, [{ filter: 'brightness(.86)' }, { filter: 'brightness(1)' }], 840)],
    ]));
    watch($('#horarios .timetable-heading'), [[$('#schedule-title'), heading], [$('.daily-week'), el => copy(el, 40, 6)]]);
    watch($('#timetable-days'), [[$('#timetable-days'), fade]]);
    scheduleTasks().forEach(([el, play]) => watch(el, [[el, play]]));
    watch($('.contact-heading'), [[$('.contact-heading h2'), heading]]);
    $$('.contact-details > div').forEach((el, i) => watch(el, [[el, item => copy(item, i * 40, 8)]]));
    watch($('.map-placeholder'), [[$('.map-placeholder'), photograph]]);
    watch($('footer'), [[$('footer'), fade]]);
  }
  function scheduleChanged() {
    for (const [el, animation] of active) if (!el.isConnected) { animation.cancel(); active.delete(el); }
    for (const el of roots.keys()) if (!el.isConnected) { observer?.unobserve(el); roots.delete(el); }
    for (const [el, play] of scheduleTasks()) {
      if (visible(el)) { seen.add(el); play(el); }
      else watch(el, [[el, play]]);
    }
  }
  function heroChanged() { if (visible($('.hero-schedule'))) copy($('.hero-schedule'), 0, 6); }
  preference.addEventListener('change', () => { cancelAll(); refresh(currentArea); });
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) cancelAll(); else refresh(currentArea); });
  return { refresh, scheduleChanged, heroChanged };
}
