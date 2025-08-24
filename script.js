/* ====== Data & Persistence ====== */
const STORAGE_KEY = "ppt_data_v1";

const defaultData = {
  subjects: [
    {
      id: uid(), name: "Java (Core + Advanced)", open: true, topics: [
        { id: uid(), name: "Core Java", open: false, subtopics: [
          st("OOP (Encapsulation, Inheritance, Polymorphism, Abstraction)"),
          st("Exception Handling"),
          st("Collections Framework"),
          st("Generics"),
          st("I/O & Serialization")
        ]},
        { id: uid(), name: "Advanced Java", open: false, subtopics: [
          st("Multithreading & Concurrency"),
          st("JDBC"),
          st("JVM Internals, GC"),
          st("Streams & Lambda"),
          st("Best Practices")
        ]}
      ]
    },
    {
      id: uid(), name: "DSA (Basics)", open: true, topics: [
        { id: uid(), name: "Foundations", open:false, subtopics: [
          st("Complexity (Big-O)"),
          st("Arrays"),
          st("Strings"),
          st("Linked List"),
          st("Stacks & Queues"),
          st("Sorting (Basic)"),
          st("Searching (Binary Search)")
        ]}
      ]
    },
    {
      id: uid(), name: "DSA (Intermediate)", open: false, topics: [
        { id: uid(), name: "Core", open:false, subtopics: [
          st("Recursion & Backtracking"),
          st("Trees"),
          st("Binary Search Trees"),
          st("Heaps & Priority Queue"),
          st("Hashing (Advanced)"),
          st("Greedy"),
          st("DP Basics")
        ]}
      ]
    },
    {
      id: uid(), name: "DBMS", open: false, topics: [
        { id: uid(), name: "Core", open:false, subtopics: [
          st("ER Model"),
          st("Normalization"),
          st("SQL (DDL/DML/DCL)"),
          st("Joins, Subqueries"),
          st("Transactions & ACID"),
          st("Indexing"),
          st("Stored Procedures & Triggers")
        ]}
      ]
    },
    {
      id: uid(), name: "Operating Systems (OS)", open: false, topics: [
        { id: uid(), name: "Concepts", open:false, subtopics: [
          st("Processes & Threads"),
          st("CPU Scheduling"),
          st("Deadlocks"),
          st("Memory Management"),
          st("Virtual Memory & Paging"),
          st("File Systems"),
          st("Synchronization")
        ]}
      ]
    },
    {
      id: uid(), name: "Computer Networks (CN)", open: false, topics: [
        { id: uid(), name: "Networking", open:false, subtopics: [
          st("OSI Model"),
          st("TCP/IP"),
          st("HTTP/HTTPS"),
          st("IP Addressing & Subnetting"),
          st("Routing Basics"),
          st("Transport Layer (TCP/UDP)"),
          st("DNS, CDN")
        ]}
      ]
    },
    {
      id: uid(), name: "Revision + Placement Prep", open: false, topics: [
        { id: uid(), name: "Career", open:false, subtopics: [
          st("Resume Polish"),
          st("Mock Interviews"),
          st("Problem Solving Practice"),
          st("Company Research")
        ]}
      ]
    }
  ],
  streak: {
    count: 0,
    lastDate: null // "YYYY-MM-DD" of the last day when streak incremented
  }
};

function st(name){ return { id: uid(), name, done: false }; }
function uid(){ return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(defaultData);
    const data = JSON.parse(raw);
    // Data guard
    if(!data.subjects || !Array.isArray(data.subjects)) return structuredClone(defaultData);
    return data;
  }catch(e){
    console.warn("Failed to load, using defaults", e);
    return structuredClone(defaultData);
  }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* ====== Global State ====== */
let state = load();
let currentSubjectId = null;
let currentTopicId = null;

