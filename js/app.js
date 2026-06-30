// ========================
// LIFTLAB — APP CORE
// ========================

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('LiftLab: Service worker registered'))
      .catch(err => console.log('LiftLab: SW error', err));
  });
}

// ========================
// CONFIG
// ========================

const EXERCISEDB_KEY = '89873a376emshb4aac58b1f59da0p158863jsne076af2868db';

function getWorkoutPhotoUrl(weekType, dayIndex, isRest = false) {
  const PHOTOS = {
    'A-0': 'images/Chest day.jpg',
    'A-1': 'images/back_day.jpg',
    'A-2': 'images/Leg day.jpg',
    'A-3': 'images/arms day.jpg',
    'B-0': 'images/Back Squat .webp',
    'B-1': 'images/kettlebell.jpg',
    'B-2': 'images/Power clean.webp',
    'B-3': 'images/thrusters.webp',
    'rest': 'images/rest_day.webp',
  };
  const key = isRest ? 'rest' : `${weekType}-${dayIndex}`;
  return PHOTOS[key] || PHOTOS['rest'];
}

function getWorkoutHeroTitle(weekType, dayIndex, isRest = false) {
  if (isRest) return { title: 'Rest day', sub: 'Recovery is part of the program' };
  const TITLES = {
    'A-0': { title: 'Chest &\nShoulders',   sub: 'Day 1 · Upper Push · Week A' },
    'A-1': { title: 'Back &\nBiceps',        sub: 'Day 2 · Upper Pull · Week A' },
    'A-2': { title: 'Leg\nDay',              sub: 'Day 3 · Legs · Week A' },
    'A-3': { title: 'Arms\nDay',             sub: 'Day 4 · Full Body · Week A' },
    'B-0': { title: 'Strength\n& Power',     sub: 'Day 1 · CrossFit · Week B' },
    'B-1': { title: 'Endurance\n& Gymnastics', sub: 'Day 2 · CrossFit · Week B' },
    'B-2': { title: 'Olympic\nLifting',      sub: 'Day 3 · CrossFit · Week B' },
    'B-3': { title: 'Full Body\n& Intensity', sub: 'Day 4 · CrossFit · Week B' },
  };
  return TITLES[`${weekType}-${dayIndex}`] || { title: 'Train', sub: '' };
}

// Maps our exercise names to ExerciseDB search terms
const EXERCISE_NAME_MAP = {
  'Incline Barbell Bench Press':               'barbell incline bench press',
  'Flat Machine Chest Press':                  'smith machine bench press',
  'Dumbbell Shoulder Press':                   'dumbbell shoulder press',
  'Standing Dumbbell Side Lateral Raise':      'dumbbell lateral raise',
  'Seated Overhead EZ Bar Tricep Ext':         'ez bar overhead triceps extension',
  'Single Arm Cable Press Down':               'cable pushdown',
  'Wide Grip Pull Down':                       'cable pulldown',
  'Chest Supported Machine Row':               'lever seated row',
  'Narrow Grip Low Pulley Cable Row':          'cable seated row',
  'EZ Bar Preacher Curl':                      'ez bar preacher curl',
  'Standing Alternating Dumbbell Hammer Curl': 'dumbbell hammer curl',
  'Rope Face Pull':                            'cable rear delt fly',
  'Leg Curl Machine':                          'lever lying leg curl',
  'Leg Extension Machine':                     'lever leg extension',
  'Leg Press':                                 'sled 45 degrees leg press',
  'Hack Squat':                                'sled hack squat',
  'Barbell Walking Lunge':                     'barbell walking lunge',
  'Seated Calf Raise':                         'lever seated calf raise',
  'Incline Dumbbell Bench Press':              'dumbbell incline bench press',
  'Narrow Grip Pull Down':                     'cable pulldown',
  'Narrow Grip Bench Press':                   'barbell close-grip bench press',
  'EZ Bar Bicep Curls':                        'ez bar curl',
  'EZ Bar Skullcrusher':                       'ez bar lying triceps extension',
  'Dumbbell Rear Delt Lateral Raise':          'dumbbell rear lateral raise',
  // Program B — CrossFit
  'Back Squat':                                'barbell squat',
  'Strict Pull-ups':                           'pull up',
  'Romanian Deadlift':                         'barbell romanian deadlift',
  'Seated Dumbbell Shoulder Press':            'dumbbell shoulder press',
  'Power Clean':                               'barbell power clean',
  'Weighted Dips':                             'weighted dip',
  'Front Squat':                               'barbell front squat',
  'Hang Power Cleans':                         'barbell power clean',
  'Thrusters':                                 'barbell thruster',
  'Wall Balls':                                'medicine ball',
  'Kettlebell Swings':                         'kettlebell swing',
};

// ========================
// PROGRAM SELECTOR
// ========================

function getWeekProgram() {
  return getWeekState().weekType === 'B' ? PROGRAM_B : PROGRAM_A;
}

// ========================
// NAVIGATION
// ========================
const tabs = {
  home: renderHome,
  workout: renderWorkout,
  supps: renderSupps,
  progress: renderProgress
};

let currentTab = 'home';
let suppsViewExpanded = false;
let circleMode = 'logging'; // 'logging' | 'resting'

function navigateTo(tabName) {
  clearRestTimer();
  clearWarmupTimer();
  currentTab = tabName;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  const screenContainer = document.getElementById('screen-container');
  screenContainer.innerHTML = '';
  tabs[tabName]();

  const bannerLabel = document.getElementById('active-banner-label');
  if (bannerLabel && session) {
    bannerLabel.textContent = tabName === 'workout'
      ? 'Session in progress'
      : 'Session in progress — tap to return';
  }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'workout') {
      if (session && session.paused) {
        togglePauseWorkout();
      } else if (session && !session.paused) {
        navigateTo('workout');
        renderActiveExercise();
      } else {
        navigateTo('workout');
      }
    } else {
      if (btn.dataset.tab === 'supps') suppsViewExpanded = false;
      navigateTo(btn.dataset.tab);
    }
  });
});

document.getElementById('header-week-badge').addEventListener('click', () => {
  const state = getWeekState();
  state.weekType = state.weekType === 'A' ? 'B' : 'A';
  localStorage.setItem('liftlab_week', JSON.stringify(state));
  navigateTo(currentTab);
});

// ========================
// HOME SCREEN
// ========================

function renderHome() {
  const container = document.getElementById('screen-container');
  const state = getWeekState();

  const weekBadge = document.getElementById('header-week-badge');
  if (weekBadge) weekBadge.textContent = `Week ${state.weekType}`;

  currentDayIndex = getTodayProgramDayIndex();
  const weekType = state.weekType;

  const checkinKey = `liftlab_checkin_${getTodayKey()}`;
  const todayAns   = localStorage.getItem(checkinKey);
  const isRestDay  = todayAns === 'rest';
  const isPending  = todayAns === null;

  // Hero section — rest day uses rest photo/title, pending/yes use today's workout
  const heroPhotoUrl = getWorkoutPhotoUrl(weekType, currentDayIndex, isRestDay);
  const heroData     = getWorkoutHeroTitle(weekType, currentDayIndex, isRestDay);
  const titleLines   = heroData.title.split('\n').join('<br>');

  // Sub-pill text: rest day shows next program day, otherwise the standard sub
  const program = getWeekProgram();
  const todayProgDay = program[currentDayIndex];
  const subPillText = isRestDay
    ? `Next up — ${todayProgDay ? todayProgDay.label : 'Training day'}`
    : heroData.sub;

  // Week dot strip (reads new checkin keys)
  const monday   = getMondayDate();
  const todayKey = getTodayKey();
  const dayLetters = ['M','T','W','T','F','S','S'];
  const weekDots = dayLetters.map((ltr, i) => {
    const d  = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dk  = dateToDayKey(d);
    const ck  = localStorage.getItem(`liftlab_checkin_${dk}`);
    const isTodayDot = dk === todayKey;
    const isPastDot  = d < new Date() && !isTodayDot;
    let cls = '';
    if (isTodayDot && ck === 'yes') cls = 'today-yes';
    else if (isTodayDot)             cls = 'today';
    else if (isPastDot && ck === 'yes') cls = 'done';
    return `<div class="home-ws-day">
      <span class="home-ws-label">${ltr}</span>
      <div class="home-ws-dot ${cls}"></div>
    </div>`;
  }).join('');

  // Calendar rows — read from liftlab_checkin_${dk}, no scheduledOffsets
  const calRows = dayLetters.map((ltr, i) => {
    const d  = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dk       = dateToDayKey(d);
    const isToday  = dk === todayKey;
    const isPast   = d < new Date() && !isToday;
    const ans      = localStorage.getItem(`liftlab_checkin_${dk}`);
    let cls = '';
    if (isToday) {
      if (todayAns === 'yes')       cls = 'today-yes';
      else if (todayAns === 'rest') cls = 'today-rest';
      else                          cls = 'today-pending';
    } else if (isPast && ans === 'yes')  cls = 'done';
    else if (isPast && ans === 'rest')   cls = 'rest';
    else if (isPast && !ans)             cls = 'missed';
    else                                 cls = 'future';
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    return `<div class="home-cal-day ${cls}">
      <span class="home-cal-lbl">${dayNames[i]}</span>
      <div class="home-cal-num">${d.getDate()}</div>
      <div class="home-cal-pip"></div>
    </div>`;
  }).join('');

  // Calendar card (same structure in all 3 states)
  const monday2  = getMondayDate();
  const sunday   = new Date(monday2); sunday.setDate(monday2.getDate() + 6);
  const rangeLabel = `${monday2.toLocaleDateString('en-CA',{month:'short',day:'numeric'})} – ${sunday.toLocaleDateString('en-CA',{month:'short',day:'numeric'})}`;
  const calendarCardHTML = `
    <div class="home-cal-card">
      <div class="home-cal-header">
        <span class="home-cal-title">This week</span>
        <span class="home-cal-range">${rangeLabel}</span>
      </div>
      <div class="home-cal-row">${calRows}</div>
      <div class="home-cal-legend">
        <div class="home-leg-item"><div class="home-leg-dot" style="background:#22C55E;"></div><span>today</span></div>
        <div class="home-leg-item"><div class="home-leg-dot" style="background:#5B4EFF;"></div><span>done</span></div>
        <div class="home-leg-item"><div class="home-leg-dot" style="background:#F59E0B;"></div><span>missed</span></div>
        <div class="home-leg-item"><div class="home-leg-dot" style="background:#1C1C1C; border:1px solid #333;"></div><span>rest</span></div>
      </div>
    </div>
  `;

  // Return card — shown when a session is in progress (active or paused)
  const _rc_color = session && session.paused ? '#7B70FF' : '#22C55E';
  const returnCard = session ? `
    <div class="active-return-card" id="active-return-card">
      <div class="active-return-left">
        <div class="active-return-dot" style="background:${_rc_color};"></div>
        <div>
          <div class="active-return-name" style="color:${_rc_color};">${session.exercises[session.exIdx]?.name || 'Workout'}</div>
          <div class="active-return-set">Set ${session.setNum} of ${session.exercises[session.exIdx]?.sets || '?'}${session.paused ? ' · paused' : ''}</div>
        </div>
      </div>
      <span class="active-return-cta" style="color:${_rc_color};">${session.paused ? 'Resume' : 'Return'} →</span>
    </div>
  ` : '';

  // Build dark panel content based on state
  let darkPanelContent;

  if (isPending) {
    // State 1 — no answer yet: check-in card + calendar
    darkPanelContent = `
      <div class="home-checkin-card">
        <div class="home-checkin-q">Training today?</div>
        <div class="home-checkin-btns">
          <button class="home-checkin-yes" id="checkin-yes">Yes, let's go</button>
          <button class="home-checkin-rest" id="checkin-rest">Rest day</button>
        </div>
      </div>
      ${calendarCardHTML}
    `;
  } else if (todayAns === 'yes') {
    // State 2 — training day: calendar + stats + start button
    const exCount = todayProgDay ? todayProgDay.exercises.length : 0;
    const hasBuf  = getBufferState().exercises && getBufferState().exercises.length > 0;
    darkPanelContent = `
      ${calendarCardHTML}
      <div class="home-stats-row">
        <div class="home-stat-card">
          <div class="home-stat-val">30</div>
          <div class="home-stat-lbl">Minutes</div>
        </div>
        <div class="home-stat-card">
          <div class="home-stat-val">${exCount}</div>
          <div class="home-stat-lbl">Exercises</div>
        </div>
        <div class="home-stat-card">
          <div class="home-stat-val">${hasBuf ? '+10' : '—'}</div>
          <div class="home-stat-lbl">Buffer</div>
        </div>
      </div>
      <button class="home-start-btn" id="home-start-btn">Start workout →</button>
    `;
  } else {
    // State 3 — rest day: calendar + rest card
    darkPanelContent = `
      ${calendarCardHTML}
      <div class="home-rest-card">
        <div class="home-rest-title">Enjoy your rest day</div>
        <div class="home-rest-sub">${todayProgDay ? todayProgDay.label : 'Training day'} is ready when you are</div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="home-hero-wrap${isRestDay ? ' rest-day' : ''}">
      <img class="home-hero-img" src="${heroPhotoUrl}" alt="${heroData.title.replace('\n',' ')}" />
      <div class="home-hero-overlay"></div>
      <div class="home-week-strip">${weekDots}</div>
      <div class="home-hero-text">
        <div class="home-greeting">Good ${getTimeOfDay()}, Anil</div>
        <div class="home-hero-title">${titleLines}</div>
        <div class="home-hero-sub-pill">
          <div class="home-hero-sub-dot"></div>
          <span class="home-hero-sub-text">${subPillText}</span>
        </div>
      </div>
    </div>

    <div class="home-dark-panel">
      ${returnCard}
      ${darkPanelContent}
    </div>
  `;

  // Return card click
  const returnCardEl = document.getElementById('active-return-card');
  if (returnCardEl) returnCardEl.addEventListener('click', () => {
    if (session && session.paused) {
      togglePauseWorkout();
    } else {
      navigateTo('workout');
      renderActiveExercise();
    }
  });

  // Event listeners
  const yesBtn = document.getElementById('checkin-yes');
  if (yesBtn) yesBtn.addEventListener('click', () => {
    localStorage.setItem(checkinKey, 'yes');
    renderHome();
  });

  const restBtn = document.getElementById('checkin-rest');
  if (restBtn) restBtn.addEventListener('click', () => {
    localStorage.setItem(checkinKey, 'rest');
    renderHome();
  });

  const homeStartBtn = document.getElementById('home-start-btn');
  if (homeStartBtn) homeStartBtn.addEventListener('click', () => navigateTo('workout'));

  checkAndShowCheckins();
}

function buildCalendarStrip(state) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = getMondayDate();
  const todayKey = getTodayKey();
  const scheduled = state ? state.scheduledOffsets : [0, 1, 3, 4];
  const checkins  = state ? state.checkins : {};

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayKey = dateToDayKey(d);
    const isToday = dayKey === todayKey;
    const isPast = d < today && !isToday;
    const isWorkoutDay = scheduled.includes(i);
    const checkin = checkins[dayKey];

    let stateClass = '';
    if (isToday) stateClass = 'today';
    else if (isPast && isWorkoutDay && checkin === 'yes') stateClass = 'completed';
    else if (isPast && isWorkoutDay && checkin === 'no')  stateClass = 'missed';
    else if (!isWorkoutDay) stateClass = 'rest';

    html += `
      <div class="cal-day ${stateClass}">
        <span class="cal-label">${dayLabels[i]}</span>
        <div class="cal-circle">${d.getDate()}</div>
        <div class="cal-dot"></div>
      </div>
    `;
  }
  return html;
}

