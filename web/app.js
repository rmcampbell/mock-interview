/**
 * Browser version of the mock-interview quiz.
 * Mirrors the CLI flow:
 *  -> pick topics
 *  -> optional shuffle/combine
 *  -> reveal answers
 */
(() => {
  'use strict';

  const md = window.markdownit({
    html: false,
    linkify: true,
    breaks: false,
    // Syntax highlighting via Prism. Returning '' falls back to markdown-it's
    // own escaping, so an unknown language degrades to plain (escaped) code.
    highlight(code, lang) {
      const grammar = lang && window.Prism && window.Prism.languages[lang];
      if (!grammar) return '';
      return window.Prism.highlight(code, grammar, lang);
    }
  });

  const $ = (id) => document.getElementById(id);
  const el = {
    setup: $('setup'), quiz: $('quiz'), done: $('done'), error: $('error'),
    topicList: $('topic-list'), start: $('start'), restart: $('restart'), again: $('again'),
    selectAll: $('select-all'), selectNone: $('select-none'),
    optShuffle: $('opt-shuffle'), optCombine: $('opt-combine'),
    topicLabel: $('topic-label'), counter: $('counter'), progressBar: $('progress-bar'),
    question: $('question'), answer: $('answer'),
    reveal: $('reveal'), prev: $('prev'), next: $('next'), doneSummary: $('done-summary')
  };

  let topics = [];
  let deck = [];
  let index = 0;

  /** Fisher-Yates, same approach as the CLI's shuffle. */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function show(section) {
    for (const s of [el.setup, el.quiz, el.done, el.error]) s.hidden = true;
    section.hidden = false;
    el.restart.hidden = section === el.setup;
  }

  function render(target, markdown) {
    target.innerHTML = md.render(String(markdown ?? ''));
    // Let wide tables scroll instead of pushing the page sideways.
    for (const table of target.querySelectorAll('table')) {
      const wrap = document.createElement('div');
      wrap.className = 'table-scroll';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }
  }

  function fail(message) {
    el.error.textContent = message;
    show(el.error);
  }

  // ---- setup ----------------------------------------------------------------
  function renderTopics() {
    el.topicList.innerHTML = '';
    topics.forEach((t, i) => {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.value = String(i);
      box.addEventListener('change', syncStart);

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = t.topic;

      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = t.questions.length;

      label.append(box, name, count);
      li.appendChild(label);
      el.topicList.appendChild(li);
    });
  }

  const checkboxes = () => [...el.topicList.querySelectorAll('input[type=checkbox]')];
  const selected = () => checkboxes().filter((c) => c.checked).map((c) => topics[Number(c.value)]);

  function syncStart() {
    const picked = selected();
    el.start.disabled = picked.length === 0;
    el.optCombine.disabled = picked.length < 2;
    if (picked.length < 2) el.optCombine.checked = false;
  }

  function setAll(checked) {
    for (const c of checkboxes()) c.checked = checked;
    syncStart();
  }

  // ---- quiz -----------------------------------------------------------------
  function buildDeck() {
    const picked = selected();
    const combine = el.optCombine.checked && picked.length > 1;
    const randomize = el.optShuffle.checked;

    if (combine) {
      const all = picked.flatMap((t) => t.questions.map((q) => ({...q, topic: t.topic})));
      deck = randomize ? shuffle(all) : all;
    } else {
      deck = picked.flatMap((t) => {
        const qs = t.questions.map((q) => ({...q, topic: t.topic}));
        return randomize ? shuffle(qs) : qs;
      });
    }
    index = 0;
  }

  function paint() {
    const card = deck[index];
    if (!card) return finish();

    el.topicLabel.textContent = card.topic;
    el.counter.textContent = `${index + 1} / ${deck.length}`;
    el.progressBar.style.width = `${((index + 1) / deck.length) * 100}%`;

    render(el.question, card.question);
    el.answer.hidden = true;
    el.answer.innerHTML = '';
    delete el.answer.dataset.rendered;
    el.reveal.textContent = 'View answer';
    el.prev.disabled = index === 0;
    el.next.textContent = index + 1 === deck.length ? 'Finish' : 'Next';
    window.scrollTo({top: 0});
  }

  function showAnswer() {
    if (!el.answer.hidden) return;
    // Render once per question, then just toggle visibility.
    if (!el.answer.dataset.rendered) {
      render(el.answer, deck[index].answer);
      el.answer.dataset.rendered = '1';
    }
    el.answer.hidden = false;
    el.reveal.textContent = 'Hide answer';
  }

  function hideAnswer() {
    if (el.answer.hidden) return;
    el.answer.hidden = true;
    el.reveal.textContent = 'View answer';
  }

  function toggleAnswer() {
    if (el.answer.hidden) showAnswer();
    else hideAnswer();
  }

  function go(step) {
    const next = index + step;
    if (next < 0) return;
    if (next >= deck.length) return finish();
    index = next;
    paint();
  }

  function finish() {
    el.doneSummary.textContent = `You went through ${deck.length} question${deck.length === 1 ? '' : 's'}.`;
    show(el.done);
  }

  function startQuiz() {
    buildDeck();
    if (!deck.length) return fail('No questions found for the selected topics.');
    show(el.quiz);
    paint();
  }

  // ---- events ---------------------------------------------------------------
  // After a mouse click the button keeps focus, which would make Space activate
  // that button instead of toggling the answer. Blur only for real mouse clicks
  // (detail === 0 for keyboard-triggered ones) so keyboard focus is preserved.
  function blurIfMouse(event) {
    if (event.detail > 0) event.currentTarget.blur();
  }

  el.start.addEventListener('click', startQuiz);
  el.reveal.addEventListener('click', (e) => {
    blurIfMouse(e);
    toggleAnswer();
  });
  el.next.addEventListener('click', (e) => {
    blurIfMouse(e);
    go(1);
  });
  el.prev.addEventListener('click', (e) => {
    blurIfMouse(e);
    go(-1);
  });
  el.selectAll.addEventListener('click', () => setAll(true));
  el.selectNone.addEventListener('click', () => setAll(false));
  el.restart.addEventListener('click', () => show(el.setup));
  el.again.addEventListener('click', () => show(el.setup));

  document.addEventListener('keydown', (event) => {
    if (el.quiz.hidden) return;

    // Let a focused control handle its own keys (accessibility).
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      toggleAnswer();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (el.answer.hidden) showAnswer();
      else go(1);
    } else if (event.key === 'ArrowRight') {
      go(1);
    } else if (event.key === 'ArrowLeft') {
      go(-1);
    }
  });

  // ---- boot -----------------------------------------------------------------

  fetch('subjects.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      topics = data;
      if (!topics.length) throw new Error('no topics in subjects.json');
      renderTopics();
      syncStart();
      show(el.setup);
    })
    .catch((err) => fail(`Could not load questions (${err.message}). Run \`npm run build:web\` to generate subjects.json.`));
})();
