import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STORAGE_KEY = 'workout-tracker-v3';
const CONFIG = window.WORKOUT_APP_CONFIG || {};
const TRAINING_PLAN = [
  { day: 'Monday', training: 'Easy Run' },
  { day: 'Tuesday', training: 'Strength A + Upper (Push/Pull)' },
  { day: 'Wednesday', training: 'Tempo / Intervals' },
  { day: 'Thursday', training: 'Easy Run' },
  { day: 'Friday', training: 'Strength B + Upper (Pull/Push)' },
  { day: 'Saturday', training: 'Long Run' },
  { day: 'Sunday', training: 'Rest / Recovery' }
];

const ROUTINE_REFERENCE = {
  'Workout A': [
    { exercise: 'Barbell Squat', sets: '4', reps: '4-6', startWeight: '50 kg', muscles: 'Quads, glutes, core', notes: '' },
    { exercise: 'Romanian Deadlift', sets: '3', reps: '6-8', startWeight: '40 kg', muscles: 'Hamstrings, glutes', notes: '' },
    { exercise: 'Walking Lunges', sets: '3', reps: '8-10/leg', startWeight: 'Bodyweight or 2x8 kg', muscles: 'Quads, glutes', notes: '' },
    { exercise: 'Standing Calf Raises', sets: '3', reps: '10-12', startWeight: 'Bodyweight', muscles: 'Calves', notes: '' },
    { exercise: 'Plank', sets: '3', reps: '45-60s', startWeight: 'Bodyweight', muscles: 'Core', notes: '' },
    { exercise: 'Push-ups', sets: '3', reps: '8-12', startWeight: 'Bodyweight', muscles: 'Chest, shoulders, triceps', notes: '' },
    { exercise: 'Dumbbell Row', sets: '3', reps: '8-10/arm', startWeight: '12 kg', muscles: 'Back, lats', notes: '' }
  ],
  'Workout B': [
    { exercise: 'Bulgarian Split Squat', sets: '3', reps: '6-8/leg', startWeight: 'Bodyweight or 2x6 kg', muscles: 'Quads, glutes', notes: '' },
    { exercise: 'Hip Thrust', sets: '3', reps: '6-8', startWeight: '40 kg', muscles: 'Glutes', notes: '' },
    { exercise: 'Single-leg RDL', sets: '3', reps: '8/leg', startWeight: '8 kg', muscles: 'Hamstrings, glutes', notes: '' },
    { exercise: 'Tibialis Raises', sets: '3', reps: '12-15', startWeight: 'Bodyweight', muscles: 'Shins', notes: '' },
    { exercise: 'Side Plank', sets: '3', reps: '30-45s', startWeight: 'Bodyweight', muscles: 'Core, obliques', notes: '' },
    { exercise: 'Pull-ups / Assisted', sets: '3', reps: 'AMRAP', startWeight: 'Bodyweight / assisted', muscles: 'Back, lats', notes: '' },
    { exercise: 'Bicep Curl', sets: '2', reps: '10', startWeight: '8 kg', muscles: 'Biceps', notes: '' },
    { exercise: 'Tricep Pushdown', sets: '2', reps: '10', startWeight: 'Light', muscles: 'Triceps', notes: '' }
  ]
};

const DEFAULT_TEMPLATES = {
  'Workout A': [
    'Barbell squat',
    'Romanian deadlift',
    'Bench press',
    'Bent-over row',
    'Plank'
  ],
  'Workout B': [
    'Deadlift',
    'Overhead press',
    'Pull-up or lat pulldown',
    'Split squat',
    'Cable crunch'
  ]
};

const AUTH_MODES = {
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
  RESET: 'reset'
};

const emptyState = () => ({
  workouts: [],
  templates: structuredClone(DEFAULT_TEMPLATES),
  currentStrength: {
    selectedWorkout: 'Workout A',
    date: todayISO(),
    notes: '',
    checks: {}
  },
  meta: {
    lastSyncedAt: '',
    cloudEnabled: false
  }
});

let state = loadState();
let deferredPrompt = null;
let session = null;
let syncTimer = null;
let supabase = null;
let authMode = AUTH_MODES.SIGN_IN;

