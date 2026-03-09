const modeLabel = document.getElementById('modeLabel');
const timeDisplay = document.getElementById('timeDisplay');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const switchBtn = document.getElementById('switchBtn');
const focusInput = document.getElementById('focusInput');
const breakInput = document.getElementById('breakInput');
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const savedTask = document.getElementById('savedTask');

const STORAGE_KEY = 'focus-flow-state';

let state = {
  mode: 'focus',
  running: false,
  remainingSeconds: 25 * 60,
  focusMinutes: 25,
  breakMinutes: 5,
  task: '',
};

let timerId = null;

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function modeDurationSeconds(mode) {
  return (mode === 'focus' ? state.focusMinutes : state.breakMinutes) * 60;
}

function updateUI() {
  modeLabel.textContent = state.mode === 'focus' ? 'Focus' : 'Break';
  timeDisplay.textContent = formatTime(state.remainingSeconds);
  startPauseBtn.textContent = state.running ? 'Pause' : 'Start';
  focusInput.value = state.focusMinutes;
  breakInput.value = state.breakMinutes;
  savedTask.textContent = state.task ? `• ${state.task}` : 'No task set.';
  document.title = `${timeDisplay.textContent} • ${modeLabel.textContent}`;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state = {
      ...state,
      ...parsed,
      focusMinutes: Math.min(120, Math.max(1, Number(parsed.focusMinutes) || 25)),
      breakMinutes: Math.min(60, Math.max(1, Number(parsed.breakMinutes) || 5)),
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function notifyModeComplete() {
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
  if (Notification.permission === 'granted') {
    new Notification(state.mode === 'focus' ? 'Focus done!' : 'Break done!', {
      body: state.mode === 'focus' ? 'Time for a short break.' : 'Back to deep work.',
    });
  }
}

function switchMode() {
  state.mode = state.mode === 'focus' ? 'break' : 'focus';
  state.remainingSeconds = modeDurationSeconds(state.mode);
  saveState();
  updateUI();
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    if (!state.running) return;
    if (state.remainingSeconds > 0) {
      state.remainingSeconds -= 1;
      saveState();
      updateUI();
      return;
    }
    state.running = false;
    stopTimer();
    notifyModeComplete();
    switchMode();
  }, 1000);
}

startPauseBtn.addEventListener('click', async () => {
  state.running = !state.running;
  if (state.running && 'Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (state.running) startTimer();
  if (!state.running) stopTimer();
  saveState();
  updateUI();
});

resetBtn.addEventListener('click', () => {
  state.running = false;
  stopTimer();
  state.remainingSeconds = modeDurationSeconds(state.mode);
  saveState();
  updateUI();
});

switchBtn.addEventListener('click', () => {
  state.running = false;
  stopTimer();
  switchMode();
});

focusInput.addEventListener('change', () => {
  state.focusMinutes = Math.min(120, Math.max(1, Number(focusInput.value) || 25));
  if (state.mode === 'focus') state.remainingSeconds = modeDurationSeconds('focus');
  saveState();
  updateUI();
});

breakInput.addEventListener('change', () => {
  state.breakMinutes = Math.min(60, Math.max(1, Number(breakInput.value) || 5));
  if (state.mode === 'break') state.remainingSeconds = modeDurationSeconds('break');
  saveState();
  updateUI();
});

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.task = taskInput.value.trim();
  taskInput.value = '';
  saveState();
  updateUI();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

loadState();
updateUI();