/* ====== Elements ====== */
const subjectsContainer = document.getElementById("subjectsContainer");
const sidebarList = document.getElementById("sidebarList");
const streakCountEl = document.getElementById("streakCount");
const streakHintEl = document.getElementById("streakHint");
const addSubjectBtn = document.getElementById("addSubjectBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const resetBtn = document.getElementById("resetBtn");
const searchInput = document.getElementById("searchInput");

const fab = document.getElementById("fab");
const fabMenu = document.getElementById("fabMenu");
const toastEl = document.getElementById("toast");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalInput = document.getElementById("modalInput");
const modalCancel = document.getElementById("modalCancel");
const modalOk = document.getElementById("modalOk");

const tickAudio = document.getElementById("tickSound");
let audioCtx = null;

/* ====== Audio Tick (WebAudio) ====== */
function playTick(){
  try{
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.09);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }catch(e){ /* ignore */ }
}

/* ====== Streak Logic ====== */
function todayStr(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function daysBetween(d1, d2){
  // date strings YYYY-MM-DD
  const a = new Date(d1+"T00:00:00");
  const b = new Date(d2+"T00:00:00");
  return Math.round((b - a) / 86400000);
}
function initStreak(){
  const t = todayStr();
  const last = state.streak.lastDate;
  if(!last) { /* first time */ }
  else{
    const diff = daysBetween(last, t);
    if(diff > 1){
      // Skipped a day
      state.streak.count = 0;
      notify("Streak reset 😿 — missed a day. Start again today!");
    }
  }
  renderStreak();
  save();
}
function onSubtopicCompletedToday(){
  const t = todayStr();
  if(state.streak.lastDate === t){
    // already credited today
    return;
  }
  const last = state.streak.lastDate;
  if(last){
    const diff = daysBetween(last, t);
    if(diff === 1 || diff === 0){
      state.streak.count += 1;
    } else {
      // skipped days
      state.streak.count = 1;
    }
  } else {
    state.streak.count = 1;
  }
  state.streak.lastDate = t;
  renderStreak();
  save();
}
function renderStreak(){
  streakCountEl.textContent = state.streak.count;
  const t = todayStr();
  streakHintEl.textContent = (state.streak.lastDate === t)
    ? "Nice! You’ve kept your streak today ✅"
    : "Complete one subtopic today to grow your streak!";
}

/* ====== Render ====== */
function render(){
  // Sidebar
  sidebarList.innerHTML = "";
  state.subjects.forEach(sub => {
    const {done, total} = subjectProgress(sub);
    const li = document.createElement("li");
    li.className = "sidebar-item";
    li.innerHTML = `
      <span class="title">${escapeHtml(sub.name)}</span>
      <span class="badge">${pct(done,total)}</span>
    `;
    li.addEventListener("click", () => {
      // scroll & open
      const el = document.querySelector(`[data-subject-id="${sub.id}"]`);
      if(el){
        el.classList.add("open");
        const body = el.querySelector(".card-body");
        expandElement(body);
        el.scrollIntoView({behavior:"smooth", block:"center"});
      }
      currentSubjectId = sub.id;
      currentTopicId = null;
    });
    sidebarList.appendChild(li);
  });

  // Main Subjects
  subjectsContainer.innerHTML = "";
  state.subjects.forEach(sub => {
    subjectsContainer.appendChild(renderSubject(sub));
  });
}

function renderSubject(sub){
  const card = document.createElement("div");
  card.className = "card" + (sub.open ? " open" : "");
  card.dataset.subjectId = sub.id;

  const {done, total} = subjectProgress(sub);
  const percent = pct(done, total);
  const header = document.createElement("div");
  header.className = "card-header";
  header.innerHTML = `
    <div class="card-title">
      <svg class="caret" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M9 18l6-6-6-6"/></svg>
      <span>${escapeHtml(sub.name)}</span>
    </div>
    <div class="row">
      <div class="progress" style="--pct:${percent}">
        <span style="width:${percent}"></span>
      </div>
      <div class="percent">${percent}</div>
      <div class="card-actions">
        <button class="icon-btn" data-action="add-topic">+ Topic</button>
        <button class="icon-btn" data-action="rename-subject">Rename</button>
        <button class="icon-btn" data-action="delete-subject">Delete</button>
      </div>
    </div>
  `;

  header.addEventListener("click", (e)=>{
    // Ignore clicks on action buttons
    const act = e.target.closest(".icon-btn");
    if(act) return;
    card.classList.toggle("open");
    const body = card.querySelector(".card-body");
    if(card.classList.contains("open")) expandElement(body); else collapseElement(body);
    currentSubjectId = sub.id;
    currentTopicId = null;
  });

  const body = document.createElement("div");
  body.className = "card-body";
  if(sub.open) setTimeout(()=>expandElement(body, true), 0);

  sub.topics.forEach(topic => body.appendChild(renderTopic(sub, topic)));
  card.appendChild(header);
  card.appendChild(body);

  // Actions
  header.querySelector('[data-action="add-topic"]').addEventListener("click", (e)=>{
    e.stopPropagation();
    promptModal("Add Topic", "Topic name", (val)=>{
      if(!val.trim()) return;
      sub.topics.push({ id: uid(), name: val.trim(), open: false, subtopics: [] });
      save(); render();
    });
  });
  header.querySelector('[data-action="rename-subject"]').addEventListener("click", (e)=>{
    e.stopPropagation();
    promptModal("Rename Subject", "New subject name", (val)=>{
      if(!val.trim()) return;
      sub.name = val.trim(); save(); render();
    }, sub.name);
  });
  header.querySelector('[data-action="delete-subject"]').addEventListener("click", (e)=>{
    e.stopPropagation();
    if(confirm(`Delete subject "${sub.name}"? This cannot be undone.`)){
      state.subjects = state.subjects.filter(s=>s.id!==sub.id);
      save(); render();
    }
  });

  return card;
}

function renderTopic(sub, topic){
  const wrap = document.createElement("div");
  wrap.className = "topic" + (topic.open ? " open" : "");
  wrap.dataset.topicId = topic.id;

  const header = document.createElement("div");
  header.className = "topic-header";
  header.innerHTML = `
    <div class="row">
      <svg class="caret" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M9 18l6-6-6-6"/></svg>
      <div class="topic-title">${escapeHtml(topic.name)}</div>
    </div>
    <div class="row">
      <button class="icon-btn" data-action="add-subtopic">+ Subtopic</button>
      <button class="icon-btn" data-action="rename-topic">Rename</button>
      <button class="icon-btn" data-action="delete-topic">Delete</button>
    </div>
  `;
  header.addEventListener("click", (e)=>{
    const act = e.target.closest(".icon-btn");
    if(act) return;
    wrap.classList.toggle("open");
    const body = wrap.querySelector(".topic-body");
    if(wrap.classList.contains("open")) expandElement(body); else collapseElement(body);
    currentSubjectId = sub.id;
    currentTopicId = topic.id;
  });

  const body = document.createElement("div");
  body.className = "topic-body";
  if(topic.open) setTimeout(()=>expandElement(body, true), 0);

  topic.subtopics.forEach(st => body.appendChild(renderSubtopic(sub, topic, st)));

  // Actions
  header.querySelector('[data-action="add-subtopic"]').addEventListener("click", (e)=>{
    e.stopPropagation();
    promptModal("Add Subtopic", "Subtopic name", (val)=>{
      if(!val.trim()) return;
      topic.subtopics.push({ id: uid(), name: val.trim(), done: false });
      save(); render();
    });
  });
  header.querySelector('[data-action="rename-topic"]').addEventListener("click", (e)=>{
    e.stopPropagation();
    promptModal("Rename Topic", "New topic name", (val)=>{
      if(!val.trim()) return;
      topic.name = val.trim(); save(); render();
    }, topic.name);
  });
  header.querySelector('[data-action="delete-topic"]').addEventListener("click", (e)=>{
    e.stopPropagation();
    if(confirm(`Delete topic "${topic.name}"?`)){
      sub.topics = sub.topics.filter(t=>t.id!==topic.id);
      save(); render();
    }
  });

  wrap.appendChild(header);
  wrap.appendChild(body);
  return wrap;
}

function renderSubtopic(sub, topic, subtopic){
  const row = document.createElement("div");
  row.className = "subtopic";
  row.dataset.subtopicId = subtopic.id;

  const left = document.createElement("div");
  left.className = "subtopic-left";

  const box = document.createElement("span");
  box.className = "checkbox" + (subtopic.done ? " checked" : "");
  box.setAttribute("role","checkbox");
  box.setAttribute("aria-checked", subtopic.done ? "true" : "false");
  box.tabIndex = 0;

  const label = document.createElement("label");
  label.textContent = subtopic.name;

  left.appendChild(box);
  left.appendChild(label);

  const actions = document.createElement("div");
  actions.className = "row";
  const renameBtn = document.createElement("button");
  renameBtn.className = "icon-btn";
  renameBtn.textContent = "Rename";
  const delBtn = document.createElement("button");
  delBtn.className = "icon-btn";
  delBtn.textContent = "Delete";

  actions.appendChild(renameBtn);
  actions.appendChild(delBtn);

  row.appendChild(left);
  row.appendChild(actions);

  // Checkbox interactions
  function toggle(){
    const wasDone = subtopic.done;
    subtopic.done = !subtopic.done;
    if(subtopic.done){
      playTick();
      showQuote();
      onSubtopicCompletedToday();
    }
    // visual
    box.classList.toggle("checked", subtopic.done);
    box.setAttribute("aria-checked", subtopic.done ? "true" : "false");
    // update progress bar
    save(); render(); // re-render to update percentages quickly
  }
  box.addEventListener("click", toggle);
  box.addEventListener("keydown", (e)=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggle(); }});
  label.addEventListener("click", toggle);

  // Rename / Delete
  renameBtn.addEventListener("click", ()=>{
    promptModal("Rename Subtopic", "New subtopic name", (val)=>{
      if(!val.trim()) return;
      subtopic.name = val.trim(); save(); render();
    }, subtopic.name);
  });
  delBtn.addEventListener("click", ()=>{
    if(confirm(`Delete subtopic "${subtopic.name}"?`)){
      topic.subtopics = topic.subtopics.filter(s=>s.id!==subtopic.id);
      save(); render();
    }
  });

  return row;
}

