// ===== МЕТКА ИСТОЧНИКА =====
// Короткие ссылки соцсетей (/ig, /tg, /yt, /vk, /th…) открывают страницу с ?utm_source=…
// Запоминаем метку на 30 дней: человек может вернуться позже уже без неё.
const getRef = (() => {
  const KEY = 'dd_ref';
  try {
    const u = new URLSearchParams(window.location.search);
    const fresh = (u.get('ref') || u.get('utm_source') || '').slice(0, 60);
    if (fresh) localStorage.setItem(KEY, JSON.stringify({ v: fresh, t: Date.now() }));
  } catch (_) {}
  return () => {
    try {
      const u = new URLSearchParams(window.location.search);
      const now = (u.get('ref') || u.get('utm_source') || '').slice(0, 60);
      if (now) return now;
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      return s && Date.now() - s.t < 30 * 864e5 ? s.v : '';
    } catch (_) { return ''; }
  };
})();

// ===== ЕДИНЫЙ SCROLL-ДИСПЕТЧЕР =====
// Было: 5 отдельных scroll-слушателей, каждый со своим requestAnimationFrame —
// на мобилке они конкурировали за кадр и давали рывки при скролле.
// Стало: один слушатель + один rAF на кадр, подписчики вызываются по очереди.
const scrollSubscribers = [];
let scrollFrameQueued = false;
const runScrollSubscribers = () => {
  scrollFrameQueued = false;
  for (let i = 0; i < scrollSubscribers.length; i += 1) {
    try { scrollSubscribers[i](); } catch (_) { /* один сбойный подписчик не роняет остальные */ }
  }
};
const onScrollFrame = (fn) => {
  scrollSubscribers.push(fn);
  return () => {
    if (scrollFrameQueued) return;
    scrollFrameQueued = true;
    window.requestAnimationFrame(runScrollSubscribers);
  };
};
const requestScrollFrame = () => {
  if (scrollFrameQueued) return;
  scrollFrameQueued = true;
  window.requestAnimationFrame(runScrollSubscribers);
};
window.addEventListener('scroll', requestScrollFrame, { passive: true });
window.addEventListener('resize', requestScrollFrame);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const motionSequence = document.querySelector('.motion-sequence');
const introStage = document.querySelector('.intro-stage');

// ===== КАСКАДНОЕ ПОЯВЛЕНИЕ ПЕРВОГО ЭКРАНА =====
// Три уровня сверху вниз: шапка → заголовок с CTA → подписи и лента работ.
// Тот же почерк, что focus-reveal в «Для кого»: элементы выходят из мягкого
// блюра в фокус с небольшим подъёмом. Играет один раз при загрузке.
if (introStage && window.anime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const q = (sel) => [...introStage.querySelectorAll(sel)].filter(Boolean);
  const level1 = [...q('.site-header .brand'), ...q('.site-header .header-duration'),
                  ...q('.site-header nav'), ...q('.site-header .header-side'),
                  ...q('.mobile-hero-proof')];
  const level2 = [...q('.hero-kicker'), ...q('#hero-title')];
  // Кнопка центрируется через transform:translateX(-50%) — анимируем её
  // отдельно, БЕЗ translateY, иначе anime.js затрёт центрирование.
  const level2cta = q('.hero-cta');
  const level3 = [...q('.hero-proof'), ...q('.hero-hint'), ...q('.hero-gallery-note'),
                  ...q('.mobile-project-meta'), ...q('.showcase-marquee')];
  const all = [...level1, ...level2, ...level2cta, ...level3];

  if (all.length) {
    // Снимаем CSS-маскировку: с этого момента видимостью управляет anime.js.
    // Порядок важен — сначала выставляем opacity:0 через anime, потом
    // убираем класс, иначе будет кадр с полностью видимым контентом.
    // Стартовое состояние: мягкий блюр + лёгкий подъём снизу.
    window.anime.set(level1, { opacity: 0, translateY: -12, filter: 'blur(8px)' });
    window.anime.set(level2, { opacity: 0, translateY: 22, filter: 'blur(14px)' });
    window.anime.set(level2cta, { opacity: 0, filter: 'blur(14px)' });
    window.anime.set(level3, { opacity: 0, translateY: 26, filter: 'blur(12px)' });
    introStage.classList.add('is-ready');

    const playIntro = () => {
      const tl = window.anime.timeline({ easing: 'cubicBezier(.22, 1, .36, 1)' });
      tl
        .add({ targets: level1, opacity: [0, 1], translateY: [-12, 0],
               filter: ['blur(8px)', 'blur(0px)'],
               delay: window.anime.stagger(70), duration: 620 }, 120)
        .add({ targets: level2, opacity: [0, 1], translateY: [22, 0],
               filter: ['blur(14px)', 'blur(0px)'],
               delay: window.anime.stagger(110), duration: 820 }, 340)
        .add({ targets: level2cta, opacity: [0, 1],
               filter: ['blur(14px)', 'blur(0px)'], duration: 820 }, 450)
        .add({ targets: level3, opacity: [0, 1], translateY: [26, 0],
               filter: ['blur(12px)', 'blur(0px)'],
               delay: window.anime.stagger(90), duration: 760 }, 700);
    };

    // Ждём шрифты, чтобы текст не «прыгал» в момент проявления.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(playIntro).catch(playIntro);
    } else {
      window.requestAnimationFrame(playIntro);
    }
  }
}

