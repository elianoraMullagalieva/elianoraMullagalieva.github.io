/* ============================================================
   NEURO — многоступенчатая анимация на GSAP.

   Четыре ступени, каждая со своим смыслом:
     1. BOOT   — система просыпается: сканирующая линия, техно-лог.
     2. INGEST — портрет проявляется, по нему проходит красный свет.
     3. OUTPUT — гигантские литеры выезжают по диагоналям макета.
     4. LIVE   — выноски прочерчиваются, счётчики тикают,
                 сцена дышит и реагирует на курсор.

   Движение только по диагоналям композиции (45° и −39°) —
   тем же, что нарисованы в макете.
   ============================================================ */

(function () {
  "use strict";

  var root = document.querySelector("[data-neuro]");
  if (!root) return;

  // Без GSAP показываем статичную композицию — она самодостаточна.
  if (typeof window.gsap === "undefined") {
    root.classList.add("is-static");
    return;
  }

  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    root.classList.add("is-static");
    return;
  }

  /* --------------------------------------------------------
     Сбор элементов
     -------------------------------------------------------- */

  var portrait = root.querySelector(".neuro__portrait");
  var portraitWrap = root.querySelector(".neuro__portrait-wrap");
  var scan = root.querySelector(".neuro__scan");
  var grain = root.querySelector(".neuro__grain");
  var diagonals = root.querySelectorAll(".neuro__diag");
  var boots = root.querySelectorAll("[data-boot]");
  var chars = root.querySelectorAll(".neuro__ch");
  var claimRows = root.querySelectorAll(".neuro__claim-row > span");
  var logItems = root.querySelectorAll("[data-log] li");
  var wirePaths = root.querySelectorAll(".neuro__wire-path, .neuro__leader-path");
  var nodes = root.querySelectorAll(".neuro__node");
  var rules = root.querySelectorAll(".neuro__rule");
  var counters = root.querySelectorAll("[data-count]");
  var statusValue = root.querySelector("[data-status]");
  var scrambleEls = root.querySelectorAll("[data-scramble]");
  var hasScramble = typeof window.scrambleText === "function";

  // Угол диагонали макета: буквы приезжают вдоль неё, а не «откуда попало».
  var DIAG = { x: 0.62, y: -0.78 };

  /* --------------------------------------------------------
     Подготовка штрихов SVG к прочерчиванию
     -------------------------------------------------------- */

  wirePaths.forEach(function (path) {
    var len;
    try {
      len = path.getTotalLength();
    } catch (e) {
      len = 0;
    }
    if (!len) return;
    // Сохраняем авторский dasharray у пунктирной рамки:
    // прочерчиваем её через обёрточную маску длины.
    path.dataset.len = len;
    if (!path.getAttribute("stroke-dasharray")) {
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    } else {
      gsap.set(path, { opacity: 0 });
    }
  });

  /* --------------------------------------------------------
     Стартовые состояния
     -------------------------------------------------------- */

  gsap.set(root, { autoAlpha: 1 });

  // Портрет не «проявляется» затуханием — он раскрывается построчно
  // сверху вниз (--reveal — CSS-переменная, двигает линейную маску
  // в CSS: см. .neuro__portrait-wrap). opacity:1 с самого начала —
  // видимость держит маска, а не прозрачность.
  gsap.set(portraitWrap, { opacity: 1, "--reveal": "0%" });
  var revealEdge = root.querySelector(".neuro__reveal-edge");
  gsap.set(revealEdge, { opacity: 0 });
  gsap.set(portrait, { scale: 1.08, filter: "grayscale(0.8) contrast(1.2) brightness(0.82)" });
  gsap.set(boots, { opacity: 0, y: 8 });
  gsap.set(claimRows, { yPercent: 115 });
  gsap.set(logItems, { opacity: 0, x: 14 });
  gsap.set(nodes, { scale: 0, transformOrigin: "center center" });
  gsap.set(rules, { scaleX: 0 });
  gsap.set(diagonals, { drawSVG: undefined, opacity: 0 });

  // Диагонали прочерчиваем вручную (DrawSVG — платный плагин).
  diagonals.forEach(function (line) {
    var len = Math.hypot(
      line.x2.baseVal.value - line.x1.baseVal.value,
      line.y2.baseVal.value - line.y1.baseVal.value
    );
    gsap.set(line, { attr: { "stroke-dasharray": len }, strokeDashoffset: len, opacity: 1 });
  });

  // Литеры: приезжают вдоль диагонали, из-за портрета.
  chars.forEach(function (ch) {
    var white = ch.classList.contains("is-white");
    gsap.set(ch, {
      opacity: 0,
      x: -110 * DIAG.x,
      y: -110 * DIAG.y,
      scale: white ? 1.18 : 1.06,
      transformOrigin: "50% 60%",
    });
  });

  /* --------------------------------------------------------
     Главный таймлайн
     -------------------------------------------------------- */

  var tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    paused: true,
  });

  /* ---- 1. BOOT + INGEST: скан и раскрытие фото идут ПАРАЛЛЕЛЬНО
     с текстом, не после него. Скан горизонтальный (как и был),
     раскрытие фото — вертикальная штора; оба стартуют в один момент
     и вместе с появлением техно-подписей — вся сцена просыпается
     разом, а не по очереди. ---- */

  // Техно-подписи включаются сразу, с первого кадра: сцена не должна
  // начинаться с пустого серого экрана. Мелкие лейблы одновременно
  // «расшифровываются» из случайных символов — система не просто
  // проявляется, а как будто считывает собственные данные.
  tl.addLabel("boot")
    .to(
      boots,
      {
        opacity: 1,
        y: 0,
        duration: 0.15,
        stagger: { each: 0.018, from: "start" },
        onStart: function () {
          if (!hasScramble) return;
          scrambleEls.forEach(function (el, i) {
            window.scrambleText(el, null, { duration: 0.2, delay: i * 0.015, scrambleStep: 0.03 });
          });
        },
      },
      "boot"
    )
    .to(
      diagonals,
      { strokeDashoffset: 0, duration: 0.335, ease: "power2.inOut", stagger: 0.027 },
      "boot"
    )
    // Скан идёт один раз горизонтально, синхронно со стартом раскрытия
    // фото под ним — визуально это одно движение "проявки", а не два.
    .fromTo(
      scan,
      { xPercent: -60, opacity: 0 },
      { xPercent: 420, opacity: 1, duration: 0.385, ease: "power2.inOut" },
      "boot"
    )
    .to(scan, { opacity: 0, duration: 0.15 }, "boot+=0.31")
    .to(revealEdge, { opacity: 1, duration: 0.06 }, "boot")
    .to(
      portraitWrap,
      { "--reveal": "118%", duration: 0.36, ease: "power2.inOut" },
      "boot"
    )
    .to(revealEdge, { opacity: 0, duration: 0.08 }, "boot+=0.31")
    .to(
      portrait,
      {
        scale: 1,
        filter: "grayscale(0) contrast(1.06) brightness(1) saturate(1.04)",
        duration: 0.385,
        ease: "power2.out",
      },
      "boot+=0.05"
    );

  /* ---- 2. OUTPUT: литеры выезжают по диагонали ---- */

  // Красные литеры приходят волной, белые (N, D) — с задержкой
  // и защёлкиванием: это акцент композиции. Стартует сразу же,
  // как только фото раскрылось — без паузы между этапами.
  var redChars = [];
  var whiteChars = [];
  chars.forEach(function (ch) {
    (ch.classList.contains("is-white") ? whiteChars : redChars).push(ch);
  });

  tl.addLabel("output", "boot+=0.285")
    .to(
      redChars,
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: "expo.out",
        stagger: { each: 0.055, from: "start" },
      },
      "output"
    )
    .to(
      whiteChars,
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: "back.out(1.6)",
      },
      "output+=0.32"
    );

  /* ---- 3. LIVE: выноски у лица, манифест, лог, счётчики ---- */

  // Провода-выноски у лица приходят почти сразу за раскрытым портретом,
  // не через долгую паузу — они читаются как отклик на уже видимое лицо.
  tl.addLabel("live", "output+=0.4")
    .to(
      claimRows,
      { yPercent: 0, duration: 0.85, ease: "power3.out", stagger: 0.09 },
      "live"
    )
    .to(rules, { scaleX: 1, duration: 0.5, stagger: 0.1 }, "live+=0.2")
    .to(
      wirePaths,
      {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power2.inOut",
        stagger: 0.1,
      },
      "live+=0.1"
    )
    .to(
      nodes,
      { scale: 1, duration: 0.4, ease: "back.out(2.4)", stagger: 0.06 },
      "live+=0.55"
    )
    .to(
      logItems,
      {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.12,
        onStart: function () {
          if (!hasScramble) return;
          logItems.forEach(function (el, i) {
            window.scrambleText(el, null, { duration: 0.6, delay: i * 0.12, scrambleStep: 0.03 });
          });
        },
      },
      "live+=0.4"
    );

  // Счётчики телеметрии добегают до значений макета
  counters.forEach(function (el, i) {
    var target = parseFloat(el.dataset.count);
    var obj = { v: 0 };
    tl.to(
      obj,
      {
        v: target,
        duration: 1.1,
        ease: "power2.out",
        onUpdate: function () {
          el.textContent = obj.v.toFixed(2).padStart(6, "0");
        },
      },
      "live+=" + (0.1 + i * 0.08)
    );
  });

  // STATUS дописывается по букве — как в терминале
  if (statusValue) {
    var word = "ACTIVE";
    var typed = { i: 0 };
    statusValue.textContent = "";
    tl.to(
      typed,
      {
        i: word.length,
        duration: 0.55,
        ease: "none",
        onUpdate: function () {
          statusValue.textContent = word.slice(0, Math.round(typed.i));
        },
      },
      "live+=0.6"
    );
  }

  /* --------------------------------------------------------
     Постоянная жизнь сцены: ничего не замирает насмерть
     -------------------------------------------------------- */

  function startAmbient() {
    // Портрет едва дышит
    gsap.to(portrait, {
      scale: 1.025,
      duration: 9,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    // Зерно живёт
    gsap.to(grain, {
      x: "+=18",
      y: "+=12",
      duration: 3.2,
      ease: "none",
      repeat: -1,
      yoyo: true,
    });

    // Телеметрия продолжает тикать в младших разрядах —
    // система работает, а не показывает скриншот.
    counters.forEach(function (el) {
      var base = parseFloat(el.dataset.count);
      gsap.to(
        { v: 0 },
        {
          v: 1,
          duration: 2.4,
          repeat: -1,
          ease: "none",
          onRepeat: function () {
            var drift = base + (Math.random() - 0.5) * 0.6;
            el.textContent = Math.abs(drift).toFixed(2).padStart(6, "0");
          },
        }
      );
    });

    // Узлы выносок пульсируют по очереди
    gsap.to(nodes, {
      opacity: 0.35,
      duration: 1.1,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      stagger: { each: 0.3, from: "random" },
    });
  }

  tl.call(startAmbient, null, "live+=1.2");

  // Мелкие лейблы перескрамбливаются при наведении — деталь, которая
  // держит сцену «живой» и после того, как основной таймлайн отыграл.
  if (hasScramble && window.matchMedia("(pointer: fine)").matches) {
    scrambleEls.forEach(function (el) {
      window.scrambleText.hoverize(el, { duration: 0.5, scrambleStep: 0.03 });
    });
  }

  /* --------------------------------------------------------
     Параллакс от курсора — сцена отзывается на присутствие
     -------------------------------------------------------- */

  var layers = [
    { el: portraitWrap, depth: 8 },
    { el: root.querySelector(".neuro__word--left"), depth: 18 },
    { el: root.querySelector(".neuro__word--right"), depth: 18 },
    { el: root.querySelector(".neuro__diagonals"), depth: 26 },
  ];

  var setters = layers
    .filter(function (l) {
      return l.el;
    })
    .map(function (l) {
      return {
        depth: l.depth,
        x: gsap.quickTo(l.el, "x", { duration: 0.9, ease: "power3.out" }),
        y: gsap.quickTo(l.el, "y", { duration: 0.9, ease: "power3.out" }),
      };
    });

  var pointerFine = window.matchMedia("(pointer: fine)").matches;

  if (pointerFine) {
    root.addEventListener("pointermove", function (e) {
      var r = root.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      setters.forEach(function (s) {
        s.x(nx * s.depth);
        s.y(ny * s.depth * 0.6);
      });
    });

    root.addEventListener("pointerleave", function () {
      setters.forEach(function (s) {
        s.x(0);
        s.y(0);
      });
    });
  }

  /* --------------------------------------------------------
     Запуск: по входу секции в экран
     -------------------------------------------------------- */

  function play() {
    tl.play();
  }

  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: root,
      start: "top 72%",
      once: true,
      onEnter: play,
    });
  } else {
    play();
  }

  // Если картинка ещё грузится — ждём её, чтобы ступень INGEST
  // не проигралась по пустому месту.
  if (portrait && !portrait.complete) {
    portrait.addEventListener("load", function () {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  }

  /* ========================================================
     ПЕРЕХОД К БЛОКУ 2 — «мысль сворачивается в ядро»

     Скролл продолжает ту же историю: литеры NEURO и DOES
     втягиваются по своим диагоналям обратно к центру кадра —
     туда, где было лицо, — портрет уходит в глубину,
     и из точки схода разворачивается сфера из слов.
     ======================================================== */

  var core = document.querySelector("[data-core]");
  var sphereCanvas = core && core.querySelector("[data-sphere]");

  if (!core || !sphereCanvas || typeof window.TextSphere === "undefined") return;

  // Белые глифы держат контраст на тёмном фоне; красный акцент — только
  // на ближней к зрителю четверти сферы, для объёма (см. text-sphere.js).
  var sphere = new window.TextSphere(sphereCanvas, {
    word: "sales",
    color: "#f3f1f0",
    accentColor: "#ff3b48",
    fontFamily: '"B612 Mono", monospace',
    fontWeight: 400,
    fontSize: 15,
    speed: 3.6,
    rotationSide: "counterclockwise",
    twist: 50,
    letterSpacing: 800,
    assembly: 0,
  });

  var coreEls = core.querySelectorAll("[data-core-el]");
  var coreRows = core.querySelectorAll(".core__title-row > span");
  var glyphsOut = core.querySelector("[data-glyphs]");

  gsap.set(coreEls, { opacity: 0, y: 16 });
  gsap.set(coreRows, { yPercent: 115 });

  var wordLeft = root.querySelector(".neuro__word--left");
  var wordRight = root.querySelector(".neuro__word--right");

  // Первая сцена закреплена, пока идёт сворачивание.
  var handoff = gsap.timeline({
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: window.matchMedia("(max-width: 720px)").matches ? "+=70%" : "+=110%",
      pin: true,
      pinSpacing: true,
      scrub: 0.8,
    },
  });

  // Канвас поднимаем поверх закреплённой первой сцены, чтобы ядро
  // собиралось в кадре, а не за его пределами.
  gsap.set(sphereCanvas, { position: "fixed", inset: 0, zIndex: 5, opacity: 0 });
  handoff.to(sphereCanvas, { opacity: 1, ease: "power1.out", duration: 0.5 }, 0.25);

  // Канвас возвращается в поток только когда секция ядра реально
  // дошла до верха экрана. Иначе между откреплением и появлением
  // секции остаётся пустой (чёрный) кадр — особенно заметно на мобильном.
  function releaseCanvas() {
    gsap.set(sphereCanvas, { clearProps: "position,inset,zIndex" });
  }
  function holdCanvas() {
    gsap.set(sphereCanvas, { position: "fixed", inset: 0, zIndex: 5 });
  }

  window.ScrollTrigger.create({
    trigger: core,
    start: "top top",
    onEnter: releaseCanvas,
    onLeaveBack: holdCanvas,
  });

  // 1. Мелкая техно-графика гаснет первой — она обслуживала первую сцену
  handoff
    .to(
      [boots, logItems, claimRows, wirePaths, nodes, diagonals],
      { opacity: 0, ease: "power1.in", duration: 0.4 },
      0
    )
    // 2. Литеры втягиваются к центру — по тем же диагоналям, что и приходили.
    //    Уходят не в ноль: остаются видны до самого схода в ядро.
    .to(
      wordLeft,
      { x: 230, y: 150, scale: 0.28, opacity: 0, ease: "power2.in", duration: 0.85 },
      0.12
    )
    .to(
      wordRight,
      { x: -230, y: -60, scale: 0.28, opacity: 0, ease: "power2.in", duration: 0.85 },
      0.12
    )
    // 3. Портрет обесцвечивается и уходит в глубину — обратный ход INGEST
    .to(
      portrait,
      {
        scale: 1.3,
        filter: "grayscale(1) contrast(1.3) brightness(0.35)",
        ease: "power2.in",
        duration: 0.95,
      },
      0.1
    )
    .to(portraitWrap, { opacity: 0, ease: "power2.in", duration: 0.7 }, 0.3);

  // 4. Фон темнеет РАНЬШЕ схода: ядро должно собираться уже на глубине,
  //    а не на светлом экране. Это убирает пустой кадр в середине.
  // Темнеет и сама секция, и её фоновый слой — иначе светлый .neuro__bg
  // остаётся поверх и ядро собирается на сером.
  var bgLayer = root.querySelector(".neuro__bg");
  handoff
    .to(root, { backgroundColor: "#0a0809", ease: "power2.in", duration: 0.7 }, 0.08)
    .to(bgLayer, { opacity: 0, ease: "power2.in", duration: 0.65 }, 0.12)
    .to(grain, { opacity: 0, ease: "power1.in", duration: 0.5 }, 0.1);

  // 5. Сфера начинает собираться, пока литеры ещё видны — фазы
  //    перекрываются, движение не прерывается ни на кадр.
  var assembly = { v: 0 };
  handoff.to(
    assembly,
    {
      v: 1,
      ease: "power2.out",
      duration: 1.15,
      onUpdate: function () {
        sphere.setAssembly(assembly.v);
      },
    },
    0.3
  );

  // 6. Подписи второй сцены приходят, когда ядро уже держит форму
  var coreScrambleEls = core.querySelectorAll("[data-scramble]");
  gsap
    .timeline({
      scrollTrigger: {
        trigger: core,
        start: "top 62%",
        once: true,
      },
      defaults: { ease: "power3.out" },
    })
    .to(coreRows, { yPercent: 0, duration: 0.9, stagger: 0.1 })
    .to(
      coreEls,
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.09,
        onStart: function () {
          if (!hasScramble) return;
          coreScrambleEls.forEach(function (el, i) {
            window.scrambleText(el, null, { duration: 0.7, delay: 0.15 + i * 0.08, scrambleStep: 0.03 });
          });
        },
      },
      0.15
    );

  if (hasScramble && window.matchMedia("(pointer: fine)").matches) {
    coreScrambleEls.forEach(function (el) {
      window.scrambleText.hoverize(el, { duration: 0.5, scrambleStep: 0.03 });
    });
  }

  // Счётчик глифов добегает до реального числа в геометрии
  if (glyphsOut) {
    window.ScrollTrigger.create({
      trigger: core,
      start: "top 62%",
      once: true,
      onEnter: function () {
        var total = sphere._geometry.length || 0;
        var obj = { v: 0 };
        gsap.to(obj, {
          v: total,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: function () {
            glyphsOut.textContent = String(Math.round(obj.v)).padStart(4, "0");
          },
        });
      },
    });
  }

  /* ========================================================
     БЛОК 3 — ТАРИФЫ + FAQ

     Заходит в кадр обычным scroll-reveal: заголовок и тег первыми,
     карточки тарифов волной слева направо (рекомендованная — с
     небольшой задержкой, чтобы взгляд сначала прошёл по всем трём),
     FAQ отдельным заходом ниже. Скрамбл — на теги NEURAL SYSTEM.
     ======================================================== */

  var deploy = document.querySelector("[data-deploy]");
  if (!deploy) return;

  var deployScrambleEls = deploy.querySelectorAll("[data-scramble]");
  var plans = deploy.querySelectorAll("[data-plan]");
  var faqItems = deploy.querySelectorAll("[data-faq-item]");

  gsap.set(deploy.querySelectorAll(".deploy__tag, .deploy__title, .deploy__lead"), {
    opacity: 0,
    y: 14,
  });
  gsap.set(plans, { opacity: 0, y: 28 });
  gsap.set(deploy.querySelectorAll(".faq__tag, .faq__title"), { opacity: 0, y: 14 });
  gsap.set(faqItems, { opacity: 0, y: 16 });

  gsap
    .timeline({
      scrollTrigger: { trigger: deploy, start: "top 78%", once: true },
      defaults: { ease: "power3.out" },
    })
    .to(deploy.querySelectorAll(".deploy__tag, .deploy__title, .deploy__lead"), {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.08,
      onStart: function () {
        if (!hasScramble) return;
        deployScrambleEls.forEach(function (el, i) {
          window.scrambleText(el, null, { duration: 0.6, delay: i * 0.05, scrambleStep: 0.03 });
        });
      },
    })
    .to(
      plans,
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 },
      "-=0.2"
    );

  gsap
    .timeline({
      scrollTrigger: { trigger: deploy.querySelector(".faq"), start: "top 82%", once: true },
      defaults: { ease: "power3.out" },
    })
    .to(deploy.querySelectorAll(".faq__tag, .faq__title"), { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 })
    .to(faqItems, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07 }, "-=0.2");

  // Аккордеон: закрываем остальные пункты при открытии одного —
  // это FAQ, а не список независимых карточек.
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqItems.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });
})();