/* ====== Expand/Collapse animation helpers ====== */
function expandElement(el, instant=false){
  el.classList.add("animating");
  el.style.display = "block";
  const start = el.scrollHeight; // force layout
  el.style.maxHeight = "0px";
  requestAnimationFrame(()=>{
    const full = el.scrollHeight;
    if(instant){
      el.style.maxHeight = full + "px";
      setTimeout(()=>{ el.style.maxHeight = "none"; el.classList.remove("animating"); }, 10);
    }else{
      el.style.maxHeight = full + "px";
      setTimeout(()=>{ el.style.maxHeight = "none"; el.classList.remove("animating"); }, 350);
    }
  });
}
function collapseElement(el){
  el.classList.add("animating");
  const full = el.scrollHeight;
  el.style.maxHeight = full + "px";
  requestAnimationFrame(()=>{
    el.style.maxHeight = "0px";
    setTimeout(()=>{
      el.classList.remove("animating");
      el.style.display = "none";
    }, 350);
  });
}

/* ====== Utilities ====== */
function escapeHtml(s){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function subjectProgress(sub){
  let total = 0, done = 0;
  sub.topics.forEach(t=>{
    total += t.subtopics.length;
    done += t.subtopics.filter(x=>x.done).length;
  });
  return {done, total};
}
function pct(done, total){
  return (total===0 ? "0%" : `${Math.round((done/total)*100)}%`);
}

function notify(msg){
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  setTimeout(()=>{ toastEl.style.display="none"; }, 1800);
}

const QUOTES = [
  "One step at a time. 🔥",
  "Small wins build momentum. 🚀",
  "Today’s effort is tomorrow’s offer. 💼",
  "Consistency beats intensity. ⚔️",
  "You vs. you. Keep going. 💪",
  "Make it happen, champ. 🏆",
  "Every checkbox is progress. ✅"
];
function showQuote(){
  notify(QUOTES[Math.floor(Math.random()*QUOTES.length)]);
}

/* ====== Modal Prompt ====== */
let modalResolve = null;
function promptModal(title, placeholder, onOk, value=""){
  modalTitle.textContent = title;
  modalInput.placeholder = placeholder;
  modalInput.value = value;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  modalInput.focus();
  modalResolve = (v)=>{ onOk(v); modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); modalInput.value=""; };
}
modalCancel.addEventListener("click", ()=> {
  modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true");
});
modalOk.addEventListener("click", ()=> {
  modalResolve && modalResolve(modalInput.value);
});
modal.addEventListener("keydown", (e)=>{
  if(e.key==="Enter"){ modalOk.click(); }
  if(e.key==="Escape"){ modalCancel.click(); }
});