function getTodayWorkout(state) {
  const todayOffset = getTodayDayOffset();
  const scheduled   = state ? state.scheduledOffsets : [0, 1, 3, 4];
  const checkin     = state ? state.checkins[getTodayKey()] : null;
  const weekType    = state ? state.weekType : 'A';
  const isRestDay   = !scheduled.includes(todayOffset) || checkin === 'no';

  if (isRestDay) {
    const photoUrl = getWorkoutPhotoUrl('rest', 0, true);
    return `
      <div class="today-card">
        <div class="today-card-header">
          <div>
            <div class="today-card-title">Rest day</div>
            <div class="today-card-meta">Recovery is part of the program</div>
          </div>
          <span class="today-card-tag">Week ${weekType}</span>
        </div>
        <div class="home-muscle-img-wrap">
          <img class="home-exercise-img" src="${photoUrl}" alt="Rest day" referrerpolicy="no-referrer" />
        </div>
        <div class="rest-day-msg">See you at the next session 💪</div>
      </div>
    `;
  }

  const dayIndex = getTodayProgramDayIndex();
  const program = getWeekProgram();
  const day = program[dayIndex];
  const muscleMap = getMuscleMap(dayIndex, weekType);
  const photoUrl = getWorkoutPhotoUrl(weekType, dayIndex);

  const tagHtml = muscleMap.tags.map(t =>
    `<span class="muscle-tag ${t.primary ? 'muscle-tag-primary' : 'muscle-tag-secondary'}">${t.name}</span>`
  ).join('');

  return `
    <div class="today-card">
      <div class="today-card-header">
        <div>
          <div class="today-card-title">${day.label}</div>
          <div class="today-card-meta">${day.muscles} · 30 min</div>
        </div>
        <span class="today-card-tag">Week ${weekType}</span>
      </div>
      <div class="home-muscle-img-wrap">
        <img class="home-exercise-img" src="${photoUrl}" alt="${day.label}" referrerpolicy="no-referrer" />
      </div>
      <div class="muscle-tag-row">${tagHtml}</div>
      <div class="today-card-footer">
        <button class="start-btn" id="home-start-btn">Start workout</button>
      </div>
    </div>
  `;
}

function getMuscleMap(dayIndex, weekType = 'A') {
  const P = '#2A5A9A'; // primary — dark navy accent
  const S = '#1A3A6A'; // secondary — darker navy
  const I = '#0D1828'; // inactive — very dark

  const crossfitDays = [
    {
      // Day 1: Back Squat + Pull-ups
      chest: I, shoulder: S, tricep: I, lats: P, bicep: S, quad: P, calf: I,
      tags: [
        { name: 'Quads',  primary: true  },
        { name: 'Lats',   primary: true  },
        { name: 'Biceps', primary: false },
      ]
    },
    {
      // Day 2: Romanian Deadlift + Shoulder Press
      chest: I, shoulder: P, tricep: S, lats: S, bicep: I, quad: S, calf: I,
      tags: [
        { name: 'Hamstrings', primary: true  },
        { name: 'Shoulders',  primary: true  },
        { name: 'Triceps',    primary: false },
      ]
    },
    {
      // Day 3: Power Clean + Weighted Dips
      chest: S, shoulder: S, tricep: S, lats: P, bicep: S, quad: S, calf: I,
      tags: [
        { name: 'Full Body', primary: true  },
        { name: 'Power',     primary: true  },
        { name: 'Chest',     primary: false },
      ]
    },
    {
      // Day 4: Front Squat + Pull-ups
      chest: I, shoulder: S, tricep: I, lats: P, bicep: S, quad: P, calf: I,
      tags: [
        { name: 'Quads',     primary: true  },
        { name: 'Lats',      primary: true  },
        { name: 'Shoulders', primary: false },
      ]
    },
  ];

  const days = [
    {
      chest: P, shoulder: P, tricep: S, lats: I, bicep: I, quad: I, calf: I,
      tags: [
        { name: 'Chest',     primary: true  },
        { name: 'Shoulders', primary: true  },
        { name: 'Triceps',   primary: false },
      ]
    },
    {
      chest: I, shoulder: I, tricep: I, lats: P, bicep: P, quad: I, calf: I,
      tags: [
        { name: 'Back',       primary: true  },
        { name: 'Lats',       primary: true  },
        { name: 'Biceps',     primary: false },
        { name: 'Rear Delts', primary: false },
      ]
    },
    {
      chest: I, shoulder: I, tricep: I, lats: I, bicep: I, quad: P, calf: S,
      tags: [
        { name: 'Quads',      primary: true  },
        { name: 'Hamstrings', primary: true  },
        { name: 'Calves',     primary: false },
      ]
    },
    {
      chest: P, shoulder: I, tricep: S, lats: P, bicep: S, quad: I, calf: I,
      tags: [
        { name: 'Chest',   primary: true  },
        { name: 'Back',    primary: true  },
        { name: 'Biceps',  primary: false },
        { name: 'Triceps', primary: false },
      ]
    },
  ];

  const daySet = weekType === 'B' ? crossfitDays : days;
  const m = daySet[dayIndex] || daySet[0];

  const svg = `<svg viewBox="0 0 80 180" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="40" cy="12" rx="10" ry="11" fill="${I}"/>
    <ellipse cx="21" cy="36" rx="9"  ry="7"  fill="${m.shoulder}"/>
    <ellipse cx="59" cy="36" rx="9"  ry="7"  fill="${m.shoulder}"/>
    <rect x="25" y="29" width="30" height="30" rx="4" fill="${m.chest}"/>
    <rect x="16" y="33" width="11" height="26" rx="4" fill="${m.lats}"/>
    <rect x="53" y="33" width="11" height="26" rx="4" fill="${m.lats}"/>
    <rect x="8"  y="42" width="10" height="24" rx="4" fill="${m.bicep}"/>
    <rect x="62" y="42" width="10" height="24" rx="4" fill="${m.bicep}"/>
    <rect x="9"  y="67" width="8"  height="18" rx="3" fill="${m.tricep}"/>
    <rect x="63" y="67" width="8"  height="18" rx="3" fill="${m.tricep}"/>
    <rect x="25" y="59" width="30" height="22" rx="3" fill="${I}"/>
    <rect x="23" y="81" width="34" height="10" rx="3" fill="${I}"/>
    <rect x="24" y="92" width="14" height="36" rx="4" fill="${m.quad}"/>
    <rect x="42" y="92" width="14" height="36" rx="4" fill="${m.quad}"/>
    <rect x="25" y="130" width="12" height="28" rx="4" fill="${m.calf}"/>
    <rect x="43" y="130" width="12" height="28" rx="4" fill="${m.calf}"/>
  </svg>`;

  return { svg, tags: m.tags };
}

function buildSuppsSnapshot() {
  const list = getSuppsCustomList();
  const checked = getCheckedSupps();
  const doneCount = checked.filter(n => list.some(s => s.name === n)).length;

  const pills = list.map(s => `
    <span class="supp-pill ${checked.includes(s.name) ? 'done' : ''}">${s.name}</span>
  `).join('');

  return `
    <div class="supps-snapshot">
      <div class="supps-snapshot-header">
        <span class="supps-snapshot-title">${doneCount} of ${list.length} taken</span>
        <button class="supps-snapshot-link" id="supps-see-all">See all →</button>
      </div>
      <div class="supp-pill-row">${pills}</div>
    </div>
  `;
}

// ========================
// SUPPS SCREEN
// ========================

const DEFAULT_SUPPS_LIST = [
  { name: 'Multi-Vitamin',  time: 'With breakfast' },
  { name: 'Fish Oil',       time: 'With breakfast' },
  { name: 'Creatine',       time: 'Any time' },
  { name: 'Protein Shake',  time: 'Post-workout' },
  { name: 'Test Booster',   time: 'As directed' },
];

function getSuppsCustomList() {
  const raw = localStorage.getItem('liftlab_edits');
  return raw ? JSON.parse(raw) : DEFAULT_SUPPS_LIST;
}

function saveSuppsCustomList(list) {
  localStorage.setItem('liftlab_edits', JSON.stringify(list));
}

function getCheckedSupps() {
  const raw = localStorage.getItem('liftlab_supps');
  if (!raw) return [];
  const stored = JSON.parse(raw);
  if (stored.date !== getTodayKey()) return [];
  return stored.checked || [];
}

function saveCheckedSupps(checked) {
  localStorage.setItem('liftlab_supps', JSON.stringify({ date: getTodayKey(), checked }));
}

// ========================
// STREAK TRACKING
// ========================

function getStreakData() {
  const raw = localStorage.getItem('liftlab_streak');
  if (!raw) return { currentStreak: 0, freezeUsed: false, lastCompleteDay: null, history: {} };
  try { return JSON.parse(raw); } catch(e) { return { currentStreak: 0, freezeUsed: false, lastCompleteDay: null, history: {} }; }
}

function saveStreakData(data) {
  localStorage.setItem('liftlab_streak', JSON.stringify(data));
}

function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function processStreakMissedDays() {
  const data = getStreakData();
  if (!data.lastCompleteDay) return data;
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  let cursor = keyToDate(data.lastCompleteDay);
  cursor.setDate(cursor.getDate() + 1);
  let changed = false;
  while (cursor < todayDate) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}-${cursor.getDate()}`;
    if (!data.history[key]) {
      if (!data.freezeUsed) {
        data.history[key] = 'freeze';
        data.freezeUsed = true;
      } else {
        data.history[key] = 'missed';
        data.currentStreak = 0;
        data.freezeUsed = false;
      }
      changed = true;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (changed) saveStreakData(data);
  return data;
}

function markTodayDone() {
  const data = processStreakMissedDays();
  const today = getTodayKey();
  if (data.history[today] === 'done') return;
  data.history[today] = 'done';
  data.currentStreak += 1;
  data.freezeUsed = false;
  data.lastCompleteDay = today;
  saveStreakData(data);
}

function buildStreakCalendar(data) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayNum = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const hdrs = ['M','T','W','T','F','S','S'].map(l => `<div class="streak-cal-hdr">${l}</div>`).join('');
  const blanks = Array(startOffset).fill('<div></div>').join('');
  let cells = '';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month + 1}-${d}`;
    const status = data.history[key];
    const isToday = d === todayNum;
    const isFuture = new Date(year, month, d) > new Date(year, month, todayNum);
    if (isFuture) {
      cells += `<div class="streak-day" style="color:#222233;background:transparent">${d}</div>`;
    } else if (isToday) {
      cells += `<div class="streak-day ${status === 'done' ? 'done ' : ''}today">${d}</div>`;
    } else if (status === 'done') {
      cells += `<div class="streak-day done">${d}</div>`;
    } else if (status === 'freeze') {
      cells += `<div class="streak-day freeze">${d}</div>`;
    } else if (status === 'missed') {
      cells += `<div class="streak-day missed">${d}</div>`;
    } else {
      cells += `<div class="streak-day" style="color:#222233">${d}</div>`;
    }
  }
  return `<div class="streak-cal-grid">${hdrs}${blanks}${cells}</div>`;
}

function renderStreakCard(data) {
  const freezeLabel = data.freezeUsed ? '0 freezes left' : '1 freeze left';
  return `
    <div class="streak-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
        <div>
          <div class="streak-number">${data.currentStreak}</div>
          <div class="streak-label">day streak</div>
        </div>
        <div class="freeze-badge">${freezeLabel}</div>
      </div>
      ${buildStreakCalendar(data)}
      <div class="streak-legend">
        <div class="streak-leg-item">
          <div class="streak-leg-dot" style="background:#5B4EFF"></div>taken
        </div>
        <div class="streak-leg-item">
          <div class="streak-leg-dot" style="background:rgba(245,158,11,0.5);border:1px solid rgba(245,158,11,0.3)"></div>freeze day
        </div>
        <div class="streak-leg-item">
          <div class="streak-leg-dot" style="background:#1C1C1C"></div>missed
        </div>
      </div>
    </div>
  `;
}

function allSuppsComplete() {
  const list = getSuppsCustomList();
  const checked = getCheckedSupps();
  return list.length > 0 && list.every(s => checked.includes(s.name));
}

function getStreakBadgeHTML() {
  const streakData = JSON.parse(localStorage.getItem('liftlab_streak') || '{}');
  const count = streakData.currentStreak || 0;
  if (count <= 0) return '';
  return `
    <div class="supps-complete-streak">
      <i class="ti ti-flame" aria-hidden="true"></i>
      <span id="supps-streak-count">0</span> day streak
    </div>
  `;
}

function buildCompleteCardHTML() {
  const total = getSuppsCustomList().length;
  return `
    <div class="supps-complete-card" id="supps-complete-card">
      <div class="supps-complete-ring-wrap">
        <div class="supps-ripple"></div>
        <div class="supps-ripple supps-ripple-delay"></div>
        <div class="supps-complete-ring">
          <i class="ti ti-check supps-complete-icon" aria-hidden="true"></i>
        </div>
      </div>
      <div class="supps-complete-title">Stack complete</div>
      <div class="supps-complete-sub">All ${total} supplements logged for today</div>
      ${getStreakBadgeHTML()}
      <div class="supps-complete-hint">TAP TO VIEW CHECKLIST</div>
    </div>
  `;
}

