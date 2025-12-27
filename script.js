const CONFIG = {
  name: "Дианочка",
  giftUrl:
    "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&w=1200&q=80",
  finalImage: "VALORANT-Gifting.jpg",
};

const MUSIC_TRACKS = {
  loading: "https://www.bensound.com/bensound-music/bensound-scifi.mp3",
  quiz: "https://www.bensound.com/bensound-music/bensound-littleidea.mp3",
  chase: "https://www.bensound.com/bensound-music/bensound-epic.mp3",
  final: "./Unknown Artist - Happy Birthday (minus).mp3",
};

const screens = {
  intro: document.getElementById("screen-intro"),
  loading: document.getElementById("screen-loading"),
  gate: document.getElementById("screen-gate"),
  quiz: document.getElementById("screen-quiz"),
  chase: document.getElementById("screen-chase"),
  final: document.getElementById("screen-final"),
};

const introScreen = document.getElementById("screen-intro");
const introStart = document.getElementById("introStart");
const loadingDots = document.getElementById("loadingDots");
const loadingSub = document.getElementById("loadingSub");
const retryBtn = document.getElementById("retryBtn");
const okBtn = document.getElementById("okBtn");

const gateText = document.getElementById("gateText");
const gateActions = document.getElementById("gateActions");
const gateYes = document.getElementById("gateYes");
const gateNo = document.getElementById("gateNo");

const quizTitle = document.getElementById("quizTitle");
const quizProgress = document.getElementById("quizProgress");
const quizQuestion = document.getElementById("quizQuestion");
const quizOptions = document.getElementById("quizOptions");
const quizOtherWrap = document.getElementById("quizOtherWrap");
const quizOtherInput = document.getElementById("quizOtherInput");
const quizOtherConfirm = document.getElementById("quizOtherConfirm");
const easterOption = document.getElementById("easterOption");

const chaseArea = document.getElementById("chaseArea");
const chaseBtn = document.getElementById("chaseBtn");

const finalTitle = document.getElementById("finalTitle");
const finalMessage = document.getElementById("finalMessage");
const finalExtra = document.getElementById("finalExtra");
const finalSummary = document.getElementById("finalSummary");
const finalImg = document.getElementById("finalImg");
const finalEmoji = document.getElementById("finalEmoji");
const restartBtn = document.getElementById("restartBtn");
const bgMusic = document.getElementById("bgMusic");

const confetti = document.getElementById("confetti");
const toast = document.getElementById("toast");

let loadingTimer = null;
let loadingDotsTimer = null;
let retryHoverCount = 0;
let toastTimer = null;
let quizIndex = 0;
let answers = [];
let chaseJitterTimer = null;
let lastChaseTaunt = "";
let typewriterToken = 0;
let introStarted = false;
let finalMusicQueued = false;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const screenMusicMap = {
  intro: "",
  loading: "loading",
  gate: "quiz",
  quiz: "quiz",
  chase: "chase",
  final: "final",
};
const hasMusicTracks = Object.values(MUSIC_TRACKS).some(Boolean);
const musicState = {
  active: bgMusic,
  standby: new Audio(),
  currentKey: "",
  enabled: hasMusicTracks,
  blocked: false,
  userInteracted: false,
  volume: 0.75,
  fadeMs: reduceMotion ? 0 : 1200,
  token: 0,
};
let currentScreen = "intro";

function setupAudioElement(audio) {
  if (!audio) return;
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
}

setupAudioElement(musicState.active);
setupAudioElement(musicState.standby);

const quizData = [
  {
    question: "Вопрос #1. Какая у тебя суперсила?",
    options: [
      "🥲 выживать на кофе и минимуме сна",
      "😼 игнорировать сообщения 3 дня, а потом отвечать \"окак\"",
      "😏 быть самой крутой в мире",
      "❓ другой вариант",
    ],
    allowOther: true,
  },
  {
    question: "Вопрос #2. Как ты хочешь провести этот год?",
    options: [
      "богатая, красивая, счастливая (стандартная комплектация)",
      "найти многа деняг в кармане забытых джинсов",
      "чтобы вселенная давала кешбэк за стресс",
      "чтобы друзья выполняли все желания (даже тупые)",
    ],
    allowOther: false,
  },
];