if (motionSequence && window.anime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const transitionVariant = new URLSearchParams(window.location.search).get('transition') === 'fade'
    ? 'fade'
    : 'black';
  document.documentElement.dataset.transition = transitionVariant;
  const motionStage = motionSequence.querySelector('.motion-stage');
  const motionCurtain = motionSequence.querySelector('.motion-curtain');
  const motionChrome = motionSequence.querySelector('.motion-chrome');
  const motionTunnel = motionSequence.querySelector('.motion-tunnel');
  const motionTunnelText = motionSequence.querySelector('.motion-tunnel-text');
  const motionWordsField = motionSequence.querySelector('.motion-words');
  const motionWords = [...motionSequence.querySelectorAll('.motion-words span')];
  const motionLineTargets = [...motionSequence.querySelectorAll('.motion-destinations span')];
  const motionPosters = [...motionSequence.querySelectorAll('.motion-poster')];
  const motionFlash = motionSequence.querySelector('.motion-flash span');
  const motionResult = motionSequence.querySelector('.motion-result');
  const motionAudienceSection = document.querySelector('.audience-section');
  let audienceSceneReady = false;
  let motionTimeline;
  let motionTicking = false;
  let requestedMotionProgress = 0;
  let displayedMotionProgress = 0;
  let mobileProgressFrame = 0;
  let previousProgressFrameTime = 0;

  const tunnelCamera = { x: 0, y: 0, width: 1400, height: 814 };
  const renderTunnelCamera = () => {
    motionTunnel.setAttribute('viewBox', `${tunnelCamera.x} ${tunnelCamera.y} ${tunnelCamera.width} ${tunnelCamera.height}`);
  };

  const getTunnelTarget = () => {
    try {
      // «П» — первая буква второго слова, но нужный круг находится в следующей «р».
      const targetIndex = 'НейроП'.length;
      const box = motionTunnelText.getExtentOfChar(targetIndex);
      const counter = {
        // The typographic bbox includes the descender. These coordinates land in
        // the visual centre of the «р» counter rather than in its line-height box.
        x: box.x + box.width * .55,
        y: box.y + box.height * .53,
      };
      return {
        // ViewBox centres on the counter, not on the baseline of the glyph.
        x: counter.x - 13,
        y: counter.y - 13,
        width: 26,
        height: 26,
      };
    } catch {
      return { x: 686, y: 398, width: 26, height: 26 };
    }
  };

  const buildMotionTimeline = () => {
    const posterAngles = window.innerWidth <= 900 ? [-19.5, 15] : [3, -3];
    window.anime.remove([motionCurtain, motionChrome, motionTunnel, motionWordsField, motionFlash, motionResult, tunnelCamera, ...motionWords, ...motionPosters]);
    window.anime.set(motionCurtain, transitionVariant === 'fade'
      ? { translateY: '0%', opacity: 0 }
      : { translateY: '100%', opacity: 1 });
    window.anime.set(motionChrome, { opacity: 0 });
    window.anime.set(motionTunnel, { opacity: 0 });
    window.anime.set(motionWords, { opacity: 0, filter: 'blur(10px)', translateX: 0, translateY: 0, scale: 1, letterSpacing: '-.04em' });
    window.anime.set(motionFlash, { opacity: 0, scale: .08 });
    window.anime.set(motionPosters[0], { opacity: 0, translateX: '-150%', translateY: '8%', scale: 0.94, rotate: posterAngles[0] });
    window.anime.set(motionPosters[1], { opacity: 0, translateX: '150%', translateY: '-8%', scale: 0.94, rotate: posterAngles[1] });
    Object.assign(tunnelCamera, { x: 0, y: 0, width: 1400, height: 814 });
    renderTunnelCamera();
    const tunnelTarget = getTunnelTarget();

    const travelToLine = motionWords.map((word) => {
      const from = word.getBoundingClientRect();
      const target = motionLineTargets.find((item) => item.dataset.skill === word.dataset.skill);
      const to = target.getBoundingClientRect();
      return {
        x: (to.left + to.width / 2) - (from.left + from.width / 2),
        y: (to.top + to.height / 2) - (from.top + from.height / 2),
      };
    });
    const stage = motionStage.getBoundingClientRect();
    // The vertical sequence contracts into one shared centre point. The words
    // briefly nest over each other before the light takes over the frame.
    const compactScale = window.innerWidth <= 900 ? .24 : .26;
    const travelToCentre = motionWords.map((word) => {
      const from = word.getBoundingClientRect();
      return {
        x: stage.left + stage.width / 2 - (from.left + from.width / 2),
        y: stage.top + stage.height / 2 - (from.top + from.height / 2),
      };
    });
    motionTimeline = window.anime.timeline({ autoplay: false, easing: 'cubicBezier(.22, 1, .36, 1)' });
    if (transitionVariant === 'fade') {
      motionTimeline.add({ targets: motionCurtain, opacity: [0, 1], duration: 1280, easing: 'linear' }, 0);
    } else {
      motionTimeline.add({ targets: motionCurtain, translateY: ['100%', '0%'], duration: 1280, easing: 'linear' }, 0);
    }

    motionTimeline
      .add({ targets: motionChrome, opacity: [0, 1], duration: 360 }, 1040)
      .add({ targets: motionTunnel, opacity: [0, 1], duration: 520 }, 900)
      .add({ targets: tunnelCamera, ...tunnelTarget, duration: 1500, easing: 'easeInOutCubic', update: renderTunnelCamera }, 1500)
      .add({ targets: motionTunnel, opacity: [1, 0], duration: 180 }, 3050)
      .add({
        targets: motionWords,
        opacity: [0, 1],
        filter: ['blur(10px)', 'blur(0px)'],
        delay: window.anime.stagger(50),
        duration: 480,
      }, 3220)
      .add({
        targets: motionPosters,
        opacity: [0, 1],
        translateX: 0,
        translateY: 0,
        scale: [.9, 1],
        rotate: (element, index) => posterAngles[index],
        delay: window.anime.stagger(110),
        duration: 360,
      }, 3260)
      .add({
        targets: motionWords,
        translateX: (element, index) => travelToLine[index].x,
        translateY: (element, index) => travelToLine[index].y,
        scale: 1.35,
        duration: 1160,
        delay: window.anime.stagger(55),
      }, 4120)
      .add({
        // Posters stay in the composition while the words begin to travel,
        // then leave through their nearest screen edge around the midpoint.
        targets: motionPosters,
        opacity: [1, 0],
        scale: [1, .94],
        translateX: (element, index) => index ? '160%' : '-160%',
        translateY: (element, index) => index ? '-8%' : '8%',
        duration: 1200,
        easing: 'linear',
      }, 4700)
      .add({ targets: motionWords, letterSpacing: ['-.04em', '-.06em'], duration: 700 }, 4380)
      // The completed vertical sequence folds into a single centre: upper words
      // descend and lower words rise. No letter morphing or stagger is used.
      .add({
        targets: motionWords,
        translateX: (element, index) => travelToCentre[index].x,
        translateY: (element, index) => travelToCentre[index].y,
        scale: compactScale,
        letterSpacing: '-.04em',
        duration: 700,
        easing: 'cubicBezier(.22, 1, .36, 1)',
      }, 6100)
      // The light starts with the inward motion, then carries the title through
      // the hand-off — there is no empty beat between the two states.
      .add({ targets: motionFlash, opacity: [0, .22, .78, 1, .7, .25, 0], scale: [.08, .52, .95, 1.4, 1.82, 2.1, 2.24], duration: 1280, easing: 'easeOutCubic' }, 6100);
  };

  const renderMotionProgress = (progress, scroll, start, distance) => {
    const isMobile = window.innerWidth <= 900;
    // Страховка: если секция физически ушла за верх экрана, сцена ОБЯЗАНА
    // завершиться — иначе на мобилке (инерция скролла, dvh) прогресс не доходит
    // до .999, motion-stage остаётся position:fixed и перекрывает весь сайт.
    const sectionGone = motionSequence.getBoundingClientRect().bottom <= 0;
    const isComplete = progress >= .999 || sectionGone;
    const isActive = !sectionGone && scroll > start && (scroll < start + distance || (isMobile && !isComplete));
    motionSequence.classList.toggle('is-active', isActive);
    motionSequence.classList.toggle('is-words-visible', progress >= .39 && progress < .856);
    motionSequence.classList.toggle('is-hand-off', progress >= .856);
    // The statement begins before the words have fully disappeared, inside the growing light.
    motionSequence.classList.toggle('is-result-visible', progress >= .838);
    motionSequence.classList.toggle('is-result-line-one', progress >= .842);
    motionSequence.classList.toggle('is-result-line-two', progress >= .848);
    const introComplete = sectionGone || (scroll >= start + distance && (!isMobile || isComplete));
    introStage?.classList.toggle('is-complete', introComplete);
    if (introComplete) window.dispatchEvent(new Event('persistent-chrome-update'));
    motionStage.classList.toggle('is-pinned', isActive);
    motionStage.classList.toggle('is-ended', sectionGone || (scroll >= start + distance && (!isMobile || isComplete)));
    // The completed statement gets a short reading hold.  Its exit is a neutral
    // defocus; the white audience scene only becomes readable after this title
    // is already gone, so the two texts can never compete on one frame.
    const resultExit = Math.max(0, Math.min(1, (progress - .95) / .05));
    motionStage.style.setProperty('--result-exit', resultExit.toFixed(3));
    if (!audienceSceneReady && progress >= .998 && motionAudienceSection) {
      audienceSceneReady = true;
      motionAudienceSection.classList.add('is-scene-ready');
      window.dispatchEvent(new Event('audience-scene-ready'));
    }
    // Use the designed duration rather than Anime's internal stagger bookkeeping:
    // this keeps every scroll position tied to the intended choreography.
    motionTimeline.seek(8000 * progress);
  };

  const advanceMobileProgress = (now) => {
    const elapsed = previousProgressFrameTime ? Math.min(48, now - previousProgressFrameTime) : 16;
    previousProgressFrameTime = now;
    // A flick cannot compress the final fold and flash into one instant:
    // the visible timeline advances at a deliberate, tactile pace.
    const velocity = displayedMotionProgress < .72 ? .45 : .1;
    const step = elapsed / 1000 * velocity;
    const delta = requestedMotionProgress - displayedMotionProgress;
    displayedMotionProgress += Math.sign(delta) * Math.min(Math.abs(delta), step);
    const distance = motionSequence.offsetHeight - window.innerHeight;
    renderMotionProgress(displayedMotionProgress, window.scrollY, 0, distance);
    if (Math.abs(requestedMotionProgress - displayedMotionProgress) > .0001) {
      mobileProgressFrame = window.requestAnimationFrame(advanceMobileProgress);
    } else {
      mobileProgressFrame = 0;
      previousProgressFrameTime = 0;
    }
  };

  const scrubMotionSequence = () => {
    motionTicking = false;
    const scroll = window.scrollY;
    const start = 0;
    const distance = motionSequence.offsetHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, (scroll - start) / distance));
    if (window.innerWidth <= 900) {
      requestedMotionProgress = progress;
      if (!mobileProgressFrame) mobileProgressFrame = window.requestAnimationFrame(advanceMobileProgress);
      return;
    }
    displayedMotionProgress = progress;
    renderMotionProgress(progress, scroll, start, distance);
  };

  const requestMotionScrub = () => {
    if (!motionTicking) {
      motionTicking = true;
      window.requestAnimationFrame(scrubMotionSequence);
    }
  };

  buildMotionTimeline();
  scrubMotionSequence();
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      buildMotionTimeline();
      requestMotionScrub();
    });
  }
  scrollSubscribers.push(scrubMotionSequence);
  window.addEventListener('resize', () => {
    buildMotionTimeline();
    displayedMotionProgress = requestedMotionProgress = Math.max(0, Math.min(1, (window.scrollY) / (motionSequence.offsetHeight - window.innerHeight)));
    requestMotionScrub();
  });
}

