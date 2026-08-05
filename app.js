function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function chunk(arr, size){
  const out = [];
  for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
  return out;
}
function sampleDistinct(arr, n, excludeFn){
  const pool = arr.filter(x=>!excludeFn(x));
  return shuffle(pool).slice(0,n);
}

/* ================= THEMES ================= */
const CAT_META = [
  {code:'PRON', label:'Đại từ', icon:'👤'},
  {code:'NUM', label:'Số & lượng từ', icon:'🔢'},
  {code:'TIME', label:'Thời gian', icon:'⏰'},
  {code:'FAM', label:'Gia đình', icon:'👪'},
  {code:'PROF', label:'Nghề nghiệp', icon:'💼'},
  {code:'SCHOOL', label:'Trường học', icon:'🏫'},
  {code:'WORK', label:'Công việc', icon:'🏢'},
  {code:'FOOD', label:'Đồ ăn & thức uống', icon:'🍜'},
  {code:'OBJ', label:'Đồ vật', icon:'📦'},
  {code:'CLOTH', label:'Quần áo', icon:'👕'},
  {code:'BODY', label:'Cơ thể', icon:'🧍'},
  {code:'NATURE', label:'Thiên nhiên', icon:'🌿'},
  {code:'PLACE', label:'Địa điểm', icon:'📍'},
  {code:'TRANS', label:'Giao thông', icon:'🚗'},
  {code:'COLOR', label:'Màu sắc', icon:'🎨'},
  {code:'HOBBY', label:'Sở thích', icon:'🎮'},
  {code:'EMOTION', label:'Cảm xúc', icon:'😊'},
  {code:'ADJ', label:'Tính từ', icon:'✨'},
  {code:'VERB', label:'Động từ', icon:'🏃'},
  {code:'COMM', label:'Giao tiếp', icon:'💬'},
  {code:'GRAM', label:'Ngữ pháp', icon:'📝'},
];
const CAT_COUNT = {};
DATA.forEach(d=>{ CAT_COUNT[d.cat] = (CAT_COUNT[d.cat]||0)+1; });

let currentPool = DATA;
let currentCat = null;

function renderThemeModal(){
  const body = document.getElementById('theme-modal-body');
  const allActive = currentCat===null ? ' active' : '';
  let html = `<button class="theme-opt all-opt${allActive}" data-cat="">
    <span class="ic">📚</span><span class="lbl">Tất cả chủ đề</span><span class="cnt">${DATA.length} từ</span>
  </button>`;
  CAT_META.forEach(c=>{
    const n = CAT_COUNT[c.code] || 0;
    if(n===0) return;
    const active = currentCat===c.code ? ' active' : '';
    html += `<button class="theme-opt${active}" data-cat="${c.code}">
      <span class="ic">${c.icon}</span><span class="lbl">${c.label}</span><span class="cnt">${n} từ</span>
    </button>`;
  });
  body.innerHTML = html;
  body.querySelectorAll('.theme-opt').forEach(btn=>{
    btn.addEventListener('click', ()=> selectTheme(btn.dataset.cat || null) );
  });
}
function applyThemeUI(cat){
  currentCat = cat;
  currentPool = cat ? DATA.filter(d=>d.cat===cat) : DATA;
  const meta = CAT_META.find(c=>c.code===cat);
  document.getElementById('theme-btn-icon').textContent = meta ? meta.icon : '📚';
  document.getElementById('theme-btn-current').textContent = meta ? `${meta.label} (${currentPool.length})` : `Tất cả ${DATA.length} từ`;
}
function selectTheme(cat){
  applyThemeUI(cat);
  closeThemeModal();
  initMatching();
  initFill();
  initMC();
  initFlash();
  scheduleSave();
}
function openThemeModal(){
  renderThemeModal();
  document.getElementById('theme-modal-backdrop').classList.remove('hidden');
}
function closeThemeModal(){
  document.getElementById('theme-modal-backdrop').classList.add('hidden');
}
document.getElementById('theme-btn').addEventListener('click', openThemeModal);
document.getElementById('theme-modal-close').addEventListener('click', closeThemeModal);
document.getElementById('theme-modal-backdrop').addEventListener('click', (e)=>{
  if(e.target.id==='theme-modal-backdrop') closeThemeModal();
});

/* ================= TABS ================= */
const tabs = document.querySelectorAll('.tab');
const panels = {
  matching: document.getElementById('panel-matching'),
  fill: document.getElementById('panel-fill'),
  mc: document.getElementById('panel-mc'),
  flash: document.getElementById('panel-flash'),
  order: document.getElementById('panel-order'),
  translate: document.getElementById('panel-translate'),
};
tabs.forEach(t=>{
  t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    Object.values(panels).forEach(p=>p.classList.add('hidden'));
    panels[t.dataset.mode].classList.remove('hidden');
    saveExerciseState();
  });
});

/* Fade the scrollable tab row at whichever edge has more tabs hidden, so a
   partly-cut-off tab never sits flush against the screen edge unexplained.
   #tabs is inside #app-screen, which is hidden behind the login screen at
   load time (clientWidth 0) — a ResizeObserver re-checks whenever the row's
   real size becomes available (login reveal, resize, orientation change),
   instead of a one-shot check that would miss the login-reveal moment. */
const tabsEl = document.getElementById('tabs');
function updateTabsFade(){
  const scrollable = tabsEl.scrollWidth > tabsEl.clientWidth + 1;
  tabsEl.classList.toggle('fade-left', scrollable && tabsEl.scrollLeft > 4);
  tabsEl.classList.toggle('fade-right', scrollable && tabsEl.scrollLeft < tabsEl.scrollWidth - tabsEl.clientWidth - 4);
}
tabsEl.addEventListener('scroll', updateTabsFade);
new ResizeObserver(updateTabsFade).observe(tabsEl);

/* ================= MATCHING (ghép cặp, chấm điểm khi nộp bài) ================= */
let mRounds, mRoundIdx, mLeftWords, mRightOrder, mSelectedLeft, mAssign, mSubmitted, mRoundScores;

