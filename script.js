/* =========================================================
   Романтический интерактивный сайт для Мадины
   script.js — вся логика: сцены, убегающая кнопка, звук,
   частицы, конфетти, печать текста.
   Без библиотек — только чистый JavaScript.
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   0. Небольшие помощники
   --------------------------------------------------------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const rand = (min, max) => Math.random() * (max - min) + min;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* =========================================================
   1. ЗВУК — генерируется через Web Audio API, чтобы всё
   работало полностью локально, без аудиофайлов.
   ========================================================= */
const Sound = (() => {
  let ctx = null;               // AudioContext
  let musicGain = null;         // общий регулятор громкости музыки
  let musicOn = false;          // играет ли фоновая музыка
  const musicNodes = [];        // активные осцилляторы музыки

  /** Ленивая инициализация — создаётся после первого действия
      пользователя (иначе браузер блокирует звук). */
  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /** Короткий приятный "перелив" при смене карточки. */
  function blip(freq = 660) {
    ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.42);
  }

  /** Тёплый "аккорд" для финала. */
  function chord() {
    ensure();
    const base = 392; // G4
    [1, 1.25, 1.5, 2].forEach((mult, i) => {
      const t = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = base * mult;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.7);
    });
  }

  /** Мягкая зацикленная фоновая мелодия из нежных нот. */
  function startMusic() {
    ensure();
    if (musicOn) return;
    musicOn = true;

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.0;
    musicGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2);
    musicGain.connect(ctx.destination);

    // Тёплая реверберация через простую задержку
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.33;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    delay.connect(feedback).connect(delay);
    delay.connect(musicGain);

    // Плывущая басовая подложка
    const pad = ctx.createOscillator();
    const padGain = ctx.createGain();
    pad.type = "sine";
    pad.frequency.value = 130.81; // C3
    padGain.gain.value = 0.06;
    pad.connect(padGain).connect(musicGain);
    pad.start();
    musicNodes.push(pad);

    // Нежная мелодия — ноты пентатоники, чтобы всегда звучало красиво
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0]; // C D E G A (5 октава)
    let step = 0;
    const playNote = () => {
      if (!musicOn) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const freq = scale[Math.floor(Math.random() * scale.length)];
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(g);
      g.connect(musicGain);
      g.connect(delay);
      osc.start(t);
      osc.stop(t + 1.5);
      step++;
      // Каждые 4 ноты слегка меняем бас для ощущения движения
      if (step % 4 === 0) {
        pad.frequency.linearRampToValueAtTime(
          [130.81, 146.83, 164.81, 196.0][(step / 4) % 4],
          t + 0.5
        );
      }
      musicTimer = setTimeout(playNote, rand(650, 1100));
    };
    let musicTimer = setTimeout(playNote, 400);
    musicNodes.timer = () => clearTimeout(musicTimer);
  }

  function stopMusic() {
    if (!musicOn) return;
    musicOn = false;
    if (musicNodes.timer) musicNodes.timer();
    if (musicGain) {
      musicGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    }
    musicNodes.forEach((n) => { try { n.stop(ctx.currentTime + 0.7); } catch (e) {} });
    musicNodes.length = 0;
  }

  return { blip, chord, startMusic, stopMusic, get isOn() { return musicOn; } };
})();

/* =========================================================
   2. ЧАСТИЦЫ НА ФОНЕ — звёзды и светящиеся точки на canvas.
   ========================================================= */
(function particles() {
  const canvas = $("#particles");
  const g = canvas.getContext("2d");
  let w, h, stars, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    // Плотность звёзд зависит от площади экрана
    const count = Math.round((innerWidth * innerHeight) / 6000);
    stars = Array.from({ length: count }, makeStar);
  }

  function makeStar() {
    const glow = Math.random() < 0.25; // часть точек — крупные светящиеся
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: (glow ? rand(1.4, 2.6) : rand(0.4, 1.2)) * dpr,
      base: rand(0.2, 0.9),
      tw: rand(0.005, 0.02),        // скорость мерцания
      phase: rand(0, Math.PI * 2),
      vy: rand(0.02, 0.15) * dpr,   // лёгкий дрейф вверх
      glow,
      hue: glow ? rand(320, 360) : rand(250, 300),
    };
  }

  function tick() {
    g.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.phase += s.tw;
      const alpha = s.base * (0.5 + 0.5 * Math.sin(s.phase));
      s.y -= s.vy;
      if (s.y < -5) { s.y = h + 5; s.x = Math.random() * w; }

      if (s.glow) {
        const grd = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        grd.addColorStop(0, `hsla(${s.hue}, 100%, 80%, ${alpha})`);
        grd.addColorStop(1, "hsla(320, 100%, 80%, 0)");
        g.fillStyle = grd;
        g.beginPath();
        g.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = `hsla(${s.hue}, 100%, 92%, ${alpha})`;
      g.beginPath();
      g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      g.fill();
    }
    requestAnimationFrame(tick);
  }

  addEventListener("resize", resize);
  resize();
  tick();
})();