function buildChecklistHTML() {
  const list = getSuppsCustomList();
  const checked = getCheckedSupps();
  const total = list.length;
  const doneCount = checked.filter(n => list.some(s => s.name === n)).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const complete = allSuppsComplete();
  const noteHTML = (complete && suppsViewExpanded)
    ? `<div class="supps-expanded-note">All ${total} taken today — uncheck any to edit</div>`
    : '';
  const rows = list.map(s => {
    const isDone = checked.includes(s.name);
    return `
      <div class="supp-row ${isDone ? 'checked' : ''}" data-supp="${s.name}">
        <div class="supp-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <span class="supp-name">${s.name}</span>
        <span class="supp-time">${s.time}</span>
      </div>
    `;
  }).join('');
  return `
    <div class="supps-header-row">
      <span class="supps-progress-label">${doneCount} of ${total} taken</span>
    </div>
    <div class="supps-progress-bar-track">
      <div class="supps-progress-bar-fill" style="width: ${pct}%"></div>
    </div>
    <div class="supps-list-card supps-checklist-card">
      ${noteHTML}
      ${rows}
    </div>
    <p class="supps-reset-note">Checklist resets automatically at midnight</p>
  `;
}

function attachSuppsCheckboxListeners() {
  document.querySelectorAll('.supp-row').forEach(row => {
    row.addEventListener('click', () => {
      const name = row.dataset.supp;
      const current = getCheckedSupps();
      const updated = current.includes(name)
        ? current.filter(n => n !== name)
        : [...current, name];
      saveCheckedSupps(updated);
      if (getSuppsCustomList().every(s => updated.includes(s.name))) markTodayDone();
      renderSuppsChecklistArea();
    });
  });
}

function animateStreakCount(finalCount) {
  const el = document.getElementById('supps-streak-count');
  if (!el) return;
  const startValue = Math.max(0, finalCount - 1);
  let current = startValue;
  el.textContent = current;
  if (startValue === finalCount) return;
  setTimeout(() => {
    const interval = setInterval(() => {
      current++;
      el.textContent = current;
      if (current >= finalCount) clearInterval(interval);
    }, 180);
  }, 400);
}

function renderSuppsChecklistArea() {
  const area = document.getElementById('supps-checklist-area');
  if (!area) return;
  const complete = allSuppsComplete();
  if (complete && !suppsViewExpanded) {
    area.innerHTML = buildCompleteCardHTML();
    const streakData = JSON.parse(localStorage.getItem('liftlab_streak') || '{}');
    animateStreakCount(streakData.currentStreak || 0);
    document.getElementById('supps-complete-card').addEventListener('click', () => {
      suppsViewExpanded = true;
      renderSuppsChecklistArea();
    });
  } else {
    area.innerHTML = buildChecklistHTML();
    attachSuppsCheckboxListeners();
  }
}

function renderSupps(editMode = false) {
  const streakData = editMode ? getStreakData() : processStreakMissedDays();
  const container = document.getElementById('screen-container');
  const list = getSuppsCustomList();

  const _src_color = session && session.paused ? '#7B70FF' : '#22C55E';
  const returnCard = session ? `
    <div class="active-return-card" id="active-return-card">
      <div class="active-return-left">
        <div class="active-return-dot" style="background:${_src_color};"></div>
        <div>
          <div class="active-return-name" style="color:${_src_color};">${session.exercises[session.exIdx]?.name || 'Workout'}</div>
          <div class="active-return-set">Set ${session.setNum} of ${session.exercises[session.exIdx]?.sets || '?'}${session.paused ? ' · paused' : ''}</div>
        </div>
      </div>
      <span class="active-return-cta" style="color:${_src_color};">${session.paused ? 'Resume' : 'Return'} →</span>
    </div>
  ` : '';

  const editRows = editMode ? list.map(s => `
    <div class="supp-row supp-row-edit">
      <span class="supp-name">${s.name}</span>
      <button class="supp-delete-btn" data-supp="${s.name}" aria-label="Remove ${s.name}">×</button>
    </div>
  `).join('') : '';

  const addRow = editMode ? `
    <div class="supp-add-row">
      <input class="supp-add-input" id="supp-add-input" type="text" placeholder="Add supplement…" maxlength="40" />
      <button class="supp-add-btn" id="supp-add-btn">Add</button>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="supps-screen">

      ${returnCard}

      <div class="supps-screen-header">
        <span class="supps-screen-title">Supplements</span>
        ${editMode
          ? `<button class="supps-edit-btn supps-edit-btn-done" id="supps-edit-toggle">Done</button>`
          : `<button class="supps-edit-btn" id="supps-edit-toggle">Edit</button>`
        }
      </div>

      ${!editMode ? renderStreakCard(streakData) : ''}

      <div id="supps-checklist-area">${editMode ? `
        <div class="supps-list-card">
          ${editRows}
        </div>
        ${addRow}
        <p class="supps-reset-note">Checklist resets automatically at midnight</p>
      ` : ''}</div>

    </div>
  `;

  const returnCardEl = document.getElementById('active-return-card');
  if (returnCardEl) returnCardEl.addEventListener('click', () => {
    if (session && session.paused) {
      togglePauseWorkout();
    } else {
      navigateTo('workout');
      renderActiveExercise();
    }
  });

  document.getElementById('supps-edit-toggle').addEventListener('click', () => {
    renderSupps(!editMode);
  });

  if (editMode) {
    container.querySelectorAll('.supp-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.supp;
        const updated = getSuppsCustomList().filter(s => s.name !== name);
        saveSuppsCustomList(updated);
        const updatedChecked = getCheckedSupps().filter(n => n !== name);
        saveCheckedSupps(updatedChecked);
        renderSupps(true);
      });
    });

    const addBtn = document.getElementById('supp-add-btn');
    const addInput = document.getElementById('supp-add-input');

    addBtn.addEventListener('click', () => {
      const name = addInput.value.trim();
      if (!name) return;
      const current = getSuppsCustomList();
      if (current.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        addInput.value = '';
        return;
      }
      saveSuppsCustomList([...current, { name, time: '' }]);
      renderSupps(true);
    });

    addInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') addBtn.click();
    });
  } else {
    renderSuppsChecklistArea();
  }
}
// ========================
// WORKOUT SCREEN (stub)
// ========================

// ========================
// WORKOUT PROGRAM DATA
// ========================

const PROGRAM_A = [
  {
    day: 1,
    label: 'Day 1 — Upper Push',
    muscles: 'Chest · Shoulders · Triceps',
    exercises: [
      { name: 'Incline Barbell Bench Press',          sets: 3, reps: '8–12', rest: 60, image: 'images/Incline Barbell Bench Press.jpeg' },
      { name: 'Flat Machine Chest Press',             sets: 3, reps: '8–12', rest: 60, image: 'images/Flat Machine Chest Press.jpeg' },
      { name: 'Dumbbell Shoulder Press',              sets: 3, reps: '8–12', rest: 60, image: 'images/Dumbbell Shoulder Press.jpeg' },
      { name: 'Standing Dumbbell Side Lateral Raise', sets: 2, reps: '8–12', rest: 45, image: 'images/Standing Dumbbell Side Lateral Raise .jpeg' },
      { name: 'Seated Overhead EZ Bar Tricep Ext',   sets: 2, reps: '8–12', rest: 45, image: 'images/Seated Overhead EZ Bar Tricep Extension .jpeg' },
      { name: 'Single Arm Cable Press Down',          sets: 2, reps: '8–12', rest: 45, image: 'images/Single Arm Cable Press Down .jpeg' },
    ]
  },
  {
    day: 2,
    label: 'Day 2 — Upper Pull',
    muscles: 'Back · Biceps',
    exercises: [
      { name: 'Wide Grip Pull Down',                        sets: 3, reps: '8–12', rest: 60, image: 'images/Wide Grip Pull Down .jpeg' },
      { name: 'Chest Supported Machine Row',                sets: 3, reps: '8–12', rest: 60, image: 'images/Chest Supported Machine Row .jpeg' },
      { name: 'Narrow Grip Low Pulley Cable Row',           sets: 3, reps: '8–12', rest: 60, image: 'images/Narrow Grip Low Pulley Cable Row .jpeg' },
      { name: 'EZ Bar Preacher Curl',                       sets: 2, reps: '8–12', rest: 45, image: 'images/EZ Bar Preacher Curl.jpg' },
      { name: 'Standing Alternating Dumbbell Hammer Curl',  sets: 2, reps: '8–12', rest: 45, image: 'images/Standing Alternating Dumbbell Hammer Curl.jpeg' },
      { name: 'Rope Face Pull',                             sets: 2, reps: '8–12', rest: 45, image: 'images/Rope Face Pull .jpeg' },
    ]
  },
  {
    day: 3,
    label: 'Day 3 — Legs',
    muscles: 'Quads · Hamstrings · Calves',
    exercises: [
      { name: 'Leg Curl Machine',       sets: 3, reps: '8–12',     rest: 60, image: 'images/Leg Curl Machine .jpeg' },
      { name: 'Leg Extension Machine',  sets: 3, reps: '8–12',     rest: 60, image: 'images/Leg Extension Machine.jpeg' },
      { name: 'Leg Press',              sets: 3, reps: '8–12',     rest: 60, image: 'images/Leg Press .jpeg' },
      { name: 'Hack Squat',             sets: 3, reps: '8–12',     rest: 60, image: 'images/Hack Squat .jpeg' },
      { name: 'Barbell Walking Lunge',  sets: 2, reps: '10 each',  rest: 45, image: 'images/Walking Lunge .jpeg' },
      { name: 'Seated Calf Raise',      sets: 3, reps: '12–15',    rest: 45, image: 'images/Seated Calf Raise .jpeg' },
    ]
  },
  {
    day: 4,
    label: 'Day 4 — Full Body / Arms',
    muscles: 'Chest · Back · Arms',
    exercises: [
      { name: 'Incline Dumbbell Bench Press',             sets: 3, reps: '8–12', rest: 60, image: 'images/Incline Dumbbell Bench Press .jpeg' },
      { name: 'Narrow Grip Pull Down',                    sets: 3, reps: '8–12', rest: 60, image: 'images/Wide Grip Pull Down .jpeg' },
      { name: 'Narrow Grip Bench Press',                  sets: 2, reps: '8–12', rest: 60, image: 'images/Narrow Grip Bench Press .jpeg' },
      { name: 'EZ Bar Bicep Curls',                       sets: 3, reps: '8–12', rest: 45, image: 'images/EZ Bar Preacher Curl.jpg' },
      { name: 'EZ Bar Skullcrusher',                      sets: 2, reps: '8–12', rest: 45, image: 'images/EZ Bar Skullcrusher .jpeg' },
      { name: 'Dumbbell Rear Delt Lateral Raise',         sets: 2, reps: '8–12', rest: 45, image: 'images/Dumbbell Rear Delt Lateral Raise .jpeg' },
    ]
  }
];

const PROGRAM_B = [
  {
    day: 1,
    label: 'Day 1 — Strength & Power',
    muscles: 'Legs · Back',
    hasWarmup: true,
    warmupDuration: 300,
    exercises: [
      { name: 'Back Squat',     sets: 4, reps: '5',  rest: 120, image: 'images/Back Squat.jpeg' },
      { name: 'Strict Pull-ups', sets: 3, reps: '8', rest: 90,  image: 'images/Strict Pull-ups .jpeg' },
    ],
    wod: {
      format: 'AMRAP',
      duration: 720,
      label: 'AMRAP 12 min',
      movements: [
        { name: 'Front Squats',      reps: '10 reps', image: 'images/Front Squats .jpeg' },
        { name: 'Burpees',           reps: '10 reps', image: 'images/Burpees .jpeg' },
        { name: 'Kettlebell Swings', reps: '10 reps', image: 'images/Kettlebell swings.jpeg' },
      ],
    },
  },
  {
    day: 2,
    label: 'Day 2 — Endurance & Gymnastics',
    muscles: 'Hamstrings · Shoulders',
    hasWarmup: true,
    warmupDuration: 300,
    exercises: [
      { name: 'Romanian Deadlift',              sets: 4, reps: '6',  rest: 120, image: 'images/Romanian Deadlift .jpeg' },
      { name: 'Seated Dumbbell Shoulder Press', sets: 3, reps: '10', rest: 90,  image: 'images/Dumbbell Shoulder Press.jpeg' },
    ],
    wod: {
      format: 'EMOM',
      duration: 720,
      label: 'EMOM 12 min',
      movements: [
        { name: 'Wall Balls',        reps: '15 reps', minute: 1, image: 'images/Wall Balls.jpeg' },
        { name: 'Kettlebell Swings', reps: '12 reps', minute: 2, image: 'images/Kettlebell swings.jpeg' },
        { name: 'V-Ups',             reps: '10 reps', minute: 3, image: 'images/V-Ups.jpeg' },
      ],
    },
  },
  {
    day: 3,
    label: 'Day 3 — Olympic Lifting',
    muscles: 'Full Body · Power',
    hasWarmup: true,
    warmupDuration: 300,
    exercises: [
      { name: 'Power Clean',   sets: 4, reps: '3', rest: 120, image: 'images/Power clean.webp' },
      { name: 'Weighted Dips', sets: 3, reps: '8', rest: 90,  image: 'images/Weighted Dips .jpeg' },
    ],
    wod: {
      format: 'Rounds for Time',
      rounds: 4,
      label: '4 Rounds for Time',
      movements: [
        { name: 'Hang Power Cleans',       reps: '10 reps', image: 'images/Hang Power Clean.jpeg' },
        { name: 'Lateral Barbell Burpees', reps: '12 reps', image: 'images/Burpees .jpeg' },
        { name: 'Push-ups',                reps: '10 reps', image: 'images/Push-ups.jpeg' },
      ],
    },
  },
  {
    day: 4,
    label: 'Day 4 — Full Body & High Intensity',
    muscles: 'Full Body · Conditioning',
    hasWarmup: true,
    warmupDuration: 300,
    exercises: [
      { name: 'Front Squat',    sets: 4, reps: '5', rest: 120, image: 'images/Front Squats .jpeg' },
      { name: 'Strict Pull-ups', sets: 3, reps: '8', rest: 90, image: 'images/Strict Pull-ups .jpeg' },
    ],
    wod: {
      format: 'Rounds for Time',
      rounds: 3,
      label: '3 Rounds for Time',
      movements: [
        { name: 'Thrusters',        reps: '15 reps', image: 'images/Thrusters.jpeg' },
        { name: 'Push-ups',         reps: '12 reps', image: 'images/Push-ups.jpeg' },
        { name: 'Burpees Over Bar', reps: '10 reps', image: 'images/Burpees .jpeg' },
      ],
    },
  },
];