const persistentChrome = document.querySelector('.persistent-chrome');
const persistentAudience = document.querySelector('.audience-section');
if (persistentChrome && persistentAudience) {
  const persistentAudienceStage = persistentAudience.querySelector('.audience-stage');
  const persistentDifferenceSection = document.querySelector('.difference-section');
  // Тёмные секции помечены в HTML атрибутом data-chrome="dark" — над ними шапка
  // становится светлой (.is-dark). Список собирается автоматически, без хардкода:
  // добавил секции атрибут — и она уже учитывается.
  const darkChromeSections = [...document.querySelectorAll('[data-chrome="dark"]')];
  // Секции, где шапку прячем СОВСЕМ (эффектные сцены + тарифы).
  const noChromeSections = [...document.querySelectorAll('[data-chrome="none"]')];
  // Все секции с явным режимом шапки, в порядке DOM. При наложении секций
  // (напр. difference наезжает на motion через отрицательный margin) главной
  // считается ПОСЛЕДНЯЯ в DOM из пересекающих линию шапки — она визуально сверху.
  const chromeSections = [...document.querySelectorAll('[data-chrome]')];
  const activeChromeMode = (marker) => {
    let mode = 'light';
    chromeSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= marker && rect.bottom > marker) mode = section.dataset.chrome;
    });
    return mode;
  };
  let chromeTicking = false;
  let differenceSceneReady = false;
  let lastChromeScrollY = window.scrollY;
  let chromeHiddenByScroll = false;
  const updatePersistentChrome = () => {
    chromeTicking = false;
    // The first screen owns its own expanded header. The persistent version starts
    // only after it has left, so two headers can never overlap or lose contrast.
    const introIsActive = introStage && !introStage.classList.contains('is-complete');
    const viewportMarker = Math.min(105, window.innerHeight * .14);

    // Режим шапки от активной (визуально верхней) секции под её линией.
    const chromeMode = activeChromeMode(viewportMarker);
    const inNoChrome = chromeMode === 'none';

    // Direction-aware: скролл вниз прячет шапку, вверх — возвращает.
    const dy = window.scrollY - lastChromeScrollY;
    if (Math.abs(dy) > 4) {
      if (dy > 0 && window.scrollY > window.innerHeight * .6) chromeHiddenByScroll = true;
      else if (dy < 0) chromeHiddenByScroll = false;
      lastChromeScrollY = window.scrollY;
      // При остановке шапка возвращается — НО только выше блока «Работы участников».
      // После него (тарифы/вопросы/футер) шапка при паузе не всплывает, только
      // при скролле вверх (dy<0 выше). Это просьба: не отвлекать в нижней части.
      window.clearTimeout(updatePersistentChrome.idle);
      updatePersistentChrome.idle = window.setTimeout(() => {
        const worksScene = document.querySelector('[data-works-scene]');
        const pastWorks = worksScene && worksScene.getBoundingClientRect().bottom <= 0;
        if (!pastWorks) chromeHiddenByScroll = false;
        requestPersistentChromeUpdate();
      }, 420);
    }

    const audienceRect = persistentAudience.getBoundingClientRect();
    // audience (z-index:9, margin-top:-100svh) не должна перекрывать hero, когда
    // мы выше неё (её тело ниже вьюпорта). Ставим ДО early-return по introIsActive,
    // иначе на первом экране флаг не выставляется и блок «всплывает» над hero.
    // Safari по-разному считает svh-высоту секции и window.innerHeight,
    // из-за чего блок «Для кого» всплывал над hero на первом экране.
    // Допуск в 2px и «>=» с запасом держат секцию скрытой, пока её
    // верх реально не вошёл во вьюпорт.
    persistentAudience.classList.toggle('is-below', audienceRect.top >= window.innerHeight - 2);
    const audienceActive = audienceRect.top <= viewportMarker && audienceRect.bottom > viewportMarker;
    // Раньше на блоке «Для кого» шапка была закреплена всегда (audienceActive ||),
    // и при скролле вниз она ехала вместе с контентом, налезая на заголовок.
    // Теперь ведёт себя как везде: прячется при скролле вниз, возвращается вверх.
    const shouldShow = !introIsActive && !inNoChrome && !chromeHiddenByScroll;
    persistentChrome.classList.toggle('is-visible', shouldShow);
    if (introIsActive) {
      persistentChrome.classList.remove('is-dark');
      return;
    }
    const audienceProgress = Math.max(0, Math.min(1, -audienceRect.top / Math.max(1, audienceRect.height - window.innerHeight)));
    // Блок «Для кого» держится дольше, чем занимает один экран прокрутки:
    // 1-й скролл — блок встал и читается; 2-й — карточки и текст растворяются;
    // 3-й — уходим к следующей секции. Раньше выход начинался на .72 и
    // проскакивал за пару кадров, поэтому блок было легко упустить.
    // На мобилке путь прокрутки длиннее (380svh против 260svh), поэтому
    // и окно растворения шире: блок дольше стоит и дольше уходит, чтобы
    // между «стоит» и «исчез» помещался отдельный свайп.
    const audienceMobile = window.innerWidth <= 900;
    const exitStart = audienceMobile ? .40 : .46;
    const exitSpan  = audienceMobile ? .42 : .34;
    const audienceExit = Math.max(0, Math.min(1, (audienceProgress - exitStart) / exitSpan));
    persistentAudience.style.setProperty('--audience-exit', audienceExit.toFixed(3));
    if (!differenceSceneReady && audienceExit >= .96 && persistentDifferenceSection) {
      differenceSceneReady = true;
      persistentDifferenceSection.classList.add('is-scene-ready');
      window.dispatchEvent(new Event('difference-scene-ready'));
    }
    // Не пиннить audience, пока motion ещё активна — иначе при скролле ВВЕРХ
    // (difference→audience→hero) невидимый fixed-слой перехватывает вьюпорт и
    // возникает «залипание». Симметрично для обоих направлений.
    const motionStillActive = motionSequence && motionSequence.classList.contains('is-active');
    // Dead-band против фликера fixed<->absolute на нижней границе секции: без него
    // при скролле ВВЕРХ применение position:fixed сдвигает box (у секции отрицат.
    // margin) и следующий кадр снова триггерит is-ended -> залипание. is-ended
    // побеждает, состояния взаимоисключающие.
    const EPS = 2;
    const audienceEnded = audienceRect.bottom <= window.innerHeight - EPS;
    const audiencePinned = !motionStillActive && !audienceEnded
      && audienceRect.top <= 0 && audienceRect.bottom > window.innerHeight;
    // На мобилке «Для кого» — обычный блок в потоке (см. styles.css),
    // пиннить нечего: классы состояния только ломали раскладку.
    // На мобилке «Для кого» — плоский блок в потоке; на десктопе sticky-сцена
    // сохраняется (вход в блок должен работать как раньше).
    const audienceFlat = window.innerWidth <= 900;
    persistentAudienceStage?.classList.toggle('is-pinned', !audienceFlat && audiencePinned);
    persistentAudienceStage?.classList.toggle('is-ended', !audienceFlat && audienceEnded);
    const audienceTakingOver = audienceActive && audienceExit < .08;
    // Пока audience ещё на экране (не ушёл вниз) — его выход тянет шапку в тёмный
    // режим. Но НИЖЕ по сайту это уже не влияет (иначе шапка застревала светлой).
    const audienceStillVisible = audienceRect.bottom > 0;
    // Светлая шапка (.is-dark), когда активная секция под линией — тёмная.
    // На десктопе шторки у «Для кого» больше нет: блок остаётся БЕЛЫМ до
    // самого ухода вверх. Раньше шапка светлела по audienceExit — он рос,
    // пока блок растворялся в темноту. Без шторки это давало светлую шапку
    // на белом фоне. Теперь смотрим на реальное положение секции.
    const audienceFlatDesktop = window.innerWidth > 900;
    const audienceOnScreen = audienceRect.top < window.innerHeight * .5
      && audienceRect.bottom > 0;
    const isDark = audienceFlatDesktop
      ? (!audienceOnScreen && chromeMode === 'dark')
      : ((audienceStillVisible && audienceExit > .45)
         || (!audienceTakingOver && !audienceActive && chromeMode === 'dark'));
    persistentChrome.classList.toggle('is-dark', isDark);
  };
  const requestPersistentChromeUpdate = () => {
    if (!chromeTicking) {
      chromeTicking = true;
      window.requestAnimationFrame(updatePersistentChrome);
    }
  };
  updatePersistentChrome();
  scrollSubscribers.push(updatePersistentChrome);
  window.addEventListener('resize', requestPersistentChromeUpdate);
  window.addEventListener('persistent-chrome-update', requestPersistentChromeUpdate);
}

