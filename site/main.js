// Falcon Perch landing page: walkthrough animation and scroll reveals.
(() => {
  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Reveal sections as they scroll into view ----
  const revealTargets = document.querySelectorAll('.section-head, .feature, .setup-step, .compare-col, .flow, .faq details, .wt');
  if ('IntersectionObserver' in window && !reduceMotion) {
    revealTargets.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    revealTargets.forEach((el) => io.observe(el));
  }

  // ---- Walkthrough ----
  const phone = document.getElementById('demo');
  if (!phone) return;
  const screen = document.getElementById('demo-screen');
  const finger = document.getElementById('demo-finger');
  const pin = document.getElementById('demo-pin');
  const perchBtn = document.getElementById('demo-perch-btn');
  const toggle = document.getElementById('demo-switch');
  const stepButtons = [...document.querySelectorAll('#demo-steps [data-step]')];
  const playBtn = document.getElementById('demo-toggle');
  const wt = phone.closest('.wt');

  // Stage snapshots: A empty map · B pin + draft sheet · C perch set · D system-wide on · E other app
  const startStage = ['A', 'B', 'C', 'D'];
  const endStage = ['B', 'C', 'D', 'E'];
  const durations = [4200, 3200, 4600, 4200];

  let run = 0; // bumps to cancel the running sequence
  let paused = false;
  let visible = false;
  let current = 0;
  let resumeResolvers = [];

  const sleep = (ms, token) =>
    new Promise((resolve, reject) => {
      let remaining = ms;
      let started = performance.now();
      let timer;
      const tick = () => {
        if (token !== run) return reject(new Error('cancelled'));
        if (paused || !visible) {
          remaining -= performance.now() - started;
          resumeResolvers.push(() => { started = performance.now(); timer = setTimeout(tick, Math.max(0, remaining)); });
          return;
        }
        resolve();
      };
      timer = setTimeout(tick, ms);
    });

  const resume = () => {
    const r = resumeResolvers;
    resumeResolvers = [];
    r.forEach((fn) => fn());
  };

  const setStage = (s, instant) => {
    if (instant) phone.classList.add('instant');
    phone.dataset.stage = s;
    if (instant) { void phone.offsetWidth; phone.classList.remove('instant'); }
  };

  // Moves the fake finger to the centre of an element (or a point), in screen coordinates.
  const moveFinger = (target, instant) => {
    const sr = screen.getBoundingClientRect();
    const scale = sr.width / screen.offsetWidth || 1;
    let x, y;
    if (target instanceof Element) {
      const r = target.getBoundingClientRect();
      x = (r.left + r.width / 2 - sr.left) / scale;
      y = (r.top + r.height / 2 - sr.top) / scale;
    } else {
      ({ x, y } = target);
    }
    if (instant) finger.classList.add('instant');
    finger.style.transform = `translate(${x}px, ${y}px)`;
    if (instant) { void finger.offsetWidth; finger.classList.remove('instant'); }
  };

  const press = async (token) => {
    finger.classList.add('press');
    await sleep(220, token);
    finger.classList.remove('press');
  };

  const caption = document.getElementById('demo-caption');
  const markStep = (i) => {
    current = i;
    const t = stepButtons[i].querySelector('.t');
    caption.querySelector('b').textContent = t.querySelector('b').textContent;
    caption.querySelector('span').textContent = t.querySelector('small').textContent;
    stepButtons.forEach((b, j) => {
      if (j === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      const bar = b.querySelector('.bar i');
      bar.classList.remove('run');
      if (j === i && !reduceMotion) {
        bar.style.setProperty('--dur', `${durations[i]}ms`);
        void bar.offsetWidth;
        bar.classList.add('run');
      }
    });
  };

  const steps = [
    // 1. Pick a place
    async (t) => {
      moveFinger({ x: 210, y: 380 }, true);
      finger.classList.add('show');
      await sleep(500, t);
      moveFinger(pin);
      await sleep(800, t);
      await press(t);
      setStage('B');
      await sleep(1100, t);
      moveFinger(perchBtn);
      await sleep(1600, t);
    },
    // 2. Set your perch
    async (t) => {
      finger.classList.add('show');
      moveFinger(perchBtn, true);
      await sleep(300, t);
      await press(t);
      setStage('C');
      await sleep(900, t);
      moveFinger(toggle);
      await sleep(1700, t);
    },
    // 3. Apply to every app
    async (t) => {
      finger.classList.add('show');
      moveFinger(toggle, true);
      await sleep(400, t);
      await press(t);
      setStage('D');
      await sleep(500, t);
      finger.classList.remove('show');
      phone.classList.add('demo-notif');
      await sleep(2600, t);
      phone.classList.remove('demo-notif');
      await sleep(800, t);
    },
    // 4. Every app follows
    async (t) => {
      finger.classList.remove('show');
      setStage('E');
      await sleep(4200, t);
    },
  ];

  const resetVisuals = () => {
    finger.classList.remove('show', 'press');
    phone.classList.remove('demo-notif');
  };

  async function playFrom(i) {
    const token = ++run;
    resumeResolvers = [];
    try {
      for (let k = i; ; k = (k + 1) % steps.length) {
        resetVisuals();
        setStage(startStage[k], true);
        markStep(k);
        await steps[k](token);
      }
    } catch {
      /* cancelled */
    }
  }

  // Static mode for reduced motion: show the finished state of each step.
  const showStatic = (i) => {
    run++;
    resetVisuals();
    setStage(endStage[i], true);
    markStep(i);
  };

  stepButtons.forEach((b) =>
    b.addEventListener('click', () => {
      const i = Number(b.dataset.step);
      if (reduceMotion) return showStatic(i);
      playFrom(i);
    }),
  );

  const setPaused = (p) => {
    paused = p;
    playBtn.setAttribute('aria-pressed', String(p));
    playBtn.querySelector('span').textContent = p ? 'Play' : 'Pause';
    wt.classList.toggle('demo-paused', p);
    if (!p) resume();
  };

  if (reduceMotion) {
    playBtn.hidden = true;
    showStatic(0);
    return;
  }

  playBtn.addEventListener('click', () => setPaused(!paused));

  // Only animate while the walkthrough is on screen and the tab is visible.
  const setVisible = (v) => {
    const was = visible;
    visible = v && !document.hidden;
    wt.classList.toggle('demo-paused', paused || !visible);
    if (visible && !was) resume();
  };
  new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), { threshold: 0.25 }).observe(phone);
  document.addEventListener('visibilitychange', () => setVisible(!document.hidden && isOnScreen()));
  const isOnScreen = () => {
    const r = phone.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };

  playFrom(0);
})();