function initMatching(){
  mRounds = chunk(shuffle(currentPool), 10);
  mRoundIdx = 0;
  mRoundScores = new Array(mRounds.length).fill(0);
  document.getElementById('m-total').textContent = currentPool.length;
  document.getElementById('m-total-rounds').textContent = mRounds.length;
  loadMatchRound();
}
function loadMatchRound(){
  document.getElementById('m-round').textContent = mRoundIdx+1;
  mLeftWords = mRounds[mRoundIdx];
  mRightOrder = shuffle(mLeftWords.map((_,i)=>i));
  mSelectedLeft = null;
  mAssign = new Array(mLeftWords.length).fill(null);
  mSubmitted = false;
  renderMatchAll();
}
function renderMatchAll(){
  const totalCorrect = mRoundScores.reduce((a,b)=>a+b,0);
  document.getElementById('m-score').textContent = totalCorrect;
  document.getElementById('m-progress').style.width = (totalCorrect/currentPool.length*100) + '%';
  renderMatch();

  const submitRow = document.getElementById('m-submit-row');
  const banner = document.getElementById('m-score-banner');
  if(mSubmitted){
    const correct = mAssign.filter((r,i)=>r===i).length;
    const isLast = mRoundIdx === mRounds.length-1;
    let html = `<button class="btn ghost" id="m-retry-round">Làm lại vòng này</button>`;
    if(!isLast) html += `<button class="btn" id="m-next-round">Vòng tiếp theo →</button>`;
    else html += `<button class="btn" id="m-restart">Làm lại từ đầu</button>`;
    submitRow.innerHTML = html;
    document.getElementById('m-retry-round').addEventListener('click', loadMatchRound);
    if(!isLast){
      document.getElementById('m-next-round').addEventListener('click', ()=>{ mRoundIdx++; loadMatchRound(); });
    } else {
      document.getElementById('m-restart').addEventListener('click', initMatching);
    }
    banner.innerHTML = `<div class="score-banner">Đúng ${correct}/${mLeftWords.length} ở vòng này${isLast ? ' · Đã hoàn thành tất cả các vòng!' : ''}</div>`;
  } else {
    submitRow.innerHTML = `<button class="btn" id="m-submit">Nộp bài</button>`;
    document.getElementById('m-submit').addEventListener('click', ()=>{
      mSubmitted = true;
      mRoundScores[mRoundIdx] = mAssign.filter((r,i)=>r===i).length;
      renderMatchAll();
    });
    banner.innerHTML = '';
  }
  saveExerciseState();
}
function renderMatch(){
  const body = document.getElementById('m-body');
  const leftHtml = mLeftWords.map((w,i)=>{
    let cls = 'match-item';
    if(mSubmitted){
      cls += ' locked ' + (mAssign[i]===i ? 'matched' : (mAssign[i]!==null ? 'wrong' : ''));
    } else {
      if(i===mSelectedLeft) cls += ' selected';
      else if(mAssign[i]!==null) cls += ' paired';
    }
    return `<div class="${cls}" data-side="L" data-idx="${i}">
      <span class="hz">${w.hanzi}</span><span class="py">${w.pinyin}</span>
    </div>`;
  }).join('');
  const rightHtml = mRightOrder.map((origIdx,pos)=>{
    const assignedLeft = mAssign.findIndex(r=>r===origIdx);
    let cls = 'match-item';
    if(mSubmitted){
      if(assignedLeft!==-1) cls += ' locked ' + (assignedLeft===origIdx ? 'matched' : 'wrong');
      else cls += ' locked';
    } else if(assignedLeft!==-1){
      cls += ' paired';
    }
    return `<div class="${cls}" data-side="R" data-idx="${origIdx}" data-pos="${pos}">
      <span class="nghia-text">${mLeftWords[origIdx].nghia}</span>
    </div>`;
  }).join('');
  body.innerHTML = `<div class="match-cols"><div class="match-col" id="m-left">${leftHtml}</div><div class="match-col" id="m-right">${rightHtml}</div></div>`;

  if(mSubmitted) return;

  body.querySelectorAll('.match-item[data-side="L"]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const i = parseInt(el.dataset.idx);
      if(mAssign[i]!==null){
        mAssign[i] = null;
        mSelectedLeft = null;
        renderMatchAll();
        return;
      }
      mSelectedLeft = (mSelectedLeft===i) ? null : i;
      renderMatch();
    });
  });
  body.querySelectorAll('.match-item[data-side="R"]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const origIdx = parseInt(el.dataset.idx);
      const existingLeft = mAssign.findIndex(r=>r===origIdx);
      if(existingLeft!==-1){
        mAssign[existingLeft] = null;
        renderMatchAll();
        return;
      }
      if(mSelectedLeft===null) return;
      mAssign[mSelectedLeft] = origIdx;
      mSelectedLeft = null;
      renderMatchAll();
    });
  });
}

/* ================= Shared: build a quiz with 4 options per question ================= */
function buildQuiz(getPrompt, getOptionValue, getCorrectValue, order){
  return order.map(w=>{
    const distractors = sampleDistinct(order, 3, d=>getOptionValue(d)===getCorrectValue(w));
    const options = shuffle([w, ...distractors]);
    const correctIndex = options.findIndex(o=>getOptionValue(o)===getCorrectValue(w));
    return { word:w, options, correctIndex, selected:null };
  });
}
function renderNavGrid(container, quiz, curIdx, submitted, onClick){
  container.innerHTML = quiz.map((q,i)=>{
    let cls = 'navbtn';
    if(submitted){ cls += (q.selected===q.correctIndex) ? ' correct' : ' wrong'; }
    else if(q.selected!==null){ cls += ' answered'; }
    if(i===curIdx) cls += ' current';
    return `<button class="${cls}" data-i="${i}">${i+1}</button>`;
  }).join('');
  container.querySelectorAll('.navbtn').forEach(btn=>{
    btn.addEventListener('click', ()=> onClick(parseInt(btn.dataset.i)) );
  });
}