const els = {
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.tab-panel'),
  totalWorkouts: document.getElementById('totalWorkouts'),
  totalRuns: document.getElementById('totalRuns'),
  totalDistance: document.getElementById('totalDistance'),
  thisWeek: document.getElementById('thisWeek'),
  quickAddForm: document.getElementById('quickAddForm'),
  quickDate: document.getElementById('quickDate'),
  quickType: document.getElementById('quickType'),
  quickDistance: document.getElementById('quickDistance'),
  quickDuration: document.getElementById('quickDuration'),
  quickNotes: document.getElementById('quickNotes'),
  clearQuickAdd: document.getElementById('clearQuickAdd'),
  historyFilter: document.getElementById('historyFilter'),
  historyList: document.getElementById('historyList'),
  historyEmpty: document.getElementById('historyEmpty'),
  historyTemplate: document.getElementById('historyItemTemplate'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile'),
  runForm: document.getElementById('runForm'),
  runDate: document.getElementById('runDate'),
  runDistance: document.getElementById('runDistance'),
  runDuration: document.getElementById('runDuration'),
  runPace: document.getElementById('runPace'),
  runNotes: document.getElementById('runNotes'),
  workoutSelector: document.getElementById('workoutSelector'),
  strengthDate: document.getElementById('strengthDate'),
  strengthNotes: document.getElementById('strengthNotes'),
  strengthChecklist: document.getElementById('strengthChecklist'),
  strengthProgress: document.getElementById('strengthProgress'),
  resetWorkoutBtn: document.getElementById('resetWorkoutBtn'),
  completeWorkoutBtn: document.getElementById('completeWorkoutBtn'),
  templateEditor: document.getElementById('templateEditor'),
  saveTemplatesBtn: document.getElementById('saveTemplatesBtn'),
  resetTemplatesBtn: document.getElementById('resetTemplatesBtn'),
  installBtn: document.getElementById('installBtn'),
  weeklyPlan: document.getElementById('weeklyPlan'),
  routineReference: document.getElementById('routineReference'),
  selectedRoutineReference: document.getElementById('selectedRoutineReference'),
  authSummary: document.getElementById('authSummary'),
  authToggleBtn: document.getElementById('authToggleBtn'),
  authModal: document.getElementById('authModal'),
  authModalBackdrop: document.getElementById('authModalBackdrop'),
  authCloseBtn: document.getElementById('authCloseBtn'),
  authForm: document.getElementById('authForm'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authConfirmPassword: document.getElementById('authConfirmPassword'),
  authPasswordWrap: document.getElementById('authPasswordWrap'),
  authConfirmWrap: document.getElementById('authConfirmWrap'),
  authModeSignIn: document.getElementById('authModeSignIn'),
  authModeSignUp: document.getElementById('authModeSignUp'),
  authModeReset: document.getElementById('authModeReset'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  authModalText: document.getElementById('authModalText'),
  authModalStatus: document.getElementById('authModalStatus'),
  loadCloudBtn: document.getElementById('loadCloudBtn'),
  syncNowBtn: document.getElementById('syncNowBtn'),
  signOutBtn: document.getElementById('signOutBtn'),
  signedInAs: document.getElementById('signedInAs'),
  localStatus: document.getElementById('localStatus'),
  cloudStatus: document.getElementById('cloudStatus'),
  lastSync: document.getElementById('lastSync'),
  authHint: document.getElementById('authHint')
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return emptyState();

  try {
    const parsed = JSON.parse(saved);
    return {
      ...emptyState(),
      ...parsed,
      workouts: parsed.workouts ?? [],
      templates: parsed.templates ?? structuredClone(DEFAULT_TEMPLATES),
      currentStrength: parsed.currentStrength ?? emptyState().currentStrength,
      meta: {
        lastSyncedAt: parsed.meta?.lastSyncedAt ?? '',
        cloudEnabled: Boolean(parsed.meta?.cloudEnabled)
      }
    };
  } catch {
    return emptyState();
  }
}

function saveState({ scheduleSync = true } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  els.localStatus.textContent = `Saved ${formatDateTime(new Date().toISOString())}`;
  if (scheduleSync) scheduleCloudSave();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return 'No date';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatDateTime(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function durationToSeconds(value) {
  if (!value) return 0;
  const parts = value.split(':').map(Number);
  if (parts.length === 2) {
    const [hh, mm] = parts;
    return hh * 3600 + mm * 60;
  }
  const [hh, mm, ss] = parts;
  return hh * 3600 + mm * 60 + ss;
}

function paceFrom(distance, durationClock) {
  const seconds = durationToSeconds(durationClock);
  const km = Number(distance);
  if (!seconds || !km) return '';
  const secPerKm = seconds / km;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60).toString().padStart(2, '0');
  return `${mins}:${secs} /km`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function setActiveTab(tabId) {
  els.tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  els.panels.forEach(panel => panel.classList.toggle('active', panel.id === tabId));
}

function addWorkout(entry) {
  state.workouts.unshift({
    id: crypto.randomUUID(),
    ...entry,
    createdAt: new Date().toISOString()
  });
  saveState();
  renderAll();
}

function deleteWorkout(id) {
  state.workouts = state.workouts.filter(item => item.id !== id);
  saveState();
  renderAll();
}

function renderSummary() {
  const workouts = state.workouts;
  const runs = workouts.filter(w => w.type === 'Run');
  const totalDistance = runs.reduce((sum, run) => sum + (Number(run.distance) || 0), 0);
  const weekStart = startOfWeek(new Date());
  const thisWeekCount = workouts.filter(w => {
    const when = new Date(`${w.date}T00:00:00`);
    return when >= weekStart;
  }).length;

  els.totalWorkouts.textContent = workouts.length;
  els.totalRuns.textContent = runs.length;
  els.totalDistance.textContent = `${totalDistance.toFixed(2)} km`;
  els.thisWeek.textContent = thisWeekCount;
}


function getWorkoutNames() {
  const referenceNames = Object.keys(ROUTINE_REFERENCE);
  return referenceNames.length ? referenceNames : Object.keys(state.templates);
}

function getWorkoutExercises(workoutName) {
  const referenceItems = ROUTINE_REFERENCE[workoutName];
  if (Array.isArray(referenceItems) && referenceItems.length) {
    return referenceItems.map(item => item.exercise);
  }
  return state.templates[workoutName] ?? [];
}

function renderHistory() {
  els.historyList.innerHTML = '';
  const filter = els.historyFilter.value;

  const filtered = state.workouts.filter(workout => {
    if (filter === 'all') return true;
    if (filter === 'Run') return workout.type === 'Run';
    if (filter === 'strength') return ['Workout A', 'Workout B', 'Upper', 'Lower', 'Full Body'].includes(workout.type);
    return true;
  });

  els.historyEmpty.style.display = filtered.length ? 'none' : 'block';

  filtered.forEach(workout => {
    const node = els.historyTemplate.content.firstElementChild.cloneNode(true);
    const title = node.querySelector('.history-title');
    const meta = node.querySelector('.history-meta');
    const del = node.querySelector('.danger-link');

    title.textContent = `${workout.type} • ${formatDate(workout.date)}`;

    const details = [];
    if (workout.distance) details.push(`${Number(workout.distance).toFixed(2)} km`);
    if (workout.duration) details.push(workout.duration);
    if (workout.pace) details.push(workout.pace);
    if (workout.notes) details.push(workout.notes);
    meta.textContent = details.join(' • ') || 'No extra details';

    del.addEventListener('click', () => deleteWorkout(workout.id));
    els.historyList.appendChild(node);
  });
}

function renderStrengthSelector() {
  const names = getWorkoutNames();
  els.workoutSelector.innerHTML = names.map(name => `<option value="${name}">${name}</option>`).join('');
  if (!names.includes(state.currentStrength.selectedWorkout)) {
    state.currentStrength.selectedWorkout = names[0];
  }
  els.workoutSelector.value = state.currentStrength.selectedWorkout;
}

function renderStrengthChecklist() {
  const workoutName = state.currentStrength.selectedWorkout;
  const exercises = getWorkoutExercises(workoutName);
  els.strengthChecklist.innerHTML = '';

  exercises.forEach((exercise, index) => {
    const id = `${workoutName}-${index}`;
    const wrapper = document.createElement('label');
    wrapper.className = 'check-item';
    const checked = Boolean(state.currentStrength.checks[id]);
    if (checked) wrapper.classList.add('done');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => {
      state.currentStrength.checks[id] = checkbox.checked;
      saveState();
      renderStrengthChecklist();
    });

    const text = document.createElement('span');
    text.textContent = exercise;
    wrapper.append(checkbox, text);
    els.strengthChecklist.appendChild(wrapper);
  });

  const completeCount = exercises.filter((_, index) => state.currentStrength.checks[`${workoutName}-${index}`]).length;
  els.strengthProgress.textContent = `${completeCount} / ${exercises.length}`;
}

function renderPlan() {
  els.weeklyPlan.innerHTML = TRAINING_PLAN.map(item => `
    <article class="plan-item">
      <p class="plan-day">${item.day}</p>
      <p class="plan-training">${item.training}</p>
    </article>
  `).join('');

  els.routineReference.innerHTML = Object.entries(ROUTINE_REFERENCE).map(([name, items]) => `
    <section class="routine-card">
      <h3>${name}</h3>
      <div class="routine-table-wrap">
        <table class="routine-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Sets</th>
              <th>Reps</th>
              <th>Start weight</th>
              <th>Muscles</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${escapeHtml(item.exercise)}</td>
                <td>${escapeHtml(item.sets)}</td>
                <td>${escapeHtml(item.reps)}</td>
                <td>${escapeHtml(item.startWeight)}</td>
                <td>${escapeHtml(item.muscles)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `).join('');
}

function renderSelectedRoutineReference() {
  const workoutName = state.currentStrength.selectedWorkout;
  const items = ROUTINE_REFERENCE[workoutName] ?? [];
  if (!items.length) {
    els.selectedRoutineReference.innerHTML = '<p class="hint">No detailed routine stored for this template yet.</p>';
    return;
  }

  els.selectedRoutineReference.innerHTML = `
    <div class="routine-table-wrap">
      <table class="routine-table">
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Sets</th>
            <th>Reps</th>
            <th>Start weight</th>
            <th>Muscles</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${escapeHtml(item.exercise)}</td>
              <td>${escapeHtml(item.sets)}</td>
              <td>${escapeHtml(item.reps)}</td>
              <td>${escapeHtml(item.startWeight)}</td>
              <td>${escapeHtml(item.muscles)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderTemplateEditor() {
  const workoutNames = getWorkoutNames();
  els.templateEditor.innerHTML = workoutNames.map(name => {
    const items = ROUTINE_REFERENCE[name] ?? [];
    const exercises = getWorkoutExercises(name);
    const sourceLabel = items.length
      ? 'Checklist items are pulled automatically from the routine reference on the Plan page.'
      : 'No routine reference found for this workout yet.';

    return `
      <div class="template-card">
        <h3>${escapeHtml(name)}</h3>
        <p class="hint">${sourceLabel}</p>
        <div class="template-list">
          ${exercises.map((exercise, index) => `
            <label>
              <span>Exercise ${index + 1}</span>
              <input type="text" value="${escapeHtml(exercise)}" readonly />
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function setAuthStatus(message = '', tone = '') {
  els.authModalStatus.textContent = message;
  els.authModalStatus.classList.remove('success', 'error');
  if (tone) els.authModalStatus.classList.add(tone);
}

function openAuthModal(mode = authMode) {
  authMode = mode;
  renderAuthMode();
  els.authModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const fieldToFocus = authMode === AUTH_MODES.RESET || authMode === AUTH_MODES.SIGN_IN || authMode === AUTH_MODES.SIGN_UP
    ? els.authEmail
    : els.authPassword;
  window.setTimeout(() => fieldToFocus.focus(), 20);
}

function closeAuthModal() {
  els.authModal.classList.add('hidden');
  document.body.style.overflow = '';
  setAuthStatus('');
}

function renderAuthMode() {
  const isSignIn = authMode === AUTH_MODES.SIGN_IN;
  const isSignUp = authMode === AUTH_MODES.SIGN_UP;
  const isReset = authMode === AUTH_MODES.RESET;

  els.authModeSignIn.classList.toggle('active', isSignIn);
  els.authModeSignUp.classList.toggle('active', isSignUp);
  els.authModeReset.classList.toggle('active', isReset);
  els.authPasswordWrap.classList.toggle('hidden', isReset);
  els.authConfirmWrap.classList.toggle('hidden', !isSignUp);
  els.authPassword.required = !isReset;
  els.authConfirmPassword.required = isSignUp;
  els.authPassword.autocomplete = isSignUp ? 'new-password' : 'current-password';

  if (isSignIn) {
    els.authSubmitBtn.textContent = 'Sign in';
    els.authModalText.textContent = 'Use your email address and password. Revolutionary, I know.';
  } else if (isSignUp) {
    els.authSubmitBtn.textContent = 'Create account';
    els.authModalText.textContent = 'Create an email-and-password login for cloud sync. No more magic-link faff.';
  } else {
    els.authSubmitBtn.textContent = 'Send reset email';
    els.authModalText.textContent = 'This sends a password reset email. Because apparently humans enjoy proving they own inboxes.';
  }

  setAuthStatus('');
}

function renderAuthStatus() {
  const configured = isCloudConfigured();
  const email = session?.user?.email || '';
  const cloudOn = configured && Boolean(session);

  els.authSummary.textContent = configured ? (cloudOn ? 'Cloud sync on' : 'Cloud ready') : 'Cloud sync off';
  els.authSummary.classList.toggle('success', cloudOn);
  els.authSummary.classList.toggle('warning', configured && !cloudOn);
  els.authSummary.classList.toggle('danger', !configured);

  els.authToggleBtn.textContent = cloudOn ? 'Account' : 'Sign in';
  els.authToggleBtn.disabled = !configured;
  els.signedInAs.textContent = email || 'Not signed in';
  els.cloudStatus.textContent = !configured ? 'Disabled' : cloudOn ? 'Connected' : 'Awaiting sign-in';
  els.lastSync.textContent = formatDateTime(state.meta?.lastSyncedAt || '');
  els.signOutBtn.classList.toggle('hidden', !cloudOn);
  els.loadCloudBtn.disabled = !configured || !cloudOn;
  els.syncNowBtn.disabled = !configured || !cloudOn;

  els.authHint.textContent = !configured
    ? 'Add your Supabase URL and anon key in config.js first. Until then this is local-only, like a diary with no backup.'
    : cloudOn
      ? 'Signed in. Changes save locally first, then sync to Supabase.'
      : 'Cloud is configured. Sign in from the small button at the top to sync this tracker across devices.';
}

function renderAll() {
  renderSummary();
  renderPlan();
  renderHistory();
  renderStrengthSelector();
  renderStrengthChecklist();
  renderSelectedRoutineReference();
  renderTemplateEditor();
  renderAuthStatus();
  renderAuthMode();
  els.strengthDate.value = state.currentStrength.date || todayISO();
  els.strengthNotes.value = state.currentStrength.notes || '';
}

function isCloudConfigured() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && !CONFIG.supabaseUrl.includes('YOUR_PROJECT_ID'));
}

function cloudPayload() {
  return {
    workouts: state.workouts,
    templates: state.templates,
    currentStrength: state.currentStrength,
    app_version: 1,
    updated_at_client: new Date().toISOString()
  };
}

async function initialiseCloud() {
  if (!isCloudConfigured()) {
    renderAuthStatus();
    return;
  }

  supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const { data: { session: currentSession } } = await supabase.auth.getSession();
  session = currentSession;
  renderAuthStatus();

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    session = newSession;
    renderAuthStatus();

    if (event === 'SIGNED_IN' && session) {
      setAuthStatus('Signed in. The machines remain barely coordinated.', 'success');
      await loadCloudState({ preferCloud: true });
      closeAuthModal();
    }

    if (event === 'SIGNED_OUT') {
      setAuthStatus('Signed out.', 'success');
    }
  });

  if (session) {
    await loadCloudState({ preferCloud: true });
  }
}

async function signInWithPassword(email, password) {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthStatus(`Sign-in failed: ${error.message}`, 'error');
    return false;
  }
  return true;
}

async function signUpWithPassword(email, password) {
  if (!supabase) return;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    setAuthStatus(`Sign-up failed: ${error.message}`, 'error');
    return false;
  }

  const needsEmailConfirm = !data.session;
  setAuthStatus(
    needsEmailConfirm
      ? 'Account created. Check your email to confirm the address, because nothing is ever allowed to be simple.'
      : 'Account created and signed in.',
    'success'
  );

  if (!needsEmailConfirm) {
    session = data.session;
    renderAuthStatus();
    await loadCloudState({ preferCloud: true });
    closeAuthModal();
  }

  return true;
}

async function sendPasswordReset(email) {
  if (!supabase) return;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}`
  });
  if (error) {
    setAuthStatus(`Reset failed: ${error.message}`, 'error');
    return false;
  }
  setAuthStatus('Password reset email sent.', 'success');
  return true;
}

async function loadCloudState({ preferCloud = false } = {}) {
  if (!supabase || !session?.user) return;
  els.cloudStatus.textContent = 'Loading...';

  const { data, error } = await supabase
    .from('workout_app_state')
    .select('state, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    els.cloudStatus.textContent = `Error: ${error.message}`;
    return;
  }

  if (data?.state) {
    const incoming = data.state;
    const shouldUseCloud = preferCloud || state.workouts.length === 0;
    if (shouldUseCloud) {
      state = {
        ...emptyState(),
        workouts: incoming.workouts ?? [],
        templates: incoming.templates ?? structuredClone(DEFAULT_TEMPLATES),
        currentStrength: incoming.currentStrength ?? emptyState().currentStrength,
        meta: {
          cloudEnabled: true,
          lastSyncedAt: data.updated_at || new Date().toISOString()
        }
      };
      saveState({ scheduleSync: false });
      renderAll();
    }
    els.cloudStatus.textContent = 'Connected';
    els.lastSync.textContent = formatDateTime(data.updated_at);
  } else {
    await saveCloudState();
  }
}

async function saveCloudState() {
  if (!supabase || !session?.user) return;
  const { error } = await supabase
    .from('workout_app_state')
    .upsert({
      user_id: session.user.id,
      state: cloudPayload()
    }, { onConflict: 'user_id' });

  if (error) {
    els.cloudStatus.textContent = `Sync failed: ${error.message}`;
    return;
  }

  state.meta.cloudEnabled = true;
  state.meta.lastSyncedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAuthStatus();
}

function scheduleCloudSave() {
  if (!supabase || !session?.user) return;
  clearTimeout(syncTimer);
  els.cloudStatus.textContent = 'Queued';
  syncTimer = setTimeout(() => {
    saveCloudState();
  }, 700);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mergeImportedState(parsed) {
  state = {
    ...emptyState(),
    workouts: parsed.workouts ?? [],
    templates: parsed.templates ?? structuredClone(DEFAULT_TEMPLATES),
    currentStrength: parsed.currentStrength ?? emptyState().currentStrength,
    meta: {
      ...state.meta,
      cloudEnabled: state.meta.cloudEnabled,
      lastSyncedAt: state.meta.lastSyncedAt
    }
  };
  saveState();
  renderAll();
}

els.tabs.forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));

els.quickAddForm.addEventListener('submit', event => {
  event.preventDefault();
  const entry = {
    type: els.quickType.value,
    date: els.quickDate.value,
    distance: els.quickDistance.value || '',
    duration: els.quickDuration.value || '',
    notes: els.quickNotes.value.trim(),
    pace: els.quickType.value === 'Run' ? paceFrom(els.quickDistance.value, els.quickDuration.value) : ''
  };
  addWorkout(entry);
  els.quickAddForm.reset();
  els.quickDate.value = todayISO();
});

els.clearQuickAdd.addEventListener('click', () => {
  els.quickAddForm.reset();
  els.quickDate.value = todayISO();
});

function updateRunPacePreview() {
  els.runPace.value = paceFrom(els.runDistance.value, els.runDuration.value);
}

els.runDistance.addEventListener('input', updateRunPacePreview);
els.runDuration.addEventListener('input', updateRunPacePreview);

els.runForm.addEventListener('submit', event => {
  event.preventDefault();
  addWorkout({
    type: 'Run',
    date: els.runDate.value,
    distance: els.runDistance.value,
    duration: els.runDuration.value,
    notes: els.runNotes.value.trim(),
    pace: paceFrom(els.runDistance.value, els.runDuration.value)
  });
  els.runForm.reset();
  els.runDate.value = todayISO();
  els.runPace.value = '';
});

els.workoutSelector.addEventListener('change', () => {
  state.currentStrength.selectedWorkout = els.workoutSelector.value;
  saveState();
  renderStrengthChecklist();
  renderSelectedRoutineReference();
});

els.strengthDate.addEventListener('change', () => {
  state.currentStrength.date = els.strengthDate.value;
  saveState();
});

els.strengthNotes.addEventListener('input', () => {
  state.currentStrength.notes = els.strengthNotes.value;
  saveState();
});

els.resetWorkoutBtn.addEventListener('click', () => {
  const workoutName = state.currentStrength.selectedWorkout;
  const exercises = getWorkoutExercises(workoutName);
  exercises.forEach((_, index) => { state.currentStrength.checks[`${workoutName}-${index}`] = false; });
  saveState();
  renderStrengthChecklist();
});

els.completeWorkoutBtn.addEventListener('click', () => {
  const workoutName = state.currentStrength.selectedWorkout;
  const exercises = getWorkoutExercises(workoutName);
  const doneCount = exercises.filter((_, index) => state.currentStrength.checks[`${workoutName}-${index}`]).length;

  if (!els.strengthDate.value) {
    alert('Add a date first. Even Excel managed that much.');
    return;
  }
  if (doneCount !== exercises.length) {
    alert('You have not ticked every exercise yet. Nice try.');
    return;
  }

  addWorkout({
    type: workoutName,
    date: els.strengthDate.value,
    distance: '',
    duration: '',
    notes: els.strengthNotes.value.trim(),
    pace: ''
  });

  exercises.forEach((_, index) => { state.currentStrength.checks[`${workoutName}-${index}`] = false; });
  state.currentStrength.notes = '';
  state.currentStrength.date = todayISO();
  saveState();
  renderAll();
  setActiveTab('tracker');
});

els.saveTemplatesBtn.addEventListener('click', () => {
  alert('The checklist now comes straight from the routine reference on the Plan page, so there is nothing separate to save here. One less pointless chore.');
});

els.resetTemplatesBtn.addEventListener('click', () => {
  alert('The checklist is synced from the routine reference, so there is no separate template list to reset.');
});

els.historyFilter.addEventListener('change', renderHistory);

els.exportBtn.addEventListener('click', () => {
  downloadJson(`workout-tracker-export-${todayISO()}.json`, state);
});

els.importBtn.addEventListener('click', () => els.importFile.click());
els.importFile.addEventListener('change', async () => {
  const file = els.importFile.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    mergeImportedState(parsed);
    alert('Import complete. Humanity survives another backup exercise.');
  } catch {
    alert('That JSON is invalid. Even the browser noticed.');
  }
  els.importFile.value = '';
});

els.authToggleBtn.addEventListener('click', () => {
  if (!isCloudConfigured()) {
    setActiveTab('settings');
    return;
  }
  openAuthModal(session ? AUTH_MODES.SIGN_IN : authMode);
});

els.authCloseBtn.addEventListener('click', closeAuthModal);
els.authModalBackdrop.addEventListener('click', closeAuthModal);
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !els.authModal.classList.contains('hidden')) {
    closeAuthModal();
  }
});