const finalLines = [
  "Хочу чтобы ты была счастливой, смеялась так, чтобы болел живот,",
  "чтобы все, о чем мечтаешь — сбывалось (даже если это котик, 3 кг суши и чтобы тебе платили миллионы за просто так).",
  "Спасибо что ты есть, ты супер 🫶",
];

function showScreen(name, forceMusic = false) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  setScreenMusic(name, forceMusic);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showToast(message, duration = 2000) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fadeVolume(audio, target, duration, token) {
  if (!audio) return Promise.resolve();
  const start = Number.isFinite(audio.volume) ? audio.volume : 0;
  const safeTarget = Number.isFinite(target) ? clamp(target, 0, 1) : 0;
  const safeDuration = Number.isFinite(duration) ? duration : 0;
  if (safeDuration <= 0) {
    audio.volume = safeTarget;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const startTime = performance.now();
    const tick = (now) => {
      if (token !== musicState.token) {
        resolve();
        return;
      }
      const progress = Math.min(1, (now - startTime) / safeDuration);
      const nextVolume = start + (safeTarget - start) * progress;
      audio.volume = Number.isFinite(nextVolume) ? clamp(nextVolume, 0, 1) : safeTarget;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

async function playOn(audio, url, token, showToastOnFail, fadeDuration = musicState.fadeMs) {
  if (audio.src !== url) {
    audio.src = url;
    audio.load();
  }
  audio.currentTime = 0;
  audio.volume = 0;
  const attemptPlay = async (muted) => {
    audio.muted = muted;
    try {
      await audio.play();
      return true;
    } catch (error) {
      return false;
    }
  };
  let played = false;
  if (!musicState.userInteracted) {
    played = await attemptPlay(false);
    if (!played) {
      played = await attemptPlay(true);
    }
  } else {
    played = await attemptPlay(false);
  }
  if (!played) {
    musicState.blocked = true;
    if (showToastOnFail) {
      showToast("Браузер не дал включить звук без разрешения.");
    }
    return false;
  }
  if (token !== musicState.token) return false;
  musicState.blocked = false;
  await fadeVolume(audio, musicState.volume, fadeDuration, token);
  return token === musicState.token;
}

async function crossfadeTo(url, showToastOnFail = false, preferActive = false) {
  if (!url) return;
  const token = (musicState.token += 1);
  const active = musicState.active;
  const standby = musicState.standby;

  if (preferActive) {
    await playOn(active, url, token, showToastOnFail);
    return;
  }

  const activeHasSource = Boolean(active.src);
  if (!activeHasSource || active.paused) {
    await playOn(active, url, token, showToastOnFail);
    return;
  }

  if (active.src === url && !active.paused) {
    active.muted = !musicState.userInteracted;
    await fadeVolume(active, musicState.volume, musicState.fadeMs, token);
    musicState.blocked = false;
    return;
  }

  const standbyReady = standby.src === url && !standby.paused;
  if (!standbyReady) {
    standby.muted = !musicState.userInteracted;
    standby.src = url;
    standby.currentTime = 0;
    standby.volume = 0;
    try {
      await standby.play();
    } catch (error) {
      standby.pause();
      standby.currentTime = 0;
      await fadeVolume(active, 0, musicState.fadeMs / 2, token);
      await playOn(active, url, token, showToastOnFail, musicState.fadeMs / 2);
      return;
    }
  }

  if (token !== musicState.token) return;
  musicState.blocked = false;

  await Promise.all([
    fadeVolume(active, 0, musicState.fadeMs, token),
    fadeVolume(standby, musicState.volume, musicState.fadeMs, token),
  ]);

  if (token !== musicState.token) return;

  active.pause();
  active.currentTime = 0;

  musicState.active = standby;
  musicState.standby = active;
}

function stopMusic() {
  musicState.token += 1;
  const token = musicState.token;
  const active = musicState.active;
  const standby = musicState.standby;
  fadeVolume(active, 0, musicState.fadeMs, token).then(() => {
    active.pause();
    active.currentTime = 0;
  });
  standby.pause();
  standby.currentTime = 0;
  standby.volume = 0;
  musicState.blocked = false;
}

function setScreenMusic(name, force = false) {
  currentScreen = name;
  if (!hasMusicTracks) return;
  const hasKey = Object.prototype.hasOwnProperty.call(screenMusicMap, name);
  const key = hasKey ? screenMusicMap[name] : "loading";
  if (!key) {
    musicState.currentKey = "";
    stopMusic();
    return;
  }
  const url = MUSIC_TRACKS[key];
  const isSameSrc = Boolean(url) && musicState.active.src === url;
  if (!force && key === musicState.currentKey && isSameSrc && !musicState.active.paused) return;
  musicState.currentKey = key;
  if (!musicState.enabled) return;
  crossfadeTo(url, false, force);
}

async function forcePlayTrack(key, showToastOnFail = false) {
  const url = MUSIC_TRACKS[key];
  if (!url || !musicState.enabled) return false;
  musicState.currentKey = key;
  const token = (musicState.token += 1);
  const active = musicState.active;
  const standby = musicState.standby;
  standby.pause();
  standby.currentTime = 0;
  standby.volume = 0;
  active.pause();
  active.currentTime = 0;
  active.muted = false;
  return playOn(active, url, token, showToastOnFail);
}

function unlockMusic() {
  musicState.userInteracted = true;
  musicState.active.muted = false;
  musicState.standby.muted = false;
  if (!musicState.enabled) return;
  if (musicState.blocked || musicState.active.paused) {
    musicState.blocked = false;
    setScreenMusic(currentScreen, true);
    return;
  }
  const token = musicState.token;
  fadeVolume(musicState.active, musicState.volume, musicState.fadeMs, token);
}

function resetLoadingTimers() {
  clearTimeout(loadingTimer);
  clearInterval(loadingDotsTimer);
}

function startIntro() {
  introStarted = false;
  showScreen("intro");
}

async function handleIntroStart() {
  if (introStarted) return;
  introStarted = true;
  musicState.userInteracted = true;
  musicState.blocked = false;
  musicState.active.muted = false;
  musicState.standby.muted = false;
  await forcePlayTrack("loading", true);
  startLoading();
}

function startLoading(forceMusic = false) {
  showScreen("loading", forceMusic);
  resetLoadingTimers();
  retryHoverCount = 0;
  loadingSub.textContent = "";
  retryBtn.classList.add("hidden");
  okBtn.classList.add("hidden");
  loadingDots.textContent = ".";

  let dotCount = 1;
  loadingDotsTimer = setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    loadingDots.textContent = ".".repeat(dotCount);
  }, reduceMotion ? 400 : 300);

  loadingTimer = setTimeout(() => {
    loadingSub.textContent = "да блин, снова зависло… секундочку…";
    retryBtn.classList.remove("hidden");
  }, reduceMotion ? 10 : 5000);
}

function fleeRetryButton() {
  retryHoverCount += 1;
  retryBtn.classList.add("retry-flee");
  setTimeout(() => retryBtn.classList.remove("retry-flee"), 220);
  if (retryHoverCount >= 3) {
    okBtn.classList.remove("hidden");
  }
}

async function typeLines(container, lines, speed = 24) {
  typewriterToken += 1;
  const token = typewriterToken;
  container.innerHTML = "";
  for (const line of lines) {
    if (token !== typewriterToken) return;
    const lineEl = document.createElement("div");
    container.appendChild(lineEl);
    if (reduceMotion) {
      lineEl.textContent = line;
    } else {
      for (let i = 1; i <= line.length; i += 1) {
        if (token !== typewriterToken) return;
        lineEl.textContent = line.slice(0, i);
        await sleep(speed);
      }
    }
    await sleep(reduceMotion ? 20 : 360);
  }
}

async function startGate() {
  showScreen("gate");
  gateActions.classList.add("hidden");
  await typeLines(gateText, [
    "Проверка:",
    "1/3: Сегодня действительно твой День Рождения? (да/нет)",
  ]);
  gateActions.classList.remove("hidden");
}

function renderQuiz() {
  const question = quizData[quizIndex];
  quizTitle.textContent = "Маленький квиз с мемным тоном";
  quizProgress.textContent = `${quizIndex + 1}/${quizData.length}`;
  quizQuestion.textContent = question.question;
  quizOptions.innerHTML = "";
  quizOtherWrap.classList.add("hidden");
  quizOtherInput.value = "";

  const options = quizIndex === 1 ? shuffle(question.options) : question.options;
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => {
      if (question.allowOther && option.includes("другой вариант")) {
        quizOtherWrap.classList.remove("hidden");
        quizOtherInput.focus();
        return;
      }
      setAnswer(option);
    });
    quizOptions.appendChild(button);
  });
}