const audienceSection = document.querySelector('.audience-section');
if (audienceSection && window.anime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const audienceTitle = audienceSection.querySelector('.audience-intro h2');
  const audienceTitleWords = audienceTitle ? [...audienceTitle.querySelectorAll('.audience-title-effect')].flatMap((part) => {
    const text = part.textContent;
    part.setAttribute('aria-label', text.trim());
    part.textContent = '';
    return text.split(/(\s+)/).flatMap((token) => {
      if (/^\s+$/.test(token)) {
        part.append(document.createTextNode(' '));
        return [];
      }
      const word = document.createElement('span');
      word.className = 'audience-title-word';
      word.setAttribute('aria-hidden', 'true');
      word.textContent = token;
      part.append(word);
      return [word];
    });
  }) : [];
  const audienceAuthor = audienceSection.querySelector('.audience-author');
  const audienceCards = [...audienceSection.querySelectorAll('.audience-card')];
  const audienceCardInners = audienceCards.map((card) => card.querySelector('.audience-card-inner')).filter(Boolean);
  const audienceCardImages = audienceCards.map((card) => card.querySelector('img')).filter(Boolean);
  const audienceCardOverlays = audienceCards.flatMap((card) => [
    card.querySelector('.audience-card-tags'),
    card.querySelector('.audience-card-copy'),
  ]).filter(Boolean);
  let audiencePlayed = false;

  window.anime.set([audienceAuthor].filter(Boolean), {
    opacity: 0,
    translateY: 20,
    filter: 'blur(9px)',
  });
  window.anime.set(audienceTitleWords, {
    opacity: 0,
    filter: 'blur(14px)',
    translateY: 6,
  });
  window.anime.set(audienceCardInners, { opacity: 0, filter: 'blur(16px)', scale: 1.05, translateY: 28 });
  window.anime.set(audienceCardImages, {
    filter: 'blur(22px) saturate(.72)',
    scale: 1.04,
  });
  window.anime.set(audienceCardOverlays, {
    opacity: 0,
    translateY: 10,
    filter: 'blur(8px)',
  });

  const playAudienceScene = () => {
    if (audiencePlayed) return;
    audiencePlayed = true;
    const timeline = window.anime.timeline({ easing:'cubicBezier(.22, 1, .36, 1)' });
    timeline
      .add({ targets:audienceTitleWords, opacity:[0, 1], filter:['blur(14px)', 'blur(0px)'], translateY:[6, 0], delay:window.anime.stagger(90), duration:680, easing:'cubicBezier(.22, 1, .36, 1)' }, 0)
      .add({ targets:audienceAuthor, opacity:[0, 1], translateY:[16, 0], filter:['blur(8px)', 'blur(0px)'], duration:520 }, 300)
    // Дорогое каскадное появление карточек: поднимаются из мягкого блюра,
    // фото проявляется из расфокуса, тексты вплывают следом. Без «пикселей».
    audienceCards.forEach((card, index) => {
      // Раньше карточки стартовали на 900 мс — заголовок уже стоял,
      // а сетка ещё пустовала почти секунду. Теперь они подхватывают
      // заголовок на 260 мс, шаг между ними тоже короче.
      const start = 260 + index * 150;
      timeline
        .add({ targets:audienceCardInners[index], opacity:[0, 1], filter:['blur(16px)', 'blur(0px)'], scale:[1.05, 1], translateY:[28, 0], duration:900, easing:'cubicBezier(.16, 1, .3, 1)' }, start)
        .add({ targets:audienceCardImages[index], filter:['blur(24px) saturate(.7)', 'blur(0px) saturate(1)'], scale:[1.08, 1], duration:1100, easing:'cubicBezier(.16, 1, .3, 1)' }, start)
        .add({ targets:audienceCardOverlays.slice(index * 2, index * 2 + 2), opacity:[0, 1], translateY:[14, 0], filter:['blur(8px)', 'blur(0px)'], duration:560 }, start + 260);
    });
  };
  window.addEventListener('audience-scene-ready', playAudienceScene);
  if (audienceSection.classList.contains('is-scene-ready')) playAudienceScene();
}

const differenceSection = document.querySelector('.difference-section');
if (differenceSection && window.anime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const differenceTitleParts = [...differenceSection.querySelectorAll('.difference-title span, .difference-title i')];
  const differenceCards = [...differenceSection.querySelectorAll('.difference-card')];
  const differenceImages = differenceCards.map((card) => card.querySelector('figure img')).filter(Boolean);
  const differenceCopy = differenceCards.map((card) => card.querySelector('.difference-copy')).filter(Boolean);
  let differencePlayed = false;

  window.anime.set(differenceTitleParts, { opacity:0, translateY:70, rotate:6 });
  window.anime.set(differenceCards, { opacity:0, filter:'blur(12px)' });
  window.anime.set(differenceImages, { filter:'blur(20px) saturate(.72)', scale:1.04 });
  window.anime.set(differenceCopy, { opacity:0, translateY:12, filter:'blur(8px)' });

  const playDifferenceScene = () => {
    if (differencePlayed) return;
    differencePlayed = true;
    window.anime.timeline({ easing:'cubicBezier(.22, 1, .36, 1)' })
      .add({ targets:differenceTitleParts, opacity:[0,1], translateY:[70,0], rotate:[6,0], delay:window.anime.stagger(120), duration:800 }, 0)
      .add({ targets:differenceCards, opacity:[0,1], filter:['blur(12px)', 'blur(0px)'], delay:window.anime.stagger(560), duration:620 }, 820)
      .add({ targets:differenceImages, filter:['blur(20px) saturate(.72)', 'blur(0px) saturate(1)'], scale:[1.04,1], delay:window.anime.stagger(560), duration:840, easing:'cubicBezier(.16, 1, .3, 1)' }, 820)
      .add({ targets:differenceCopy, opacity:[0,1], translateY:[12,0], filter:['blur(8px)', 'blur(0px)'], delay:window.anime.stagger(560), duration:460 }, 1240);
  };
  window.addEventListener('difference-scene-ready', playDifferenceScene);
  if (differenceSection.classList.contains('is-scene-ready')) playDifferenceScene();
}

window.addEventListener('pointermove', (event) => {
  const dot = document.querySelector('.cursor-dot');
  dot.style.left = `${event.clientX}px`;
  dot.style.top = `${event.clientY}px`;
});

const source = new URLSearchParams(window.location.search).get('source');
const note = document.querySelector('[data-source-note]');
if (source === 'reels') note.textContent = 'Ты пришла из Reels: здесь не «волшебный промпт», а полный путь от мысли до живого сайта.';
if (source === 'ads') note.textContent = 'Ты пришла из рекламы: начни с программы и проверь, совпадает ли твоя исходная точка с маршрутом.';

document.querySelectorAll('.programme-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const module = trigger.closest('.programme-module');
    const isOpen = module.classList.contains('is-open');
    document.querySelectorAll('.programme-module').forEach((item) => {
      const itemTrigger = item.querySelector('.programme-trigger');
      item.classList.remove('is-open');
      itemTrigger?.setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      module.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
});

// Аккордеон вопросов (FAQ) — по образцу программы.
document.querySelectorAll('.questions-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.questions-item');
    const isOpen = item.classList.contains('is-open');
    document.querySelectorAll('.questions-item').forEach((el) => {
      el.classList.remove('is-open');
      el.querySelector('.questions-trigger')?.setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      item.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
});

const statCounters = [...document.querySelectorAll('.programme-stats dt[data-count]')];
if (statCounters.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const formatStat = (counter, value) => `${value}${counter.dataset.suffix || ''}`;
  const countStats = () => {
    statCounters.forEach((counter) => {
      const target = Number(counter.dataset.count);
      const startedAt = performance.now();
      const duration = target > 1000 ? 1040 : 780;
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = formatStat(counter, Math.max(1, Math.round(1 + (target - 1) * eased)));
        if (progress < 1) window.requestAnimationFrame(tick);
      };
      counter.textContent = formatStat(counter, 1);
      window.requestAnimationFrame(tick);
    });
  };
  const statsObserver = new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      countStats();
      observer.disconnect();
    }
  }, { threshold: .55 });
  statsObserver.observe(statCounters[0].closest('.programme-stats'));
}

const workTunnel = document.querySelector('[data-work-tunnel]');
const workTunnelImages = Array.isArray(window.TUNNEL_GALLERY_IMAGES) ? window.TUNNEL_GALLERY_IMAGES : [];

// Fallback-картинки туннеля показываем ТОЛЬКО если WebGL не завёлся.
// Раньше они грузились всегда (eager) параллельно с WebGL-текстурами —
// те же файлы качались по 2-3 раза, +4 МБ трафика впустую.
function showTunnelFallback() {
  if (!workTunnel || !workTunnelImages.length) return;
  const fallback = workTunnel.querySelector('.work-tunnel-fallback');
  if (!fallback || fallback.children.length) return;
  workTunnelImages.slice(0, 6).forEach((src) => {
    const image = new Image();
    image.src = src;
    image.alt = '';
    image.loading = 'lazy';
    fallback.append(image);
  });
}