/* =========================================================
   3. ФОНОВЫЕ СЕРДЕЧКИ — едва заметные, плывут вверх.
   ========================================================= */
(function backgroundHearts() {
  const box = $("#bgHearts");
  const glyphs = ["❤", "💗", "💖", "🤍", "💜"];
  function spawn() {
    const s = document.createElement("span");
    s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    s.style.left = rand(0, 100) + "vw";
    s.style.fontSize = rand(12, 30) + "px";
    const dur = rand(9, 18);
    s.style.animationDuration = dur + "s";
    box.appendChild(s);
    setTimeout(() => s.remove(), dur * 1000);
  }
  setInterval(spawn, 900);
})();

/* =========================================================
   4. КОНФЕТТИ И ЛЕТЯЩИЕ СЕРДЕЧКИ — для финала.
   ========================================================= */
const Confetti = (() => {
  const canvas = $("#confetti");
  const g = canvas.getContext("2d");
  let w, h, dpr, pieces = [], running = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
  }
  addEventListener("resize", resize);
  resize();

  const colors = ["#ff5c8a", "#ff9ec4", "#a86bff", "#6be7ff", "#ffd36b", "#ffffff"];

  function burst(amount = 160) {
    for (let i = 0; i < amount; i++) {
      const heart = Math.random() < 0.3;
      pieces.push({
        x: rand(0, w),
        y: rand(-h * 0.3, 0),
        vx: rand(-1.5, 1.5) * dpr,
        vy: rand(1.5, 5) * dpr,
        size: rand(6, 13) * dpr,
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.2, 0.2),
        color: colors[Math.floor(Math.random() * colors.length)],
        heart,
        life: rand(200, 360),
      });
    }
    if (!running) { running = true; tick(); }
  }

  function drawHeart(x, y, size, color) {
    g.fillStyle = color;
    g.beginPath();
    const s = size / 10;
    g.moveTo(x, y + 3 * s);
    g.bezierCurveTo(x, y, x - 5 * s, y, x - 5 * s, y + 3 * s);
    g.bezierCurveTo(x - 5 * s, y + 6 * s, x, y + 8 * s, x, y + 10 * s);
    g.bezierCurveTo(x, y + 8 * s, x + 5 * s, y + 6 * s, x + 5 * s, y + 3 * s);
    g.bezierCurveTo(x + 5 * s, y, x, y, x, y + 3 * s);
    g.fill();
  }

  function tick() {
    g.clearRect(0, 0, w, h);
    pieces = pieces.filter((p) => p.life > 0 && p.y < h + 40);
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03 * dpr;      // гравитация
      p.vx *= 0.995;
      p.rot += p.vr;
      p.life--;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.globalAlpha = Math.min(1, p.life / 60);
      if (p.heart) {
        drawHeart(0, -p.size / 2, p.size * 1.6, p.color);
      } else {
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      }
      g.restore();
    }
    if (pieces.length) requestAnimationFrame(tick);
    else { running = false; g.clearRect(0, 0, w, h); }
  }

  return { burst };
})();

/* =========================================================
   5. УБЕГАЮЩАЯ КНОПКА "НЕТ" — поймать невозможно.
   ========================================================= */
(function runawayButton() {
  const btn = $("#noBtn");
  if (!btn) return;

  let dodges = 0;
  const phrases = ["Точно нет? 🙈", "Не убежишь 😄", "Попробуй ещё 💫", "Ну нет так нет ❤️", "Поймай меня 😌"];

  function flee() {
    // Переводим кнопку в "свободный" режим (fixed) при первом побеге
    if (!btn.classList.contains("is-loose")) {
      btn.classList.add("is-loose");
    }
    const bw = btn.offsetWidth;
    const bh = btn.offsetHeight;
    const maxX = innerWidth - bw - 16;
    const maxY = innerHeight - bh - 16;

    const x = rand(16, Math.max(16, maxX));
    const y = rand(16, Math.max(16, maxY));

    // Случайные прыжок, поворот и изменение размера
    const scale = rand(0.75, 1.35);
    const rot = Math.random() < 0.5 ? rand(-25, 25) : 0;

    btn.style.left = x + "px";
    btn.style.top = y + "px";
    btn.style.transform = `scale(${scale}) rotate(${rot}deg)`;

    dodges++;
    if (dodges % 3 === 0) {
      btn.textContent = phrases[Math.floor(Math.random() * phrases.length)];
    }
  }

  // На компьютере — убегает от курсора
  btn.addEventListener("mouseenter", flee);
  btn.addEventListener("mousemove", flee);
  // Клик тоже не даём совершить
  btn.addEventListener("click", (e) => { e.preventDefault(); flee(); });
  // На телефоне — прыгает при каждом касании
  btn.addEventListener("touchstart", (e) => { e.preventDefault(); flee(); }, { passive: false });
})();