/* ================= MULTIPLE CHOICE ================= */
let mcQuiz, mcCur, mcSubmitted;
function initMC(){
  const order = shuffle(currentPool);
  mcQuiz = buildQuiz(w=>w.hanzi, d=>d.nghia, w=>w.nghia, order);
  mcCur = 0;
  mcSubmitted = false;
  document.getElementById('mc-total').textContent = mcQuiz.length;
  renderMCAll();
}
function renderMCAll(){
  renderNavGrid(document.getElementById('mc-navgrid'), mcQuiz, mcCur, mcSubmitted, gotoMC);
  const answered = mcQuiz.filter(q=>q.selected!==null).length;
  document.getElementById('mc-answered').textContent = answered;
  document.getElementById('mc-progress').style.width = (answered/mcQuiz.length*100) + '%';
  const submitRow = document.getElementById('mc-submit-row');
  const banner = document.getElementById('mc-score-banner');
  const scoreStat = document.getElementById('mc-scorestat');
  if(mcSubmitted){
    submitRow.innerHTML = `<button class="btn ghost" id="mc-restart">Làm lại từ đầu</button>`;
    document.getElementById('mc-restart').addEventListener('click', initMC);
    const score = mcQuiz.filter(q=>q.selected===q.correctIndex).length;
    banner.innerHTML = `<div class="score-banner">Điểm: ${score}/${mcQuiz.length}</div>`;
    scoreStat.innerHTML = '';
  } else {
    submitRow.innerHTML = `<button class="btn" id="mc-submit">Nộp bài</button>`;
    document.getElementById('mc-submit').addEventListener('click', ()=>{ mcSubmitted = true; renderMCAll(); });
    banner.innerHTML = '';
    scoreStat.textContent = '';
  }
  renderMCQuestion();
  saveExerciseState();
}
function gotoMC(i){ mcCur = i; renderMCAll(); }
function renderMCQuestion(){
  const q = mcQuiz[mcCur];
  document.getElementById('mc-hanzi').textContent = q.word.hanzi;
  document.getElementById('mc-pinyin').textContent = q.word.pinyin;
  const letters = ['A','B','C','D'];
  const box = document.getElementById('mc-options');
  box.innerHTML = q.options.map((opt,i)=>{
    let cls = 'opt-btn';
    if(mcSubmitted){
      if(i===q.correctIndex) cls += ' correct';
      else if(i===q.selected) cls += ' incorrect';
    } else if(i===q.selected){ cls += ' selected'; }
    return `<button class="${cls}" data-i="${i}" ${mcSubmitted?'disabled':''}><span class="letter">${letters[i]}.</span>${opt.nghia}</button>`;
  }).join('');
  if(!mcSubmitted){
    box.querySelectorAll('.opt-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        q.selected = parseInt(btn.dataset.i);
        renderMCAll();
      });
    });
  }
}
document.getElementById('mc-prev').addEventListener('click', ()=>{ mcCur = (mcCur-1+mcQuiz.length)%mcQuiz.length; renderMCAll(); });
document.getElementById('mc-next').addEventListener('click', ()=>{ mcCur = (mcCur+1)%mcQuiz.length; renderMCAll(); });

/* ================= FILL IN BLANK ================= */
let fQuiz, fCur, fSubmitted;
function initFill(){
  const order = shuffle(currentPool).filter(w=>w.ex_zh.includes(w.hanzi));
  fQuiz = buildQuiz(w=>w.hanzi, d=>d.hanzi, w=>w.hanzi, order);
  fCur = 0;
  fSubmitted = false;
  document.getElementById('f-total').textContent = fQuiz.length;
  renderFillAll();
}
function renderFillAll(){
  renderNavGrid(document.getElementById('f-navgrid'), fQuiz, fCur, fSubmitted, gotoFill);
  const answered = fQuiz.filter(q=>q.selected!==null).length;
  document.getElementById('f-answered').textContent = answered;
  document.getElementById('f-progress').style.width = (answered/fQuiz.length*100) + '%';
  const submitRow = document.getElementById('f-submit-row');
  const banner = document.getElementById('f-score-banner');
  const scoreStat = document.getElementById('f-scorestat');
  if(fSubmitted){
    submitRow.innerHTML = `<button class="btn ghost" id="f-restart">Làm lại từ đầu</button>`;
    document.getElementById('f-restart').addEventListener('click', initFill);
    const score = fQuiz.filter(q=>q.selected===q.correctIndex).length;
    banner.innerHTML = `<div class="score-banner">Điểm: ${score}/${fQuiz.length}</div>`;
    scoreStat.innerHTML = '';
  } else {
    submitRow.innerHTML = `<button class="btn" id="f-submit">Nộp bài</button>`;
    document.getElementById('f-submit').addEventListener('click', ()=>{ fSubmitted = true; renderFillAll(); });
    banner.innerHTML = '';
    scoreStat.textContent = '';
  }
  renderFillQuestion();
  saveExerciseState();
}
function gotoFill(i){ fCur = i; renderFillAll(); }
function renderFillQuestion(){
  const q = fQuiz[fCur];
  const w = q.word;
  const parts = w.ex_zh.split(w.hanzi);
  let blankContent = '____';
  if(fSubmitted){ blankContent = w.hanzi; }
  else if(q.selected!==null){ blankContent = q.options[q.selected].hanzi; }
  const zhLine = parts.length>1
    ? (parts[0] + `<span class="blank">${blankContent}</span>` + parts.slice(1).join(w.hanzi))
    : (`<span class="blank">${blankContent}</span> ` + w.ex_zh);
  document.getElementById('f-sentence').innerHTML = `<span class="zh">${zhLine}</span>`;
  document.getElementById('f-pinyin').textContent = fSubmitted ? w.ex_pinyin : '';
  document.getElementById('f-vi').textContent = fSubmitted ? w.ex_vi : '';

  const letters = ['A','B','C','D'];
  const box = document.getElementById('f-options');
  box.innerHTML = q.options.map((opt,i)=>{
    let cls = 'opt-btn';
    if(fSubmitted){
      if(i===q.correctIndex) cls += ' correct';
      else if(i===q.selected) cls += ' incorrect';
    } else if(i===q.selected){ cls += ' selected'; }
    return `<button class="${cls}" data-i="${i}" ${fSubmitted?'disabled':''}><span class="letter">${letters[i]}.</span>${opt.hanzi} <span style="font-style:italic;color:var(--text-soft);font-weight:400;">(${opt.pinyin})</span></button>`;
  }).join('');
  if(!fSubmitted){
    box.querySelectorAll('.opt-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        q.selected = parseInt(btn.dataset.i);
        renderFillAll();
      });
    });
  }
}
document.getElementById('f-prev').addEventListener('click', ()=>{ fCur = (fCur-1+fQuiz.length)%fQuiz.length; renderFillAll(); });
document.getElementById('f-next').addEventListener('click', ()=>{ fCur = (fCur+1)%fQuiz.length; renderFillAll(); });