/* ====== Search ====== */
searchInput.addEventListener("input", ()=>{
  const q = searchInput.value.trim().toLowerCase();
  const subjectCards = document.querySelectorAll(".card");
  subjectCards.forEach(card=>{
    const subjectId = card.dataset.subjectId;
    const sub = state.subjects.find(s=>s.id===subjectId);
    let match = sub.name.toLowerCase().includes(q);
    // check topics/subtopics
    sub.topics.forEach(t=>{
      if(t.name.toLowerCase().includes(q)) match = true;
      t.subtopics.forEach(sst=>{
        if(sst.name.toLowerCase().includes(q)) match = true;
      });
    });
    card.style.display = match ? "block" : "none";
  });
});

/* ====== Sidebar Add ====== */
addSubjectBtn.addEventListener("click", ()=>{
  promptModal("Add Subject", "Subject name", (val)=>{
    if(!val.trim()) return;
    state.subjects.push({ id: uid(), name: val.trim(), open:true, topics: [] });
    save(); render();
  });
});

/* ====== Export / Import / Reset ====== */
exportBtn.addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `prep-tracker-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  notify("Exported progress ✅");
});

importInput.addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const text = await file.text();
  try{
    const data = JSON.parse(text);
    if(!data.subjects || !Array.isArray(data.subjects)) throw new Error("Invalid file");
    state = data; save(); render(); initStreak();
    notify("Imported progress ✅");
  }catch(err){
    alert("Import failed: Invalid JSON file.");
  }finally{
    importInput.value = "";
  }
});

resetBtn.addEventListener("click", ()=>{
  if(confirm("Reset ALL data? This cannot be undone.")){
    state = structuredClone(defaultData);
    save(); render(); initStreak();
    notify("Reset complete");
  }
});

/* ====== FAB ====== */
fab.addEventListener("click", ()=>{
  fabMenu.classList.toggle("open");
});
fabMenu.addEventListener("click", (e)=>{
  const btn = e.target.closest(".fab-item");
  if(!btn) return;
  const action = btn.dataset.action;
  if(action==="subject"){
    addSubjectBtn.click();
  }else if(action==="topic"){
    if(!currentSubjectId){
      notify("Open a subject first to add a topic.");
      return;
    }
    const sub = state.subjects.find(s=>s.id===currentSubjectId);
    promptModal("Add Topic (current subject)", "Topic name", (val)=>{
      if(!val.trim()) return;
      sub.topics.push({ id: uid(), name: val.trim(), open:true, subtopics: [] });
      save(); render();
    });
  }else if(action==="subtopic"){
    if(!currentSubjectId || !currentTopicId){
      notify("Open a topic first to add a subtopic.");
      return;
    }
    const sub = state.subjects.find(s=>s.id===currentSubjectId);
    const topic = sub.topics.find(t=>t.id===currentTopicId);
    promptModal("Add Subtopic (current topic)", "Subtopic name", (val)=>{
      if(!val.trim()) return;
      topic.subtopics.push({ id: uid(), name: val.trim(), done:false });
      save(); render();
    });
  }
  fabMenu.classList.remove("open");
});

/* ====== Initial Render ====== */
render();
initStreak();

/* ====== Helper: open last positions ====== */
(function ensureOpenForEmpty(){
  // If no topics/subtopics, keep subject open for UX
  state.subjects.forEach(s=>{
    if(s.topics.length===0) s.open = true;
  });
})();

/* ====== END ====== */
