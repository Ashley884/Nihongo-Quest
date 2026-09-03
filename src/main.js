import './style.css';
import { supabase, supabaseConfigured } from './supabase.js';
import { fallbackTopics, greetingsQuestions } from './data.js';

const APP_VERSION = '1.3';
const state = { topics: [], questions: [], currentTopic: null, currentIndex: 0, selected: null, score: 0, adminUser: null, adminTopics: [], adminQuestions: [], editingTopic: null, editingQuestion: null, topicError: null, questionError: null };
const app = document.querySelector('#app');

const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const slugify = (v='') => v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const path = () => window.location.pathname;

function layout(content, admin=false) {
  const menuItems = admin
    ? `<a href="/">Quiz Home</a><button id="menuLogout" type="button">Log out</button>`
    : `<a href="/">Quiz Home</a><a href="/admin">Admin</a>`;
  app.innerHTML = `<header class="site-header"><a class="brand" href="/" aria-label="Nihongo Quest home"><span class="brand-mark">N</span><span>NIHONGO QUEST</span></a><div class="header-actions"><button class="ghost" id="menuBtn" type="button" aria-label="Open menu" aria-expanded="false">☰</button>${admin ? '<button class="admin-pill" id="logoutBtn" type="button">Log out</button>' : '<a class="admin-pill" href="/admin">Admin</a>'}</div></header><nav class="site-menu" id="siteMenu" aria-label="Site menu">${menuItems}</nav>${content}<div id="toast" class="toast" role="status" aria-live="polite"></div>`;
  const menuBtn = document.querySelector('#menuBtn');
  const menu = document.querySelector('#siteMenu');
  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    menuBtn?.setAttribute('aria-expanded','false');
    menuBtn?.setAttribute('aria-label','Open menu');
    if(menuBtn) menuBtn.textContent='☰';
  };
  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.textContent = open ? '×' : '☰';
  });
  menu?.addEventListener('click', e => { if(e.target.closest('a')) closeMenu(); });
  document.onkeydown = e => { if(e.key === 'Escape') closeMenu(); };
  document.onclick = e => { if(document.body.classList.contains('menu-open') && !menu?.contains(e.target) && !menuBtn?.contains(e.target)) closeMenu(); };
  document.querySelector('#logoutBtn')?.addEventListener('click', async () => { await supabase.signOut(); state.adminUser=null; renderAdminLogin(); });
  document.querySelector('#menuLogout')?.addEventListener('click', async () => { closeMenu(); await supabase.signOut(); state.adminUser=null; renderAdminLogin(); });
}
function toast(msg, error=false){ const el=document.querySelector('#toast'); if(!el)return; el.textContent=msg; el.className='toast show'+(error?' error':''); setTimeout(()=>el.className='toast',2800); }

async function loadTopics(){
  state.topicError = null;
  if(!supabaseConfigured) { state.topics=fallbackTopics; return; }
  const { data, error } = await supabase.from('topics').select('*').eq('published',true).order('sort_order');
  if(error){ state.topics=[]; state.topicError=error; return; }
  state.topics = data || [];
}
function normalizeQuestion(q){
  const options = Array.isArray(q.options) && q.options.length === 4
    ? q.options
    : [q.option_a, q.option_b, q.option_c, q.option_d];
  const correctIndex = Number.isInteger(q.correct_index) ? q.correct_index : Number(q.correct_option);
  return {...q, options, correct_index: correctIndex};
}
async function loadQuestions(topic){
  state.questionError = null;
  if(!supabaseConfigured){ return topic.slug==='greetings' ? greetingsQuestions : []; }
  const { data, error } = await supabase.from('questions').select('*').eq('topic_id',topic.id).order('sort_order');
  if(error){ state.questionError=error; return []; }
  return (data || []).map(normalizeQuestion);
}