function startQuiz() {
  showScreen("quiz");
  quizIndex = 0;
  answers = [];
  renderQuiz();
}

function setAnswer(value) {
  answers[quizIndex] = value;
  quizIndex += 1;
  if (quizIndex >= quizData.length) {
    startChase();
    return;
  }
  renderQuiz();
}

function positionChaseButton(x, y) {
  chaseBtn.style.left = `${x}px`;
  chaseBtn.style.top = `${y}px`;
}

function randomButtonPosition() {
  const areaRect = chaseArea.getBoundingClientRect();
  const btnRect = chaseBtn.getBoundingClientRect();
  const padding = 16;
  const minX = btnRect.width / 2 + padding;
  const maxX = areaRect.width - btnRect.width / 2 - padding;
  const minY = btnRect.height / 2 + padding;
  const maxY = areaRect.height - btnRect.height / 2 - padding;
  const randX = minX + Math.random() * Math.max(1, maxX - minX);
  const randY = minY + Math.random() * Math.max(1, maxY - minY);
  return { x: randX, y: randY };
}

function getEscapeTarget(pointer) {
  const areaRect = chaseArea.getBoundingClientRect();
  const btnRect = chaseBtn.getBoundingClientRect();
  const padding = 16;
  const minX = btnRect.width / 2 + padding;
  const maxX = areaRect.width - btnRect.width / 2 - padding;
  const minY = btnRect.height / 2 + padding;
  const maxY = areaRect.height - btnRect.height / 2 - padding;

  if (!pointer) {
    return randomButtonPosition();
  }

  const btnCenterX = btnRect.left + btnRect.width / 2;
  const btnCenterY = btnRect.top + btnRect.height / 2;
  const dirX = btnCenterX - pointer.x;
  const dirY = btnCenterY - pointer.y;
  const length = Math.hypot(dirX, dirY) || 1;
  const normX = dirX / length;
  const normY = dirY / length;
  const escapeDistance = Math.min(areaRect.width, areaRect.height) * (0.3 + Math.random() * 0.25);
  const jitter = 60 + Math.random() * 80;

  const targetX =
    (btnCenterX - areaRect.left) + normX * escapeDistance + (Math.random() - 0.5) * jitter;
  const targetY =
    (btnCenterY - areaRect.top) + normY * escapeDistance + (Math.random() - 0.5) * jitter;

  return {
    x: clamp(targetX, minX, maxX),
    y: clamp(targetY, minY, maxY),
  };
}