// 3 exercises per day (~10 min catch-up shortlist)
const BUFFER_SHORTLISTS = [
  [
    { name: 'Flat Machine Chest Press',             sets: 2, reps: '8–12', rest: 60 },
    { name: 'Dumbbell Shoulder Press',              sets: 2, reps: '8–12', rest: 60 },
    { name: 'Single Arm Cable Press Down',          sets: 2, reps: '8–12', rest: 45 },
  ],
  [
    { name: 'Chest Supported Machine Row',          sets: 2, reps: '8–12', rest: 60 },
    { name: 'EZ Bar Preacher Curl',                 sets: 2, reps: '8–12', rest: 45 },
    { name: 'Rope Face Pull',                       sets: 2, reps: '8–12', rest: 45 },
  ],
  [
    { name: 'Leg Extension Machine',                sets: 2, reps: '8–12', rest: 60 },
    { name: 'Leg Press',                            sets: 2, reps: '8–12', rest: 60 },
    { name: 'Seated Calf Raise',                    sets: 2, reps: '12–15', rest: 45 },
  ],
  [
    { name: 'Narrow Grip Bench Press',              sets: 2, reps: '8–12', rest: 60 },
    { name: 'EZ Bar Bicep Curls',                   sets: 2, reps: '8–12', rest: 45 },
    { name: 'EZ Bar Skullcrusher',                  sets: 2, reps: '8–12', rest: 45 },
  ],
];

const CROSSFIT_BUFFER_SHORTLISTS = [
  [{ name: 'Front Squats / Burpees / KB Swings',   sets: 1, reps: 'AMRAP 8 min', rest: 0 }],
  [{ name: 'Wall Balls / V-Ups / KB Swings',        sets: 1, reps: 'AMRAP 8 min', rest: 0 }],
  [{ name: 'Power Cleans / Push-ups / Dips',        sets: 1, reps: 'AMRAP 8 min', rest: 0 }],
  [{ name: 'Thrusters / Push-ups / Burpees',        sets: 1, reps: 'AMRAP 8 min', rest: 0 }],
];

const EXERCISE_LIBRARY = [
  { group: 'Chest', exercises: [
    { name: 'Incline Barbell Bench Press',     sets: 3, reps: '8–12',  rest: 60 },
    { name: 'Flat Barbell Bench Press',        sets: 3, reps: '8–12',  rest: 60 },
    { name: 'Flat Machine Chest Press',        sets: 3, reps: '8–12',  rest: 60 },
    { name: 'Incline Dumbbell Bench Press',    sets: 3, reps: '8–12',  rest: 60 },
    { name: 'Narrow Grip Bench Press',         sets: 3, reps: '8–12',  rest: 60 },
    { name: 'Cable Chest Fly',                 sets: 3, reps: '12–15', rest: 45 },
    { name: 'Dumbbell Chest Fly',              sets: 3, reps: '12–15', rest: 45 },
    { name: 'Dips',                            sets: 3, reps: '8–12',  rest: 60 },
  ]},
  { group: 'Shoulders', exercises: [
    { name: 'Dumbbell Shoulder Press',              sets: 3, reps: '8–12',  rest: 60 },
    { name: 'Barbell Overhead Press',               sets: 3, reps: '8–12',  rest: 90 },
    { name: 'Arnold Press',                         sets: 3, reps: '8–12',  rest: 60 },
    { name: 'Standing Dumbbell Side Lateral Raise', sets: 2, reps: '12–15', rest: 45 },
    { name: 'Cable Lateral Raise',                  sets: 2, reps: '12–15', rest: 45 },
    { name: 'Rope Face Pull',                       sets: 2, reps: '12–15', rest: 45 },
    { name: 'Dumbbell Rear Delt Lateral Raise',     sets: 2, reps: '12–15', rest: 45 },
  ]},
  { group: 'Back', exercises: [
    { name: 'Wide Grip Pull Down',              sets: 3, reps: '8–12', rest: 60 },
    { name: 'Narrow Grip Pull Down',            sets: 3, reps: '8–12', rest: 60 },
    { name: 'Chest Supported Machine Row',      sets: 3, reps: '8–12', rest: 60 },
    { name: 'Narrow Grip Low Pulley Cable Row', sets: 3, reps: '8–12', rest: 60 },
    { name: 'Barbell Row',                      sets: 3, reps: '8–12', rest: 90 },
    { name: 'Single Arm Dumbbell Row',          sets: 3, reps: '8–12 each', rest: 60 },
    { name: 'Seated Cable Row',                 sets: 3, reps: '8–12', rest: 60 },
    { name: 'Straight Arm Pulldown',            sets: 2, reps: '12–15', rest: 45 },
  ]},
  { group: 'Biceps', exercises: [
    { name: 'EZ Bar Bicep Curls',                       sets: 3, reps: '8–12',  rest: 45 },
    { name: 'EZ Bar Preacher Curl',                     sets: 2, reps: '8–12',  rest: 45 },
    { name: 'Standing Alternating Dumbbell Hammer Curl', sets: 2, reps: '8–12', rest: 45 },
    { name: 'Cable Bicep Curl',                         sets: 3, reps: '10–15', rest: 45 },
    { name: 'Incline Dumbbell Curl',                    sets: 2, reps: '10–12', rest: 45 },
    { name: 'Concentration Curl',                       sets: 2, reps: '10–12', rest: 45 },
  ]},
  { group: 'Triceps', exercises: [
    { name: 'Single Arm Cable Press Down',           sets: 2, reps: '10–15', rest: 45 },
    { name: 'Seated Overhead EZ Bar Tricep Ext',     sets: 2, reps: '8–12',  rest: 45 },
    { name: 'EZ Bar Skullcrusher',                   sets: 2, reps: '8–12',  rest: 45 },
    { name: 'Cable Tricep Pushdown',                 sets: 3, reps: '10–15', rest: 45 },
    { name: 'Overhead Dumbbell Tricep Extension',    sets: 2, reps: '10–12', rest: 45 },
    { name: 'Weighted Dips',                         sets: 3, reps: '8–12',  rest: 60 },
  ]},
  { group: 'Legs', exercises: [
    { name: 'Leg Press',             sets: 3, reps: '8–12',    rest: 60 },
    { name: 'Hack Squat',            sets: 3, reps: '8–12',    rest: 60 },
    { name: 'Back Squat',            sets: 4, reps: '5–8',     rest: 90 },
    { name: 'Front Squat',           sets: 4, reps: '5–8',     rest: 90 },
    { name: 'Barbell Walking Lunge', sets: 2, reps: '10 each', rest: 45 },
    { name: 'Split Squat',           sets: 3, reps: '10 each', rest: 60 },
    { name: 'Romanian Deadlift',     sets: 3, reps: '8–12',    rest: 60 },
    { name: 'Leg Curl Machine',      sets: 3, reps: '8–12',    rest: 60 },
    { name: 'Leg Extension Machine', sets: 3, reps: '8–12',    rest: 60 },
    { name: 'Hip Thrust',            sets: 3, reps: '10–12',   rest: 60 },
    { name: 'Seated Calf Raise',     sets: 3, reps: '12–15',   rest: 45 },
    { name: 'Standing Calf Raise',   sets: 3, reps: '12–15',   rest: 45 },
  ]},
  { group: 'CrossFit / Olympic', exercises: [
    { name: 'Power Clean',       sets: 4, reps: '3',   rest: 120 },
    { name: 'Hang Power Cleans', sets: 4, reps: '5',   rest: 120 },
    { name: 'Barbell Deadlift',  sets: 3, reps: '5',   rest: 120 },
    { name: 'Strict Pull-ups',   sets: 3, reps: '8',   rest: 90  },
    { name: 'Thrusters',         sets: 3, reps: '10',  rest: 90  },
    { name: 'Kettlebell Swings', sets: 3, reps: '15–20', rest: 60 },
    { name: 'Wall Balls',        sets: 3, reps: '15–20', rest: 60 },
    { name: 'Box Jumps',         sets: 3, reps: '10',  rest: 60  },
  ]},
];

let currentDayIndex = 0;
let checkinsShown = false;

// ========================
// WORKOUT EDITOR — STORAGE
// ========================

function getProgramEdits() {
  try { return JSON.parse(localStorage.getItem('liftlab_program_edits') || '{}'); }
  catch { return {}; }
}

function getDayExercises(weekType, dayIndex) {
  const edits = getProgramEdits();
  const key = `${weekType}_${dayIndex}`;
  if (edits[key]) return edits[key];
  const program = weekType === 'B' ? PROGRAM_B : PROGRAM_A;
  return [...program[dayIndex].exercises];
}

function saveDayExercises(weekType, dayIndex, exercises) {
  const edits = getProgramEdits();
  edits[`${weekType}_${dayIndex}`] = exercises;
  localStorage.setItem('liftlab_program_edits', JSON.stringify(edits));
}

function resetDayExercises(weekType, dayIndex) {
  const edits = getProgramEdits();
  delete edits[`${weekType}_${dayIndex}`];
  localStorage.setItem('liftlab_program_edits', JSON.stringify(edits));
}

function resetFullProgram(weekType) {
  const edits = getProgramEdits();
  [0, 1, 2, 3].forEach(i => delete edits[`${weekType}_${i}`]);
  localStorage.setItem('liftlab_program_edits', JSON.stringify(edits));
}

function renderWorkout() {
  const weekState  = getWeekState();
  const weekType   = weekState.weekType;
  const program    = getWeekProgram();
  const day        = program[currentDayIndex];
  const container  = document.getElementById('screen-container');
  const buf        = getBufferState();

  const dayExercises = getDayExercises(weekType, currentDayIndex);
  const isCrossFit   = !!day.wod;
  const hasBuffer    = buf.exercises && buf.exercises.length > 0;
  const baseDuration = isCrossFit ? 35 : 30;
  const durationMins = hasBuffer ? baseDuration + 10 : baseDuration;
  const photoUrl     = getWorkoutPhotoUrl(weekType, currentDayIndex);

  // Day selector pills
  const dayTabs = program.map((d, i) => `
    <button class="wt-day-tab ${i === currentDayIndex ? 'active' : ''}" data-day="${i}">Day ${d.day}</button>
  `).join('');

  // Exercise cards — thumbnail uses day photo (reliable, no external API needed)
  const exerciseCards = dayExercises.map((e, i) => `
    <div class="wt-ex-card">
      <div class="wt-ex-thumb">
        <img class="wt-ex-thumb-img" src="${e.image || photoUrl}" alt="${e.name}" referrerpolicy="no-referrer" />
        <span class="wt-ex-thumb-num">${i + 1}</span>
      </div>
      <div class="wt-ex-info">
        <div class="wt-ex-name">${e.name}</div>
        <div class="wt-ex-detail">${e.sets} sets · ${e.reps} reps</div>
      </div>
      <div class="wt-ex-rest">${e.rest}s</div>
    </div>
  `).join('');

  // WOD section (CrossFit only)
  const wodSection = isCrossFit ? (() => {
    const wod = day.wod;
    const movementRows = wod.movements.map(m => `
      <div class="wod-preview-row">
        ${m.image ? `<img class="wod-preview-thumb" src="${m.image}" alt="${m.name}" />` : ''}
        <span class="wod-preview-name">${m.name}</span>
        ${m.minute ? `<span class="wod-preview-meta">Min ${m.minute}</span>` : ''}
        <span class="wod-preview-reps">${m.reps}</span>
      </div>
    `).join('');
    return `
      <div class="wt-section">
        <div class="wt-section-header">
          <div class="wt-section-left">
            <span class="wt-section-title">WOD</span>
            <span class="wt-section-meta">${wod.label}</span>
          </div>
          <span class="wt-format-badge">${wod.format}</span>
        </div>
        <div class="wod-preview-card"><div class="wod-preview-header">
          <span class="wod-preview-label">${wod.label}</span>
          <span class="wod-preview-format">${wod.format}</span>
        </div>${movementRows}</div>
      </div>
    `;
  })() : '';

  // Buffer section
  const bufferSection = hasBuffer ? `
    <div class="wt-section">
      <div class="wt-section-header">
        <div class="wt-section-left">
          <span class="wt-section-title">Catch-up</span>
          <span class="wt-section-meta">From ${getDayName(buf.fromDayKey)}</span>
        </div>
        <span class="wt-amber-badge">+10 min</span>
      </div>
      <div class="wt-ex-list">
        ${buf.exercises.map(e => `
          <div class="wt-ex-card">
            <div class="wt-ex-thumb wt-ex-thumb-plain">
              <span class="wt-ex-thumb-num">+</span>
            </div>
            <div class="wt-ex-info">
              <div class="wt-ex-name">${e.name}</div>
              <div class="wt-ex-detail">${e.sets} sets · ${e.reps} reps</div>
            </div>
            <div class="wt-ex-rest">${e.rest}s</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const warmupLine = isCrossFit
    ? `<div class="wt-warmup-line">🚴 5 min warm-up included</div>`
    : '';

  container.innerHTML = `
    <div class="wt-screen">

      <div class="wt-hero">
        <img class="wt-hero-img" src="${photoUrl}" alt="${day.label}" referrerpolicy="no-referrer" />
        <div class="wt-hero-overlay"></div>
        <button class="wt-back-btn" id="wt-back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="wt-hero-text">
          <div class="wt-hero-title">${day.label}</div>
          <div class="wt-hero-sub">Day ${day.day} · ${day.muscles} · Week ${weekType} · ${durationMins} min</div>
        </div>
      </div>

      <div class="wt-day-tabs-wrap">
        <div class="wt-day-tabs">${dayTabs}</div>
      </div>

      <div class="wt-section">
        <div class="wt-section-header">
          <div class="wt-section-left">
            <span class="wt-section-title">Main workout</span>
            <span class="wt-section-meta">${dayExercises.length} exercises · ${durationMins} min</span>
          </div>
          <div class="wt-section-right">
            <span class="wt-week-badge">Week ${weekType}</span>
            <button class="wt-edit-btn" id="wt-edit-btn" aria-label="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </div>
        ${warmupLine}
        <div class="wt-ex-list">${exerciseCards}</div>
      </div>

      ${wodSection}
      ${bufferSection}

      <div class="wt-start-bar">
        <button class="wt-start-btn" id="wt-start-btn">Start workout →</button>
      </div>

    </div>
  `;

  // Day tab switching
  container.querySelectorAll('.wt-day-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDayIndex = parseInt(btn.dataset.day);
      renderWorkout();
    });
  });

  document.getElementById('wt-back-btn').addEventListener('click', () => navigateTo('home'));
  document.getElementById('wt-start-btn').addEventListener('click', () => startActiveSession(currentDayIndex));
  document.getElementById('wt-edit-btn').addEventListener('click', () => renderWorkoutEditor(currentDayIndex));

}