/* ================= FLASHCARDS ================= */
let flPool, flDeck, flIdx;
let flKnown = new Set();
function initFlash(){
  flPool = currentPool;
  flDeck = shuffle(flPool);
  flIdx = 0;
  document.getElementById('fl-known-total').textContent = currentPool.length;
  renderFlash();
}
function currentFlashFilter(){
  return document.getElementById('fl-filter').checked;
}
function rebuildFlashDeck(){
  const onlyUnknown = currentFlashFilter();
  const base = onlyUnknown ? currentPool.filter(d=>!flKnown.has(d.id)) : currentPool;
  flDeck = shuffle(base);
  flIdx = 0;
  if(flDeck.length===0){
    document.getElementById('fl-hz').textContent = '🎉';
    document.getElementById('fl-py').textContent = '';
    document.getElementById('fl-meaning').textContent = 'Bạn đã nhớ hết!';
    document.getElementById('fl-ex').textContent = '';
    document.getElementById('fl-ex-pinyin').textContent = '';
    document.getElementById('fl-ex-vi').textContent = '';
    document.getElementById('fl-index').textContent = 0;
    document.getElementById('fl-total').textContent = 0;
  } else {
    renderFlash();
  }
}
function renderFlash(){
  saveExerciseState();
  if(flDeck.length===0) return;
  const card = document.getElementById('flashcard');
  card.classList.remove('flipped');
  const w = flDeck[flIdx];
  document.getElementById('fl-index').textContent = flIdx+1;
  document.getElementById('fl-total').textContent = flDeck.length;
  document.getElementById('fl-progress').style.width = Math.round(((flIdx+1)/flDeck.length)*100) + '%';
  document.getElementById('fl-lvl-front').textContent = w.level;
  document.getElementById('fl-lvl-back').textContent = w.level;
  document.getElementById('fl-hz').textContent = w.hanzi;
  document.getElementById('fl-py').textContent = w.pinyin;
  document.getElementById('fl-meaning').textContent = w.nghia;
  document.getElementById('fl-ex').textContent = w.ex_zh;
  document.getElementById('fl-ex-pinyin').textContent = w.ex_pinyin;
  document.getElementById('fl-ex-vi').textContent = w.ex_vi;
  const known = flKnown.has(w.id);
  document.getElementById('fl-badge-front').classList.toggle('hidden', !known);
  document.getElementById('fl-badge-back').classList.toggle('hidden', !known);
  document.getElementById('fl-known-count').textContent = flKnown.size;
  const toggleBtn = document.getElementById('fl-toggle-known');
  toggleBtn.textContent = known ? '↺ Bỏ đánh dấu' : '✓ Đã nhớ từ này';
  toggleBtn.className = known ? 'btn ghost' : 'btn';
}
document.getElementById('flashcard').addEventListener('click', function(){
  if(flDeck.length===0) return;
  this.classList.toggle('flipped');
});
document.getElementById('fl-next').addEventListener('click', ()=>{
  if(flDeck.length===0) return;
  flIdx = (flIdx+1) % flDeck.length;
  renderFlash();
});
document.getElementById('fl-prev').addEventListener('click', ()=>{
  if(flDeck.length===0) return;
  flIdx = (flIdx-1+flDeck.length) % flDeck.length;
  renderFlash();
});
document.getElementById('fl-shuffle').addEventListener('click', ()=>{
  flDeck = shuffle(flDeck.length ? flDeck : DATA);
  flIdx = 0;
  renderFlash();
});
document.getElementById('fl-toggle-known').addEventListener('click', ()=>{
  if(flDeck.length===0) return;
  const w = flDeck[flIdx];
  if(flKnown.has(w.id)){ flKnown.delete(w.id); } else { flKnown.add(w.id); }
  document.getElementById('fl-known-count').textContent = flKnown.size;
  const known = flKnown.has(w.id);
  document.getElementById('fl-badge-front').classList.toggle('hidden', !known);
  document.getElementById('fl-badge-back').classList.toggle('hidden', !known);
  const toggleBtn = document.getElementById('fl-toggle-known');
  toggleBtn.textContent = known ? '↺ Bỏ đánh dấu' : '✓ Đã nhớ từ này';
  toggleBtn.className = known ? 'btn ghost' : 'btn';
  if(currentFlashFilter()){
    rebuildFlashDeck();
  }
  scheduleSave();
});
document.getElementById('fl-filter').addEventListener('change', rebuildFlashDeck);

/* ================= SENTENCE ORDERING ================= */
let ordQuiz, ordCur, ordSubmitted;

