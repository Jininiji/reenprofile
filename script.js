const enter = document.querySelector('.enter-button');
const filters = document.querySelectorAll('[data-filter]');

if (enter) {
  enter.addEventListener('click', () => window.location.assign('portfolio.html'));
}

const rain = document.querySelector('.rain');
if (rain && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const drops = document.createDocumentFragment();
  for (let index = 0; index < 42; index += 1) {
    const drop = document.createElement('i');
    drop.style.setProperty('--left', `${Math.random() * 100}%`);
    drop.style.setProperty('--delay', `${Math.random() * -16}s`);
    drop.style.setProperty('--duration', `${11 + Math.random() * 10}s`);
    drop.style.setProperty('--length', `${72 + Math.random() * 136}px`);
    drop.style.setProperty('--opacity', `${0.12 + Math.random() * 0.2}`);
    drops.appendChild(drop);
  }
  rain.appendChild(drops);
}

const supabaseClient = window.reenSupabase;
const currentPage = document.querySelector('[data-page]');

function applyContent(content) {
  Object.entries(content).forEach(([field, value]) => {
    const target = document.querySelector(`[data-content="${field}"]`);
    if (!target) return;
    if (target.tagName === 'A') {
      target.href = value;
      target.textContent = value;
      return;
    }
    target.textContent = value;
  });
}

async function loadPageContent() {
  if (!supabaseClient || !currentPage) return;
  const { data, error } = await supabaseClient
    .from('site_content')
    .select('content')
    .eq('page', currentPage.dataset.page)
    .maybeSingle();
  if (!error && data?.content) applyContent(data.content);
}

loadPageContent();

const adminTrigger = document.querySelector('.admin-trigger');
if (adminTrigger && supabaseClient) {
  const editorFields = {
    reen: [['identity', 'Reen / 오시마크'], ['mood', '한 줄 문구'], ['genre', '방송 장르'], ['reel_url', '릴스타 URL']],
    rain: [['body', 'RAIN 문구']],
    live: [['body', 'LIVE 문구']],
    actor: [['body', 'ACTOR 문구']],
  };
  const modal = document.createElement('div');
  modal.className = 'admin-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="admin-modal__backdrop" data-admin-close></div>
    <section class="admin-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="admin-title">
      <button class="admin-modal__close" type="button" aria-label="로그인 창 닫기" data-admin-close>×</button>
      <p class="admin-modal__eyebrow">REEN — ADMIN</p>
      <h2 id="admin-title">Welcome back.</h2>
      <form class="admin-form">
        <label for="admin-email">EMAIL</label>
        <input id="admin-email" name="email" type="email" autocomplete="email" required />
        <label for="admin-password">PASSWORD</label>
        <input id="admin-password" name="password" type="password" autocomplete="current-password" required />
        <button type="submit">LOG IN ↗</button>
        <p class="admin-form__note" aria-live="polite"></p>
      </form>
      <section class="admin-editor" hidden>
        <p class="admin-editor__intro">수정 후 SAVE CHANGES를 누르세요.</p>
        <form class="admin-editor__form"></form>
        <button class="admin-signout" type="button">SIGN OUT</button>
      </section>
    </section>`;
  document.body.appendChild(modal);

  const password = modal.querySelector('#admin-password');
  const email = modal.querySelector('#admin-email');
  const loginForm = modal.querySelector('.admin-form');
  const editor = modal.querySelector('.admin-editor');
  const editorForm = modal.querySelector('.admin-editor__form');
  const note = modal.querySelector('.admin-form__note');

  const showEditor = async () => {
    const { data, error } = await supabaseClient.from('site_content').select('page, content');
    if (error) {
      note.textContent = '문구 저장소를 아직 찾을 수 없습니다. 설정을 확인해 주세요.';
      return;
    }
    const records = Object.fromEntries(data.map((row) => [row.page, row.content]));
    editorForm.replaceChildren();
    Object.entries(editorFields).forEach(([page, fields]) => {
      const group = document.createElement('fieldset');
      const title = document.createElement('legend');
      title.textContent = page.toUpperCase();
      group.appendChild(title);
      fields.forEach(([field, label]) => {
        const fieldLabel = document.createElement('label');
        const textarea = document.createElement('textarea');
        fieldLabel.textContent = label;
        textarea.value = records[page]?.[field] ?? '';
        textarea.dataset.editorPage = page;
        textarea.dataset.editorField = field;
        fieldLabel.appendChild(textarea);
        group.appendChild(fieldLabel);
      });
      editorForm.appendChild(group);
    });
    const save = document.createElement('button');
    save.type = 'submit';
    save.textContent = 'SAVE CHANGES ↗';
    editorForm.appendChild(save);
    loginForm.hidden = true;
    editor.hidden = false;
  };

  const close = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    adminTrigger.focus();
  };
  adminTrigger.addEventListener('click', () => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data.session) showEditor();
      else email.focus();
    });
  });
  modal.querySelectorAll('[data-admin-close]').forEach((button) => button.addEventListener('click', close));
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    note.textContent = '로그인 중…';
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) {
      note.textContent = '이메일 또는 비밀번호를 확인해 주세요.';
      return;
    }
    note.textContent = '';
    await showEditor();
  });
  editorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = {};
    editorForm.querySelectorAll('textarea').forEach((textarea) => {
      const page = textarea.dataset.editorPage;
      values[page] ??= {};
      values[page][textarea.dataset.editorField] = textarea.value.trim();
    });
    const updates = await Promise.all(Object.entries(values).map(([page, content]) =>
      supabaseClient.from('site_content').update({ content, updated_at: new Date().toISOString() }).eq('page', page),
    ));
    if (updates.some(({ error }) => error)) {
      alert('저장하지 못했습니다. 관리자 권한과 설정을 확인해 주세요.');
      return;
    }
    if (currentPage && values[currentPage.dataset.page]) applyContent(values[currentPage.dataset.page]);
    alert('저장했습니다.');
  });
  modal.querySelector('.admin-signout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    editor.hidden = true;
    loginForm.hidden = false;
    password.value = '';
    email.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
}

filters.forEach((filter) => {
  filter.addEventListener('click', () => {
    filters.forEach((item) => item.classList.toggle('is-selected', item === filter));
  });
});