// ========================
// PROGRESS SCREEN
// ========================

function getProgressData() {
  const all = JSON.parse(localStorage.getItem('liftlab_weights') || '[]');
  if (!all.length) return {};

  const byExercise = {};
  for (const entry of all) {
    if (!byExercise[entry.exerciseName]) byExercise[entry.exerciseName] = [];
    byExercise[entry.exerciseName].push(entry);
  }

  const result = {};
  for (const [name, logs] of Object.entries(byExercise)) {
    // Group entries within 3 hours into one session
    const sessions = [];
    let cur = [logs[0]];
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].ts - logs[i - 1].ts < 10800000) {
        cur.push(logs[i]);
      } else {
        sessions.push(cur);
        cur = [logs[i]];
      }
    }
    sessions.push(cur);

    const mapped = sessions.map(s => {
      const validWeights = s.filter(e => e.weight > 0).map(e => e.weight);
      const avgWeight = validWeights.length
        ? Math.round((validWeights.reduce((a, b) => a + b, 0) / validWeights.length) * 10) / 10
        : 0;
      const maxWeight = validWeights.length ? Math.max(...validWeights) : 0;
      const diffs = s.map(e => e.difficulty).filter(Boolean);
      return {
        ts: s[0].ts,
        date: new Date(s[0].ts),
        avgWeight,
        maxWeight,
        sets: s.length,
        difficulty: diffs[diffs.length - 1] || null,
      };
    }).filter(s => s.avgWeight > 0);

    if (mapped.length) result[name] = mapped;
  }
  return result;
}

function buildMiniChart(sessions) {
  const W = 140, H = 44, PAD = 6;
  const weights = sessions.map(s => s.avgWeight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const pts = sessions.map((s, i) => ({
    x: PAD + (sessions.length > 1 ? (i / (sessions.length - 1)) : 0.5) * (W - PAD * 2),
    y: H - PAD - ((s.avgWeight - minW) / range) * (H - PAD * 2),
  }));

  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${pts[0].x.toFixed(1)},${H} ${line} ${pts[pts.length - 1].x.toFixed(1)},${H}`;
  const dots = pts.map(p =>
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="#4A6A9A"/>`
  ).join('');

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${area}" fill="#1A3A6A" opacity="0.5"/>
    <polyline points="${line}" fill="none" stroke="#2A5A9A" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}