function initOrder(){
  const order = shuffle(SENT_DATA);
  ordQuiz = order.map(s=>{
    const idxs = shuffle(s.chunks.map((_,i)=>i));
    return { sentence:s, shuffledIdxs: idxs, answer: [], status: null, hintUsed:false };
  });
  ordCur = 0;
  ordSubmitted = false;
  document.getElementById('ord-total').textContent = ordQuiz.length;
  document.getElementById('ord-done-total').textContent = ordQuiz.length;
  renderOrderAll();
}
function renderOrderAll(){
  const container = document.getElementById('ord-navgrid');
  container.innerHTML = ordQuiz.map((q,i)=>{
    let cls = 'navbtn';
    if(ordSubmitted){
      cls += (q.status==='correct') ? ' correct' : ' revealed';
    } else if(q.answer.length>0){
      cls += ' answered';
    }
    if(i===ordCur) cls += ' current';
    return `<button class="${cls}" data-i="${i}">${i+1}</button>`;
  }).join('');
  container.querySelectorAll('.navbtn').forEach(btn=>{
    btn.addEventListener('click', ()=> gotoOrder(parseInt(btn.dataset.i)) );
  });
  const filledCount = ordQuiz.filter(q=>q.answer.length>0).length;
  document.getElementById('ord-done-count').textContent = filledCount;
  document.getElementById('ord-progress').style.width = (filledCount/ordQuiz.length*100) + '%';
  document.getElementById('ord-index').textContent = ordCur+1;

  const submitRow = document.getElementById('ord-submit-row');
  const banner = document.getElementById('ord-score-banner');
  if(ordSubmitted){
    submitRow.innerHTML = `<button class="btn ghost" id="ord-restart">Làm lại từ đầu</button>`;
    document.getElementById('ord-restart').addEventListener('click', initOrder);
    const okCount = ordQuiz.filter(q=>q.status==='correct').length;
    const reviewCount = ordQuiz.filter(q=>q.status==='review').length;
    banner.innerHTML = `<div class="score-banner">Kết quả: ${okCount} câu đúng · ${reviewCount} câu cần ôn lại</div>`;
  } else {
    submitRow.innerHTML = `<button class="btn" id="ord-submit">Nộp bài</button>`;
    document.getElementById('ord-submit').addEventListener('click', submitOrder);
    banner.innerHTML = '';
  }
  renderOrderPuzzle();
  saveExerciseState();
}
function submitOrder(){
  ordQuiz.forEach(q=>{
    const s = q.sentence;
    const correct = q.answer.length === s.chunks.length && q.answer.every((idx,pos)=>idx===pos);
    q.status = correct ? 'correct' : 'review';
  });
  ordSubmitted = true;
  renderOrderAll();
}
function gotoOrder(i){ ordCur = i; renderOrderAll(); }
function renderOrderPuzzle(){
  const q = ordQuiz[ordCur];
  const s = q.sentence;
  const locked = ordSubmitted;

  const answerBox = document.getElementById('ord-answer');
  answerBox.classList.remove('correct','wrong');
  answerBox.innerHTML = s.chunks.map((_,pos)=>{
    if(pos < q.answer.length){
      const chunkIdx = q.answer[pos];
      return `<button class="order-slot-chip" data-pos="${pos}" ${locked?'disabled':''}>${s.chunks[chunkIdx]}</button>`;
    }
    return `<div class="order-slot-empty"></div>`;
  }).join('');
  if(!locked){
    answerBox.querySelectorAll('.order-slot-chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const pos = parseInt(btn.dataset.pos);
        q.answer.splice(pos,1);
        renderOrderAll();
      });
    });
  }

  const bankBox = document.getElementById('ord-bank');
  const usedSet = new Set(q.answer);
  const remaining = q.shuffledIdxs.filter(idx=>!usedSet.has(idx));
  bankBox.innerHTML = remaining.map(idx=>`<button class="order-chip" data-idx="${idx}" ${locked?'disabled':''}>${s.chunks[idx]}</button>`).join('');
  bankBox.classList.toggle('hidden', locked);
  if(!locked){
    bankBox.querySelectorAll('.order-chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = parseInt(btn.dataset.idx);
        if(q.answer.length < s.chunks.length){
          q.answer.push(idx);
          renderOrderAll();
        }
      });
    });
  }

  const revealBox = document.getElementById('ord-reveal-box');
  const verdictBox = document.getElementById('ord-verdict');
  if(ordSubmitted){
    revealBox.classList.remove('hidden');
    document.getElementById('ord-reveal-zh').textContent = s.zh;
    document.getElementById('ord-reveal-py').textContent = s.pinyin;
    document.getElementById('ord-reveal-vi').textContent = s.vi;
    document.getElementById('ord-reveal-gram').textContent = '📐 ' + s.grammar;
    if(q.status==='correct'){
      verdictBox.textContent = q.hintUsed ? '🟢 Đúng (có dùng gợi ý trước khi nộp)' : '🟢 Chính xác!';
      verdictBox.className = 'match-verdict high';
      answerBox.classList.add('correct');
    } else {
      verdictBox.textContent = '🟡 Chưa đúng thứ tự — so sánh với đáp án bên dưới';
      verdictBox.className = 'match-verdict mid';
    }
  } else {
    revealBox.classList.add('hidden');
  }

  document.getElementById('ord-reveal').disabled = locked;
  document.getElementById('ord-reset').disabled = locked;
}
document.getElementById('ord-reveal').addEventListener('click', ()=>{
  if(ordSubmitted) return;
  const q = ordQuiz[ordCur];
  q.answer = q.sentence.chunks.map((_,i)=>i);
  q.hintUsed = true;
  renderOrderAll();
});
document.getElementById('ord-reset').addEventListener('click', ()=>{
  if(ordSubmitted) return;
  const q = ordQuiz[ordCur];
  q.answer = [];
  q.shuffledIdxs = shuffle(q.shuffledIdxs);
  renderOrderAll();
});
document.getElementById('ord-prev').addEventListener('click', ()=>{ ordCur = (ordCur-1+ordQuiz.length)%ordQuiz.length; renderOrderAll(); });
document.getElementById('ord-next').addEventListener('click', ()=>{ ordCur = (ordCur+1)%ordQuiz.length; renderOrderAll(); });

/* ================= TRANSLATION ================= */
let dichDirection = 'zh2vi';
let dichQuiz, dichCur, dichSubmitted;