/* =========================================================
   6. УПРАВЛЕНИЕ СЦЕНАМИ И ЦЕПОЧКОЙ КАРТОЧЕК.
   ========================================================= */
(function sceneFlow() {
  const scenes = $$(".scene");
  const byName = (name) => scenes.find((s) => s.dataset.scene === name);
  let current = byName("intro");

  /** Плавный переход между сценами. */
  async function goto(name) {
    const next = byName(name);
    if (!next || next === current) return;
    Sound.blip(rand(560, 760));

    current.classList.add("is-leaving");
    current.classList.remove("is-active");
    const leaving = current;
    current = next;

    await sleep(180);
    next.classList.add("is-active");
    // Перезапускаем анимацию появления карточки
    const card = $(".card, .final", next);
    if (card) { card.style.animation = "none"; void card.offsetWidth; card.style.animation = ""; }

    await sleep(700);
    leaving.classList.remove("is-leaving");
  }

  /* ---------- Цепочка романтичных фраз ---------- */
  const chain = [
    "Ты моё солнце ☀️",
    "Ты моя луна 🌙",
    "Ты мой покой",
    "Ты моя улыбка",
    "Ты моё вдохновение",
    "Ты моё счастье",
    "Ты человек, рядом с которым хочется прожить каждую секунду",
    "Ты та, ради которой хочется становиться лучше",
    "Ты причина, по которой сердце улыбается",
    "Ты самое красивое, что случилось в моей жизни",
    "Ты стала частью моего сердца",
    "Но это ещё не всё...",
  ];
  let chainIndex = 0;
  const chainText = $("#chainText");
  const chainScene = byName("chain");

  /** Показывает текущую фразу цепочки с анимацией появления.
      Меняем текст и перезапускаем CSS-анимацию одним махом — так фраза
      не может «потеряться», даже если нажимать «Дальше» очень быстро. */
  function showChainPhrase() {
    chainText.textContent = chain[chainIndex];
    chainText.style.animation = "none";
    void chainText.offsetWidth; // принудительный reflow перезапускает анимацию
    chainText.style.animation = "phraseIn 0.65s cubic-bezier(0.22,1,0.36,1) both";
  }

  async function enterChain() {
    chainIndex = 0;
    showChainPhrase();
    await goto("chain");
  }

  async function nextChain() {
    Sound.blip(rand(600, 820));
    chainIndex++;
    if (chainIndex < chain.length) {
      showChainPhrase();
    } else {
      await goto("prefinal");
    }
  }

  /* ---------- Обработчики кнопок ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;

    // Первое взаимодействие — запускаем музыку (если ещё не выключена вручную)
    Music.autoStart();

    switch (action) {
      case "start":  goto("ask"); break;
      case "next":   enterChain(); break;
      case "chain-next": nextChain(); break;
      case "final":  runFinal(); break;
    }
  });

  /* =========================================================
     7. ФИНАЛЬНЫЙ ЭКРАН — печать текста, свечение, конфетти.
     ========================================================= */
  const mainLine = "Ты моя безумнейшая любовь, Мадина ❤️";
  const subLine  = "И это никогда не изменится.";

  /** Печатает строку по буквам в элемент. */
  async function typeInto(el, text, speed = 55) {
    el.textContent = "";
    el.classList.add("caret");
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      // Небольшой звук на некоторых буквах, чтобы печать "звучала"
      if (i % 3 === 0) Sound.blip(rand(720, 900));
      await sleep(speed + (text[i] === " " ? 20 : 0));
    }
    el.classList.remove("caret");
  }

  async function runFinal() {
    await goto("final");
    Sound.chord();
    Confetti.burst(200);
    // Догоняющие залпы конфетти
    setTimeout(() => Confetti.burst(120), 800);
    setTimeout(() => Confetti.burst(120), 1800);

    await sleep(500);
    await typeInto($("#typeMain"), mainLine, 60);
    await sleep(400);
    await typeInto($("#typeSub"), subLine, 40);

    // Финальный залп сердечек
    Confetti.burst(140);
  }
})();

/* =========================================================
   8. КНОПКА МУЗЫКИ (включить / выключить).
   ========================================================= */
const Music = (() => {
  const btn = $("#musicToggle");
  let userMuted = false;   // выключил ли пользователь вручную
  let started = false;     // запускалась ли музыка хоть раз

  function refresh() {
    btn.classList.toggle("is-muted", !Sound.isOn);
    btn.classList.toggle("is-playing", Sound.isOn);
  }

  /** Автозапуск при первом клике по кнопкам сцен. */
  function autoStart() {
    if (userMuted || started) return;
    started = true;
    Sound.startMusic();
    refresh();
  }

  btn.addEventListener("click", () => {
    if (Sound.isOn) {
      Sound.stopMusic();
      userMuted = true;
    } else {
      Sound.startMusic();
      userMuted = false;
      started = true;
    }
    refresh();
  });

  refresh();
  return { autoStart };
})();