function buildFullChart(sessions) {
  const W = 320, H = 160, PL = 40, PR = 12, PT = 12, PB = 28;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  const weights = sessions.map(s => s.avgWeight);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const minW = Math.floor((rawMin - 5) / 5) * 5;
  const maxW = Math.ceil((rawMax + 5)  / 5) * 5;
  const range = maxW - minW || 10;

  const toX = i => PL + (sessions.length > 1 ? (i / (sessions.length - 1)) : 0.5) * cW;
  const toY = w => PT + cH - ((w - minW) / range) * cH;

  const pts = sessions.map((s, i) => ({ x: toX(i), y: toY(s.avgWeight) }));
  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${pts[0].x.toFixed(1)},${H - PB} ${line} ${pts[pts.length - 1].x.toFixed(1)},${H - PB}`;

  // 3 horizontal gridlines
  const yTicks = [minW, minW + Math.round(range / 2), maxW];
  const gridLines = yTicks.map(w => {
    const y = toY(w).toFixed(1);
    return `
      <line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}"
            stroke="#111C28" stroke-width="1" stroke-dasharray="3,3"/>
      <text x="${PL - 5}" y="${y}" text-anchor="end" dominant-baseline="middle"
            font-size="9" fill="#3A5A70">${w}</text>`;
  }).join('');

  // X axis date labels — show up to 4
  const step = Math.max(1, Math.floor((sessions.length - 1) / 3));
  const xLabels = sessions.map((s, i) => {
    if (i !== 0 && i !== sessions.length - 1 && i % step !== 0) return '';
    const label = s.date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    return `<text x="${toX(i).toFixed(1)}" y="${H - 6}" text-anchor="middle"
                  font-size="8" fill="#3A5A70">${label}</text>`;
  }).join('');

  const dots = pts.map(p =>
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#4A6A9A"/>`
  ).join('');

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
               style="width:100%;height:auto;display:block">
    ${gridLines}
    <polygon points="${area}" fill="#1A3A6A" opacity="0.4"/>
    <polyline points="${line}" fill="none" stroke="#2A5A9A" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
    ${xLabels}
  </svg>`;
}

// ========================
// PROGRESS TAB — REDESIGN
// ========================

const MUSCLE_MAP = {
  'Incline Barbell Bench Press': 'Chest',
  'Flat Machine Chest Press': 'Chest',
  'Incline Dumbbell Bench Press': 'Chest',
  'Narrow Grip Bench Press': 'Chest',
  'Dumbbell Shoulder Press': 'Shoulders',
  'Standing Dumbbell Side Lateral Raise': 'Shoulders',
  'Seated Dumbbell Shoulder Press': 'Shoulders',
  'Seated Overhead EZ Bar Tricep Extension': 'Triceps',
  'Seated Overhead EZ Bar Tricep Ext': 'Triceps',
  'Single Arm Cable Press Down': 'Triceps',
  'EZ Bar Skullcrusher': 'Triceps',
  'Wide Grip Pull Down': 'Back',
  'Chest Supported Machine Row': 'Back',
  'Narrow Grip Low Pulley Cable Row': 'Back',
  'Narrow Grip Pull Down': 'Back',
  'Rope Face Pull': 'Back',
  'EZ Bar Preacher Curl': 'Biceps',
  'Standing Alternating Dumbbell Hammer Curl': 'Biceps',
  'EZ Bar Bicep Curls': 'Biceps',
  'Dumbbell Rear Delt Lateral Raise': 'Back',
  'Leg Curl Machine': 'Legs',
  'Leg Extension Machine': 'Legs',
  'Leg Press': 'Legs',
  'Hack Squat': 'Legs',
  'Barbell Walking Lunge': 'Legs',
  'Seated Calf Raise': 'Legs',
  'Back Squat': 'Legs',
  'Front Squat': 'Legs',
  'Romanian Deadlift': 'Legs',
  'Strict Pull-ups': 'Back',
  'Weighted Dips': 'Triceps',
  'Power Clean': 'Back',
};

const WORKOUT_ANCHORS = [
  { label: 'Upper Push', keys: ['Incline Barbell Bench Press','Flat Machine Chest Press','Single Arm Cable Press Down'] },
  { label: 'Upper Pull', keys: ['Wide Grip Pull Down','Chest Supported Machine Row','Narrow Grip Low Pulley Cable Row'] },
  { label: 'Legs',       keys: ['Leg Curl Machine','Leg Extension Machine','Leg Press','Hack Squat','Seated Calf Raise'] },
  { label: 'CrossFit',   keys: ['Back Squat','Front Squat','Romanian Deadlift','Power Clean','Strict Pull-ups','Weighted Dips'] },
];

function inferWorkoutLabel(exNames) {
  const s = new Set(exNames);
  let best = '', bestScore = 0;
  for (const { label, keys } of WORKOUT_ANCHORS) {
    const score = keys.filter(k => s.has(k)).length;
    if (score > bestScore) { bestScore = score; best = label; }
  }
  return best || 'Arms';
}

function buildTrainingHeatmap() {
  const all = JSON.parse(localStorage.getItem('liftlab_weights') || '[]');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayNum = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

  const trainedDays = new Set();
  for (const e of all) {
    const d = new Date(e.ts);
    if (d.getFullYear() === year && d.getMonth() === month) trainedDays.add(d.getDate());
  }

  const dowHdrs = ['M','T','W','T','F','S','S'].map(l => `<span>${l}</span>`).join('');
  const empties = Array(startOffset).fill('<div class="heat-cell h-empty"></div>').join('');

  let cells = '';
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday  = d === todayNum;
    const isFuture = d > todayNum;
    const trained  = trainedDays.has(d);
    let cls = 'heat-cell';
    if (isFuture)       cls += ' h-future';
    else if (isToday)   cls += trained ? ' h-trained h-today' : ' h-today';
    else if (trained)   cls += ' h-trained';
    else                cls += ' h-rest';
    cells += `<div class="${cls}">${d}</div>`;
  }

  return `
    <div class="progress-section-card">
      <div class="progress-section-title">TRAINING THIS MONTH</div>
      <div class="heat-dow">${dowHdrs}</div>
      <div class="heat-grid">${empties}${cells}</div>
      <div class="heat-legend">
        <div class="heat-legend-sq" style="background:#1A1A1A"></div>
        <span class="heat-legend-label">rest</span>
        <div class="heat-legend-sq" style="background:#5B4EFF"></div>
        <span class="heat-legend-label">trained</span>
      </div>
    </div>
  `;
}

function buildMuscleBreakdown() {
  const all = JSON.parse(localStorage.getItem('liftlab_weights') || '[]');
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);

  const muscleSets = {};
  for (const e of all) {
    const d = new Date(e.ts);
    if (d >= monday && d < sunday) {
      const m = MUSCLE_MAP[e.exerciseName];
      if (m) muscleSets[m] = (muscleSets[m] || 0) + 1;
    }
  }

  const entries = Object.entries(muscleSets).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '';

  const maxSets = entries[0][1];
  const barColor = s => s / maxSets >= 0.75 ? '#5B4EFF' : s / maxSets >= 0.4 ? '#4A3FE0' : '#2E28A0';

  const rows = entries.map(([muscle, sets]) => `
    <div class="muscle-row">
      <div class="muscle-name">${muscle}</div>
      <div class="muscle-track">
        <div class="muscle-fill" style="width:${Math.round((sets/maxSets)*100)}%;background:${barColor(sets)}"></div>
      </div>
      <div class="muscle-count">${sets} sets</div>
    </div>
  `).join('');

  return `
    <div class="progress-section-card">
      <div class="progress-section-title">THIS WEEK — MUSCLE GROUPS</div>
      <div class="muscle-grid">${rows}</div>
    </div>
  `;
}

function buildSessionCards() {
  const all = JSON.parse(localStorage.getItem('liftlab_weights') || '[]');
  if (!all.length) return '';

  const sorted = [...all].sort((a, b) => a.ts - b.ts);
  const sessions = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    sorted[i].ts - sorted[i - 1].ts < 10800000 ? cur.push(sorted[i]) : (sessions.push(cur), cur = [sorted[i]]);
  }
  sessions.push(cur);

  // All-time best weight per exercise
  const allTimeBest = {};
  for (const e of all) {
    if (e.weight > 0 && (!allTimeBest[e.exerciseName] || e.weight > allTimeBest[e.exerciseName]))
      allTimeBest[e.exerciseName] = e.weight;
  }

  // Per-exercise averaged session history for ↑ detection
  const exHistory = {};
  for (const sess of sessions) {
    const byEx = {};
    for (const e of sess) { if (!byEx[e.exerciseName]) byEx[e.exerciseName] = []; byEx[e.exerciseName].push(e); }
    for (const [name, entries] of Object.entries(byEx)) {
      const vals = entries.filter(e => e.weight > 0).map(e => e.weight);
      if (!vals.length) continue;
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
      if (!exHistory[name]) exHistory[name] = [];
      exHistory[name].push({ sessionTs: sess[0].ts, avgWeight: avg });
    }
  }

  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WDAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  return sessions.slice(-10).reverse().map(sess => {
    const d = new Date(sess[0].ts);
    const workoutLabel = inferWorkoutLabel([...new Set(sess.map(e => e.exerciseName))]);
    const dateStr = `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()} · ${workoutLabel}`;
    const dur = Math.max(20, Math.round((sess[sess.length - 1].ts - sess[0].ts) / 60000));

    const byEx = {};
    for (const e of sess) { if (!byEx[e.exerciseName]) byEx[e.exerciseName] = []; byEx[e.exerciseName].push(e); }

    const exRows = Object.entries(byEx).map(([name, entries]) => {
      const vals = entries.filter(e => e.weight > 0).map(e => e.weight);
      if (!vals.length) return '';
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
      const maxLogged = Math.max(...vals);
      const hist = exHistory[name] || [];
      const idx  = hist.findIndex(h => h.sessionTs === sess[0].ts);
      const isUp = idx > 0 && avg > hist[idx - 1].avgWeight;
      const isPB = idx > 0 && maxLogged >= (allTimeBest[name] || 0);
      return `
        <div class="session-summary-ex">
          <span class="session-ex-name">${name}</span>
          <div class="session-ex-right">
            <span class="session-ex-weight">${avg} lbs</span>
            ${isUp ? `<span class="session-ex-up">↑</span>` : ''}
            ${isPB ? `<span class="session-ex-pb">PB</span>` : ''}
          </div>
        </div>
      `;
    }).filter(Boolean).join('');

    if (!exRows) return '';
    return `
      <div class="session-summary-card">
        <div class="session-summary-hdr">
          <span class="session-summary-date">${dateStr}</span>
          <span class="session-summary-badge">${dur} min</span>
        </div>
        ${exRows}
      </div>
    `;
  }).filter(Boolean).join('');
}

function renderProgress() {
  const container = document.getElementById('screen-container');
  const all = JSON.parse(localStorage.getItem('liftlab_weights') || '[]');

  const _prc_color = session && session.paused ? '#7B70FF' : '#22C55E';
  const returnCard = session ? `
    <div class="active-return-card" id="active-return-card">
      <div class="active-return-left">
        <div class="active-return-dot" style="background:${_prc_color};"></div>
        <div>
          <div class="active-return-name" style="color:${_prc_color};">${session.exercises[session.exIdx]?.name || 'Workout'}</div>
          <div class="active-return-set">Set ${session.setNum} of ${session.exercises[session.exIdx]?.sets || '?'}${session.paused ? ' · paused' : ''}</div>
        </div>
      </div>
      <span class="active-return-cta" style="color:${_prc_color};">${session.paused ? 'Resume' : 'Return'} →</span>
    </div>
  ` : '';

  if (!all.length) {
    container.innerHTML = `
      <div class="progress-screen">
        ${returnCard}
        <div class="progress-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <div class="progress-empty-title">No data yet</div>
          <div class="progress-empty-body">Complete a workout to start tracking your progress here.</div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="progress-screen">
        ${returnCard}
        ${buildTrainingHeatmap()}
        ${buildMuscleBreakdown()}
        ${buildSessionCards()}
      </div>
    `;
  }

  const returnCardEl = document.getElementById('active-return-card');
  if (returnCardEl) returnCardEl.addEventListener('click', () => {
    if (session && session.paused) {
      togglePauseWorkout();
    } else {
      navigateTo('workout');
      renderActiveExercise();
    }
  });
}

function renderExerciseDetail(name, sessions) {
  const container = document.getElementById('screen-container');
  const fullChart = buildFullChart(sessions);

  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  let trendLabel = 'First session';
  let trendClass = 'trend-new';
  if (prev) {
    const diff = Math.round((last.avgWeight - prev.avgWeight) * 10) / 10;
    if (diff > 0)      { trendLabel = `↑ +${diff} lbs this session`;  trendClass = 'trend-up';   }
    else if (diff < 0) { trendLabel = `↓ ${diff} lbs this session`;   trendClass = 'trend-down'; }
    else               { trendLabel = '→ Holding weight';             trendClass = 'trend-same'; }
  }

  const recentRows = [...sessions].reverse().slice(0, 6).map(s => {
    const dateStr = s.date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    const diffClass = { easy: 'diff-easy', right: 'diff-right', hard: 'diff-hard' }[s.difficulty] || '';
    return `
      <div class="detail-row">
        <span class="detail-date">${dateStr}</span>
        <span class="detail-weight">${s.avgWeight} lbs</span>
        <span class="detail-sets">${s.sets} sets</span>
        <span class="detail-diff ${diffClass}">${s.difficulty || '—'}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="progress-screen">
      <div class="detail-nav">
        <button class="detail-back-btn" id="detail-back">← Progress</button>
      </div>
      <div class="detail-exercise-name">${name}</div>
      <div class="detail-trend-row">
        <span class="progress-trend ${trendClass}">${trendLabel}</span>
        <span class="detail-session-count">${sessions.length} session${sessions.length > 1 ? 's' : ''}</span>
      </div>
      <div class="detail-chart-wrap">${fullChart}</div>
      <div class="detail-section-label">Recent sessions</div>
      <div class="detail-list-card">
        <div class="detail-list-header">
          <span>Date</span><span>Avg lbs</span><span>Sets</span><span>Feel</span>
        </div>
        ${recentRows}
      </div>
    </div>
  `;

  document.getElementById('detail-back').addEventListener('click', () => renderProgress());
}

// ========================
// WORKOUT EDITOR — UI
// ========================

let editorDayIndex = 0;

function renderWorkoutEditor(dayIdx) {
  editorDayIndex = dayIdx !== undefined ? dayIdx : editorDayIndex;
  const weekState = getWeekState();
  const weekType  = weekState.weekType;
  const program   = getWeekProgram();
  const day       = program[editorDayIndex];
  const exercises = getDayExercises(weekType, editorDayIndex);
  const container = document.getElementById('screen-container');

  const dayTabs = program.map((d, i) => `
    <button class="day-tab ${i === editorDayIndex ? 'active' : ''}" data-day="${i}">Day ${d.day}</button>
  `).join('');

  const exerciseRows = exercises.map((e, i) => `
    <div class="editor-row">
      <span class="editor-row-num">${i + 1}</span>
      <button class="editor-row-name" data-idx="${i}">${e.name}</button>
      <div class="editor-row-actions">
        <button class="editor-arrow" data-action="up"   data-idx="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="editor-arrow" data-action="down" data-idx="${i}" ${i === exercises.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="editor-remove" data-idx="${i}">×</button>
      </div>
    </div>
  `).join('');

  const isCrossFit = !!day.wod;
  const wodNote = isCrossFit ? `
    <div class="editor-wod-note">WOD (${day.wod.label}) is fixed and not editable.</div>
  ` : '';

  container.innerHTML = `
    <div class="editor-screen">

      <div class="editor-header">
        <button class="editor-back-btn" id="editor-back">← Back</button>
        <span class="editor-title">Edit Workout</span>
        <span class="editor-week-badge">Week ${weekType}</span>
      </div>

      <div class="editor-tabs-wrap">${dayTabs}</div>

      <div class="editor-day-label">${day.label}</div>

      <div class="editor-list-card">
        ${exerciseRows.length ? exerciseRows : '<p class="editor-empty">No exercises. Add one below.</p>'}
      </div>

      ${wodNote}

      <button class="editor-add-btn" id="editor-add">+ Add exercise</button>

      <div class="editor-restore-row">
        <button class="editor-restore-day" id="editor-restore-day">Restore this day</button>
        <button class="editor-restore-all" id="editor-restore-all">Restore full program</button>
      </div>

    </div>
  `;

  document.getElementById('editor-back').addEventListener('click', () => {
    currentDayIndex = editorDayIndex;
    renderWorkout();
  });

  container.querySelectorAll('.day-tab').forEach(btn => {
    btn.addEventListener('click', () => renderWorkoutEditor(parseInt(btn.dataset.day)));
  });

  container.querySelectorAll('.editor-row-name').forEach(btn => {
    btn.addEventListener('click', () => {
      renderExercisePicker(weekType, editorDayIndex, parseInt(btn.dataset.idx));
    });
  });

  container.querySelectorAll('.editor-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const i   = parseInt(btn.dataset.idx);
      const dir = btn.dataset.action;
      const list = [...getDayExercises(weekType, editorDayIndex)];
      if (dir === 'up' && i > 0) {
        [list[i - 1], list[i]] = [list[i], list[i - 1]];
      } else if (dir === 'down' && i < list.length - 1) {
        [list[i], list[i + 1]] = [list[i + 1], list[i]];
      }
      saveDayExercises(weekType, editorDayIndex, list);
      renderWorkoutEditor();
    });
  });

  container.querySelectorAll('.editor-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const i    = parseInt(btn.dataset.idx);
      const list = getDayExercises(weekType, editorDayIndex).filter((_, j) => j !== i);
      saveDayExercises(weekType, editorDayIndex, list);
      renderWorkoutEditor();
    });
  });

  document.getElementById('editor-add').addEventListener('click', () => {
    renderExercisePicker(weekType, editorDayIndex, -1);
  });

  document.getElementById('editor-restore-day').addEventListener('click', () => {
    resetDayExercises(weekType, editorDayIndex);
    renderWorkoutEditor();
  });

  document.getElementById('editor-restore-all').addEventListener('click', () => {
    resetFullProgram(weekType);
    renderWorkoutEditor();
  });
}

function renderExercisePicker(weekType, dayIndex, replaceIdx) {
  const overlay = document.createElement('div');
  overlay.className = 'picker-overlay';

  const groupSections = EXERCISE_LIBRARY.map(({ group, exercises }) => {
    const rows = exercises.map(e => `
      <button class="picker-row" data-name="${e.name}">${e.name}</button>
    `).join('');
    return `<div class="picker-group-label">${group}</div>${rows}`;
  }).join('');

  overlay.innerHTML = `
    <div class="picker-card">
      <div class="picker-header">
        <span class="picker-title">${replaceIdx >= 0 ? 'Swap exercise' : 'Add exercise'}</span>
        <button class="picker-cancel" id="picker-cancel">Cancel</button>
      </div>
      <div class="picker-search-wrap">
        <input class="picker-search" id="picker-search" type="text"
               placeholder="Search exercises…" autocomplete="off" />
      </div>
      <div class="picker-body" id="picker-body">${groupSections}</div>
    </div>
  `;

  document.getElementById('app').appendChild(overlay);

  document.getElementById('picker-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('picker-search').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    const body = document.getElementById('picker-body');
    if (!q) { body.innerHTML = groupSections; wirePickerRows(); return; }

    const matched = EXERCISE_LIBRARY.flatMap(({ exercises }) =>
      exercises.filter(ex => ex.name.toLowerCase().includes(q))
    );
    body.innerHTML = matched.length
      ? matched.map(ex => `<button class="picker-row" data-name="${ex.name}">${ex.name}</button>`).join('')
      : '<p class="picker-empty">No matches</p>';
    wirePickerRows();
  });

  function wirePickerRows() {
    overlay.querySelectorAll('.picker-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        let picked = null;
        for (const { exercises } of EXERCISE_LIBRARY) {
          picked = exercises.find(e => e.name === name);
          if (picked) break;
        }
        if (!picked) { overlay.remove(); return; }

        const list = [...getDayExercises(weekType, dayIndex)];
        if (replaceIdx >= 0) {
          list[replaceIdx] = { ...picked };
        } else {
          list.push({ ...picked });
        }
        saveDayExercises(weekType, dayIndex, list);
        overlay.remove();
        renderWorkoutEditor(dayIndex);
      });
    });
  }

  wirePickerRows();
}

// ========================
// WEEK & DAY SCHEDULING
// ========================

function getMondayDate(ref = new Date()) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function dateToDayKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getTodayDayOffset() {
  return (new Date().getDay() + 6) % 7; // 0=Mon … 6=Sun
}

function getWeekState() {
  const mondayKey = dateToDayKey(getMondayDate());
  const raw    = localStorage.getItem('liftlab_week');
  const stored = raw ? JSON.parse(raw) : null;

  if (!stored || stored.mondayKey !== mondayKey) {
    const weekType = stored ? (stored.weekType === 'A' ? 'B' : 'A') : 'A';
    localStorage.removeItem('liftlab_buffer');
    localStorage.removeItem('liftlab_missed');
    return { mondayKey, weekType };
  }
  return stored;
}

function saveWeekState(state) {
  localStorage.setItem('liftlab_week', JSON.stringify(state));
}

function getTodayProgramDayIndex() {
  const monday   = getMondayDate();
  const todayKey = getTodayKey();
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d  = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dk = dateToDayKey(d);
    if (dk === todayKey) break;
    if (localStorage.getItem(`liftlab_checkin_${dk}`) === 'yes') done++;
  }
  return Math.min(done, PROGRAM_A.length - 1);
}

function getBufferState() {
  const raw = localStorage.getItem('liftlab_buffer');
  return raw ? JSON.parse(raw) : { exercises: [], fromDayKey: null, fromDayIndex: null };
}

function saveBufferState(buf) {
  localStorage.setItem('liftlab_buffer', JSON.stringify(buf));
}

function getDayName(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getMissedLog() {
  const raw = localStorage.getItem('liftlab_missed');
  if (!raw) return [];
  const stored = JSON.parse(raw);
  const state = getWeekState();
  if (stored.mondayKey !== state.mondayKey) return [];
  return stored.days || [];
}

function saveMissedLog(days) {
  const state = getWeekState();
  localStorage.setItem('liftlab_missed', JSON.stringify({ mondayKey: state.mondayKey, days }));
}

function getUnhandledMissedDays() {
  const monday   = getMondayDate();
  const todayKey = getTodayKey();
  const handled  = getMissedLog();
  const missed   = [];

  // Start at i=1 — Monday has no previous day to compare against
  for (let i = 1; i < 7; i++) {
    const d  = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dk = dateToDayKey(d);
    if (dk === todayKey) break;

    const ans  = localStorage.getItem(`liftlab_checkin_${dk}`);
    const prev = new Date(monday);
    prev.setDate(monday.getDate() + i - 1);
    const prevAns = localStorage.getItem(`liftlab_checkin_${dateToDayKey(prev)}`);

    if ((!ans || ans !== 'yes') && prevAns === 'yes' && !handled.includes(dk)) {
      missed.push({ dayKey: dk, offset: i });
    }
  }
  return missed;
}

function checkMissedDays(onDone) {
  const missed = getUnhandledMissedDays();
  if (!missed.length) { onDone(); return; }

  const first  = missed[0];
  const state  = getWeekState();
  const monday = getMondayDate();
  let yesCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (localStorage.getItem(`liftlab_checkin_${dateToDayKey(d)}`) === 'yes') yesCount++;
  }
  const dayIndex     = Math.min(yesCount, PROGRAM_A.length - 1);
  const shortlists   = state.weekType === 'B' ? CROSSFIT_BUFFER_SHORTLISTS : BUFFER_SHORTLISTS;
  const bufExercises = shortlists[dayIndex] || shortlists[0];

  showMissedDayModal(first, bufExercises, onDone);
}

function showMissedDayModal(missed, bufExercises, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'checkin-overlay';
  overlay.innerHTML = `
    <div class="checkin-card">
      <div class="checkin-card-title">Missed day</div>
      <div class="checkin-card-body">
        You didn't make it on <strong>${getDayName(missed.dayKey)}</strong>.
        Want to add a quick 10-min catch-up to today's session?
      </div>
      <div class="checkin-btn-row">
        <button class="checkin-btn" data-val="skip">Skip it</button>
        <button class="checkin-btn checkin-btn-primary" data-val="add">Add catch-up</button>
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);

  overlay.querySelectorAll('.checkin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.remove();
      const handled = getMissedLog();
      saveMissedLog([...handled, missed.dayKey]);
      if (btn.dataset.val === 'add') {
        saveBufferState({ exercises: bufExercises, fromDayKey: missed.dayKey, fromDayIndex: missed.offset });
      }
      onDone();
    });
  });
}

function checkAndShowCheckins() {
  if (checkinsShown) return;
  // Only run the missed-day check once per session, and only after user has answered yes
  const todayAns = localStorage.getItem(`liftlab_checkin_${getTodayKey()}`);
  if (todayAns === 'yes') {
    checkinsShown = true;
    checkMissedDays(() => renderHome());
  }
}


// ========================
// WEIGHT PROGRESSION
// ========================

