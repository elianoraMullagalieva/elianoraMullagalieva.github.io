/* Счётчик для camp.derzayvdesign.com
 *
 * Считает: заходы, откуда пришли, докуда долистали, сколько пробыли,
 * клики по кнопкам оплаты.
 *
 * Почему свой, а не Метрика: данные остаются на хостинге Эли,
 * и бот может слать по ним отчёты в Telegram. Метрика добавится
 * сверху, когда Яндекс починит кабинет.
 */
(function () {
  // шлём сразу в CRM Эли (раздел «Аналитика» → «Сайт и ссылки»)
  var ADRES = 'https://crm2.derzayvdesign.com/api/site/event';
  var nachalo = Date.now();
  var maxGlubina = 0;
  var otpravleno = false;

  function metki() {
    var p = new URLSearchParams(location.search);
    var src = p.get('utm_source') || p.get('ref') || '';
    if (!src) {   // вернулся позже без метки — берём сохранённую при первом заходе (30 дней)
      try {
        var s = JSON.parse(localStorage.getItem('dd_ref') || 'null');
        if (s && Date.now() - s.t < 30 * 864e5) src = s.v;
      } catch (e) {}
    }
    return {
      istochnik: src,
      kampaniya: p.get('utm_campaign') || ''
    };
  }

  function poslat(sobytie, dop) {
    var m = metki();
    var telo = {
      sobytie: sobytie,
      stranica: location.pathname,
      istochnik: m.istochnik,
      kampaniya: m.kampaniya,
      otkuda: document.referrer || '',
      glubina: maxGlubina,
      sekund: Math.round((Date.now() - nachalo) / 1000)
    };
    if (dop) for (var k in dop) telo[k] = dop[k];

    // sendBeacon доживает до закрытия вкладки, обычный fetch — нет
    var json = JSON.stringify(telo);
    if (navigator.sendBeacon) {
      // text/plain — чтобы браузер не делал лишний запрос-проверку к другому домену
      navigator.sendBeacon(ADRES, new Blob([json], { type: 'text/plain' }));
    } else {
      fetch(ADRES, { method: 'POST', body: json, keepalive: true, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  // для окна заявки (script.js): заявка с ником и тарифом тоже уходит в CRM
  window.ddStat = poslat;

  // заход
  poslat('prosmotr');

  // докуда долистал: показывает, где люди уходят
  window.addEventListener('scroll', function () {
    var vsego = document.body.scrollHeight - window.innerHeight;
    if (vsego <= 0) return;
    var procent = Math.round((window.scrollY / vsego) * 100);
    if (procent > maxGlubina) maxGlubina = Math.min(procent, 100);
  }, { passive: true });

  // клики по оплате и важным кнопкам
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button');
    if (!el) return;
    var txt = (el.textContent || '').trim().slice(0, 60);
    var href = el.getAttribute('href') || '';
    if (/оплат|купить|записат|тариф|payform|prodamus/i.test(txt + ' ' + href)) {
      poslat('klik_oplata', { knopka: txt });
    }
  }, true);

  // докуда дошёл по блокам: каждый блок — один раз, когда дошёл до середины экрана
  // (блоки с анимацией бывают в несколько экранов — «виден на 40%» у них не наступает)
  // (по этому CRM строит воронку и видно, на каком блоке люди уходят)
  if ('IntersectionObserver' in window) {
    var videl = {};
    var nabl = new IntersectionObserver(function (zap) {
      zap.forEach(function (z) {
        var id = z.target.id;
        if (z.isIntersecting && id && !videl[id]) { videl[id] = 1; poslat('blok', { blok: id }); }
      });
    }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('section[id]').forEach(function (el) { nabl.observe(el); });
  }

  // начал заполнять форму заявки (открыл окно и стал печатать ник)
  document.addEventListener('focusin', function (e) {
    if (e.target && e.target.closest && e.target.closest('[data-lead-form]') && !window.__ddForma) {
      window.__ddForma = 1; poslat('forma_start');
    }
  });

  // уход со страницы: тут и глубина, и время
  window.addEventListener('pagehide', function () {
    if (otpravleno) return;
    otpravleno = true;
    poslat('ushel');
  });
})();