function home(){
  const topics = state.topics;
  layout(`<main class="shell"><section class="hero"><div class="hero-copy"><div class="eyebrow">ROMAJI • FOCUSED • QUIZ ONLY</div><h1>Learn Japanese.<br><em>One quiz at a time.</em></h1><p>Choose a topic, answer the questions, and see your result. No distractions — just focused romaji practice.</p></div><div class="hero-art"><span>🌸</span><span>✦</span><span>🌸</span></div></section><section class="topic-head"><div><div class="eyebrow dark">QUIZ LIBRARY</div><h2>Choose your quiz</h2></div><input id="topicSearch" class="search" placeholder="Search topics…" aria-label="Search topics" /></section><section id="topicGrid" class="topic-grid"></section></main>`);
  const render = (term='') => {
    const grid=document.querySelector('#topicGrid');
    if(state.topicError){ grid.innerHTML='<div class="empty">We could not load the quiz library right now. Please refresh and try again.</div>'; return; }
    const filtered=topics.filter(t=>(t.name+' '+(t.subtitle||'')).toLowerCase().includes(term.toLowerCase()));
    grid.innerHTML=filtered.map((t,i)=>`<article class="topic-card"><div class="topic-top"><span class="topic-number">${String(t.sort_order||i+1).padStart(2,'0')}</span><span class="topic-icon">${esc(t.icon||'🌸')}</span></div><h3>${esc(t.name)}</h3><p>${esc(t.subtitle||'')}</p><a class="take" href="/quiz/${encodeURIComponent(t.slug)}">Take Quiz <span>↗</span></a></article>`).join('') || '<div class="empty">No matching topics.</div>';
  };
  render(); document.querySelector('#topicSearch').addEventListener('input',e=>render(e.target.value));
}

async function quiz(slug){
  const topic = state.topics.find(t=>t.slug===slug);
  if(!topic){ notFound(); return; }
  const questions = await loadQuestions(topic);
  state.currentTopic=topic; state.questions=questions; state.currentIndex=0; state.selected=null; state.score=0;
  if(state.questionError){ layout(`<main class="quiz-shell"><a class="back" href="/">← All topics</a><section class="quiz-panel"><div class="empty-icon">⚠</div><div class="eyebrow dark">${esc(topic.name)}</div><h1>Quiz could not load</h1><p>There was a problem loading this quiz. Please refresh and try again.</p><a class="take dark-btn" href="/">Choose another topic</a></section></main>`); return; }
  if(!questions.length){ layout(`<main class="quiz-shell"><a class="back" href="/">← All topics</a><section class="quiz-panel"><div class="empty-icon">🌸</div><div class="eyebrow dark">${esc(topic.name)}</div><h1>Quiz coming soon</h1><p>This topic is ready, but its questions have not been added yet.</p><a class="take dark-btn" href="/">Choose another topic</a></section></main>`); return; }
  renderQuestion();
}
function renderQuestion(){
  const q=normalizeQuestion(state.questions[state.currentIndex]), total=state.questions.length, pct=Math.round(((state.currentIndex+1)/total)*100);
  layout(`<main class="quiz-shell"><a class="back" href="/">← All topics</a><section class="quiz-panel"><div class="quiz-meta"><span>${esc(state.currentTopic.name).toUpperCase()}</span><span>${state.currentIndex+1} / ${total}</span></div><div class="progress-line"><i style="width:${pct}%"></i></div><h1>${esc(q.question_text)}</h1><div class="answers">${q.options.map((o,i)=>`<button class="answer ${state.selected===i?'selected':''}" data-i="${i}"><b>${String.fromCharCode(65+i)}</b><span>${esc(o)}</span></button>`).join('')}</div><div class="quiz-footer"><span class="hint">Choose one answer</span><button id="nextBtn" class="primary">${state.currentIndex===total-1?'Finish Quiz':'Next →'}</button></div></section></main>`);
  document.querySelectorAll('.answer').forEach(b=>b.addEventListener('click',()=>{state.selected=Number(b.dataset.i);renderQuestion();}));
  document.querySelector('#nextBtn').addEventListener('click',nextQuestion);
}
function nextQuestion(){
  if(state.selected===null){toast('Please choose an answer first.',true);return;}
  if(state.selected===normalizeQuestion(state.questions[state.currentIndex]).correct_index) state.score++;
  state.currentIndex++; state.selected=null;
  if(state.currentIndex<state.questions.length) renderQuestion(); else renderResult();
}
function renderResult(){
  const total=state.questions.length, pct=Math.round(state.score/total*100);
  layout(`<main class="quiz-shell"><section class="quiz-panel result"><div class="result-flower">🌸</div><div class="eyebrow dark">QUIZ COMPLETE</div><h1>${pct}%</h1><p>You got <strong>${state.score}</strong> out of <strong>${total}</strong> correct.</p><div class="result-actions"><a class="primary take" href="/quiz/${esc(state.currentTopic.slug)}">Try Again</a><a class="secondary take" href="/">Choose Another Topic</a></div></section></main>`);
}
function notFound(){ layout(`<main class="quiz-shell"><section class="quiz-panel result"><div class="eyebrow dark">404</div><h1>Page not found</h1><p>That quiz link does not exist.</p><a class="primary take" href="/">Back to quizzes</a></section></main>`); }