// Инициализация туннеля вынесена в функцию: three.js (654 КБ) грузится
// не на старте, а когда человек подходит к сцене. Вызывается из загрузчика ниже.
function initWorkTunnel() {
if (workTunnel && workTunnelImages.length && window.THREE) {
  const canvas = workTunnel.querySelector('.work-tunnel-canvas');
  const section = workTunnel.closest('.works-scene');
  const stickyLayer = workTunnel.closest('.works-sticky') || section;
  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.background = null;
  // Прогресс сцены = РЕАЛЬНЫЙ пролёт камеры вглубь (не оверлей). Контроллер
  // сцены пишет сюда 0..1, а камера физически улетает вперёд на travelDepth.
  let travelProgress = 0;
  workTunnel._setTravel = (t) => { travelProgress = Math.max(0, Math.min(1, t)); };
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  const tunnelWidth = 12;
  const tunnelHeight = 7.2;
  const segmentDepth = 4.2;
  const segmentCount = 17;
  const columns = 4;
  const rows = 4;
  const halfWidth = tunnelWidth / 2;
  const halfHeight = tunnelHeight / 2;
  const cellWidth = tunnelWidth / columns;
  const cellHeight = tunnelHeight / rows;
  const lineMaterial = new THREE.LineBasicMaterial({ color:'#b0b0b0', transparent:true, opacity:.2 });
  const palette = ['#8f1d1a'];  // только приглушённый фирменный красный, без светлых плашек
  const colourMaterials = palette.map((colour) => new THREE.MeshBasicMaterial({ color:colour, side:THREE.DoubleSide }));
  const loader = new THREE.TextureLoader();
  const makeLine = () => {};  // линии-сетки отключены — сердцевина должна быть чистой
  const fit = (width, height, ratio) => {
    const fittedWidth = Math.min(width, height * ratio);
    return { width:fittedWidth, height:fittedWidth / ratio };
  };
  const loadTexture = (src) => new Promise((resolve) => {
    loader.load(src, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      resolve({
        texture,
        ratio: texture.image.width / texture.image.height,
        orientation: texture.image.width >= texture.image.height ? 'landscape' : 'portrait',
      });
    }, undefined, () => resolve(null));
  });

  Promise.all(workTunnelImages.map(loadTexture)).then((loadedTextures) => {
    const textures = loadedTextures.filter(Boolean);
    if (!textures.length) return;
    workTunnel.classList.add('has-webgl');
    // The composition stays editable through the folder alone: portrait files
    // become the banner rails, while wider projects become the website rails.
    const siteWorks = textures.filter((item) => item.ratio >= 1.05);
    const bannerWorks = textures.filter((item) => item.ratio < 1.05);
    const segments = [];
    let population = 0;
    let running = true;
    let previous = 0;
    let raf = 0;
    // Speed reacts to scrolling: a calm base drift plus a boost that decays.
    // Scrolling feeds the boost so the tunnel "flies in" faster while the wheel
    // is moving, then eases back to the base drift on its own.
    const baseSpeed = .45;
    const maxSpeed = 6.5;
    let speed = baseSpeed;
    let driftZ = 0;      // непрерывный автодрейф вперёд
    let travelZ = 0;     // текущий форсаж от скролла (сглаженный)
    const travelDepth = 46; // на сколько единиц вглубь пролетаем за всю сцену
    let lastScrollY = window.scrollY;
    const onTunnelScroll = () => {
      if (!running) { lastScrollY = window.scrollY; return; }
      const dy = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      // Only downward scrolling accelerates the flight forward.
      // Палец на телефоне даёт dy в разы больше колеса мыши: с десктопным
      // коэффициентом туннель мгновенно улетал на максимум и захлёбывался
      // (особенно заметно при скролле вверх). На мобилке разгон мягче,
      // а потолок скорости ниже.
      const wide = window.innerWidth > 900;
      const gain = wide ? .09 : .028;
      const cap  = wide ? maxSpeed : 3.2;
      if (dy > 0) speed = Math.min(cap, speed + dy * gain);
    };
    scrollSubscribers.push(onTunnelScroll);

    const addSlab = (group, slot, material, ratio = null) => {
      const size = ratio ? fit(slot.width, slot.height, ratio) : { width:slot.width, height:slot.height };
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size.width, size.height), material);
      mesh.position.copy(slot.position);
      mesh.rotation.copy(slot.rotation);
      group.add(mesh);
    };
    const slots = () => {
      const list = [];
      const z = -segmentDepth / 2;
      for (let column = 0; column < columns; column += 1) {
        const x = -halfWidth + column * cellWidth + cellWidth / 2;
        const rail = column === 0 || column === columns - 1 ? 'banner' : 'site';
        list.push({ face:'floor', rail, column, width:cellWidth, height:segmentDepth, position:new THREE.Vector3(x, -halfHeight, z), rotation:new THREE.Euler(-Math.PI / 2, 0, 0) });
        list.push({ face:'ceiling', rail, column, width:cellWidth, height:segmentDepth, position:new THREE.Vector3(x, halfHeight, z), rotation:new THREE.Euler(Math.PI / 2, 0, 0) });
      }
      for (let row = 0; row < rows; row += 1) {
        const y = -halfHeight + row * cellHeight + cellHeight / 2;
        list.push({ face:'left-wall', width:segmentDepth, height:cellHeight, position:new THREE.Vector3(-halfWidth, y, z), rotation:new THREE.Euler(0, Math.PI / 2, 0) });
        list.push({ face:'right-wall', width:segmentDepth, height:cellHeight, position:new THREE.Vector3(halfWidth, y, z), rotation:new THREE.Euler(0, -Math.PI / 2, 0) });
      }
      return list;
    };
    const fillSegment = (group) => {
      group.children.filter((child) => child.userData.isSlab).forEach((child) => {
        child.geometry.dispose();
        if (child.userData.disposeMaterial) child.material.dispose();
        group.remove(child);
      });
      const seed = population;
      population += 1;
      slots().forEach((slot, index) => {
        const isBannerRail = slot.rail === 'banner';
        // Banner rails alternate as a chessboard: one lower edge is occupied
        // while the opposite edge stays empty; the next depth row reverses it.
        // The ceiling mirrors the rhythm, so the frame never becomes a stripe.
        if (isBannerRail) {
          const isOccupied = (seed + slot.column + (slot.face === 'ceiling' ? 1 : 0)) % 2 === 0;
          if (!isOccupied) return;
          const source = bannerWorks.length ? bannerWorks : textures;
          const work = source[(seed + (slot.face === 'ceiling' ? 1 : 0)) % source.length];
          const material = new THREE.MeshBasicMaterial({ map:work.texture, side:THREE.DoubleSide });
          const before = group.children.length;
          addSlab(group, slot, material, work.ratio);
          group.children[before].userData.isSlab = true;
          group.children[before].userData.disposeMaterial = true;
          return;
        }

        // Most remaining cells stay black. Works lead the composition; coloured
        // fields are only occasional structural accents, never a checkerboard.
        const value = (seed * 19 + index * 11) % 41;
        if (value > 15) return;
        // One quiet coloured plane at most every third depth segment. The grid
        // should read as a gallery first; colour is just the tunnel's rhythm.
        const isAccent = value === 0 && seed % 3 === 0;
        if (!isAccent) {
          const source = siteWorks.length ? siteWorks : textures;
          const work = source[(seed * 3 + index * 5) % source.length];
          const material = new THREE.MeshBasicMaterial({ map:work.texture, side:THREE.DoubleSide });
          const before = group.children.length;
          addSlab(group, slot, material, work.ratio);
          group.children[before].userData.isSlab = true;
          group.children[before].userData.disposeMaterial = true;
        } else {
          const before = group.children.length;
          addSlab(group, slot, colourMaterials[(seed + index) % colourMaterials.length]);
          group.children[before].userData.isSlab = true;
        }
      });
    };
    const makeSegment = (z) => {
      const group = new THREE.Group();
      group.position.z = z;
      for (let column = 0; column <= columns; column += 1) {
        const x = -halfWidth + column * cellWidth;
        makeLine(group, new THREE.Vector3(x, -halfHeight, 0), new THREE.Vector3(x, -halfHeight, -segmentDepth));
        makeLine(group, new THREE.Vector3(x, halfHeight, 0), new THREE.Vector3(x, halfHeight, -segmentDepth));
      }
      for (let row = 0; row <= rows; row += 1) {
        const y = -halfHeight + row * cellHeight;
        makeLine(group, new THREE.Vector3(-halfWidth, y, 0), new THREE.Vector3(-halfWidth, y, -segmentDepth));
        makeLine(group, new THREE.Vector3(halfWidth, y, 0), new THREE.Vector3(halfWidth, y, -segmentDepth));
      }
      for (let column = 0; column <= columns; column += 1) {
        const x = -halfWidth + column * cellWidth;
        makeLine(group, new THREE.Vector3(x, -halfHeight, -segmentDepth), new THREE.Vector3(x, halfHeight, -segmentDepth));
      }
      for (let row = 0; row <= rows; row += 1) {
        const y = -halfHeight + row * cellHeight;
        makeLine(group, new THREE.Vector3(-halfWidth, y, -segmentDepth), new THREE.Vector3(halfWidth, y, -segmentDepth));
      }
      fillSegment(group);
      return group;
    };
    for (let index = 0; index < segmentCount; index += 1) {
      const segment = makeSegment(-index * segmentDepth);
      scene.add(segment);
      segments.push(segment);
    }
    const resize = () => {
      const width = Math.max(1, workTunnel.clientWidth);
      const height = Math.max(1, workTunnel.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(workTunnel);
    const visibilityObserver = new IntersectionObserver(([entry]) => { running = entry.isIntersecting; }, { threshold:0 });
    visibilityObserver.observe(stickyLayer);
    camera.position.set(0, 0, 0);
    resize();
    const animate = (now) => {
      raf = window.requestAnimationFrame(animate);
      if (!running) return;
      const delta = previous ? Math.min((now - previous) / 1000, 1 / 30) : 1 / 60;
      previous = now;
      // Speed boost eases back to base drift; the tunnel keeps living on its own.
      speed += (baseSpeed - speed) * Math.min(1, delta * 1.9);
      // Continuous auto-drift forward.
      driftZ -= delta * speed;
      // Scroll adds a REAL forward travel: the camera physically flies deeper as
      // you scroll, so works rush past and vanish behind you — a true fly-through,
      // not a dark overlay. Eased toward the target so it never jerks.
      const targetTravel = -travelProgress * travelDepth;
      travelZ += (targetTravel - travelZ) * Math.min(1, delta * 4.5);
      camera.position.z = driftZ + travelZ;
      const cameraZ = camera.position.z;
      // Пока просто дрейфуем (не погружаемся) — коридор бесконечный: ушедший
      // сегмент возвращается в хвост с новыми работами. Но КАК ТОЛЬКО начинается
      // погружение (travelProgress), переставление ОСТАНАВЛИВАЕТСЯ: новые работы
      // больше не подставляются, мы долетаем до последних и влетаем в темноту.
      // Коридор бесконечный в ОБЕ стороны: улетевший за спину сегмент уходит
      // в хвост, а при обратном скролле сегмент из дальнего хвоста возвращается
      // вперёд — туннель всегда во весь экран, никогда не «съёживается» вдали.
      const zs = segments.map((item) => item.position.z);
      let tail = Math.min(...zs);
      let head = Math.max(...zs);
      segments.forEach((segment) => {
        if (segment.position.z > cameraZ + segmentDepth) {
          tail -= segmentDepth;
          segment.position.z = tail;
          if (travelProgress < 0.06) fillSegment(segment);
        } else if (segment.position.z < cameraZ - segmentCount * segmentDepth) {
          head += segmentDepth;
          segment.position.z = head;
          if (travelProgress < 0.06) fillSegment(segment);
        }
      });
      renderer.render(scene, camera);
    };
    raf = window.requestAnimationFrame(animate);
    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('scroll', onTunnelScroll);
      renderer.dispose();
    }, { once:true });
  });
}

} // конец initWorkTunnel