function initDich(){
  const order = shuffle(SENT_DATA);
  dichQuiz = order.map(s=>({ sentence:s, typedText:'', status:null, lastScore:undefined }));
  dichCur = 0;
  dichSubmitted = false;
  document.getElementById('dich-total').textContent = dichQuiz.length;
  document.getElementById('dich-done-total').textContent = dichQuiz.length;
  renderDichAll();
}
function setDichDirection(dir){
  if(dichDirection === dir) return;
  dichDirection = dir;
  document.getElementById('dich-dir-zhvi').classList.toggle('active', dir==='zh2vi');
  document.getElementById('dich-dir-vizh').classList.toggle('active', dir==='vi2zh');
  initDich();
}

/* --- Fuzzy "gan dung" matching helpers (khong can chinh xac 100%) --- */
function stripDiacriticsVi(s){
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
}
function normalizeViText(s){
  return stripDiacriticsVi(s).toLowerCase().replace(/[.,!?;:"'()\-–…?]/g,' ').replace(/\s+/g,' ').trim();
}
function normalizeZhText(s){
  return s.replace(/[。？！，、；：""''()\-…\s]/g,'');
}
function wordOverlapScore(userText, refText){
  const uWords = new Set(normalizeViText(userText).split(' ').filter(w=>w.length>0));
  const rWords = normalizeViText(refText).split(' ').filter(w=>w.length>0);
  const rSet = new Set(rWords);
  if(rSet.size===0) return 0;
  let hit=0;
  rSet.forEach(w=>{ if(uWords.has(w)) hit++; });
  return hit / rSet.size;
}
function charOverlapScoreZh(userText, refText){
  const uChars = new Set(normalizeZhText(userText).split(''));
  const rChars = normalizeZhText(refText).split('');
  const rSet = new Set(rChars);
  if(rSet.size===0) return 0;
  let hit=0;
  rSet.forEach(c=>{ if(uChars.has(c)) hit++; });
  return hit / rSet.size;
}
function computeMatchScore(direction, userText, s){
  if(!userText || !userText.trim()) return null;
  return direction==='zh2vi' ? wordOverlapScore(userText, s.vi) : charOverlapScoreZh(userText, s.zh);
}
function verdictFromScore(score){
  if(score===null) return null;
  if(score >= 0.6) return {cls:'high', text:'🟢 Khá sát nghĩa!'};
  if(score >= 0.3) return {cls:'mid', text:'🟡 Gần đúng'};
  return {cls:'low', text:'🔴 Khác khá nhiều so với đáp án'};
}

function renderDichAll(){
  const container = document.getElementById('dich-navgrid');
  container.innerHTML = dichQuiz.map((q,i)=>{
    let cls = 'navbtn';
    if(dichSubmitted){
      if(q.status==='correct') cls += ' correct';
      else cls += ' revealed';
    } else if(q.typedText && q.typedText.trim()){
      cls += ' answered';
    }
    if(i===dichCur) cls += ' current';
    return `<button class="${cls}" data-i="${i}">${i+1}</button>`;
  }).join('');
  container.querySelectorAll('.navbtn').forEach(btn=>{
    btn.addEventListener('click', ()=> gotoDich(parseInt(btn.dataset.i)) );
  });
  const filledCount = dichQuiz.filter(q=>q.typedText && q.typedText.trim()).length;
  document.getElementById('dich-done-count').textContent = filledCount;
  document.getElementById('dich-progress').style.width = (filledCount/dichQuiz.length*100) + '%';
  document.getElementById('dich-index').textContent = dichCur+1;

  const submitRow = document.getElementById('dich-submit-row');
  const banner = document.getElementById('dich-score-banner');
  if(dichSubmitted){
    submitRow.innerHTML = `<button class="btn ghost" id="dich-restart">Làm lại từ đầu</button>`;
    document.getElementById('dich-restart').addEventListener('click', initDich);
    const okCount = dichQuiz.filter(q=>q.status==='correct').length;
    const reviewCount = dichQuiz.filter(q=>q.status==='review').length;
    banner.innerHTML = `<div class="score-banner">Đánh giá: ${okCount} câu ổn · ${reviewCount} câu cần ôn lại</div>`;
  } else {
    submitRow.innerHTML = `<button class="btn" id="dich-submit">Nộp bài</button>`;
    document.getElementById('dich-submit').addEventListener('click', submitDich);
    banner.innerHTML = '';
  }
  renderDichQuestion();
  saveExerciseState();
}
function submitDich(){
  dichQuiz.forEach(q=>{
    const score = computeMatchScore(dichDirection, q.typedText, q.sentence);
    q.lastScore = score;
    q.status = (score !== null && score >= 0.6) ? 'correct' : 'review';
  });
  dichSubmitted = true;
  renderDichAll();
}
function gotoDich(i){
  dichQuiz[dichCur].typedText = document.getElementById('dich-textarea').value;
  dichCur = i;
  renderDichAll();
}
function renderDichQuestion(){
  const q = dichQuiz[dichCur];
  const s = q.sentence;
  const promptBox = document.getElementById('dich-prompt');
  if(dichDirection==='zh2vi'){
    promptBox.innerHTML = `<div class="zh">${s.zh}</div><div class="py">${s.pinyin}</div>`;
  } else {
    promptBox.innerHTML = `<div class="vi">${s.vi}</div>`;
  }
  const textarea = document.getElementById('dich-textarea');
  textarea.value = q.typedText || '';
  textarea.disabled = dichSubmitted;

  const revealBox = document.getElementById('dich-reveal-box');
  const assessRow = document.getElementById('dich-assess-row');
  const verdictBox = document.getElementById('dich-match-verdict');
  const autoStatusBox = document.getElementById('dich-auto-status');
  if(dichSubmitted){
    revealBox.classList.remove('hidden');
    assessRow.classList.remove('hidden');
    const contentBox = document.getElementById('dich-reveal-content');
    if(dichDirection==='zh2vi'){
      contentBox.innerHTML = `<div class="vi-line">${s.vi}</div>`;
    } else {
      contentBox.innerHTML = `<div class="zh-line">${s.zh}</div><div class="py-line">${s.pinyin}</div>`;
    }
    document.getElementById('dich-reveal-gram').textContent = '📐 ' + s.grammar;
    const verdict = verdictFromScore(q.lastScore===undefined ? null : q.lastScore);
    if(verdict){
      verdictBox.textContent = verdict.text;
      verdictBox.className = 'match-verdict ' + verdict.cls;
    } else {
      verdictBox.className = 'match-verdict hidden';
    }
    if(q.status === 'correct'){
      autoStatusBox.textContent = '✓ Đã tự động đánh giá: Ổn — đối chiếu đáp án bên trên nhé.';
      autoStatusBox.className = 'auto-status-line st-correct';
    } else {
      autoStatusBox.textContent = '↺ Đã tự động đánh giá: Cần ôn lại — đối chiếu đáp án bên trên nhé.';
      autoStatusBox.className = 'auto-status-line st-review';
    }
  } else {
    revealBox.classList.add('hidden');
    assessRow.classList.add('hidden');
  }
}
document.getElementById('dich-dir-zhvi').addEventListener('click', ()=>setDichDirection('zh2vi'));
document.getElementById('dich-dir-vizh').addEventListener('click', ()=>setDichDirection('vi2zh'));
document.getElementById('dich-textarea').addEventListener('input', (e)=>{
  dichQuiz[dichCur].typedText = e.target.value;
  if(!dichSubmitted){
    const btn = document.querySelector(`#dich-navgrid .navbtn[data-i="${dichCur}"]`);
    if(btn && e.target.value.trim()) btn.classList.add('answered');
  }
  scheduleLocalSave();
});
document.getElementById('dich-mark-correct').addEventListener('click', ()=>{
  dichQuiz[dichCur].status = 'correct';
  renderDichAll();
});
document.getElementById('dich-mark-review').addEventListener('click', ()=>{
  dichQuiz[dichCur].status = 'review';
  renderDichAll();
});
document.getElementById('dich-prev').addEventListener('click', ()=>{
  dichQuiz[dichCur].typedText = document.getElementById('dich-textarea').value;
  dichCur = (dichCur-1+dichQuiz.length)%dichQuiz.length;
  renderDichAll();
});
document.getElementById('dich-next').addEventListener('click', ()=>{
  dichQuiz[dichCur].typedText = document.getElementById('dich-textarea').value;
  dichCur = (dichCur+1)%dichQuiz.length;
  renderDichAll();
});

/* ================= ACCOUNT / SYNC ================= */
let currentUser = null;
let authMode = 'login';
let saveTimer = null;

function showAuthScreen(){
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
  setAuthMode('login');
}
function showAppScreen(){
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
}
function updateAccountUI(){
  const curEl = document.getElementById('account-btn-current');
  const noteEl = document.getElementById('sync-note');
  curEl.textContent = currentUser + ' · Đăng xuất';
  noteEl.textContent = 'Tiến trình học đang được lưu và đồng bộ theo tài khoản này.';
  noteEl.classList.remove('hidden');
}
async function checkAuth(){
  try{
    const res = await fetch('/api/me');
    if(res.ok){
      const data = await res.json();
      currentUser = data.username;
      updateAccountUI();
      showAppScreen();
      await loadProgress();
      return;
    }
  }catch(e){ /* loi mang - coi nhu chua dang nhap */ }
  showAuthScreen();
}
async function loadProgress(){
  try{
    const res = await fetch('/api/progress');
    if(!res.ok) return;
    const data = await res.json();
    const state = data.state || {};
    if(Array.isArray(state.knownIds)){
      flKnown = new Set(state.knownIds);
    }
    if(state.lastTheme && state.lastTheme !== currentCat){
      selectTheme(state.lastTheme);
    } else {
      renderFlash();
      document.getElementById('fl-known-count').textContent = flKnown.size;
    }
  }catch(e){ console.error(e); }
}
function scheduleSave(){
  if(!currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveProgressNow, 500);
}
async function saveProgressNow(){
  if(!currentUser) return;
  try{
    await fetch('/api/progress', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ state: { knownIds: Array.from(flKnown), lastTheme: currentCat } })
    });
  }catch(e){ console.error(e); }
}
function handleAccountBtnClick(){
  if(confirm(`Đăng xuất khỏi tài khoản "${currentUser}"?`)){
    doLogout();
  }
}
function setAuthMode(mode){
  authMode = mode;
  document.getElementById('auth-tab-login').classList.toggle('active', mode==='login');
  document.getElementById('auth-tab-register').classList.toggle('active', mode==='register');
  document.getElementById('auth-submit').textContent = mode==='login' ? 'Đăng nhập' : 'Tạo tài khoản';
  document.getElementById('auth-error').classList.add('hidden');
}
async function submitAuth(){
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.classList.add('hidden');
  if(!username || !password){
    errEl.textContent = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.';
    errEl.classList.remove('hidden');
    return;
  }
  const url = authMode==='login' ? '/api/login' : '/api/register';
  try{
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username, password})
    });
    const data = await res.json();
    if(!res.ok){
      errEl.textContent = data.error || 'Có lỗi xảy ra, thử lại.';
      errEl.classList.remove('hidden');
      return;
    }
    currentUser = data.username;
    updateAccountUI();
    showAppScreen();
    await loadProgress();
  }catch(e){
    errEl.textContent = 'Không kết nối được máy chủ.';
    errEl.classList.remove('hidden');
  }
}
async function doLogout(){
  try{ await fetch('/api/logout', {method:'POST'}); }catch(e){}
  currentUser = null;
  flKnown = new Set();
  clearLocalExerciseState();
  showAuthScreen();
}
document.getElementById('account-btn').addEventListener('click', handleAccountBtnClick);
document.getElementById('auth-tab-login').addEventListener('click', ()=>setAuthMode('login'));
document.getElementById('auth-tab-register').addEventListener('click', ()=>setAuthMode('register'));
document.getElementById('auth-submit').addEventListener('click', submitAuth);
document.getElementById('auth-password').addEventListener('keydown', (e)=>{ if(e.key==='Enter') submitAuth(); });