function moveChaseButton(pointer) {
  const { x, y } = getEscapeTarget(pointer);
  positionChaseButton(x, y);
}

function handleChaseMove(event) {
  const btnRect = chaseBtn.getBoundingClientRect();
  const centerX = btnRect.left + btnRect.width / 2;
  const centerY = btnRect.top + btnRect.height / 2;
  const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
  if (distance < 160) {
    moveChaseButton({ x: event.clientX, y: event.clientY });
  }
}

function stopChaseJitter() {
  clearTimeout(chaseJitterTimer);
}

function scheduleChaseJitter() {
  stopChaseJitter();
  if (reduceMotion) return;
  const delay = 420 + Math.random() * 680;
  chaseJitterTimer = setTimeout(() => {
    if (!screens.chase.classList.contains("active")) return;
    moveChaseButton();
    scheduleChaseJitter();
  }, delay);
}

function startChase() {
  showScreen("chase");
  const areaRect = chaseArea.getBoundingClientRect();
  positionChaseButton(areaRect.width / 2, areaRect.height / 2);
  scheduleChaseJitter();
}

function fireConfetti() {
  const colors = ["#ff6b6b", "#ffd166", "#06d6a0", "#f15bb5", "#fdffb6"];
  confetti.innerHTML = "";
  const count = 140;
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    const size = Math.floor(Math.random() * 8) + 6;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.3}px`;
    const duration = Math.random() * 1.3 + 1.2;
    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    confetti.appendChild(piece);
  }
  setTimeout(() => {
    confetti.innerHTML = "";
  }, 2400);
}

function startFinal() {
  const shouldForceMusic = !finalMusicQueued || musicState.blocked || musicState.active.paused;
  showScreen("final", shouldForceMusic);
  finalMusicQueued = false;
  const name = CONFIG.name.trim() || "Именинница";
  finalTitle.textContent = `${name}, с Днем Рождения 💛`;
  finalMessage.textContent = `${finalLines[0]} ${finalLines[1]}`;
  finalExtra.textContent = finalLines[2];
  const summaryParts = [];
  if (answers[0]) summaryParts.push(`Суперсила: ${answers[0]}`);
  if (answers[1]) summaryParts.push(`Планы: ${answers[1]}`);
  finalSummary.textContent = summaryParts.join(" • ");

  if (CONFIG.finalImage) {
    finalImg.src = CONFIG.finalImage;
    finalImg.classList.remove("hidden");
    finalEmoji.classList.add("hidden");
  } else {
    finalImg.classList.add("hidden");
    finalEmoji.classList.remove("hidden");
  }

}

if (introStart) {
  introStart.addEventListener("click", handleIntroStart);
}
if (introScreen) {
  introScreen.addEventListener("click", handleIntroStart);
}

retryBtn.addEventListener("mouseenter", fleeRetryButton);
retryBtn.addEventListener("touchstart", fleeRetryButton);
retryBtn.addEventListener("click", () => {
  fleeRetryButton();
  showToast("Неа. От этого он еще сильнее завис.");
});
okBtn.addEventListener("click", () => {
  resetLoadingTimers();
  startGate();
});

gateYes.addEventListener("click", startQuiz);
gateNo.addEventListener("click", () => {
  showToast("Врунишка обнаружен. Перезапуск...");
  setTimeout(startLoading, 1200);
});

quizOtherConfirm.addEventListener("click", () => {
  const value = quizOtherInput.value.trim();
  if (!value) {
    showToast("Ну придумай хоть что-нибудь 🤭");
    return;
  }
  setAnswer(value);
});

quizOtherInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    quizOtherConfirm.click();
  }
});

easterOption.addEventListener("click", () => {
  showToast("Капец ты глазастая");
  const easterAnswer =
    quizIndex === 0
      ? "Глаза, достойные куратора Цвет Вёрстки"
      : "Поносить Егра за его существование";
  setAnswer(easterAnswer);
});

const chaseTaunts = [
  "хи-хи, мимо 🤭",
  "ой, почти!",
  "не туда!",
  "поймай меня, если можешь 😜",
  "я тут... нет, уже там!",
];

function showChaseTaunt() {
  const options = chaseTaunts.filter((item) => item !== lastChaseTaunt);
  const message = options[Math.floor(Math.random() * options.length)] || chaseTaunts[0];
  lastChaseTaunt = message;
  showToast(message, 1600);
}

function isPointerInsideButton(x, y) {
  const rect = chaseBtn.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function isEventOnChaseButton(event) {
  if (!event) return false;
  if (event.target && chaseBtn.contains(event.target)) return true;
  if (typeof event.clientX === "number" && typeof event.clientY === "number") {
    return isPointerInsideButton(event.clientX, event.clientY);
  }
  return false;
}

chaseBtn.addEventListener("mouseenter", (event) => {
  moveChaseButton({ x: event.clientX, y: event.clientY });
});
chaseArea.addEventListener("mousemove", handleChaseMove);
chaseArea.addEventListener("click", (event) => {
  if (isEventOnChaseButton(event)) return;
  showChaseTaunt();
  moveChaseButton({ x: event.clientX, y: event.clientY });
});
chaseArea.addEventListener("touchstart", (event) => {
  event.preventDefault();
  if (event.touches.length === 0) return;
  const touch = event.touches[0];
  const onButton =
    (event.target && chaseBtn.contains(event.target)) ||
    isPointerInsideButton(touch.clientX, touch.clientY);
  if (!onButton) {
    showChaseTaunt();
  }
  moveChaseButton({ x: touch.clientX, y: touch.clientY });
});

chaseBtn.addEventListener("click", async (event) => {
  event.stopPropagation();
  fireConfetti();
  stopChaseJitter();
  finalMusicQueued = true;
  await forcePlayTrack("final", true);
  setTimeout(startFinal, reduceMotion ? 10 : 1200);
});

restartBtn.addEventListener("click", startLoading);

startIntro();
