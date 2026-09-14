import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  projectId: "ganpati-5f24e",
  appId: "1:512949354669:web:f561488c630203a9ae4624"
  // Add your Firebase apiKey, authDomain, databaseURL, storageBucket and messagingSenderId
  // if your Firebase project requires them for browser SDK initialization.
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const liveVideo = document.querySelector("#liveVideo");
const offlineState = document.querySelector("#offlineState");
const liveBadge = document.querySelector("#liveBadge");
const viewerCount = document.querySelector("#viewerCount");

function applyLiveState(data) {
  const online = Boolean(data?.online);
  offlineState.hidden = online;
  liveVideo.hidden = !online;
  liveBadge.hidden = !online;
  viewerCount.hidden = !online;
  if (data?.streamUrl && liveVideo.src !== data.streamUrl) liveVideo.src = data.streamUrl;
}
onValue(ref(db, "liveDarshan"), snap => applyLiveState(snap.val()), err => {
  console.warn("Live Darshan Firebase read failed:", err);
});

const tracks = {
  "TRADITIONAL AARTIS": [
    ["Sukhkarta Dukhaharta","./assets/audio/sukhkarta-dukhaharta.mp3"],
    ["Jai Ganesh Deva","./assets/audio/jai-ganesh-deva.mp3"],
    ["Prathama Tula Vandito","./assets/audio/prathama-tula-vandito.mp3"],
    ["Shendur Laal Chadhayo","./assets/audio/shendur-laal-chadhayo.mp3"],
    ["Shree Ganeshay Dheemahi","./assets/audio/shree-ganeshay-dheemahi.mp3"]
  ],
  "FESTIVAL ANTHEMS": [
    ["Deva Shree Ganesha","./assets/audio/deva-shree-ganesha.mp3"],
    ["Morya Re","./assets/audio/morya-re.mp3"],
    ["Deva Ho Deva","./assets/audio/deva-ho-deva.mp3"],
    ["Suno Ganpati Bappa Morya","./assets/audio/suno-ganpati-bappa-morya.mp3"],
    ["Jalwa","./assets/audio/jalwa.mp3"],
    ["Gajanana","./assets/audio/gajanana.mp3"],
    ["Mourya Re","./assets/audio/mourya-re.mp3"]
  ]
};

const audio = document.querySelector("#audioPlayer");
const playBtn = document.querySelector("#playBtn");
const progress = document.querySelector("#progressBar");
const currentTrack = document.querySelector("#currentTrack");
const currentCategory = document.querySelector("#currentCategory");
const art = document.querySelector(".album-art");
let selected = { category:"TRADITIONAL AARTIS", index:0 };

function eqHtml(){return '<span class="eq"><i></i><i></i><i></i></span>'}
function renderTracks(){
  for(const [category, items] of Object.entries(tracks)){
    const list = document.querySelector(category==="TRADITIONAL AARTIS" ? "#traditionalList":"#anthemList");
    list.innerHTML = "";
    items.forEach((item,i)=>{
      const li=document.createElement("li");
      li.dataset.category=category; li.dataset.index=i;
      li.innerHTML=`<span class="track-num">${selected.category===category&&selected.index===i?eqHtml():String(i+1).padStart(2,"0")}</span><span>${item[0]}</span>`;
      li.onclick=()=>selectTrack(category,i,true);
      list.appendChild(li);
    });
  }
}
function selectTrack(category,index,autoplay=false){
  selected={category,index};
  const item=tracks[category][index];
  currentCategory.textContent=category; currentTrack.textContent=item[0];
  audio.src=item[1]; progress.style.width="0%";
  renderTracks();
  if(autoplay) audio.play().catch(()=>{});
}
playBtn.onclick=()=>{
  if(audio.paused) audio.play().catch(()=>{}); else audio.pause();
};
audio.onplay=()=>{playBtn.innerHTML='<span class="play-icon">Ⅱ</span>';art.classList.add("playing")};
audio.onpause=()=>{playBtn.innerHTML='<span class="play-icon">▶</span>';art.classList.remove("playing")};
audio.ontimeupdate=()=>{if(audio.duration)progress.style.width=`${audio.currentTime/audio.duration*100}%`};
audio.onended=()=>{const next=selected.index+1;if(next<tracks[selected.category].length)selectTrack(selected.category,next,true)};
renderTracks();

const timeline=document.querySelector("#timeline");
function renderTimeline(items){
  const safe=Array.isArray(items)?items:[];
  timeline.innerHTML=safe.length?safe.map((x,i)=>`<article class="timeline-card ${x.active?"active":""}" data-i="${i}"><span class="timeline-node"></span><time>${escapeHtml(x.time||"[Date / Time Placeholder]")}</time><h3>${escapeHtml(x.title||"[Event Name Placeholder]")}</h3><p>${escapeHtml(x.description||"")}</p></article>`).join(""):`<article class="timeline-card visible"><span class="timeline-node"></span><time>[Date / Time Placeholder]</time><h3>[Event Name Placeholder]</h3><p>[Event Description Placeholder]</p></article>`;
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>e.isIntersecting&&e.target.classList.add("visible")),{threshold:.12});
  timeline.querySelectorAll(".timeline-card").forEach(el=>observer.observe(el));
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
onValue(ref(db,"events"),snap=>{
  const val=snap.val();
  renderTimeline(val?Object.values(val).sort((a,b)=>(a.order??0)-(b.order??0)):[]);
},()=>renderTimeline([]));

document.querySelectorAll(".gallery-item").forEach(btn=>btn.addEventListener("click",()=>{
  const img=btn.querySelector("img"), src=btn.dataset.image;
  if(!img || img.style.display==="none") return;
  document.querySelector("#lightboxImage").src=src;
  document.querySelector("#lightbox").classList.add("open");
}));
const close=()=>document.querySelector("#lightbox").classList.remove("open");
document.querySelector("#lightboxClose").onclick=close;
document.querySelector("#lightbox").onclick=e=>{if(e.target.id==="lightbox")close()};

const menuBtn=document.querySelector("#menuBtn"), nav=document.querySelector("#mainNav");
menuBtn.onclick=()=>{const open=nav.classList.toggle("open");menuBtn.setAttribute("aria-expanded",open)};
nav.querySelectorAll("a").forEach(a=>a.onclick=()=>nav.classList.remove("open"));

const canvas=document.querySelector("#dustCanvas"), ctx=canvas.getContext("2d"); let particles=[];
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);particles=Array.from({length:55},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.4+.3,s:(Math.random()-.5)*.16}))}
function dust(){ctx.clearRect(0,0,innerWidth,innerHeight);ctx.fillStyle="#CBA153";for(const p of particles){p.y-=.08;p.x+=p.s;if(p.y<0)p.y=innerHeight;if(p.x<0||p.x>innerWidth)p.s*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}requestAnimationFrame(dust)}
addEventListener("resize",resize);resize();dust();
addEventListener("scroll",()=>{const y=scrollY;const copy=document.querySelector(".hero-copy");if(copy){copy.style.transform=`translateY(${-y*0.15}px)`;copy.style.opacity=Math.max(0,1-y/520)}} ,{passive:true});