function getProgressionSuggestion(exerciseName) {
  const all = JSON.parse(localStorage.getItem('liftlab_weights') || '[]');
  const exLogs = all.filter(l => l.exerciseName === exerciseName);
  if (!exLogs.length) return null;

  // Group log entries into sessions — entries within 3 hours = one session
  const sessions = [];
  let cur = [exLogs[0]];
  for (let i = 1; i < exLogs.length; i++) {
    if (exLogs[i].ts - exLogs[i - 1].ts < 10800000) {
      cur.push(exLogs[i]);
    } else {
      sessions.push(cur);
      cur = [exLogs[i]];
    }
  }
  sessions.push(cur);

  const last = sessions[sessions.length - 1];
  const lastWeight = last[last.length - 1].weight || 0;
  const diffs = last.map(l => l.difficulty).filter(Boolean);
  if (!diffs.length) return { lastWeight, suggestion: lastWeight, reason: null };

  const easyCount = diffs.filter(d => d === 'easy').length;
  const hardCount = diffs.filter(d => d === 'hard').length;

  if (hardCount > 0) {
    return { lastWeight, suggestion: lastWeight, reason: 'Hard last time — hold weight' };
  }

  if (easyCount === diffs.length) {
    // Check if previous session was also all-easy
    const prev = sessions[sessions.length - 2];
    const prevAllEasy = prev &&
      prev.map(l => l.difficulty).filter(Boolean).every(d => d === 'easy');

    const bump = prevAllEasy ? 10 : 5;
    const reason = prevAllEasy
      ? 'Easy 2 sessions running — increase weight'
      : 'Easy last time — try more';
    return { lastWeight, suggestion: lastWeight + bump, reason };
  }

  return { lastWeight, suggestion: lastWeight, reason: 'Felt right — maintain weight' };
}

function getSuggestedWeight(exIdx) {
  if (!session) return '';
  const exName = session.exercises[exIdx].name;
  const s = getProgressionSuggestion(exName);
  if (s) return String(s.suggestion);
  // Fall back to last logged weight
  const all = JSON.parse(localStorage.getItem('liftlab_weights') || '[]');
  const matches = all.filter(l => l.exerciseName === exName);
  return matches.length ? String(matches[matches.length - 1].weight || '') : '';
}

// ========================
// ACTIVE SESSION
// ========================

let session = null;
let elapsedInterval = null;

let warmupTimerId = null;

function clearWarmupTimer() {
  if (warmupTimerId) {
    clearInterval(warmupTimerId);
    warmupTimerId = null;
  }
}

// ========================
// SESSION PERSISTENCE
// ========================

function saveSession() {
  if (!session) return;
  const toSave = {
    dayIndex: session.dayIndex,
    day: session.day,
    exIdx: session.exIdx,
    setNum: session.setNum,
    weight: session.weight,
    difficulty: session.difficulty,
    logs: session.logs,
    restRemaining: 0,
    timerState: 'idle',
    startedAt: session.startedAt,
    exercises: session.exercises,
    wod: session.wod,
  };
  localStorage.setItem('liftlab_active_session', JSON.stringify(toSave));
}

function clearSession() {
  localStorage.removeItem('liftlab_active_session');
  session = null;
  updateActiveBorder(false);
  showWorkoutControls(false);
  // Also clear paused state if it was set
  document.getElementById('app').classList.remove('session-paused');
}

function updateActiveBorder(isActive) {
  const app    = document.getElementById('app');
  const banner = document.getElementById('active-session-banner');
  if (isActive) {
    app.classList.add('session-active');
    banner.classList.remove('hidden');
    startElapsedTimer();
  } else {
    app.classList.remove('session-active');
    banner.classList.add('hidden');
    stopElapsedTimer();
  }
}

function startElapsedTimer() {
  stopElapsedTimer();
  elapsedInterval = setInterval(() => {
    if (!session || !session.startedAt) return;
    const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timeStr = `${m}:${String(s).padStart(2, '0')}`;
    const bannerEl = document.getElementById('active-banner-timer');
    if (bannerEl) bannerEl.textContent = timeStr;
    const topEl = document.getElementById('active-top-timer');
    if (topEl) topEl.textContent = timeStr;
  }, 1000);
}

function stopElapsedTimer() {
  if (elapsedInterval) {
    clearInterval(elapsedInterval);
    elapsedInterval = null;
  }
}

function checkForActiveSession() {
  const saved = localStorage.getItem('liftlab_active_session');
  if (!saved) return false;
  try {
    const parsed = JSON.parse(saved);
    if (!parsed || !parsed.exercises || !parsed.exercises.length) {
      localStorage.removeItem('liftlab_active_session');
      return false;
    }
    showResumePrompt(parsed);
    return true;
  } catch (e) {
    localStorage.removeItem('liftlab_active_session');
    return false;
  }
}

function showWorkoutControls(show) {
  const nav      = document.getElementById('bottom-nav');
  const controls = document.getElementById('workout-controls');
  if (!nav || !controls) return;
  if (show) {
    nav.classList.add('hidden');
    controls.classList.remove('hidden');
  } else {
    nav.classList.remove('hidden');
    controls.classList.add('hidden');
  }
}

function togglePauseWorkout() {
  if (!session) return;
  if (session.paused) {
    session.paused = false;
    saveSession();
    document.getElementById('app').classList.remove('session-paused');
    document.getElementById('app').classList.add('session-active');
    const banner = document.getElementById('active-session-banner');
    if (banner) banner.classList.remove('paused');
    const label = document.getElementById('active-banner-label');
    if (label) label.textContent = 'Session in progress';
    renderActiveExercise();
  } else {
    clearRestTimer();
    session.paused = true;
    saveSession();
    document.getElementById('app').classList.remove('session-active');
    document.getElementById('app').classList.add('session-paused');
    const banner = document.getElementById('active-session-banner');
    if (banner) banner.classList.add('paused');
    const label = document.getElementById('active-banner-label');
    if (label) label.textContent = 'Workout paused — tap to resume';
    showWorkoutControls(false);
    updatePauseButtonUI();
  }
}

function updatePauseButtonUI() {
  const btn = document.getElementById('pause-workout-btn');
  if (btn) {
    if (session && session.paused) {
      btn.textContent = 'Resume';
      btn.classList.remove('pause-btn');
      btn.classList.add('resume-btn');
    } else {
      btn.textContent = 'Pause';
      btn.classList.remove('resume-btn');
      btn.classList.add('pause-btn');
    }
  }
  // Sync top-bar pause/play icon
  const topIcon = document.querySelector('#top-pause-btn i');
  if (topIcon) {
    topIcon.className = (session && session.paused)
      ? 'ti ti-player-play'
      : 'ti ti-player-pause';
  }
}

