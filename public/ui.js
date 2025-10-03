async function api(path, opts={}){
  const res = await fetch(path, { credentials: 'same-origin', ...opts });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

function renderList(container, items, render){
  container.innerHTML = items.map(render).join('') || '<div class="muted">موردی وجود ندارد</div>';
}

let authUser = null;

async function refreshAuth(){
  const me = await api('/api/me');
  authUser = me.user;
  document.getElementById('btnSignOut').style.display = authUser ? '' : 'none';
  document.getElementById('btnSignIn').style.display = authUser ? 'none' : '';
  document.getElementById('btnSignUp').style.display = authUser ? 'none' : '';
  document.getElementById('userArea').textContent = authUser ? `${authUser.username} (${authUser.role})` : 'میهمان';
  await refreshData();
}

async function signIn(){
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  await api('/api/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })});
  await refreshAuth();
}
async function signUp(){
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const username = email.split('@')[0];
  await api('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, username })});
  await refreshAuth();
}
async function signOut(){
  await api('/api/signout', { method: 'POST'});
  await refreshAuth();
}

function toFormData(form){
  const data = new FormData(form);
  return data;
}

async function submitReport(e){
  e.preventDefault();
  const data = toFormData(e.target);
  const res = await fetch('/api/reports', { method: 'POST', body: data, credentials: 'same-origin' });
  if(!res.ok) return alert('خطا در ارسال گزارش');
  e.target.reset();
  await refreshData();
}

async function submitAsk(e){
  e.preventDefault();
  const data = toFormData(e.target);
  const res = await fetch('/api/ask', { method: 'POST', body: data, credentials: 'same-origin' });
  if(!res.ok) return alert('خطا در ارسال سوال');
  e.target.reset();
  await refreshData();
}

let chartInstance = null;
function renderChart(labels, data){
  const ctx = document.getElementById('reportsChart').getContext('2d');
  if(chartInstance){ chartInstance.destroy(); }
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'تعداد گزارش', data, borderColor: '#111', backgroundColor: 'rgba(0,0,0,0.08)', tension: .3 }] },
    options: { responsive: true, scales: { y: { beginAtZero: true }}}
  });
}

async function refreshData(){
  const myReportsEl = document.getElementById('myReports');
  const myAsksEl = document.getElementById('myAsks');
  const counselorReportsEl = document.getElementById('counselorReports');
  const counselorAsksEl = document.getElementById('counselorAsks');
  const studentsEl = document.getElementById('students');
  const profileEl = document.getElementById('profile');

  myReportsEl.innerHTML = myAsksEl.innerHTML = counselorReportsEl.innerHTML = studentsEl.innerHTML = profileEl.innerHTML = (counselorAsksEl? counselorAsksEl.innerHTML = '' : '');

  if(!authUser){
    return;
  }

  if(authUser.role === 'student'){
    const mine = await api('/api/reports/mine');
    renderList(myReportsEl, mine.reports, r => `<div class="item"><b>${r.title || 'بدون عنوان'}</b> <span class="muted">${new Date(r.createdAt).toLocaleString('fa-IR')}</span>${r.imagePath?` <a target="_blank" href="${r.imagePath}">عکس</a>`:''}<div>${r.content||''}</div></div>`);
  }

  if(authUser.role === 'counselor'){
    const all = await api('/api/reports');
    renderList(counselorReportsEl, all.reports, r => `<div class="item"><b>${r.title||'بدون عنوان'}</b> - <span class="muted">${new Date(r.createdAt).toLocaleDateString('fa-IR')}</span>${r.imagePath?` <a target="_blank" href="${r.imagePath}">عکس</a>`:''}<div class="muted">دانش‌آموز: ${r.studentId}</div><div>${r.content||''}</div></div>`);

    const stats = await api('/api/reports/stats');
    renderChart(stats.labels, stats.data);

    const students = await api('/api/students');
    renderList(studentsEl, students.students, s => `<div class="item"><button data-id="${s.id}" class="view-profile">نمایش پروفایل</button> ${s.username} <span class="muted">${s.email}</span></div>`);

    studentsEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('button.view-profile');
      if(!btn) return;
      const id = btn.getAttribute('data-id');
      const p = await api(`/api/students/${id}/profile`);
      const pr = p.profile;
      profileEl.innerHTML = pr ? `<div>نام: ${pr.firstName||''} ${pr.lastName||''}</div><div>تلفن: ${pr.phone||''}</div><div>یادداشت: ${pr.bio||''}</div>` : '<div class="muted">پروفایلی یافت نشد</div>';
    });

    if(counselorAsksEl){
      const asks = await api('/api/ask');
      renderList(counselorAsksEl, asks.asks, a => `<div class="item"><b>سوال</b>: ${a.question||''} <span class="muted">${new Date(a.createdAt).toLocaleString('fa-IR')}</span>${a.imagePath?` <a target="_blank" href="${a.imagePath}">عکس</a>`:''}<div class="muted">دانش‌آموز: ${a.studentId}</div></div>`);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnSignIn').addEventListener('click', signIn);
  document.getElementById('btnSignUp').addEventListener('click', signUp);
  document.getElementById('btnSignOut').addEventListener('click', signOut);
  document.getElementById('reportForm').addEventListener('submit', submitReport);
  document.getElementById('askForm').addEventListener('submit', submitAsk);
  refreshAuth();
});
