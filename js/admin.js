import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, onValue, set, push, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  databaseURL: "https://ganpati-5f24e-default-rtdb.firebaseio.com",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624",
  measurementId: "G-1J5J8CBVRD"
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app),db=getDatabase(app);
const loginPanel=document.querySelector("#loginPanel"),dashboard=document.querySelector("#dashboard"),errorBox=document.querySelector("#loginError");

onAuthStateChanged(auth,user=>{
  loginPanel.hidden=!!user; dashboard.hidden=!user;
  if(user) loadDashboard();
});
document.querySelector("#loginForm").onsubmit=async e=>{
  e.preventDefault(); errorBox.textContent="";
  try{await signInWithEmailAndPassword(auth,document.querySelector("#email").value.trim(),document.querySelector("#password").value)}catch(err){errorBox.textContent="Sign-in failed. Check the authorised email/password and Firebase Auth setup."}
};
document.querySelector("#logoutBtn").onclick=()=>signOut(auth);

function loadDashboard(){
  onValue(ref(db,"liveDarshan"),snap=>{
    const online=Boolean(snap.val()?.online);
    document.querySelector("#liveToggle").checked=online;
    document.querySelector("#liveStatusText").textContent=online?"Online":"Offline";
  });
  onValue(ref(db,"events"),snap=>renderAdminEvents(snap.val()||{}));
}
document.querySelector("#liveToggle").onchange=async e=>{
  await set(ref(db,"liveDarshan"),{online:e.target.checked,updatedAt:Date.now()});
};
const form=document.querySelector("#eventForm");
form.onsubmit=async e=>{
  e.preventDefault();
  const id=document.querySelector("#eventId").value;
  const data={title:document.querySelector("#eventTitle").value.trim(),time:document.querySelector("#eventTime").value.trim(),description:document.querySelector("#eventDescription").value.trim(),active:document.querySelector("#eventActive").checked,order:Date.now()};
  const target=id?ref(db,`events/${id}`):push(ref(db,"events"));
  await set(target,data); resetForm();
};
document.querySelector("#cancelEdit").onclick=resetForm;
function resetForm(){form.reset();document.querySelector("#eventId").value=""}
function renderAdminEvents(data){
  const entries=Object.entries(data).sort(([,a],[,b])=>(a.order??0)-(b.order??0));
  document.querySelector("#eventCount").textContent=entries.length;
  document.querySelector("#eventList").innerHTML=entries.length?entries.map(([id,x])=>`<div class="admin-event"><div><strong>${esc(x.title)}</strong><small>${esc(x.time)} ${x.active?"• ACTIVE/NEXT":""}</small><small>${esc(x.description||"")}</small></div><div class="event-actions"><button data-edit="${id}">Edit</button><button data-delete="${id}">Delete</button></div></div>`).join(""):"<p>No timeline nodes yet.</p>";
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editEvent(b.dataset.edit,data[b.dataset.edit]));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Delete this timeline event?"))await remove(ref(db,`events/${b.dataset.delete}`))});
}
function editEvent(id,x){
  document.querySelector("#eventId").value=id;
  document.querySelector("#eventTitle").value=x.title||"";
  document.querySelector("#eventTime").value=x.time||"";
  document.querySelector("#eventDescription").value=x.description||"";
  document.querySelector("#eventActive").checked=!!x.active;
  scrollTo({top:document.querySelector("#eventForm").offsetTop-100,behavior:"smooth"});
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
