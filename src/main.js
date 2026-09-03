import { supabase } from './supabase.js';

const APP_VERSION = '1.3';

const state = {
  topics: [],
  questions: [],
  currentTopic: null,
  currentQuestionIndex: 0,
  selectedAnswer: null,
  adminUser: null
};


/* =========================================================
   BASIC HELPERS
   ========================================================= */

const app = document.querySelector('#app');

function esc(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function toast(message,error=false){
  let el=document.querySelector('.toast');

  if(!el){
    el=document.createElement('div');
    el.className='toast';
    document.body.appendChild(el);
  }

  el.textContent=message;
  el.className=`toast ${error?'error':''} show`;

  clearTimeout(window.__toastTimer);

  window.__toastTimer=setTimeout(()=>{
    el.classList.remove('show');
  },3000);
}


/* =========================================================
   DARK MODE
   ========================================================= */

function getSavedTheme(){
  try{
    return localStorage.getItem('nihongo_theme');
  }catch{
    return null;
  }
}

function getSystemTheme(){
  return window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
}

function getCurrentTheme(){
  return document.documentElement.dataset.theme || getSystemTheme();
}

function applyTheme(theme){
  const finalTheme =
    theme === 'dark' || theme === 'light'
      ? theme
      : getSystemTheme();

  document.documentElement.dataset.theme=finalTheme;

  try{
    if(theme === 'dark' || theme === 'light'){
      localStorage.setItem('nihongo_theme',theme);
    }else{
      localStorage.removeItem('nihongo_theme');
    }
  }catch{}

  updateThemeToggle();
}

function initializeTheme(){
  const saved=getSavedTheme();

  if(saved === 'dark' || saved === 'light'){
    document.documentElement.dataset.theme=saved;
  }else{
    document.documentElement.dataset.theme=getSystemTheme();
  }

  if(window.matchMedia){
    const media=window.matchMedia('(prefers-color-scheme: dark)');

    const systemChanged=()=>{
      const savedTheme=getSavedTheme();

      if(savedTheme !== 'dark' && savedTheme !== 'light'){
        document.documentElement.dataset.theme=
          media.matches ? 'dark' : 'light';

        updateThemeToggle();
      }
    };

    if(media.addEventListener){
      media.addEventListener('change',systemChanged);
    }else if(media.addListener){
      media.addListener(systemChanged);
    }
  }
}

function updateThemeToggle(){
  const button=document.querySelector('#themeToggle');

  if(!button){
    return;
  }

  const current=getCurrentTheme();
  const isDark=current === 'dark';

  const stateEl=button.querySelector('.theme-toggle-state');

  if(stateEl){
    stateEl.textContent=isDark ? 'Dark' : 'Light';
  }

  button.setAttribute(
    'aria-label',
    isDark ? 'Switch to light mode' : 'Switch to dark mode'
  );
}

function toggleTheme(){
  const current=getCurrentTheme();

  applyTheme(
    current === 'dark'
      ? 'light'
      : 'dark'
  );
}


/* =========================================================
   HEADER / MENU
   ========================================================= */

function layout(content,admin=false){
  const menuItems=admin
    ? `
      <a href="/">Quiz Home</a>
      <button id="menuLogout" type="button">Log out</button>
    `
    : `
      <a href="/">Quiz Home</a>
      <a href="/admin">Admin</a>
    `;

  app.innerHTML=`
    <header class="site-header">
      <a class="brand" href="/">
        <span class="brand-mark">桜</span>
        <span>NIHONGO QUEST</span>
      </a>

      <div class="header-actions">
        <button
          class="ghost"
          id="menuBtn"
          type="button"
          aria-label="Open menu"
          aria-expanded="false"
        >
          ☰
        </button>
      </div>

      <nav class="site-menu" id="siteMenu">
        ${menuItems}

        <button
          id="themeToggle"
          class="theme-toggle"
          type="button"
          aria-label="Switch theme"
        >
          <span class="theme-toggle-label">
            <span>◐</span>
            <span>Dark mode</span>
          </span>

          <span class="theme-toggle-state">Dark</span>
        </button>
      </nav>
    </header>

    <main>
      ${content}
    </main>

    <div class="toast"></div>
  `;

  const menuBtn=document.querySelector('#menuBtn');
  const menu=document.querySelector('#siteMenu');

  menuBtn.addEventListener('click',()=>{
    const open=document.body.classList.toggle('menu-open');

    menuBtn.setAttribute(
      'aria-expanded',
      open ? 'true' : 'false'
    );

    menuBtn.textContent=open ? '×' : '☰';
  });

  document.addEventListener('click',function closeMenu(event){
    if(
      document.body.classList.contains('menu-open') &&
      !event.target.closest('.site-menu') &&
      !event.target.closest('#menuBtn')
    ){
      document.body.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded','false');
      menuBtn.textContent='☰';
    }
  },{once:true});

  document.querySelector('#themeToggle')
    .addEventListener('click',()=>{
      toggleTheme();
    });

  const logout=document.querySelector('#menuLogout');

  if(logout){
    logout.addEventListener('click',async()=>{
      const {error}=await supabase.auth.signOut();

      if(error){
        toast(error.message,true);
        return;
      }

      state.adminUser=null;

      await renderAdminLogin();
    });
  }

  updateThemeToggle();
}


/* =========================================================
   DATA
   ========================================================= */

async function loadTopics(){
  const {data,error}=await supabase
    .from('topics')
    .select('*')
    .order('sort_order',{ascending:true});

  if(error){
    toast(error.message,true);
    return [];
  }

  return data || [];
}

async function loadQuestions(topicId){
  const {data,error}=await supabase
    .from('questions')
    .select('*')
    .eq('topic_id',topicId)
    .order('sort_order',{ascending:true});

  if(error){
    toast(error.message,true);
    return [];
  }

  return data || [];
}


/* =========================================================
   HOME PAGE
   ========================================================= */

async function renderHome(){
  const topics=await loadTopics();

  state.topics=topics.filter(t=>t.published !== false);

  layout(`
    <section class="shell">

      <div class="hero">
        <div class="hero-copy">
          <div class="eyebrow">
            JAPANESE QUIZ TRAINING
          </div>

          <h1>
            Learn Japanese.<br>
            <em>One quiz at a time.</em>
          </h1>

          <p>
            Choose a topic and test your Japanese knowledge
            with short, focused quizzes.
          </p>
        </div>

        <div class="hero-art" aria-hidden="true">
          <span>🌸</span>
          <span>✦</span>
        </div>
      </div>

      <div class="topic-head">
        <div>
          <div class="eyebrow dark">QUIZ LIBRARY</div>
          <h2>Choose a topic</h2>
        </div>

        <input
          class="search"
          id="topicSearch"
          type="search"
          placeholder="Search topics..."
          autocomplete="off"
        >
      </div>

      <div class="topic-grid" id="topicGrid">
        ${topicCards(state.topics)}
      </div>

    </section>
  `);

  document.querySelector('#topicSearch')
    .addEventListener('input',(event)=>{
      const term=event.target.value.toLowerCase().trim();

      const filtered=state.topics.filter(topic=>
        `${topic.name} ${topic.subtitle || ''}`
          .toLowerCase()
          .includes(term)
      );

      document.querySelector('#topicGrid').innerHTML=
        topicCards(filtered);
    });
}

function topicCards(topics){
  if(!topics.length){
    return `
      <div class="empty">
        No topics found.
      </div>
    `;
  }

  return topics.map((topic,index)=>`
    <article class="topic-card">
      <div class="topic-top">
        <span class="topic-number">
          ${String(index+1).padStart(2,'0')}
        </span>

        <span class="topic-icon">
          ${esc(topic.icon || '🌸')}
        </span>
      </div>

      <h3>${esc(topic.name)}</h3>

      <p>
        ${esc(topic.subtitle || 'Japanese quiz practice')}
      </p>

      <a
        class="take"
        href="/quiz/${encodeURIComponent(topic.slug)}"
      >
        <span>Start quiz</span>
        <span>→</span>
      </a>
    </article>
  `).join('');
}


/* =========================================================
   QUIZ PAGE
   ========================================================= */

async function renderQuiz(slug){
  const topics=await loadTopics();

  const topic=topics.find(
    t=>t.slug === slug && t.published !== false
  );

  if(!topic){
    layout(`
      <section class="quiz-shell">
        <div class="quiz-panel result">
          <div class="result-flower">🌸</div>
          <h1>404</h1>
          <p>Quiz topic not found.</p>
          <div class="result-actions">
            <a class="take" href="/">Back to quizzes</a>
          </div>
        </div>
      </section>
    `);

    return;
  }

  const questions=await loadQuestions(topic.id);

  state.currentTopic=topic;
  state.questions=questions;
  state.currentQuestionIndex=0;
  state.selectedAnswer=null;

  if(!questions.length){
    layout(`
      <section class="quiz-shell">
        <a class="back" href="/">← Back to quizzes</a>

        <div class="quiz-panel result">
          <div class="result-flower">
            ${esc(topic.icon || '🌸')}
          </div>

          <h2>${esc(topic.name)}</h2>

          <p>
            This quiz does not have any questions yet.
          </p>
        </div>
      </section>
    `);

    return;
  }

  renderQuestion();
}

function renderQuestion(){
  const topic=state.currentTopic;
  const questions=state.questions;
  const index=state.currentQuestionIndex;
  const question=questions[index];

  state.selectedAnswer=null;

  const options=Array.isArray(question.options)
    ? question.options
    : [
        question.option_a,
        question.option_b,
        question.option_c,
        question.option_d
      ].filter(v=>v !== null && v !== undefined && v !== '');

  layout(`
    <section class="quiz-shell">

      <a class="back" href="/">
        ← Back to quizzes
      </a>

      <div class="quiz-panel">

        <div class="quiz-meta">
          <span>${esc(topic.name)}</span>
          <span>${index+1} / ${questions.length}</span>
        </div>

        <div class="progress-line">
          <i style="width:${((index+1)/questions.length)*100}%"></i>
        </div>

        <h1>
          ${esc(question.question_text || question.question || '')}
        </h1>

        <div class="answers">
          ${options.map((option,i)=>`
            <button
              class="answer"
              type="button"
              data-answer="${i}"
            >
              <b>${String.fromCharCode(65+i)}</b>
              <span>${esc(option)}</span>
            </button>
          `).join('')}
        </div>

        <div class="quiz-footer">
          <span class="hint">
            Choose one answer
          </span>

          <button
            class="primary"
            id="nextQuestion"
            type="button"
            disabled
          >
            ${index === questions.length-1
              ? 'Finish quiz'
              : 'Next question'}
          </button>
        </div>

      </div>
    </section>
  `);

  document.querySelectorAll('.answer')
    .forEach(button=>{
      button.addEventListener('click',()=>{
        document.querySelectorAll('.answer')
          .forEach(item=>item.classList.remove('selected'));

        button.classList.add('selected');

        state.selectedAnswer=
          Number(button.dataset.answer);

        document.querySelector('#nextQuestion')
          .disabled=false;
      });
    });

  document.querySelector('#nextQuestion')
    .addEventListener('click',()=>{
      if(state.selectedAnswer === null){
        return;
      }

      if(
        state.currentQuestionIndex ===
        state.questions.length-1
      ){
        renderResult();
      }else{
        state.currentQuestionIndex++;
        renderQuestion();
      }
    });
}

function renderResult(){
  layout(`
    <section class="quiz-shell">

      <div class="quiz-panel result">

        <div class="result-flower">🌸</div>

        <h1>Done!</h1>

        <p>
          You completed the quiz.
        </p>

        <div class="result-actions">
          <button
            class="take"
            id="retryQuiz"
            type="button"
          >
            Try again
          </button>

          <a
            class="secondary"
            href="/"
          >
            Back to quizzes
          </a>
        </div>

      </div>

    </section>
  `);

  document.querySelector('#retryQuiz')
    .addEventListener('click',()=>{
      state.currentQuestionIndex=0;
      renderQuestion();
    });
}


/* =========================================================
   ADMIN AUTH
   ========================================================= */

async function checkAdmin(){
  const {
    data:{
      session
    }
  }=await supabase.auth.getSession();

  if(!session){
    state.adminUser=null;
    return false;
  }

  const {
    data,
    error
  }=await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id',session.user.id)
    .maybeSingle();

  if(error || !data){
    state.adminUser=null;
    return false;
  }

  state.adminUser=session.user;

  return true;
}

async function renderAdminLogin(){
  layout(`
    <section class="admin-shell">

      <div class="login-card">

        <div class="brand-mark big">
          桜
        </div>

        <div class="eyebrow dark">
          PRIVATE ADMIN
        </div>

        <h1>Admin login</h1>

        <p>
          Sign in to manage quiz topics and questions.
        </p>

        <form id="adminLoginForm">

          <label>
            Email

            <input
              id="adminEmail"
              type="email"
              required
              autocomplete="email"
            >
          </label>

          <label>
            Password

            <input
              id="adminPassword"
              type="password"
              required
              autocomplete="current-password"
            >
          </label>

          <button
            class="primary full"
            type="submit"
          >
            Sign in
          </button>

        </form>

      </div>

    </section>
  `);

  document.querySelector('#adminLoginForm')
    .addEventListener('submit',async(event)=>{
      event.preventDefault();

      const email=
        document.querySelector('#adminEmail').value.trim();

      const password=
        document.querySelector('#adminPassword').value;

      const {
        data,
        error
      }=await supabase.auth.signInWithPassword({
        email,
        password
      });

      if(error){
        toast(error.message,true);
        return;
      }

      const {
        data:adminRecord
      }=await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id',data.user.id)
        .maybeSingle();

      if(!adminRecord){
        await supabase.auth.signOut();
        toast('This account is not an admin.',true);
        return;
      }

      state.adminUser=data.user;

      await renderAdmin();
    });
}


/* =========================================================
   ADMIN HOME
   ========================================================= */

async function renderAdmin(){
  const isAdmin=await checkAdmin();

  if(!isAdmin){
    await renderAdminLogin();
    return;
  }

  state.topics=await loadTopics();

  layout(`
    <section class="admin-shell wide">

      <div class="admin-title">

        <div>
          <div class="eyebrow dark">
            CONTENT MANAGEMENT
          </div>

          <h1>Admin</h1>

          <p>
            Manage your quiz topics and questions.
          </p>
        </div>

        <button
          class="primary"
          id="newTopic"
          type="button"
        >
          + New topic
        </button>

      </div>

      <div class="admin-layout">

        <aside class="admin-topics">

          <h3>Topics</h3>

          <div id="adminTopicList">
            ${adminTopicList(state.topics)}
          </div>

        </aside>

        <section
          class="manager"
          id="topicManager"
        >
          <div class="empty">
            Select a topic to manage it.
          </div>
        </section>

      </div>

    </section>
  `,true);

  document.querySelector('#newTopic')
    .addEventListener('click',()=>{
      openTopicForm();
    });

  document.querySelectorAll('.admin-topic')
    .forEach(button=>{
      button.addEventListener('click',()=>{
        const topicId=button.dataset.id;

        const topic=state.topics.find(
          item=>String(item.id) === String(topicId)
        );

        if(topic){
          selectAdminTopic(topic);
        }
      });
    });
}

function adminTopicList(topics){
  if(!topics.length){
    return `
      <div class="empty">
        No topics yet.
      </div>
    `;
  }

  return topics.map((topic,index)=>`
    <button
      class="admin-topic"
      type="button"
      data-id="${esc(topic.id)}"
    >
      <span>${esc(topic.icon || '🌸')}</span>

      <span>${esc(topic.name)}</span>

      <small>
        ${index+1}
      </small>
    </button>
  `).join('');
}


/* =========================================================
   ADMIN TOPIC MANAGER
   ========================================================= */

async function selectAdminTopic(topic){
  state.currentTopic=topic;

  state.questions=await loadQuestions(topic.id);

  const manager=document.querySelector('#topicManager');

  if(!manager){
    return;
  }

  document.querySelectorAll('.admin-topic')
    .forEach(button=>{
      button.classList.toggle(
        'active',
        String(button.dataset.id) === String(topic.id)
      );
    });

  manager.innerHTML=`
    <div class="manager-head">

      <div>
        <div class="topic-icon large">
          ${esc(topic.icon || '🌸')}
        </div>

        <h2>${esc(topic.name)}</h2>

        <p>
          ${esc(topic.subtitle || '')}
        </p>
      </div>

      <div class="manager-actions">

        <button
          class="secondary"
          id="editTopic"
          type="button"
        >
          Edit topic
        </button>

        <button
          class="danger"
          id="deleteTopic"
          type="button"
        >
          Delete
        </button>

      </div>

    </div>

    <div class="question-head">

      <h3>
        Questions (${state.questions.length})
      </h3>

      <button
        class="primary"
        id="newQuestion"
        type="button"
      >
        + Add question
      </button>

    </div>

    <div id="questionList">
      ${questionList(state.questions)}
    </div>
  `;

  document.querySelector('#editTopic')
    .addEventListener('click',()=>{
      openTopicForm(topic);
    });

  document.querySelector('#deleteTopic')
    .addEventListener('click',()=>{
      deleteTopic(topic);
    });

  /*
   * IMPORTANT:
   * Do NOT pass the topic into openQuestionForm().
   * Passing topic here was the previous bug that caused
   * Add Question to behave like Edit Question.
   */
  document.querySelector('#newQuestion')
    .addEventListener('click',()=>{
      openQuestionForm();
    });

  document.querySelectorAll('[data-edit-question]')
    .forEach(button=>{
      button.addEventListener('click',()=>{
        const questionId=button.dataset.editQuestion;

        const question=state.questions.find(
          item=>String(item.id) === String(questionId)
        );

        if(question){
          openQuestionForm(question);
        }
      });
    });

  document.querySelectorAll('[data-delete-question]')
    .forEach(button=>{
      button.addEventListener('click',()=>{
        const questionId=button.dataset.deleteQuestion;

        const question=state.questions.find(
          item=>String(item.id) === String(questionId)
        );

        if(question){
          deleteQuestion(question);
        }
      });
    });
}

function questionList(questions){
  if(!questions.length){
    return `
      <div class="empty">
        No questions yet. Add your first question.
      </div>
    `;
  }

  return questions.map((question,index)=>{
    const options=Array.isArray(question.options)
      ? question.options
      : [
          question.option_a,
          question.option_b,
          question.option_c,
          question.option_d
        ].filter(v=>v !== null && v !== undefined && v !== '');

    let correctIndex=Number(question.correct_index);

    if(Number.isNaN(correctIndex)){
      const letters=['A','B','C','D'];

      correctIndex=
        letters.indexOf(question.correct_option);
    }

    return `
      <article class="q-card">

        <div class="q-num">
          Q${index+1}
        </div>

        <div class="q-content">

          <h4>
            ${esc(
              question.question_text ||
              question.question ||
              ''
            )}
          </h4>

          <div class="option-mini">

            ${options.map((option,i)=>`
              <span class="${i===correctIndex?'correct':''}">
                ${String.fromCharCode(65+i)}.
                ${esc(option)}
              </span>
            `).join('')}

          </div>

        </div>

        <div class="q-actions">

          <button
            class="secondary"
            type="button"
            data-edit-question="${esc(question.id)}"
          >
            Edit
          </button>

          <button
            class="danger"
            type="button"
            data-delete-question="${esc(question.id)}"
          >
            Delete
          </button>

        </div>

      </article>
    `;
  }).join('');
}


/* =========================================================
   TOPIC FORM
   ========================================================= */

function openTopicForm(topic=null){
  const isEdit=!!topic;

  const modal=document.createElement('div');

  modal.className='modal-backdrop';

  modal.innerHTML=`
    <div class="modal">

      <div class="modal-head">

        <h2>
          ${isEdit ? 'Edit topic' : 'New topic'}
        </h2>

        <button
          class="close"
          type="button"
          id="closeModal"
        >
          ×
        </button>

      </div>

      <form id="topicForm">

        <label>
          Topic name

          <input
            id="topicName"
            value="${esc(topic?.name || '')}"
            required
          >
        </label>

        <label>
          URL slug

          <input
            id="topicSlug"
            value="${esc(topic?.slug || '')}"
            placeholder="greetings"
            required
          >
        </label>

        <label>
          Subtitle

          <input
            id="topicSubtitle"
            value="${esc(topic?.subtitle || '')}"
          >
        </label>

        <label>
          Icon

          <input
            id="topicIcon"
            value="${esc(topic?.icon || '🌸')}"
          >
        </label>

        <label>
          Sort order

          <input
            id="topicSort"
            type="number"
            value="${esc(topic?.sort_order ?? state.topics.length+1)}"
          >
        </label>

        <label class="check">
          <input
            id="topicPublished"
            type="checkbox"
            ${topic?.published !== false ? 'checked' : ''}
          >

          <span>
            Published
          </span>
        </label>

        <button
          class="primary"
          type="submit"
        >
          ${isEdit ? 'Save topic' : 'Create topic'}
        </button>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  document.querySelector('#closeModal')
    .addEventListener('click',()=>{
      modal.remove();
    });

  document.querySelector('#topicForm')
    .addEventListener('submit',async(event)=>{
      event.preventDefault();

      const payload={
        name:document.querySelector('#topicName').value.trim(),
        slug:document.querySelector('#topicSlug').value.trim(),
        subtitle:document.querySelector('#topicSubtitle').value.trim(),
        icon:document.querySelector('#topicIcon').value.trim(),
        sort_order:Number(
          document.querySelector('#topicSort').value
        ) || 0,
        published:
          document.querySelector('#topicPublished').checked
      };

      const result=isEdit
        ? await supabase
            .from('topics')
            .update(payload)
            .eq('id',topic.id)
        : await supabase
            .from('topics')
            .insert(payload);

      if(result.error){
        toast(
          `Could not save topic: ${result.error.message}`,
          true
        );
        return;
      }

      modal.remove();

      toast(
        isEdit
          ? 'Topic updated successfully.'
          : 'Topic created successfully.'
      );

      await renderAdmin();
    });
}


/* =========================================================
   QUESTION FORM
   ========================================================= */

function openQuestionForm(q=null){
  const isEdit=!!q;

  const options=Array.isArray(q?.options)
    ? q.options
    : [
        q?.option_a,
        q?.option_b,
        q?.option_c,
        q?.option_d
      ].filter(v=>v !== null && v !== undefined && v !== '');

  while(options.length<4){
    options.push('');
  }

  let correctIndex=Number(q?.correct_index);

  if(Number.isNaN(correctIndex)){
    const letters=['A','B','C','D'];

    correctIndex=
      letters.indexOf(q?.correct_option);

    if(correctIndex<0){
      correctIndex=0;
    }
  }

  const modal=document.createElement('div');

  modal.className='modal-backdrop';

  modal.innerHTML=`
    <div class="modal">

      <div class="modal-head">

        <h2>
          ${isEdit ? 'Edit question' : 'Add question'}
        </h2>

        <button
          class="close"
          type="button"
          id="closeModal"
        >
          ×
        </button>

      </div>

      <form id="questionForm">

        <label>
          Question

          <textarea
            id="questionText"
            required
            placeholder="Type the question here..."
          >${esc(
            q?.question_text ||
            q?.question ||
            ''
          )}</textarea>
        </label>

        <div class="option-fields">

          <label>
            Option A

            <input
              id="option0"
              value="${esc(options[0])}"
              required
            >
          </label>

          <label>
            Option B

            <input
              id="option1"
              value="${esc(options[1])}"
              required
            >
          </label>

          <label>
            Option C

            <input
              id="option2"
              value="${esc(options[2])}"
              required
            >
          </label>

          <label>
            Option D

            <input
              id="option3"
              value="${esc(options[3])}"
              required
            >
          </label>

        </div>

        <label>
          Correct answer

          <select id="correctIndex">

            <option value="0" ${correctIndex===0?'selected':''}>
              A
            </option>

            <option value="1" ${correctIndex===1?'selected':''}>
              B
            </option>

            <option value="2" ${correctIndex===2?'selected':''}>
              C
            </option>

            <option value="3" ${correctIndex===3?'selected':''}>
              D
            </option>

          </select>
        </label>

        <label>
          Sort order

          <input
            id="questionSort"
            type="number"
            value="${esc(q?.sort_order ?? state.questions.length+1)}"
          >
        </label>

        <button
          class="primary"
          type="submit"
        >
          ${isEdit ? 'Save question' : 'Add question'}
        </button>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  document.querySelector('#closeModal')
    .addEventListener('click',()=>{
      modal.remove();
    });

  document.querySelector('#questionForm')
    .addEventListener('submit',async(event)=>{
      event.preventDefault();

      const questionText=
        document.querySelector('#questionText')
          .value
          .trim();

      const questionOptions=[
        document.querySelector('#option0').value.trim(),
        document.querySelector('#option1').value.trim(),
        document.querySelector('#option2').value.trim(),
        document.querySelector('#option3').value.trim()
      ];

      const correctIndexValue=
        Number(
          document.querySelector('#correctIndex').value
        );

      const sortOrder=
        Number(
          document.querySelector('#questionSort').value
        ) || 0;

      const payload={
        topic_id:state.currentTopic.id,
        question_text:questionText,
        options:questionOptions,
        correct_index:correctIndexValue,
        sort_order:sortOrder
      };

      /*
       * IMPORTANT:
       * This is the working insert/update logic.
       * Do not add .select().single() here.
       */
      const res=isEdit
        ? await supabase
            .from('questions')
            .update(payload)
            .eq('id',q.id)
        : await supabase
            .from('questions')
            .insert(payload);

      if(res.error){
        toast(
          `Could not save question: ${res.error.message}`,
          true
        );
        return;
      }

      modal.remove();

      toast(
        isEdit
          ? 'Question updated successfully.'
          : 'Question added successfully.'
      );

      await selectAdminTopic(state.currentTopic);
    });
}


/* =========================================================
   DELETE TOPIC
   ========================================================= */

async function deleteTopic(topic){
  const confirmed=window.confirm(
    `Delete "${topic.name}" and all of its questions?`
  );

  if(!confirmed){
    return;
  }

  const {error}=await supabase
    .from('topics')
    .delete()
    .eq('id',topic.id);

  if(error){
    toast(
      `Could not delete topic: ${error.message}`,
      true
    );
    return;
  }

  toast('Topic deleted.');

  await renderAdmin();
}


/* =========================================================
   DELETE QUESTION
   ========================================================= */

async function deleteQuestion(question){
  const confirmed=window.confirm(
    'Delete this question?'
  );

  if(!confirmed){
    return;
  }

  const {error}=await supabase
    .from('questions')
    .delete()
    .eq('id',question.id);

  if(error){
    toast(
      `Could not delete question: ${error.message}`,
      true
    );
    return;
  }

  toast('Question deleted.');

  await selectAdminTopic(state.currentTopic);
}


/* =========================================================
   ROUTING
   ========================================================= */

function getRoute(){
  const path=
    window.location.pathname
      .replace(/\/+/g,'/')
      .replace(/\/$/,'');

  if(path === '' || path === '/'){
    return {
      type:'home'
    };
  }

  if(path === '/admin'){
    return {
      type:'admin'
    };
  }

  if(path.startsWith('/quiz/')){
    return {
      type:'quiz',
      slug:decodeURIComponent(
        path.slice('/quiz/'.length)
      )
    };
  }

  return {
    type:'home'
  };
}


/* =========================================================
   APP START
   ========================================================= */

initializeTheme();

async function start(){
  const route=getRoute();

  if(route.type === 'home'){
    await renderHome();
    return;
  }

  if(route.type === 'quiz'){
    await renderQuiz(route.slug);
    return;
  }

  if(route.type === 'admin'){
    const isAdmin=await checkAdmin();

    if(isAdmin){
      await renderAdmin();
    }else{
      await renderAdminLogin();
    }

    return;
  }
}

start();


/* =========================================================
   AUTH STATE
   ========================================================= */

supabase.auth.onAuthStateChange((event,session)=>{
  if(event === 'SIGNED_OUT'){
    state.adminUser=null;
  }

  if(event === 'SIGNED_IN' && session){
    state.adminUser=session.user;
  }
});