/* ================= LOCAL PERSISTENCE (giữ trạng thái đang làm khi reload) ================= */
const LS_KEY = 'hsk_exercise_state_v1';
let localSaveTimer = null;
function scheduleLocalSave(){
  clearTimeout(localSaveTimer);
  localSaveTimer = setTimeout(saveExerciseState, 400);
}
function saveExerciseState(){
  if(!mRounds || !fQuiz || !mcQuiz || !ordQuiz || !dichQuiz || !flDeck) return;
  try{
    const activeTab = document.querySelector('.tab.active');
    const state = {
      cat: currentCat,
      mode: activeTab ? activeTab.dataset.mode : 'matching',
      matching: {
        roundIdx: mRoundIdx,
        rounds: mRounds.map(r=>r.map(w=>w.id)),
        rightOrder: mRightOrder,
        assign: mAssign,
        submitted: mSubmitted,
        roundScores: mRoundScores,
      },
      fill: {
        quiz: fQuiz.map(q=>({ wordId:q.word.id, optionIds:q.options.map(o=>o.id), correctIndex:q.correctIndex, selected:q.selected })),
        cur: fCur, submitted: fSubmitted,
      },
      mc: {
        quiz: mcQuiz.map(q=>({ wordId:q.word.id, optionIds:q.options.map(o=>o.id), correctIndex:q.correctIndex, selected:q.selected })),
        cur: mcCur, submitted: mcSubmitted,
      },
      order: {
        quiz: ordQuiz.map(q=>({ sentId:q.sentence.id, shuffledIdxs:q.shuffledIdxs, answer:q.answer, status:q.status, hintUsed:q.hintUsed })),
        cur: ordCur, submitted: ordSubmitted,
      },
      translate: {
        quiz: dichQuiz.map(q=>({ sentId:q.sentence.id, typedText:q.typedText, status:q.status, lastScore:q.lastScore })),
        cur: dichCur, submitted: dichSubmitted, direction: dichDirection,
      },
      flash: { deckIds: flDeck.map(w=>w.id), idx: flIdx },
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }catch(e){ /* localStorage khong kha dung (private mode, het dung luong...) - bo qua */ }
}
function clearLocalExerciseState(){
  try{ localStorage.removeItem(LS_KEY); }catch(e){}
}
function loadExerciseState(){
  let state;
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return false;
    state = JSON.parse(raw);
    if(!state) return false;
  }catch(e){ return false; }

  try{
    applyThemeUI(state.cat || null);

    mRounds = state.matching.rounds.map(idsArr => idsArr.map(id=>DATA[id]));
    mRoundIdx = state.matching.roundIdx || 0;
    mRoundScores = state.matching.roundScores || new Array(mRounds.length).fill(0);
    mLeftWords = mRounds[mRoundIdx];
    mRightOrder = state.matching.rightOrder;
    mAssign = state.matching.assign;
    mSubmitted = state.matching.submitted;
    mSelectedLeft = null;
    document.getElementById('m-total').textContent = currentPool.length;
    document.getElementById('m-total-rounds').textContent = mRounds.length;
    document.getElementById('m-round').textContent = mRoundIdx+1;
    renderMatchAll();

    fQuiz = state.fill.quiz.map(q=>({ word:DATA[q.wordId], options:q.optionIds.map(id=>DATA[id]), correctIndex:q.correctIndex, selected:q.selected }));
    fCur = state.fill.cur || 0;
    fSubmitted = state.fill.submitted;
    document.getElementById('f-total').textContent = fQuiz.length;
    renderFillAll();

    mcQuiz = state.mc.quiz.map(q=>({ word:DATA[q.wordId], options:q.optionIds.map(id=>DATA[id]), correctIndex:q.correctIndex, selected:q.selected }));
    mcCur = state.mc.cur || 0;
    mcSubmitted = state.mc.submitted;
    document.getElementById('mc-total').textContent = mcQuiz.length;
    renderMCAll();

    ordQuiz = state.order.quiz.map(q=>({ sentence:SENT_DATA[q.sentId], shuffledIdxs:q.shuffledIdxs, answer:q.answer, status:q.status, hintUsed:q.hintUsed }));
    ordCur = state.order.cur || 0;
    ordSubmitted = state.order.submitted;
    document.getElementById('ord-total').textContent = ordQuiz.length;
    document.getElementById('ord-done-total').textContent = ordQuiz.length;
    renderOrderAll();

    dichDirection = state.translate.direction || 'zh2vi';
    document.getElementById('dich-dir-zhvi').classList.toggle('active', dichDirection==='zh2vi');
    document.getElementById('dich-dir-vizh').classList.toggle('active', dichDirection==='vi2zh');
    dichQuiz = state.translate.quiz.map(q=>({ sentence:SENT_DATA[q.sentId], typedText:q.typedText, status:q.status, lastScore:q.lastScore }));
    dichCur = state.translate.cur || 0;
    dichSubmitted = state.translate.submitted;
    document.getElementById('dich-total').textContent = dichQuiz.length;
    document.getElementById('dich-done-total').textContent = dichQuiz.length;
    renderDichAll();

    if(state.flash && state.flash.deckIds && state.flash.deckIds.length){
      flDeck = state.flash.deckIds.map(id=>DATA[id]).filter(Boolean);
      flIdx = Math.min(state.flash.idx || 0, Math.max(flDeck.length-1, 0));
    } else {
      flDeck = shuffle(currentPool);
      flIdx = 0;
    }
    document.getElementById('fl-known-total').textContent = currentPool.length;
    renderFlash();

    if(state.mode){
      const targetTab = document.querySelector(`.tab[data-mode="${state.mode}"]`);
      if(targetTab){
        tabs.forEach(x=>x.classList.remove('active'));
        targetTab.classList.add('active');
        Object.values(panels).forEach(p=>p.classList.add('hidden'));
        panels[state.mode].classList.remove('hidden');
      }
    }
    return true;
  }catch(e){
    console.error('Khong khoi phuc duoc trang thai da luu, bat dau lai tu dau:', e);
    return false;
  }
}

/* ================= INIT ALL ================= */
if(!loadExerciseState()){
  initMatching();
  initFill();
  initMC();
  initFlash();
  initOrder();
  initDich();
}
checkAuth();