const participantGallery = document.querySelector('[data-participant-gallery]');
const caseImages = Array.isArray(window.CASE_GALLERY_IMAGES) ? window.CASE_GALLERY_IMAGES : [];
// Слайдер кейсов теперь на видео: каждая карточка автопроигрывается.
const caseVideos = Array.isArray(window.CASE_GALLERY_VIDEOS) ? window.CASE_GALLERY_VIDEOS : [];
if (participantGallery && (caseImages.length || workTunnelImages.length)) {
  const track = participantGallery.querySelector('[data-gallery-track]');
  const previousButton = participantGallery.querySelector('[data-gallery-prev]');
  const nextButton = participantGallery.querySelector('[data-gallery-next]');
  const count = document.querySelector('[data-gallery-count]');
  let activeIndex = 0;
  // В слайдер берём ТОЛЬКО вертикальные/квадратные работы (ratio <= 1.3).
  // Горизонтальные баннеры («Стратегия», «Дизайн» и т.п.) остаются в туннеле,
  // но в карусели они «лежат» и тянут композицию вниз — поэтому их исключаем.
  // Слайдер показывает финальные кейсы из assets/cases (отдельно от туннеля),
  // все как есть, без фильтра по ориентации.
  const useVideo = caseVideos.length > 0;
  const sliderSources = useVideo ? caseVideos : (caseImages.length ? caseImages : workTunnelImages);
  const cards = sliderSources.map((src, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'participant-gallery-card';
    card.setAttribute('aria-label', `Показать работу ${index + 1}`);
    if (useVideo && typeof src === 'object' && src.image) {
      // Статичный кейс: в манифесте вместо имени видео лежит { image }.
      card.innerHTML = `<img src="${src.image}" alt="${src.alt || `Работа участника ${index + 1}`}" loading="lazy" decoding="async" draggable="false" />`;
    } else if (useVideo) {
      // Тяжёлую версию (@2x) отдаём только широким экранам; на мобилке —
      // лёгкая, иначе трафик и декодирование убивают прокрутку.
      card.innerHTML = `<video class="participant-gallery-video" muted loop playsinline `
        + `preload="none" poster="assets/video/${src}.jpg" draggable="false">`
        + `<source src="assets/video/${src}@2x.mp4" media="(min-width:1200px)" type="video/mp4" />`
        + `<source src="assets/video/${src}.mp4" type="video/mp4" />`
        + `</video>`;
    } else {
      card.innerHTML = `<img src="${src}" alt="Работа участника ${index + 1}" loading="lazy" decoding="async" draggable="false" />`;
    }
    card.addEventListener('click', () => setActive(index));
    track.append(card);
    return card;
  });

  const prepareMedia = (card) => {
    const image = card.querySelector('img');
    if (!image?.naturalWidth || !image?.naturalHeight) return;
    // Никакого авто-кропа: каждая работа показывается ЦЕЛИКОМ в своём
    // оригинальном соотношении сторон. Контейнер подстраивается под картинку,
    // а не картинка под контейнер — работы не обрезаются и не унифицируются.
    card._media = { width: image.naturalWidth, height: image.naturalHeight };
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.left = '0';
    image.style.top = '0';
    fitCardsToMedia();
  };

  const fitCardsToMedia = () => {
    const bounds = track.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    cards.forEach((card) => {
      const image = card.querySelector('img');
      const ratio = card._media
        ? card._media.width / card._media.height
        : image?.naturalWidth && image?.naturalHeight
          ? image.naturalWidth / image.naturalHeight
        : 16 / 9;
      // Высота у всех кейсов ОДНА — так ряд читается ровно, без ступенек.
      // Ширина подстраивается под пропорции работы; слишком широкие
      // (панорамные скриншоты) упираются в границу зоны.
      const height = bounds.height;
      const width = Math.min(bounds.width, height * ratio);
      card.style.width = `${width}px`;
      card.style.height = `${height}px`;
      card.style.marginLeft = `${-width / 2}px`;
      card.style.marginTop = `${-height / 2}px`;
    });
    updateGalleryStage();
  };

  // Зона карусели ФИКСИРОВАНА по высоте (CSS var), не зависит от активной работы —
  // иначе заголовок и карусель прыгают при листании работ разной высоты. Работы
  // вписываются внутрь этой зоны по своей высоте, ширина у каждой своя.
  const updateGalleryStage = () => {};

  let loadedCount = 0;
  const onCardLoaded = (card) => {
    prepareMedia(card);
    loadedCount += 1;
    // кейсы показываем все, без отсева по ориентации
  };
  cards.forEach((card) => {
    const image = card.querySelector('img');
    image?.addEventListener('load', () => onCardLoaded(card), { once:true });
    if (image?.complete) onCardLoaded(card);
  });
  new ResizeObserver(fitCardsToMedia).observe(track);

  const relativePosition = (index) => {
    let distance = index - activeIndex;
    const half = cards.length / 2;
    if (distance > half) distance -= cards.length;
    if (distance < -half) distance += cards.length;
    return distance;
  };
  const renderGallery = () => {
    cards.forEach((card, index) => {
      const relative = relativePosition(index);
      const distance = Math.abs(relative);
      const visible = distance <= 2;
      const offset = relative * 46;
      const depth = distance ? -distance * 185 : 85;
      const scale = distance ? Math.max(.64, .88 - distance * .14) : 1.08;
      card.style.transform = `translate3d(${offset}%, 0, ${depth}px) rotateY(${(-relative * 36).toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      card.style.opacity = visible ? String(Math.max(.16, 1 - distance * .36)) : '0';
      card.style.filter = distance ? `brightness(${(1 - distance * .16).toFixed(2)})` : 'none';
      card.style.zIndex = String(10 - distance);
      card.style.pointerEvents = visible ? 'auto' : 'none';
      card.setAttribute('aria-hidden', String(!visible));
    });
    updateGalleryStage();
    if (count) count.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  };
  const setActive = (index) => {
    activeIndex = (index + cards.length) % cards.length;
    renderGallery();
  };
  previousButton?.addEventListener('click', () => setActive(activeIndex - 1));
  nextButton?.addEventListener('click', () => setActive(activeIndex + 1));
  participantGallery.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); setActive(activeIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); setActive(activeIndex + 1); }
  });

  // Свайп пальцем: на телефоне карусель листалась только кнопками,
  // хотя жест вправо-влево здесь ожидаемее всего.
  let swipeX = null, swipeY = null;
  participantGallery.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    swipeX = event.clientX; swipeY = event.clientY;
  }, { passive: true });
  participantGallery.addEventListener('pointerup', (event) => {
    if (swipeX === null) return;
    const dx = event.clientX - swipeX;
    const dy = event.clientY - swipeY;
    swipeX = swipeY = null;
    // Горизонтальный жест длиннее 45px и заметно длиннее вертикального,
    // иначе перехватим обычную прокрутку страницы.
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      setActive(activeIndex + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });
  // Автопроигрывание: играет ТОЛЬКО активная карточка. Шесть видео разом
  // сажают процессор и трафик, особенно на телефоне.
  if (useVideo) {
    const syncVideos = () => {
      cards.forEach((card, i) => {
        const v = card.querySelector('video');
        if (!v) return;
        if (i === activeIndex) {
          if (v.preload === 'none') v.preload = 'auto';
          const play = v.play();
          if (play && play.catch) play.catch(() => {});
        } else {
          v.pause();
        }
      });
    };
    // renderGallery объявлена через const — не переприсваиваем, а вешаем
    // синхронизацию на смену активной карточки через сам setActive.
    participantGallery.addEventListener('click', () => window.requestAnimationFrame(syncVideos));
    previousButton?.addEventListener('click', () => window.requestAnimationFrame(syncVideos));
    nextButton?.addEventListener('click', () => window.requestAnimationFrame(syncVideos));
    participantGallery.addEventListener('keydown', () => window.requestAnimationFrame(syncVideos));
    // Сцена длинная — запускаем видео только когда слайдер реально на экране.
    const galleryObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) syncVideos();
      else cards.forEach((c) => c.querySelector('video')?.pause());
    }, { threshold: .15 });
    galleryObserver.observe(participantGallery);
  }

  fitCardsToMedia();
  renderGallery();
}

// ===== WORKS SCENE — единый sticky-контроллер (туннель → работы) =====
// Фазы по прогрессу сцены p (0..1):
//   p<.10  туннель играет во весь экран, слово-подпись по центру
//   .10-.48  ВЛЁТ: canvas растёт от «дырки» к экрану, слово подрастает
//   .48-.70  слово превращается в крупный заголовок и приподнимается вверх
//   .62-1.0  под словом проявляются работы (слайдер), туннель гаснет
const worksScene = document.querySelector('[data-works-scene]');
const worksTitle = document.querySelector('[data-works-title]');
const worksKicker = document.querySelector('[data-works-kicker]');
const worksStage = document.querySelector('[data-participant-gallery]');
const worksCount = document.querySelector('[data-gallery-count]');
const worksCanvas = worksScene ? worksScene.querySelector('.work-tunnel-canvas') : null;
if (worksScene && workTunnel && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const map = (v, a, b) => clamp01((v - a) / (b - a));
  const easeInOut = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let queued = false;
  const render = () => {
    queued = false;
    const rect = worksScene.getBoundingClientRect();
    const scrollable = worksScene.offsetHeight - window.innerHeight;
    const p = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;

    if (worksCanvas) worksCanvas.style.transform = '';

    // === СТРОГО ПОСЛЕДОВАТЕЛЬНЫЕ ФАЗЫ (без наложения сцен) ===
    // A. Пролёт + рост заголовка идут ВМЕСТЕ и равномерно, заголовок по центру.
    // B. Пролёт кончился, туннель во мраке -> заголовок поднимается на место.
    // C. Только теперь появляются работы (слайдер).

    // A: РЕАЛЬНЫЙ ПРОЛЁТ вглубь. Туннель гаснет ПОЛНОСТЬЮ и раньше слайдера —
    // две сцены не перекрываются, туннель не просвечивает под работами.
    const travel = easeInOut(map(p, .06, .58));
    if (workTunnel._setTravel) workTunnel._setTravel(travel);
    const tunnelFade = map(p, .58, .70);
    workTunnel.style.opacity = (1 - tunnelFade).toFixed(3);
    // Полностью выключаем слой туннеля, когда он погас: никакого призрака
    // и никакого WebGL-кадра под слайдером.
    workTunnel.style.visibility = tunnelFade >= 1 ? 'hidden' : 'visible';

    // Заголовок живёт в ДВУХ фазах:
    //  1) внутри туннеля он МАЛЕНЬКИЙ и растёт очень медленно (crawl),
    //     оставаясь в тёмной сердцевине и не нарезаясь на работы;
    //  2) когда экран стал полностью чёрным (туннель погас) — только тогда
    //     он вырастает в полноразмерный заголовок и поднимается на место.
    const crawl = map(p, .06, .58);          // медленный рост внутри туннеля
    const bloom = easeInOut(map(p, .70, .86)); // рост на чёрном экране
    const lift  = easeInOut(map(p, .72, .88)); // подъём на своё место
    if (worksTitle) {
      worksTitle.classList.toggle('works-title-big', bloom > .25);
      const y = -lift * (window.innerHeight * .28);
      // Ширина слова при scale=1 (замеряем один раз, до трансформаций).
      if (!worksTitle._baseWidth) {
        const prev = worksTitle.style.transform;
        worksTitle.style.transform = 'translate(-50%,-50%) scale(1)';
        worksTitle._baseWidth = worksTitle.offsetWidth || 1;
        worksTitle.style.transform = prev;
      }
      // Фаза 1: слово ограничено шириной тёмной сердцевины — оно маленькое
      // и не задевает летящие работы.
      const core = window.innerWidth * (0.17 + travel * 0.20);
      const smallCap = core / worksTitle._baseWidth;
      // Внутри туннеля слово на 30% меньше прежнего (было 0.22→0.32):
      // края больше не упираются в летящие работы. Основной рост
      // перенесён на фазу чёрного экрана, когда туннель уже погас.
      const small = Math.min(0.154 + crawl * 0.07, smallCap);
      // Фаза 2: на чёрном экране потолок снимается — слово дорастает до 1.
      // Финальный масштаб 0.9 вместо 1 — заголовок на 10% меньше,
      // рост получается плавнее, и работы можно поднять выше.
      const scale = small + (0.9 - small) * bloom;
      worksTitle.style.transform = `translate(-50%, calc(-50% + ${y.toFixed(1)}px)) scale(${scale.toFixed(3)})`;
      worksTitle.style.opacity = Math.max(0.72, 0.72 + bloom * 0.28).toFixed(3);
    }

    // Кикер и счётчик — после того как заголовок встал на место.
    const meta = map(p, .86, .96);
    if (worksKicker) { worksKicker.style.opacity = meta.toFixed(3); worksKicker.style.transform = `translateY(${((1 - meta) * 14).toFixed(1)}px)`; }
    if (worksCount) worksCount.style.opacity = meta.toFixed(3);

    // C: Кейсы появляются ПОСЛЕ подъёма заголовка — никакого наложения на туннель.
    // Слайдер выходит ПОСЛЕ того, как заголовок вырос на чёрном экране,
    // а туннель уже полностью выключен — сцены не накладываются.
    const revealScale = easeOut(map(p, .84, .97));
    const revealFade = easeOut(map(p, .84, .95));
    if (worksStage) {
      worksStage.style.opacity = revealFade.toFixed(3);
      const s = (0.9 + revealScale * 0.1).toFixed(3);
      worksStage.style.transform = `translateY(${((1 - revealScale) * 40).toFixed(1)}px) scale(${s})`;
    }
    // Шапка появляется только когда кейсы зафиксировались (после полёта туннеля),
    // чтобы не мешать погружению и не перекрываться летящими работами.
    worksScene.dataset.chrome = p > .70 ? 'dark' : 'none';
  };
  const request = () => { if (queued) return; queued = true; window.requestAnimationFrame(render); };
  render();
  scrollSubscribers.push(render);
  window.addEventListener('resize', () => {
    // Базовая ширина слова зависит от clamp() по вьюпорту — пересчитываем.
    if (worksTitle) worksTitle._baseWidth = 0;
    request();
  });

  // СНАП-ДОВОДЧИК ВХОДА: когда сцена показалась снизу хотя бы на ~треть и человек
  // скроллит вниз — один плавный доводчик ставит туннель во весь экран (к началу
  // sticky), чтобы не делать 3 микроскролла. Срабатывает один раз за заход.
  let snapArmed = true;          // готов сработать
  let snapping = false;          // идёт авто-доводка
  let lastY = window.scrollY;
  const smoothScrollTo = (targetY, duration = 620) => {
    snapping = true;
    const startY = window.scrollY;
    const dist = targetY - startY;
    let startT = 0;
    const step = (t) => {
      if (!startT) startT = t;
      const p = Math.min(1, (t - startT) / duration);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic — мягко
      window.scrollTo(0, startY + dist * e);
      if (p < 1) window.requestAnimationFrame(step);
      else snapping = false;
    };
    window.requestAnimationFrame(step);
  };
  // Клик по меню: доводчик должен молчать, иначе он перехватывает переход
  // и прокрутка застревает на старте туннеля («Форматы» и «Вопросы» не
  // открывались). Глушим его на время анкорного перехода.
  let anchorJumpUntil = 0;
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a[href^="#"]');
    if (link) anchorJumpUntil = Date.now() + 1600;
  }, true);

  const maybeSnapIn = () => {
    // На телефоне доводчик отбрасывает прокрутку назад: палец тянет вниз,
    // а скрипт возвращает к началу сцены — читается как дрожание.
    // Инерционная прокрутка iOS и авто-доводка не уживаются.
    if (window.innerWidth <= 900) { lastY = window.scrollY; return; }
    if (snapping || Date.now() < anchorJumpUntil) { lastY = window.scrollY; return; }
    const rect = worksScene.getBoundingClientRect();
    const goingDown = window.scrollY > lastY;
    lastY = window.scrollY;
    const sceneTopY = window.scrollY + rect.top; // абсолютный старт sticky
    const shownFromBottom = window.innerHeight - rect.top; // сколько сцены видно снизу
    // Взведён, сцена видна на треть-две трети, ещё не долистали до полного экрана.
    if (snapArmed && goingDown && rect.top > 4 &&
        shownFromBottom > window.innerHeight * .33 &&
        shownFromBottom < window.innerHeight * 1.05) {
      snapArmed = false;
      smoothScrollTo(sceneTopY);
    }
    // Перевзвести, когда ушли выше сцены (для повторного входа сверху).
    if (rect.top > window.innerHeight * .9) snapArmed = true;
  };
  scrollSubscribers.push(maybeSnapIn);
}

// ===== ЛАЙТБОКС ДЛЯ РАБОТ В ОТЗЫВАХ =====
// Клик по превью открывает работу в полном размере.
// Закрывается кликом по фону, крестиком или Escape.
(() => {
  const root = document.querySelector('[data-lightbox-root]');
  if (!root) return;
  const image = root.querySelector('[data-lightbox-image]');
  const video = root.querySelector('[data-lightbox-video]');
  const closeButton = root.querySelector('[data-lightbox-close]');
  let lastFocused = null;

  // Открывает и картинку, и видео — по расширению файла. Чтобы заменить
  // превью на видео, достаточно поменять data-lightbox на путь к .mp4:
  // само превью (img внутри кнопки) остаётся картинкой-обложкой.
  const open = (src, alt) => {
    lastFocused = document.activeElement;
    const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(src);
    if (isVideo && video) {
      video.src = src;
      video.hidden = false;
      image.hidden = true;
      image.src = '';
      const play = video.play();
      if (play && play.catch) play.catch(() => {});
    } else {
      image.src = src;
      image.alt = alt || '';
      image.hidden = false;
      if (video) { video.pause(); video.hidden = true; video.src = ''; }
    }
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    closeButton?.focus();
  };
  const close = () => {
    root.hidden = true;
    image.src = '';
    if (video) { video.pause(); video.src = ''; video.hidden = true; }
    document.body.style.overflow = '';
    lastFocused?.focus();
  };

  // Открытие — отдельным обработчиком на документе.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-lightbox]');
    if (!trigger) return;
    event.preventDefault();
    const img = trigger.querySelector('img');
    open(trigger.getAttribute('data-lightbox'), img?.alt);
  });

  // Закрытие — обработчик на самом слое, иначе то же событие открытия
  // всплывает до документа и тут же закрывает окно.
  root.addEventListener('click', (event) => {
    if (event.target === root || event.target === closeButton) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.hidden) close();
  });
})();

// ===== СВОРАЧИВАНИЕ ДЛИННЫХ ОТЗЫВОВ =====
document.querySelectorAll('[data-review-more]').forEach((button) => {
  const card = button.closest('.review-card');
  const body = card?.querySelector('[data-review-body]');
  if (!card || !body) return;
  // Короткий отзыв сворачивать незачем — прячем кнопку.
  if (body.scrollHeight <= body.clientHeight + 8) { button.hidden = true; return; }
  button.addEventListener('click', () => {
    const open = card.classList.toggle('is-open');
    button.textContent = open ? 'Свернуть' : 'Читать полностью';
    button.setAttribute('aria-expanded', String(open));
  });
});


// ===== ПАУЗА ВИДЕО ВНЕ ЭКРАНА =====
// На телефоне 6 роликов ленты декодировались одновременно, включая те,
// что уже уехали за экран. Каждый занимает свой декодер — отсюда лаги.
// Играет только то, что реально видно.
(() => {
  const videos = [...document.querySelectorAll('.work-video, .difference-video')];
  if (!videos.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const v = entry.target;
      if (entry.isIntersecting) {
        const play = v.play();
        if (play && play.catch) play.catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { rootMargin: '100px', threshold: 0 });
  videos.forEach((v) => io.observe(v));

  // Вкладка неактивна — гасим всё, чтобы не греть телефон в фоне.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach((v) => v.pause());
  });
})();


// ===== ОТЛОЖЕННАЯ ЗАГРУЗКА ТУННЕЛЯ =====
// three.js весит 654 КБ, а туннель виден только в середине страницы.
// Грузим библиотеку заранее — когда до сцены остаётся примерно два
// экрана, чтобы к моменту подхода всё уже было готово.
(() => {
  const scene = document.querySelector('[data-works-scene]');
  if (!scene || !workTunnel || !workTunnelImages.length) return;

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    const script = document.createElement('script');
    script.src = 'assets/vendor/three.min.js';
    script.onload = () => {
      try { initWorkTunnel(); } catch (_) { showTunnelFallback(); }
    };
    script.onerror = showTunnelFallback;
    document.head.append(script);
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { start(); io.disconnect(); }
    }, { rootMargin: '200% 0px' });
    io.observe(scene);
  } else {
    start();
  }
})();


// ===== КАРУСЕЛЬ ОТЗЫВОВ: СТРЕЛКИ =====
// Лента прокручивается на ширину карточки. Стрелка гаснет,
// когда листать в эту сторону больше нечего.
(() => {
  const track = document.querySelector('.reviews-grid');
  const prev = document.querySelector('[data-reviews-prev]');
  const next = document.querySelector('[data-reviews-next]');
  if (!track || !prev || !next) return;

  const step = () => {
    const card = track.querySelector('.review-card');
    const gap = parseFloat(getComputedStyle(track).gap) || 20;
    return card ? card.getBoundingClientRect().width + gap : 360;
  };

  const controls = prev.parentElement;
  const sync = () => {
    const max = track.scrollWidth - track.clientWidth;
    // Всё поместилось — кнопки не нужны вовсе.
    controls.hidden = max <= 4;
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= max - 4;
  };

  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left:  step(), behavior: 'smooth' }));
  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
})();

// ===== МОДАЛКА ЗАХВАТА ЛИДА ПЕРЕД ОПЛАТОЙ =====
// Клик по «Выбрать» не уводит сразу на оплату: сначала окно с
// телеграмом и согласиями. Заявка летит в бота, потом — редирект
// на payform выбранного тарифа. Ловим контакт даже тех, кто уйдёт
// думать и не оплатит сразу.
(() => {
  const modal = document.querySelector('[data-lead-modal]');
  if (!modal) return;
  const form = modal.querySelector('[data-lead-form]');
  const input = form.querySelector('input[name="tg"]');
  const submit = modal.querySelector('[data-lead-submit]');
  const status = modal.querySelector('[data-lead-status]');
  const tariffLabel = modal.querySelector('[data-lead-tariff]');
  const consents = form.querySelectorAll('input[type="checkbox"]');

  let payUrl = '';
  let tariffName = '';
  let lastActive = null;

  const open = (btn) => {
    payUrl = btn.getAttribute('href') || '';
    tariffName = btn.getAttribute('data-choice') || 'Тариф';
    tariffLabel.textContent = 'Тариф «' + tariffName + '»';
    status.textContent = ''; status.className = 'lead-modal-status';
    form.reset(); syncBtn();
    lastActive = btn;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 60);
  };
  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastActive) lastActive.focus();
  };

  // Перехватываем клик по кнопкам оплаты в тарифах.
  document.querySelectorAll('.pricing-button[href*="payform.ru"]').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.preventDefault(); open(btn); });
  });

  // Кнопка активна только когда все согласия отмечены.
  const syncBtn = () => {
    const allChecked = Array.from(consents).every((c) => c.checked);
    const hasTg = input.value.trim().length > 1;
    submit.disabled = !(allChecked && hasTg);
  };
  consents.forEach((c) => c.addEventListener('change', syncBtn));
  input.addEventListener('input', syncBtn);

  // Клик по ссылке внутри label не должен ставить/снимать галочку.
  modal.querySelectorAll('.lead-modal-consent a').forEach((a) => {
    a.addEventListener('click', (e) => e.stopPropagation());
  });

  // Закрытие: оверлей, крестик, Escape.
  modal.querySelectorAll('[data-lead-close]').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

  // Метка соцсети (короткие ссылки /ig, /tg, /yt… → ?utm_source=ig) и ник Telegram
  // уходят в ссылку оплаты: Prodamus вернёт их в уведомлении, CRM запишет, откуда оплата.
  let lastTg = '';
  // Заявка на почту через Web3Forms: ключ не секретный, он и рассчитан на то, чтобы стоять на сайте
  const LEAD_KEY = '5026a0a0-bd33-4eb4-a89a-349adacf5a7b';
  const LEAD_URL = 'https://api.web3forms.com/submit';
  const leadForm = (tg, tariff, ref) => {
    const fd = new FormData();
    fd.append('access_key', LEAD_KEY);
    fd.append('subject', 'Новая заявка с сайта: ' + tariff + ' · ' + tg);
    fd.append('from_name', 'Сайт Нейро-практикума');
    fd.append('Тариф', tariff);
    fd.append('Telegram', tg);
    fd.append('Источник', ref || '—');
    fd.append('Время', new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) + ' МСК');
    return fd;
  };

  const goPay = () => {
    if (!payUrl) return;
    let url = payUrl;
    try {
      const u = new URL(payUrl);
      const ref = getRef();
      if (ref) u.searchParams.set('_param_ref', ref);
      if (lastTg) u.searchParams.set('_param_tg', lastTg);
      url = u.toString();
    } catch (_) {}
    window.location.href = url;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    let tg = input.value.trim();
    if (tg && !tg.startsWith('@') && !tg.startsWith('http') && !tg.startsWith('t.me')) tg = '@' + tg;

    submit.disabled = true;
    status.className = 'lead-modal-status is-ok';
    status.textContent = 'Открываю оплату…';

    // Реферальная метка из адреса (?ref=...) — чтобы видеть, откуда
    // пришёл клиент. Сохраняется при первом заходе, работает и после
    // перехода по сайту.
    const ref = getRef();
    lastTg = tg;
    try { if (window.ddStat) window.ddStat('zayavka', { tg: tg, tarif: tariffName }); } catch (_) {}
    const payload = JSON.stringify({ tg: tg, tariff: tariffName, ref: ref });

    // sendBeacon гарантированно доставляет заявку, даже если страница
    // тут же уходит на payform — браузер дошлёт её сам. Это надёжнее
    // фонового fetch, который на медленном интернете мог не успеть.
    let beaconOk = false;
    try {
      if (navigator.sendBeacon) {
        beaconOk = navigator.sendBeacon('lead.php', new Blob([payload], { type: 'application/json' }));
      }
    } catch (_) { beaconOk = false; }
    // Пока сайт на GitHub (Бегет лёг 03.11.2026), lead.php нет — заявка уходит письмом через Web3Forms
    try { if (LEAD_KEY && navigator.sendBeacon) navigator.sendBeacon(LEAD_URL, leadForm(tg, tariffName, ref)); } catch (_) {}

    // Если beacon недоступен — ждём обычный fetch и только потом ведём
    // на оплату, чтобы заявка точно ушла.
    if (beaconOk) {
      setTimeout(goPay, 120);
    } else {
      try {
        await fetch('lead.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      } catch (_) {}
      goPay();
    }
  });
})();