els.authModeSignIn.addEventListener('click', () => {
  authMode = AUTH_MODES.SIGN_IN;
  renderAuthMode();
});
els.authModeSignUp.addEventListener('click', () => {
  authMode = AUTH_MODES.SIGN_UP;
  renderAuthMode();
});
els.authModeReset.addEventListener('click', () => {
  authMode = AUTH_MODES.RESET;
  renderAuthMode();
});

els.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!isCloudConfigured()) {
    setAuthStatus('Add your Supabase URL and anon key in config.js first.', 'error');
    return;
  }

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  const confirmPassword = els.authConfirmPassword.value;

  if (!email) {
    setAuthStatus('Enter your email first. Telepathy support is still delayed.', 'error');
    return;
  }

  if (authMode !== AUTH_MODES.RESET && !password) {
    setAuthStatus('Enter your password.', 'error');
    return;
  }

  if (authMode === AUTH_MODES.SIGN_UP) {
    if (password.length < 6) {
      setAuthStatus('Use at least 6 characters for the password.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      setAuthStatus('Passwords do not match. Classic sabotage.', 'error');
      return;
    }
  }

  setAuthStatus('Working...', 'success');

  if (authMode === AUTH_MODES.SIGN_IN) {
    await signInWithPassword(email, password);
    return;
  }

  if (authMode === AUTH_MODES.SIGN_UP) {
    await signUpWithPassword(email, password);
    return;
  }

  await sendPasswordReset(email);
});

els.loadCloudBtn.addEventListener('click', async () => {
  await loadCloudState({ preferCloud: true });
});

els.syncNowBtn.addEventListener('click', async () => {
  els.cloudStatus.textContent = 'Syncing...';
  await saveCloudState();
});

els.signOutBtn.addEventListener('click', async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
  session = null;
  renderAuthStatus();
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  els.installBtn.classList.remove('hidden');
});

els.installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

els.quickDate.value = todayISO();
els.runDate.value = todayISO();
renderAll();
initialiseCloud();