async function renderAdminLogin(){
  layout(`<main class="admin-shell"><section class="login-card"><div class="brand-mark big">N</div><div class="eyebrow dark">PRIVATE ADMIN</div><h1>Quiz Manager</h1><p>Sign in to manage topics and questions.</p><form id="loginForm"><label>Email<input id="email" type="email" required placeholder="your admin email" /></label><label>Password<input id="password" type="password" required placeholder="Your password" /></label><button class="primary full">Sign in</button></form><a class="back" href="/">← Back to quizzes</a></section></main>`);
  document.querySelector('#loginForm').addEventListener('submit', async e=>{e.preventDefault(); if(!supabaseConfigured){toast('Connect Supabase first.',true);return;} const {data,error}=await supabase.auth.signInWithPassword({email:document.querySelector('#email').value,password:document.querySelector('#password').value}); if(error){toast(error.message,true);return;} state.adminUser=data.user; await renderAdmin();});
}
async function renderAdmin(){
  const { data: sessionData } = await supabase.auth.getSession(); if(!sessionData.session){renderAdminLogin();return;} state.adminUser=sessionData.session.user;
  const {data: topics,error:tErr}=await supabase.from('topics').select('*').order('sort_order'); if(tErr){toast(tErr.message,true);return;} state.adminTopics=topics||[];
  const {data: qs,error:qErr}=await supabase.from('questions').select('*').order('sort_order'); if(qErr){toast(qErr.message,true);return;} state.adminQuestions=(qs||[]).map(normalizeQuestion);
  layout(`<main class="admin-shell wide"><div class="admin-title"><div><div class="eyebrow dark">PRIVATE ADMIN</div><h1>Quiz Manager <small class="version-tag">v1.3</small></h1><p>Manage the 40 topic links and every quiz question.</p></div><button id="newTopic" class="primary">+ New Topic</button></div><div class="admin-layout"><aside class="admin-topics"><h3>Topics</h3><div id="adminTopicList"></div></aside><section class="manager" id="manager"></section></div></main>`,true);
  drawAdminTopics(); selectAdminTopic(state.adminTopics[0]?.id);
  document.querySelector('#newTopic').addEventListener('click',()=>openTopicForm());
}
function drawAdminTopics(){ document.querySelector('#adminTopicList').innerHTML=state.adminTopics.map(t=>`<button class="admin-topic" data-id="${t.id}"><span>${esc(t.icon||'🌸')}</span><span>${esc(t.name)}</span><small>${state.adminQuestions.filter(q=>q.topic_id===t.id).length}</small></button>`).join(''); document.querySelectorAll('.admin-topic').forEach(b=>b.addEventListener('click',()=>selectAdminTopic(b.dataset.id))); }
function selectAdminTopic(id){ if(!id){openTopicForm();return;} const t=state.adminTopics.find(x=>x.id===id); if(!t)return; document.querySelectorAll('.admin-topic').forEach(b=>b.classList.toggle('active',b.dataset.id===String(id))); document.querySelector('#manager').innerHTML=`<div class="manager-head"><div><div class="topic-icon large">${esc(t.icon||'🌸')}</div><h2>${esc(t.name)}</h2><p>/${esc(t.slug)}</p></div><div class="manager-actions"><button id="editTopic" class="secondary">Edit Topic</button><button id="deleteTopic" class="danger">Delete</button></div></div><div class="question-head"><h3>Questions (${state.adminQuestions.filter(q=>q.topic_id===t.id).length})</h3><button id="newQuestion" class="primary">+ Add Question</button></div><div id="questionList"></div>`; drawQuestions(t.id); document.querySelector('#editTopic').addEventListener('click',()=>openTopicForm(t)); document.querySelector('#deleteTopic').addEventListener('click',()=>deleteTopic(t.id)); document.querySelector('#newQuestion').addEventListener('click',()=>openQuestionForm()); }
function drawQuestions(topicId){ const qs=state.adminQuestions.filter(q=>q.topic_id===topicId).map(normalizeQuestion).sort((a,b)=>a.sort_order-b.sort_order); document.querySelector('#questionList').innerHTML=qs.map((q,i)=>`<article class="q-card"><div class="q-num">Q${String(i+1).padStart(2,'0')}</div><div class="q-content"><h4>${esc(q.question_text)}</h4><div class="option-mini">${q.options.map((o,j)=>`<span class="${j===q.correct_index?'correct':''}">${String.fromCharCode(65+j)}. ${esc(o)}</span>`).join('')}</div></div><div class="q-actions"><button class="secondary editQ" data-id="${q.id}">Edit</button><button class="danger deleteQ" data-id="${q.id}">Delete</button></div></article>`).join('') || '<div class="empty">No questions yet. Add the first one.</div>'; document.querySelectorAll('.editQ').forEach(b=>b.addEventListener('click',()=>openQuestionForm(state.adminQuestions.find(q=>q.id===b.dataset.id)))); document.querySelectorAll('.deleteQ').forEach(b=>b.addEventListener('click',()=>deleteQuestion(b.dataset.id))); }
function modal(inner){ const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.innerHTML=`<div class="modal">${inner}</div>`; document.body.appendChild(wrap); wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove();}); return wrap; }
function openTopicForm(t=null){ const isEdit=!!t; const m=modal(`<div class="modal-head"><h2>${isEdit?'Edit Topic':'New Topic'}</h2><button class="close">×</button></div><form id="topicForm"><label>Topic name<input id="tName" required value="${esc(t?.name||'')}" placeholder="e.g. Numbers" /></label><label>URL slug<input id="tSlug" required value="${esc(t?.slug||'')}" placeholder="numbers" /></label><label>Subtitle<input id="tSub" value="${esc(t?.subtitle||'')}" placeholder="Romaji label or short description" /></label><label>Icon<input id="tIcon" value="${esc(t?.icon||'🌸')}" maxlength="4" /></label><label>Order<input id="tOrder" type="number" min="1" value="${t?.sort_order||state.adminTopics.length+1}" /></label><label class="check"><input id="tPublished" type="checkbox" ${t?.published!==false?'checked':''}/> Visible to students</label><button class="primary full">${isEdit?'Save Changes':'Create Topic'}</button></form>`); m.querySelector('.close').onclick=()=>m.remove(); m.querySelector('#tName').addEventListener('input',e=>{if(!isEdit)m.querySelector('#tSlug').value=slugify(e.target.value);}); m.querySelector('#topicForm').onsubmit=async e=>{e.preventDefault(); const payload={name:m.querySelector('#tName').value.trim(),slug:slugify(m.querySelector('#tSlug').value),subtitle:m.querySelector('#tSub').value.trim(),icon:m.querySelector('#tIcon').value.trim()||'🌸',sort_order:Number(m.querySelector('#tOrder').value),published:m.querySelector('#tPublished').checked}; const res=isEdit?await supabase.from('topics').update(payload).eq('id',t.id).select().single():await supabase.from('topics').insert(payload).select().single(); if(res.error){toast(res.error.code==='23505'?'That URL slug is already in use. Choose a different slug.':res.error.message,true);return;} if(!res.data){toast('Topic was not confirmed by the database. Please try again.',true);return;} m.remove(); await renderAdmin(); toast(isEdit?'Topic updated successfully':'Topic created successfully');}; }
function openQuestionForm(q=null){
  const isEdit=!!q;
  const topic=isEdit
    ? state.adminTopics.find(t=>t.id===q.topic_id)
    : state.adminTopics.find(t=>t.id===document.querySelector('.admin-topic.active')?.dataset.id);

  const opts=q?.options || [
    q?.option_a || '',
    q?.option_b || '',
    q?.option_c || '',
    q?.option_d || ''
  ];

  const m=modal(`
    <div class="modal-head">
      <h2>${isEdit?'Edit Question':'Add Question'}</h2>
      <button class="close" type="button">×</button>
    </div>

    <form id="qForm">

      <label>
        Topic
        <select id="qTopic">
          ${state.adminTopics.map(t=>`
            <option value="${t.id}" ${topic?.id===t.id?'selected':''}>
              ${esc(t.name)}
            </option>
          `).join('')}
        </select>
      </label>

      <label>
        Question text
        <textarea
          id="qText"
          required
          placeholder="Type the question in romaji / English as appropriate."
        >${esc(q?.question_text||'')}</textarea>
      </label>

      <div class="option-fields">
        ${opts.map((o,i)=>`
          <label>
            Option ${String.fromCharCode(65+i)}
            <input
              class="qOpt"
              value="${esc(o)}"
              required
            />
          </label>
        `).join('')}
      </div>

      <label>
        Correct answer
        <select id="qCorrect">
          ${[0,1,2,3].map(i=>`
            <option
              value="${i}"
              ${Number(q?.correct_index ?? q?.correct_option ?? 0)===i?'selected':''}
            >
              Option ${String.fromCharCode(65+i)}
            </option>
          `).join('')}
        </select>
      </label>

      <label>
        Order
        <input
          id="qOrder"
          type="number"
          min="1"
          value="${q?.sort_order || ((state.adminQuestions.filter(x=>x.topic_id===topic?.id).length||0)+1)}"
        />
      </label>

      <button class="primary full" type="submit">
        ${isEdit?'Save Question':'Add Question'}
      </button>

    </form>
  `);

  m.querySelector('.close').onclick=()=>m.remove();

  m.querySelector('#qForm').onsubmit=async e=>{
    e.preventDefault();

    const topicId=m.querySelector('#qTopic').value;

    const options=[
      ...m.querySelectorAll('.qOpt')
    ].map(x=>x.value.trim());

    if(!topicId){
      toast('Please select a topic.',true);
      return;
    }

    if(options.length!==4 || options.some(x=>!x)){
      toast('Please fill in all four answer options.',true);
      return;
    }

    const questionText=m.querySelector('#qText').value.trim();

    if(!questionText){
      toast('Please enter the question text.',true);
      return;
    }

    const correctIndex=Number(m.querySelector('#qCorrect').value);
    const sortOrder=Number(m.querySelector('#qOrder').value)||1;

    const payload={
      topic_id:topicId,
      question_text:questionText,
      options:options,
      correct_index:correctIndex,
      sort_order:sortOrder,

      /* Keep compatibility with the older database columns */
      option_a:options[0],
      option_b:options[1],
      option_c:options[2],
      option_d:options[3],
      correct_option:correctIndex
    };

    console.log('Saving question payload:',payload);

    let saveResult;

    if(isEdit){
      saveResult=await supabase
        .from('questions')
        .update(payload)
        .eq('id',q.id);
    }else{
      saveResult=await supabase
        .from('questions')
        .insert(payload);
    }

    console.log('Supabase question save result:',saveResult);

    if(saveResult.error){
      toast(
        `Could not save question: ${saveResult.error.message}`,
        true
      );

      console.error(
        'Question save error:',
        saveResult.error
      );

      return;
    }

    /*
      Do not use .single() here.
      The question has already been accepted by Supabase.
      Reload the admin data directly from the database.
    */

    m.remove();

    toast(
      isEdit
        ? 'Question updated successfully'
        : 'Question added successfully'
    );

    await renderAdmin();
  };
}
async function deleteTopic(id){ if(!confirm('Delete this topic and all its questions?'))return; const {error}=await supabase.from('topics').delete().eq('id',id); if(error){toast(error.message,true);return;} await renderAdmin(); toast('Topic deleted'); }
async function deleteQuestion(id){ if(!confirm('Delete this question?'))return; const {error}=await supabase.from('questions').delete().eq('id',id); if(error){toast(error.message,true);return;} await renderAdmin(); toast('Question deleted'); }

async function router(){
  if(path()==='/admin' || path().startsWith('/admin/')){ if(!supabaseConfigured){layout(`<main class="admin-shell"><section class="login-card"><div class="brand-mark big">N</div><div class="eyebrow dark">SETUP NEEDED</div><h1>Connect Supabase</h1><p>This admin area is ready, but the production database connection has not been configured yet.</p><a class="back" href="/">← Back to quizzes</a></section></main>`);return;} await renderAdmin(); return; }
  await loadTopics(); if(path().startsWith('/quiz/')){await quiz(decodeURIComponent(path().split('/')[2]||''));return;} home();
}
router();