function endWorkoutPrompt() {
  const container = document.getElementById('screen-container');
  const overlay   = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-card">
      <div class="confirm-title">End this workout?</div>
      <div class="confirm-sub">Your progress will be saved,<br>but the session will close.</div>
      <div class="confirm-btns">
        <button class="confirm-yes" id="confirm-end-yes">End workout</button>
        <button class="confirm-no" id="confirm-end-no">Keep going</button>
      </div>
    </div>
  `;
  container.appendChild(overlay);

  document.getElementById('confirm-end-yes').addEventListener('click', () => {
    overlay.remove();
    renderSessionComplete();
  });
  document.getElementById('confirm-end-no').addEventListener('click', () => {
    overlay.remove();
  });
}

function showResumePrompt(saved) {
  const container = document.getElementById('screen-container');
  const ex      = saved.exercises[saved.exIdx];
  const exName  = ex ? ex.name : 'your workout';
  const setInfo = ex ? `Set ${saved.setNum} of ${ex.sets}` : '';
  const elapsed = saved.startedAt
    ? Math.floor((Date.now() - saved.startedAt) / 60000)
    : 0;

  container.innerHTML = `
    <div class="resume-screen">
      <div class="resume-icon">▶</div>
      <div class="resume-title">Workout in progress</div>
      <div class="resume-ex">${exName}</div>
      <div class="resume-set">${setInfo} · ${elapsed} min elapsed</div>
      <button class="resume-btn-yes" id="resume-yes">Resume session</button>
      <button class="resume-btn-end" id="resume-end">End session</button>
    </div>
  `;

  document.getElementById('resume-yes').addEventListener('click', () => {
    session = saved;
    session.timerId = null;
    session.restRemaining = 0;
    session.timerState = 'idle';
    if (!session.day) session.day = getWeekProgram()[session.dayIndex];
    updateActiveBorder(true);
    navigateTo('workout');
    renderActiveExercise();
  });

  document.getElementById('resume-end').addEventListener('click', () => {
    clearSession();
    updateActiveBorder(false);
    renderHome();
  });
}

function startActiveSession(dayIndex) {
  clearRestTimer();
  clearWarmupTimer();
  const weekState = getWeekState();
  const program = getWeekProgram();
  const day = program[dayIndex];

  if (weekState.weekType === 'B' && day.hasWarmup) {
    renderBikeWarmup(dayIndex);
  } else {
    beginStrengthSession(dayIndex);
  }
}

function beginStrengthSession(dayIndex) {
  circleMode = 'logging';
  clearRestTimer();
  clearWarmupTimer();
  const weekState = getWeekState();
  const program = getWeekProgram();
  const day = program[dayIndex];
  const buf = getBufferState();
  const bufExercises = buf.exercises && buf.exercises.length > 0 ? buf.exercises : [];
  const customExercises = getDayExercises(weekState.weekType, dayIndex);
  session = {
    dayIndex,
    day,
    exercises: [...customExercises, ...bufExercises],
    exIdx: 0,
    setNum: 1,
    weight: '',
    difficulty: null,
    logs: [],
    timerId: null,
    restRemaining: 0,
    timerState: 'idle',
    wod: day.wod || null,
    startedAt: Date.now(),
  };
  session.weight = getSuggestedWeight(0);
  updateActiveBorder(true);
  saveSession();
  renderActiveExercise();
}


function clearRestTimer() {
  if (session && session.timerId) {
    clearInterval(session.timerId);
    session.timerId = null;
  }
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderActiveExercise() {
  clearRestTimer();
  if (!session) return;
  showWorkoutControls(true);

  const ex = session.exercises[session.exIdx];
  const photoUrl = ex.image || getWorkoutPhotoUrl(getWeekState().weekType, session.dayIndex);

  session.restRemaining = ex.rest;
  session.timerState = 'idle';
  session.difficulty = null;

  const dotHTML = Array.from({length: ex.sets}, (_, i) =>
    `<div class="active-set-dot ${i < session.setNum ? 'filled' : ''}"></div>`
  ).join('');

  const elapsed = session.startedAt ? Math.floor((Date.now() - session.startedAt) / 1000) : 0;
  const em = Math.floor(elapsed / 60);
  const es = elapsed % 60;
  const elapsedStr = `${em}:${String(es).padStart(2, '0')}`;

  let circleHTML;
  let diffRowHTML = '';

  if (circleMode === 'resting') {
    const restDashOffset = ex.rest > 0 ? 490 * (1 - session.restRemaining / ex.rest) : 0;
    circleHTML = `
      <div class="active-circle-wrap" id="rest-circle">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="78" fill="none" stroke="#1A1640" stroke-width="6"/>
          <circle cx="90" cy="90" r="78" fill="none" stroke="#5B4EFF" stroke-width="6"
            stroke-linecap="round"
            stroke-dasharray="490"
            stroke-dashoffset="${restDashOffset}"
            transform="rotate(-90 90 90)"
            id="rest-ring" />
          <text x="90" y="96" text-anchor="middle" font-size="34" font-weight="500" fill="#ffffff" id="rest-countdown-text">${formatTime(session.restRemaining)}</text>
        </svg>
        <div class="active-rest-hint">tap circle to skip rest</div>
      </div>
    `;
  } else {
    circleHTML = `
      <div class="active-circle-wrap">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="78" fill="none" stroke="#1A1640" stroke-width="3"/>
        </svg>
        <input type="number" id="weight-input" class="active-weight-input" value="${session.weight}" inputmode="decimal" />
        <span class="active-weight-unit">lbs</span>
        <div class="active-weight-minus" id="weight-minus">−</div>
        <div class="active-weight-plus" id="weight-plus">+</div>
      </div>
    `;
    diffRowHTML = `
      <div class="active-diff-row">
        <div class="active-diff-pill" data-diff="easy">Easy</div>
        <div class="active-diff-pill" data-diff="right">Right</div>
        <div class="active-diff-pill" data-diff="hard">Hard</div>
      </div>
    `;
  }

  const container = document.getElementById('screen-container');
  container.innerHTML = `
    <div class="active-screen">

      <div class="active-top-bar">
        <div class="active-top-pause" id="top-pause-btn">
          <i class="ti ti-player-pause" aria-hidden="true"></i>
        </div>
        <span class="active-top-timer" id="active-top-timer">${elapsedStr}</span>
        <div class="active-top-spacer"></div>
      </div>

      <div class="active-hero">
        <img class="active-hero-img" src="${photoUrl}" alt="${ex.name}" referrerpolicy="no-referrer" />
        <div class="active-hero-overlay"></div>
        <div class="active-set-dots">${dotHTML}</div>
      </div>

      <div class="active-panel">
        <div class="active-set-label">SET ${session.setNum} OF ${ex.sets}</div>
        <div class="active-ex-name">${ex.name}</div>
        <div class="active-ex-target">Target ${ex.reps} reps</div>
        ${circleHTML}
        ${diffRowHTML}
      </div>

    </div>
  `;

  document.getElementById('top-pause-btn').addEventListener('click', togglePauseWorkout);
  document.getElementById('end-workout-btn').addEventListener('click', endWorkoutPrompt);
  updatePauseButtonUI();

  if (circleMode === 'resting') {
    document.getElementById('rest-circle').addEventListener('click', () => {
      clearRestTimer();
      onRestComplete();
    });
    startRestTimer();
  } else {
    const weightInput = document.getElementById('weight-input');
    weightInput.addEventListener('focus', (e) => { e.target.select(); });
    weightInput.addEventListener('change', (e) => {
      session.weight = parseFloat(e.target.value) || 0;
      saveSession();
    });
    document.getElementById('weight-minus').addEventListener('click', () => {
      session.weight = Math.max(0, (parseFloat(session.weight) || 0) - 5);
      document.getElementById('weight-input').value = session.weight;
      saveSession();
    });
    document.getElementById('weight-plus').addEventListener('click', () => {
      session.weight = (parseFloat(session.weight) || 0) + 5;
      document.getElementById('weight-input').value = session.weight;
      saveSession();
    });

    document.querySelectorAll('.active-diff-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        session.difficulty = pill.dataset.diff;
        logCurrentSet();
        circleMode = 'resting';
        renderActiveExercise();
        startRestTimer();
      });
    });
  }
}

function handleRestBtn() {
  const btn = document.getElementById('rest-btn');
  if (!btn) return;
  if (btn.textContent.trim() === 'Start') {
    startRestTimer();
  } else {
    clearRestTimer();
    advanceSession();
  }
}

function startRestTimer() {
  clearRestTimer();
  const display = document.getElementById('rest-display');
  const btn     = document.getElementById('rest-btn');
  const ctEl    = document.getElementById('rest-countdown-text');
  const ringEl  = document.getElementById('rest-ring');

  // Exit if no display targets exist in either layout
  if (!display && !ctEl) return;

  const ex = session.exercises[session.exIdx];
  const totalRest = ex ? ex.rest : 60;

  session.timerState = 'running';

  // Old layout setup
  if (display) { display.className = 'rest-timer-display running'; }
  if (btn)     { btn.textContent = 'Skip'; }

  session.timerId = setInterval(() => {
    session.restRemaining = Math.max(0, session.restRemaining - 1);
    const d  = document.getElementById('rest-display');
    const b  = document.getElementById('rest-btn');
    const ct = document.getElementById('rest-countdown-text');
    const rr = document.getElementById('rest-ring');

    // Bail if both display targets gone (user navigated away)
    if (!d && !ct) { clearInterval(session.timerId); session.timerId = null; return; }

    if (d)  d.textContent = formatTime(session.restRemaining);
    if (ct) ct.textContent = formatTime(session.restRemaining);
    if (rr) {
      const offset = totalRest > 0 ? 490 * (1 - session.restRemaining / totalRest) : 490;
      rr.setAttribute('stroke-dashoffset', String(offset));
    }

    if (session.restRemaining <= 0) {
      clearInterval(session.timerId);
      session.timerId = null;
      session.timerState = 'done';
      if (d) { d.className = 'rest-timer-display done'; }
      if (b) { b.textContent = 'Next'; }
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      if (circleMode === 'resting') { onRestComplete(); }
    }
  }, 1000);
}

function logCurrentSet() {
  const ex = session.exercises[session.exIdx];
  const weightVal = parseFloat(document.getElementById('weight-input').value) || 0;
  session.weight = weightVal ? String(weightVal) : '';

  const entry = {
    dayIndex: session.dayIndex,
    dayLabel: session.day.label,
    exIdx: session.exIdx,
    exerciseName: ex.name,
    setNum: session.setNum,
    weight: weightVal,
    difficulty: session.difficulty,
    ts: Date.now(),
  };

  session.logs.push(entry);
  saveSession();
  const all = JSON.parse(localStorage.getItem('liftlab_weights') || '[]');
  all.push(entry);
  localStorage.setItem('liftlab_weights', JSON.stringify(all));

  const totalSets = session.exercises.reduce((acc, e) => acc + e.sets, 0);
  const doneSets = session.logs.length;
  const pct = Math.round((doneSets / totalSets) * 100);
  const fill = document.getElementById('progress-fill');
  const cnt = document.getElementById('progress-count');
  if (fill) fill.style.width = `${pct}%`;
  if (cnt) cnt.textContent = `${doneSets} / ${totalSets} sets`;

  const logBtn = document.getElementById('log-set-btn');
  if (logBtn) logBtn.disabled = true;

  session.restRemaining = ex.rest;
  startRestTimer();
}

function advanceSession() {
  clearRestTimer();
  const ex = session.exercises[session.exIdx];

  if (session.setNum < ex.sets) {
    session.setNum++;
    saveSession();
    renderActiveExercise();
  } else if (session.exIdx < session.exercises.length - 1) {
    session.exIdx++;
    session.setNum = 1;
    session.weight = getSuggestedWeight(session.exIdx);
    saveSession();
    renderActiveExercise();
  } else if (session.wod) {
    renderWodScreen();
  } else {
    renderSessionComplete();
  }
}

function onRestComplete() {
  circleMode = 'logging';
  saveSession();
  advanceSession();
}

function renderSessionComplete() {
  clearRestTimer();
  showWorkoutControls(false);
  const container = document.getElementById('screen-container');
  const totalSets = session.logs.length;

  const rows = session.exercises.map((ex, i) => {
    const exLogs = session.logs.filter(l => l.exIdx === i);
    if (!exLogs.length) return '';
    const weightTotal = exLogs.reduce((s, l) => s + l.weight, 0);
    const avgWeight = weightTotal > 0 ? (weightTotal / exLogs.length).toFixed(1) : null;
    const lastDiff = exLogs[exLogs.length - 1]?.difficulty ?? '—';
    const diffClass = { easy: 'diff-easy', right: 'diff-right', hard: 'diff-hard' }[lastDiff] || '';
    return `
      <div class="session-summary-row">
        <span class="session-summary-name">${ex.name}</span>
        <span class="session-summary-weight">${avgWeight ? avgWeight + ' lbs' : '—'}</span>
        <span class="session-summary-diff ${diffClass}">${lastDiff}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="session-complete-screen">
      <div class="session-complete-hero">
        <div class="session-complete-icon">✓</div>
        <div class="session-complete-title">Workout complete!</div>
        <div class="session-complete-meta">${session.day.label} · ${totalSets} sets logged</div>
      </div>
      <div class="session-summary-label">Summary</div>
      <div class="session-summary-card">
        <div class="session-summary-header">
          <span>Exercise</span>
          <span>Weight</span>
          <span>Feel</span>
        </div>
        ${rows}
      </div>
      <button class="log-set-btn" id="done-btn">Done</button>
    </div>
  `;

  document.getElementById('done-btn').addEventListener('click', () => {
    saveBufferState({ exercises: [], fromDayKey: null, fromDayIndex: null });
    clearSession();
    navigateTo('home');
  });
}

// ========================
// BIKE WARM-UP SCREEN
// ========================

function renderBikeWarmup(dayIndex) {
  clearWarmupTimer();
  const day = PROGRAM_B[dayIndex];
  let remaining = day.warmupDuration;
  const total = day.warmupDuration;

  function drawWarmup() {
    const pct = ((total - remaining) / total) * 100;
    const isDone = remaining === 0;
    const container = document.getElementById('screen-container');
    if (!container) return;

    container.innerHTML = `
      <div class="warmup-screen">
        <div class="warmup-header">
          <div class="warmup-title">Warm-up</div>
          <div class="warmup-meta">Stationary Bike · ${day.label}</div>
        </div>

        <div class="warmup-timer-wrap">
          <div class="warmup-bike-icon">🚴</div>
          <div class="warmup-timer-display ${isDone ? 'done' : ''}" id="warmup-display">
            ${formatTime(remaining)}
          </div>
          <div class="warmup-progress-track">
            <div class="warmup-progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>

        <div class="warmup-message">
          ${isDone ? 'Warm-up complete! Time to lift.' : 'Get on the bike and spin it out.'}
        </div>

        ${isDone
          ? `<button class="log-set-btn" id="warmup-done-btn">Start strength work →</button>`
          : `<button class="warmup-skip-btn" id="warmup-skip-btn">Skip warm-up</button>`
        }
      </div>
    `;

    if (isDone) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      document.getElementById('warmup-done-btn').addEventListener('click', () => {
        clearWarmupTimer();
        beginStrengthSession(dayIndex);
      });
    } else {
      document.getElementById('warmup-skip-btn').addEventListener('click', () => {
        clearWarmupTimer();
        beginStrengthSession(dayIndex);
      });
    }
  }

  drawWarmup();

  warmupTimerId = setInterval(() => {
    remaining = Math.max(0, remaining - 1);
    const display = document.getElementById('warmup-display');
    const fill   = document.querySelector('.warmup-progress-fill');
    const pct    = ((total - remaining) / total) * 100;

    if (display) display.textContent = formatTime(remaining);
    if (fill)    fill.style.width = `${pct}%`;

    if (remaining === 0) {
      clearWarmupTimer();
      drawWarmup();
    }
  }, 1000);
}

// ========================
// WOD SCREEN
// ========================

function renderWodScreen() {
  const wod = session.wod;
  const container = document.getElementById('screen-container');
  const countUp = wod.format === 'Rounds for Time';
  const totalTime = wod.duration || 0;
  let remaining = totalTime;
  let elapsed = 0;
  let roundCount = 0;
  let timerRunning = false;
  let wodTimerId = null;

  function stopWodTimer() {
    if (wodTimerId) { clearInterval(wodTimerId); wodTimerId = null; }
  }

  function getTimeDisplay() {
    return countUp ? formatTime(elapsed) : formatTime(remaining);
  }

  const movementRows = wod.movements.map((m, i) => `
    <div class="wod-movement-row">
      ${m.image ? `<img class="wod-movement-thumb" src="${m.image}" alt="${m.name}" />` : `<div class="wod-movement-number">${i + 1}</div>`}
      <div class="wod-movement-info">
        <div class="wod-movement-name">${m.name}</div>
        ${m.minute ? `<div class="wod-movement-meta">Minute ${m.minute}</div>` : ''}
      </div>
      <div class="wod-movement-reps">${m.reps}</div>
    </div>
  `).join('');

  function drawWod() {
    const timeDone = !countUp && remaining <= 0;
    const roundLabel = countUp
      ? `${roundCount} / ${wod.rounds}`
      : String(roundCount);

    container.innerHTML = `
      <div class="wod-screen">

        <div class="wod-header">
          <div class="wod-label">${wod.label}</div>
          <div class="wod-day-meta">${session.day.label}</div>
        </div>

        <div class="wod-timer-block">
          <div class="wod-timer-label">${countUp ? 'Elapsed' : 'Time remaining'}</div>
          <div class="wod-timer-display ${timerRunning ? 'running' : timeDone ? 'done' : ''}" id="wod-timer-display">
            ${getTimeDisplay()}
          </div>
          ${!countUp ? `
            <div class="wod-timer-track">
              <div class="wod-timer-fill" id="wod-timer-fill"
                   style="width: ${totalTime ? ((totalTime - remaining) / totalTime * 100) : 0}%"></div>
            </div>
          ` : ''}
          <button class="rest-timer-btn" id="wod-timer-btn" ${timeDone ? 'disabled' : ''}>
            ${timerRunning ? 'Pause' : elapsed > 0 || remaining < totalTime ? 'Resume' : 'Start WOD'}
          </button>
        </div>

        <div class="wod-section-label">Movements</div>
        <div class="wod-movements-card">${movementRows}</div>

        <div class="wod-rounds-block">
          <span class="wod-rounds-label">${countUp ? 'Round' : 'Rounds completed'}</span>
          <div class="wod-rounds-controls">
            <button class="wod-rounds-btn" id="wod-rounds-minus">−</button>
            <span class="wod-rounds-count" id="wod-rounds-count">${roundLabel}</span>
            <button class="wod-rounds-btn wod-rounds-btn-add" id="wod-rounds-plus">+</button>
          </div>
        </div>

        <button class="log-set-btn" id="wod-finish-btn">Finish WOD</button>

      </div>
    `;

    document.getElementById('wod-timer-btn').addEventListener('click', () => {
      if (timerRunning) {
        stopWodTimer();
        timerRunning = false;
        const btn = document.getElementById('wod-timer-btn');
        const display = document.getElementById('wod-timer-display');
        if (btn) btn.textContent = 'Resume';
        if (display) display.className = 'wod-timer-display';
      } else {
        if (!countUp && remaining <= 0) return;
        timerRunning = true;
        const btn = document.getElementById('wod-timer-btn');
        const display = document.getElementById('wod-timer-display');
        if (btn) btn.textContent = 'Pause';
        if (display) display.className = 'wod-timer-display running';

        wodTimerId = setInterval(() => {
          if (countUp) {
            elapsed++;
          } else {
            remaining = Math.max(0, remaining - 1);
            elapsed = totalTime - remaining;
          }

          const d = document.getElementById('wod-timer-display');
          const f = document.getElementById('wod-timer-fill');
          if (!d) { stopWodTimer(); return; }

          d.textContent = getTimeDisplay();
          if (f && totalTime) f.style.width = `${(elapsed / totalTime) * 100}%`;

          if (!countUp && remaining <= 0) {
            stopWodTimer();
            timerRunning = false;
            d.className = 'wod-timer-display done';
            const b = document.getElementById('wod-timer-btn');
            if (b) { b.textContent = "Time's up!"; b.disabled = true; }
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
          }
        }, 1000);
      }
    });

    document.getElementById('wod-rounds-plus').addEventListener('click', () => {
      roundCount++;
      const el = document.getElementById('wod-rounds-count');
      if (el) el.textContent = countUp ? `${roundCount} / ${wod.rounds}` : String(roundCount);
    });

    document.getElementById('wod-rounds-minus').addEventListener('click', () => {
      if (roundCount > 0) roundCount--;
      const el = document.getElementById('wod-rounds-count');
      if (el) el.textContent = countUp ? `${roundCount} / ${wod.rounds}` : String(roundCount);
    });

    document.getElementById('wod-finish-btn').addEventListener('click', () => {
      stopWodTimer();
      renderSessionComplete();
    });
  }

  drawWod();
}

// ========================
// EXERCISE ASSETS
// ========================

function getExerciseCache() {
  try { return JSON.parse(localStorage.getItem('liftlab_exercise_cache') || '{}'); }
  catch { return {}; }
}

function saveExerciseCache(cache) {
  try { localStorage.setItem('liftlab_exercise_cache', JSON.stringify(cache)); }
  catch { /* storage full */ }
}

async function fetchExerciseGif(exerciseName) {
  if (!EXERCISEDB_KEY) return null;

  const cache = getExerciseCache();
  if (cache[exerciseName]) return cache[exerciseName];

  const searchTerm = EXERCISE_NAME_MAP[exerciseName] || exerciseName.toLowerCase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(searchTerm)}?limit=1`,
      {
        headers: {
          'X-RapidAPI-Key': EXERCISEDB_KEY,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const exercise = data[0];
    const gifUrl = exercise.gifUrl || `https://v2.exercisedb.io/image/${exercise.id}`;
    cache[exerciseName] = gifUrl;
    saveExerciseCache(cache);
    return gifUrl;
  } catch {
    return null;
  }
}

// ========================
// UTILITY HELPERS
// ========================

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getTodayDateLabel() {
  return new Date().toLocaleDateString('en-CA', {
    weekday: 'long', month: 'short', day: 'numeric'
  });
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ========================
// INIT
// ========================
function migrateWeightsToLbs() {
  if (localStorage.getItem('liftlab_unit_migration_v1') === 'done') return;
  const all = JSON.parse(localStorage.getItem('liftlab_weights') || '[]');
  const converted = all.map(entry => {
    if (entry.weight) {
      const lbs = entry.weight * 2.20462;
      entry.weight = Math.round(lbs / 2.5) * 2.5;
    }
    return entry;
  });
  localStorage.setItem('liftlab_weights', JSON.stringify(converted));
  localStorage.setItem('liftlab_unit_migration_v1', 'done');
}

migrateWeightsToLbs();
document.getElementById('pause-workout-btn').addEventListener('click', togglePauseWorkout);

if (!checkForActiveSession()) {
  navigateTo('home');
}