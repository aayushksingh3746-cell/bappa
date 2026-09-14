// ============================================================
// GANPATI DIGITAL DARSHAN
// app.js
//
// Firebase Realtime Database
// WebRTC Live Darshan
// Sankalp / Prayer Wall
// Aarti Player
// Pushpanjali
//
// NO AGORA
// NO TURN CREDENTIALS
// ============================================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";

import {
  getDatabase,
  ref,
  set,
  update,
  push,
  onValue,
  onChildAdded,
  onDisconnect,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  databaseURL:
    "https://ganpati-5f24e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ============================================================
// DOM
// ============================================================

const liveVideo =
  document.getElementById("liveVideo");

const activeStreamUI =
  document.getElementById("active-stream-ui");

const offlineStreamUI =
  document.getElementById("offline-stream-ui");

const prayerForm =
  document.getElementById("prayerForm");

const prayerInput =
  document.getElementById("prayerInput");

const prayerStatus =
  document.getElementById("prayerStatus");

const prayerWall =
  document.getElementById("prayerWall");

const heroSankalp =
  document.getElementById("heroSankalp");

const daysEl =
  document.getElementById("days");

const hoursEl =
  document.getElementById("hours");

const minutesEl =
  document.getElementById("minutes");

const secondsEl =
  document.getElementById("seconds");

const pushpanjali =
  document.getElementById("pushpanjali");

const petalCanvas =
  document.getElementById("petalCanvas");

const bellAudio =
  document.getElementById("bellAudio");

const trackTitle =
  document.getElementById("trackTitle");

const trackNumber =
  document.getElementById("trackNumber");

const playPause =
  document.getElementById("playPause");

const playIcon =
  document.getElementById("playIcon");

const progress =
  document.getElementById("progress");

const currentTimeEl =
  document.getElementById("currentTime");

const durationEl =
  document.getElementById("duration");

const trackList =
  document.getElementById("trackList");

const aartiAudio =
  document.getElementById("aartiAudio");


// ============================================================
// HELPERS
// ============================================================

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}


function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60);

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}


// ============================================================
// HERO SANKALP BUTTON
// ============================================================

if (heroSankalp) {
  heroSankalp.addEventListener(
    "click",
    () => {
      const sankalp =
        document.getElementById("sankalp");

      if (!sankalp) return;

      sankalp.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      setTimeout(() => {
        if (prayerInput) {
          prayerInput.focus();
        }
      }, 600);
    }
  );
}


// ============================================================
// SMOOTH INTERNAL NAVIGATION
// ============================================================

document
  .querySelectorAll('a[href^="#"]')
  .forEach((link) => {

    link.addEventListener(
      "click",
      () => {

        const target =
          link.getAttribute("href");

        if (!target || target === "#") {
          return;
        }

        const element =
          document.querySelector(target);

        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    );
  });


// ============================================================
// COUNTDOWN
// ============================================================
//
// Existing date supplied in the project:
// 02 September 2026
//
// That date has passed, so this displays zero.
// Change EVENT_DATE only when the actual future date
// is decided.
// ============================================================

const EVENT_DATE =
  new Date(
    "2026-09-02T00:00:00+05:30"
  ).getTime();


function updateCountdown() {

  const remaining =
    EVENT_DATE - Date.now();

  if (remaining <= 0) {

    setText(daysEl, "00");
    setText(hoursEl, "00");
    setText(minutesEl, "00");
    setText(secondsEl, "00");

    return;
  }

  const totalSeconds =
    Math.floor(remaining / 1000);

  const days =
    Math.floor(
      totalSeconds / 86400
    );

  const hours =
    Math.floor(
      (totalSeconds % 86400) / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  setText(
    daysEl,
    String(days).padStart(2, "0")
  );

  setText(
    hoursEl,
    String(hours).padStart(2, "0")
  );

  setText(
    minutesEl,
    String(minutes).padStart(2, "0")
  );

  setText(
    secondsEl,
    String(seconds).padStart(2, "0")
  );
}


updateCountdown();

setInterval(
  updateCountdown,
  1000
);


// ============================================================
// SANKALP / PRAYER WALL
// ============================================================

const prayersRef =
  ref(
    db,
    "pandal/prayers_wall"
  );


if (prayerForm && prayerInput) {

  prayerForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const text =
        prayerInput.value
          .trim()
          .replace(/\s+/g, " ");

      if (!text) {

        setText(
          prayerStatus,
          "Please enter your Sankalp."
        );

        return;
      }

      if (text.length > 50) {

        setText(
          prayerStatus,
          "Sankalp must be 50 characters or less."
        );

        return;
      }

      try {

        setText(
          prayerStatus,
          "Submitting..."
        );

        const prayerRef =
          push(prayersRef);

        await set(
          prayerRef,
          {
            text: text,
            createdAt:
              serverTimestamp()
          }
        );

        prayerInput.value = "";

        setText(
          prayerStatus,
          "Your Sankalp has been received with devotion. 🙏"
        );

        setTimeout(
          () => {
            setText(
              prayerStatus,
              ""
            );
          },
          4000
        );

      } catch (error) {

        console.error(
          "Prayer submission error:",
          error
        );

        setText(
          prayerStatus,
          "Unable to submit right now. Please try again."
        );
      }
    }
  );
}


// ============================================================
// RENDER PRAYER WALL
// ============================================================

function renderPrayerWall(data) {

  if (!prayerWall) {
    return;
  }

  const prayers = [];

  Object.entries(
    data || {}
  ).forEach(
    ([id, prayer]) => {

      if (
        !prayer ||
        typeof prayer !== "object"
      ) {
        return;
      }

      if (
        typeof prayer.text !== "string"
      ) {
        return;
      }

      prayers.push({
        id,
        text: prayer.text,
        createdAt:
          typeof prayer.createdAt === "number"
            ? prayer.createdAt
            : 0
      });
    }
  );

  prayers.sort(
    (a, b) =>
      b.createdAt - a.createdAt
  );

  const visiblePrayers =
    prayers.slice(0, 40);

  if (!visiblePrayers.length) {

    prayerWall.innerHTML = `
      <div class="empty-state">
        Be the first to offer a Sankalp. 🙏
      </div>
    `;

    return;
  }

  prayerWall.innerHTML =
    visiblePrayers
      .map(
        (prayer) => `
          <div
            class="prayer-card"
            data-prayer-id="${escapeHTML(prayer.id)}"
          >
            <p>${escapeHTML(prayer.text)}</p>
          </div>
        `
      )
      .join("");
}


onValue(
  prayersRef,
  (snapshot) => {
    renderPrayerWall(
      snapshot.val()
    );
  },
  (error) => {
    console.error(
      "Prayer wall error:",
      error
    );
  }
);


// ============================================================
// AARTI PLAYER
// ============================================================
//
// EXACT TRACK PATHS SUPPLIED BY USER
//
// 5 Traditional Aartis
// 5 Festival Anthems
//
// The fifth traditional track is using the placeholder path
// supplied by the user.
// ============================================================

const aartiTracks = [

  {
    title:
      "Sukhkarta Dukhharta",

    category:
      "Traditional Aarti",

    src:
      "./assets/Keshav_Kumar_-_Sukhkarta_Dukhharta_(mp3.pm).mp3"
  },

  {
    title:
      "Jai Ganesh Deva",

    category:
      "Traditional Aarti",

    src:
      "./assets/Kumar_Vishu_Vandana_Vajpai_-_Jai_Ganesh_Jai_Ganesh_Deva_(mp3.pm).mp3"
  },

  {
    title:
      "Shendur Laal Chadhayo",

    category:
      "Traditional Aarti",

    src:
      "./assets/Shendur Laal Chadhayo Aarti 128 Kbps.mp3"
  },

  {
    title:
      "Shree Ganeshay Dheemahi",

    category:
      "Traditional Aarti",

    src:
      "./assets/Viruddh_-_Shree_Ganeshay_Dheemahi_(mp3.pm).mp3"
  },

  {
    title:
      "Prathama Tula Vandito",

    category:
      "Traditional Aarti",

    src:
      "./assets/Prathama_Tula_Vandito.mp3"
  },

  {
    title:
      "Gajanana",

    category:
      "Festival Anthem",

    src:
      "./assets/Gajanana.mp3"
  },

  {
    title:
      "Deva Ho Deva",

    category:
      "Festival Anthem",

    src:
      "./assets/Ganpati Bappa Moriya Humse Badhkar Kaun 128 Kbps.mp3"
  },

  {
    title:
      "Jalwa",

    category:
      "Festival Anthem",

    src:
      "./assets/Jalwa Mera Hi Jalwa Wanted 128 Kbps.mp3"
  },

  {
    title:
      "Morya Re (Don)",

    category:
      "Festival Anthem",

    src:
      "./assets/Maurya Re Don 2006 128 Kbps.mp3"
  },

  {
    title:
      "Suno Ganpati Bappa Morya",

    category:
      "Festival Anthem",

    src:
      "./assets/Suno Ganpati Bappa Morya Judwaa 2 128 Kbps.mp3"
  }

];


let currentAartiIndex = 0;
let aartiPlaying = false;


// ============================================================
// LOAD AARTI
// ============================================================

function loadAarti(
  index,
  autoplay = false
) {

  if (
    !aartiAudio ||
    !aartiTracks.length
  ) {
    return;
  }

  if (index < 0) {
    index =
      aartiTracks.length - 1;
  }

  if (
    index >= aartiTracks.length
  ) {
    index = 0;
  }

  currentAartiIndex = index;

  const track =
    aartiTracks[
      currentAartiIndex
    ];

  aartiAudio.src =
    track.src;

  aartiAudio.load();

  setText(
    trackTitle,
    track.title
  );

  setText(
    trackNumber,
    `${currentAartiIndex + 1} / ${aartiTracks.length}`
  );

  if (progress) {
    progress.value = 0;
  }

  setText(
    currentTimeEl,
    "0:00"
  );

  setText(
    durationEl,
    "0:00"
  );

  if (trackList) {

    trackList
      .querySelectorAll(
        ".aarti-track"
      )
      .forEach(
        (item, itemIndex) => {

          item.classList.toggle(
            "active",
            itemIndex ===
              currentAartiIndex
          );
        }
      );
  }

  if (autoplay) {

    aartiAudio
      .play()
      .then(
        () => {

          aartiPlaying = true;

          updateAartiUI();
        }
      )
      .catch(
        (error) => {

          console.warn(
            "Aarti playback was blocked:",
            error
          );

        }
      );
  }
}


// ============================================================
// RENDER AARTI LIST
// ============================================================

function renderAartiTrackList() {

  if (!trackList) {
    return;
  }

  trackList.innerHTML = "";

  aartiTracks.forEach(
    (track, index) => {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "aarti-track";

      button.innerHTML = `
        <span class="aarti-track-number">
          ${String(index + 1).padStart(2, "0")}
        </span>

        <span class="aarti-track-info">
          <strong>
            ${escapeHTML(track.title)}
          </strong>

          <small>
            ${escapeHTML(track.category)}
          </small>
        </span>

        <span class="aarti-track-play">
          ▶
        </span>
      `;

      button.addEventListener(
        "click",
        () => {
          loadAarti(
            index,
            true
          );
        }
      );

      trackList.appendChild(
        button
      );
    }
  );
}


// ============================================================
// AARTI UI
// ============================================================

function updateAartiUI() {

  if (!aartiAudio) {
    return;
  }

  const duration =
    aartiAudio.duration;

  if (progress) {

    if (
      Number.isFinite(duration) &&
      duration > 0
    ) {

      progress.value =
        (
          aartiAudio.currentTime /
          duration
        ) * 100;

    } else {

      progress.value = 0;
    }
  }

  setText(
    currentTimeEl,
    formatTime(
      aartiAudio.currentTime
    )
  );

  setText(
    durationEl,
    formatTime(duration)
  );

  if (playIcon) {

    playIcon.textContent =
      aartiPlaying
        ? "❚❚"
        : "▶";
  }

  if (playPause) {

    playPause.setAttribute(
      "aria-label",
      aartiPlaying
        ? "Pause"
        : "Play"
    );
  }
}


// ============================================================
// AARTI EVENTS
// ============================================================

if (aartiAudio) {

  aartiAudio.addEventListener(
    "loadedmetadata",
    () => {
      updateAartiUI();
    }
  );


  aartiAudio.addEventListener(
    "timeupdate",
    updateAartiUI
  );


  aartiAudio.addEventListener(
    "play",
    () => {

      aartiPlaying = true;

      updateAartiUI();
    }
  );


  aartiAudio.addEventListener(
    "pause",
    () => {

      aartiPlaying = false;

      updateAartiUI();
    }
  );


  aartiAudio.addEventListener(
    "ended",
    () => {

      aartiPlaying = false;

      const nextIndex =
        (
          currentAartiIndex + 1
        ) %
        aartiTracks.length;

      loadAarti(
        nextIndex,
        true
      );
    }
  );


  aartiAudio.addEventListener(
    "error",
    () => {

      aartiPlaying = false;

      const track =
        aartiTracks[
          currentAartiIndex
        ];

      console.error(
        "Unable to load Aarti:",
        track.src
      );

      setText(
        trackNumber,
        `${currentAartiIndex + 1} / ${aartiTracks.length} • File unavailable`
      );

      updateAartiUI();
    }
  );
}


// ============================================================
// PLAY / PAUSE
// ============================================================

if (
  playPause &&
  aartiAudio
) {

  playPause.addEventListener(
    "click",
    async () => {

      try {

        if (
          aartiAudio.paused
        ) {

          await aartiAudio.play();

        } else {

          aartiAudio.pause();
        }

      } catch (error) {

        console.error(
          "Aarti playback error:",
          error
        );
      }
    }
  );
}


// ============================================================
// AARTI PROGRESS
// ============================================================

if (
  progress &&
  aartiAudio
) {

  progress.addEventListener(
    "input",
    () => {

      const duration =
        aartiAudio.duration;

      if (
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        return;
      }

      aartiAudio.currentTime =
        (
          Number(progress.value) /
          100
        ) * duration;
    }
  );
}


// ============================================================
// INITIALISE AARTI
// ============================================================

renderAartiTrackList();

loadAarti(
  0,
  false
);


// ============================================================
// PUSHPANJALI
// ============================================================

let petalAnimationFrame =
  null;

let petals = [];


function resizePetalCanvas() {

  if (!petalCanvas) {
    return;
  }

  const rect =
    petalCanvas.getBoundingClientRect();

  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  petalCanvas.width =
    Math.floor(
      rect.width * dpr
    );

  petalCanvas.height =
    Math.floor(
      rect.height * dpr
    );

  const context =
    petalCanvas.getContext(
      "2d"
    );

  if (context) {

    context.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );
  }
}


function createPetal(
  width,
  height
) {

  return {

    x:
      Math.random() * width,

    y:
      -20 -
      Math.random() *
        height *
        0.2,

    size:
      5 +
      Math.random() * 8,

    speed:
      1 +
      Math.random() * 2.5,

    rotation:
      Math.random() *
      Math.PI *
      2,

    rotationSpeed:
      (
        Math.random() - 0.5
      ) * 0.08,

    drift:
      (
        Math.random() - 0.5
      ) * 0.7,

    opacity:
      0.55 +
      Math.random() * 0.4
  };
}


function animatePetals() {

  if (!petalCanvas) {
    return;
  }

  const context =
    petalCanvas.getContext(
      "2d"
    );

  if (!context) {
    return;
  }

  const width =
    petalCanvas.clientWidth;

  const height =
    petalCanvas.clientHeight;

  context.clearRect(
    0,
    0,
    width,
    height
  );

  petals.forEach(
    (petal) => {

      petal.y +=
        petal.speed;

      petal.x +=
        petal.drift;

      petal.rotation +=
        petal.rotationSpeed;

      context.save();

      context.translate(
        petal.x,
        petal.y
      );

      context.rotate(
        petal.rotation
      );

      context.globalAlpha =
        petal.opacity;

      context.beginPath();

      context.ellipse(
        0,
        0,
        petal.size,
        petal.size * 0.55,
        0,
        0,
        Math.PI * 2
      );

      context.fill();

      context.restore();
    }
  );

  petals =
    petals.filter(
      (petal) =>
        petal.y <
          height + 30 &&
        petal.x >
          -50 &&
        petal.x <
          width + 50
    );

  if (petals.length > 0) {

    petalAnimationFrame =
      requestAnimationFrame(
        animatePetals
      );

  } else {

    petalAnimationFrame =
      null;
  }
}


function startPetalEffect() {

  if (!petalCanvas) {
    return;
  }

  resizePetalCanvas();

  const width =
    petalCanvas.clientWidth;

  const height =
    petalCanvas.clientHeight;

  for (
    let i = 0;
    i < 45;
    i++
  ) {

    const petal =
      createPetal(
        width,
        height
      );

    petal.y =
      Math.random() *
      height *
      0.35;

    petals.push(
      petal
    );
  }

  if (
    !petalAnimationFrame
  ) {

    animatePetals();
  }
}


if (pushpanjali) {

  pushpanjali.addEventListener(
    "click",
    async () => {

      startPetalEffect();

      if (bellAudio) {

        try {

          bellAudio.currentTime = 0;

          await bellAudio.play();

        } catch (error) {

          console.warn(
            "Bell playback was blocked:",
            error
          );
        }
      }
    }
  );
}


window.addEventListener(
  "resize",
  resizePetalCanvas
);


// ============================================================
// WEBRTC LIVE DARSHAN
// ============================================================

const broadcastRef =
  ref(
    db,
    "pandal/broadcast"
  );

let viewerId =
  sessionStorage.getItem(
    "ganpatiViewerId"
  );


if (!viewerId) {

  viewerId =
    "viewer_" +
    crypto.randomUUID();

  sessionStorage.setItem(
    "ganpatiViewerId",
    viewerId
  );
}


let currentBroadcastId =
  null;

let currentSessionId =
  null;

let peerConnection =
  null;

let viewerRef =
  null;

let signalRef =
  null;

let removeAnswerListener =
  null;

let removeClosedListener =
  null;


// ============================================================
// WEBRTC CONFIGURATION
// ============================================================

const rtcConfiguration = {

  iceServers: [
    {
      urls:
        "stun:stun.l.google.com:19302"
    }
  ]

};


// ============================================================
// STREAM UI
// ============================================================

function showOfflineStream() {

  if (activeStreamUI) {

    activeStreamUI.classList.add(
      "hidden"
    );

    activeStreamUI.style.display =
      "none";
  }

  if (offlineStreamUI) {

    offlineStreamUI.style.display =
      "";
  }

  if (liveVideo) {

    liveVideo.srcObject =
      null;
  }
}


function showActiveStream() {

  if (offlineStreamUI) {

    offlineStreamUI.style.display =
      "none";
  }

  if (activeStreamUI) {

    activeStreamUI.classList.remove(
      "hidden"
    );

    activeStreamUI.style.display =
      "";
  }
}


// ============================================================
// CLEANUP WEBRTC SESSION
// ============================================================

async function cleanupViewerSession() {

  const oldViewerRef =
    viewerRef;

  const oldSignalRef =
    signalRef;

  const oldSessionId =
    currentSessionId;

  currentBroadcastId =
    null;

  currentSessionId =
    null;

  viewerRef =
    null;

  signalRef =
    null;


  if (removeAnswerListener) {

    removeAnswerListener();

    removeAnswerListener =
      null;
  }


  if (removeClosedListener) {

    removeClosedListener();

    removeClosedListener =
      null;
  }


  if (peerConnection) {

    try {

      peerConnection.onicecandidate =
        null;

      peerConnection.ontrack =
        null;

      peerConnection.onconnectionstatechange =
        null;

      peerConnection.close();

    } catch (error) {

      console.warn(
        "Peer cleanup error:",
        error
      );
    }

    peerConnection =
      null;
  }


  if (liveVideo) {

    liveVideo.srcObject =
      null;
  }


  if (oldViewerRef) {

    try {

      await update(
        oldViewerRef,
        {
          active: false
        }
      );

    } catch (error) {

      console.warn(
        "Viewer cleanup failed:",
        error
      );
    }
  }


  if (oldSignalRef && oldSessionId) {

    try {

      await update(
        oldSignalRef,
        {
          closed: true
        }
      );

    } catch (error) {

      console.warn(
        "Signal cleanup failed:",
        error
      );
    }
  }
}


// ============================================================
// CONNECT VIEWER TO BROADCAST
// ============================================================

async function connectToBroadcast(
  broadcastId
) {

  if (!broadcastId) {
    return;
  }


  if (
    currentBroadcastId ===
      broadcastId &&
    peerConnection
  ) {

    return;
  }


  await cleanupViewerSession();


  currentBroadcastId =
    broadcastId;

  currentSessionId =
    crypto.randomUUID();


  const sessionId =
    currentSessionId;


  viewerRef =
    ref(
      db,
      `pandal/viewers/${viewerId}`
    );


  signalRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}`
    );


  try {

    // --------------------------------------------------------
    // VIEWER PRESENCE
    // --------------------------------------------------------

    await set(
      viewerRef,
      {
        active: true,
        broadcastId:
          broadcastId,
        sessionId:
          sessionId,
        updatedAt:
          serverTimestamp()
      }
    );


    await onDisconnect(
      viewerRef
    ).update({
      active: false
    });


    // --------------------------------------------------------
    // CREATE PEER CONNECTION
    // --------------------------------------------------------

    peerConnection =
      new RTCPeerConnection(
        rtcConfiguration
      );


    const pc =
      peerConnection;


    // --------------------------------------------------------
    // REMOTE VIDEO / AUDIO
    // --------------------------------------------------------

    pc.ontrack =
      (event) => {

        if (!liveVideo) {
          return;
        }

        if (
          event.streams &&
          event.streams[0]
        ) {

          liveVideo.srcObject =
            event.streams[0];

          showActiveStream();

          liveVideo
            .play()
            .catch(
              () => {}
            );
        }
      };


    // --------------------------------------------------------
    // VIEWER ICE
    // --------------------------------------------------------

    pc.onicecandidate =
      async (event) => {

        if (
          !event.candidate
        ) {
          return;
        }

        try {

          const candidateRef =
            push(
              ref(
                db,
                `pandal/signals/${viewerId}/${sessionId}/viewerCandidates`
              )
            );


          await set(
            candidateRef,
            {
              candidate:
                event.candidate
                  .candidate,

              sdpMid:
                event.candidate
                  .sdpMid,

              sdpMLineIndex:
                event.candidate
                  .sdpMLineIndex,

              usernameFragment:
                event.candidate
                  .usernameFragment ||
                null
            }
          );

        } catch (error) {

          console.error(
            "Viewer ICE error:",
            error
          );
        }
      };


    // --------------------------------------------------------
    // CONNECTION STATE
    // --------------------------------------------------------

    pc.onconnectionstatechange =
      () => {

        console.log(
          "WebRTC:",
          pc.connectionState
        );


        if (
          pc.connectionState ===
            "failed" ||
          pc.connectionState ===
            "closed" ||
          pc.connectionState ===
            "disconnected"
        ) {

          if (
            currentSessionId ===
            sessionId
          ) {

            showOfflineStream();
          }
        }
      };


    // --------------------------------------------------------
    // ADMIN ANSWER
    // --------------------------------------------------------

    const answerRef =
      ref(
        db,
        `pandal/signals/${viewerId}/${sessionId}/answer`
      );


    removeAnswerListener =
      onValue(
        answerRef,
        async (snapshot) => {

          if (
            !snapshot.exists()
          ) {
            return;
          }


          if (
            currentSessionId !==
              sessionId ||
            !peerConnection
          ) {

            return;
          }


          const answer =
            snapshot.val();


          if (
            !answer ||
            !answer.sdp
          ) {

            return;
          }


          try {

            if (
              pc.signalingState ===
              "have-local-offer"
            ) {

              await pc.setRemoteDescription(
                new RTCSessionDescription(
                  {
                    type:
                      "answer",

                    sdp:
                      answer.sdp
                  }
                )
              );
            }

          } catch (error) {

            console.error(
              "WebRTC answer error:",
              error
            );
          }
        }
      );


    // --------------------------------------------------------
    // BROADCASTER ICE
    // --------------------------------------------------------

    const broadcasterCandidatesRef =
      ref(
        db,
        `pandal/signals/${viewerId}/${sessionId}/broadcasterCandidates`
      );


    onChildAdded(
      broadcasterCandidatesRef,
      async (snapshot) => {

        if (
          currentSessionId !==
            sessionId ||
          !peerConnection
        ) {

          return;
        }


        const candidate =
          snapshot.val();


        if (
          !candidate ||
          !candidate.candidate
        ) {

          return;
        }


        try {

          await peerConnection
            .addIceCandidate(
              new RTCIceCandidate(
                {
                  candidate:
                    candidate.candidate,

                  sdpMid:
                    candidate.sdpMid ??
                    null,

                  sdpMLineIndex:
                    candidate.sdpMLineIndex ??
                    null,

                  usernameFragment:
                    candidate.usernameFragment ??
                    null
                }
              )
            );

        } catch (error) {

          console.warn(
            "Broadcaster ICE error:",
            error
          );
        }
      }
    );


    // --------------------------------------------------------
    // CLOSED SIGNAL
    // --------------------------------------------------------

    const closedRef =
      ref(
        db,
        `pandal/signals/${viewerId}/${sessionId}/closed`
      );


    removeClosedListener =
      onValue(
        closedRef,
        async (snapshot) => {

          if (
            snapshot.val() === true &&
            currentSessionId ===
              sessionId
          ) {

            showOfflineStream();

            await cleanupViewerSession();
          }
        }
      );


    // --------------------------------------------------------
    // CREATE OFFER
    // --------------------------------------------------------

    const offer =
      await pc.createOffer(
        {
          offerToReceiveAudio:
            true,

          offerToReceiveVideo:
            true
        }
      );


    await pc.setLocalDescription(
      offer
    );


    // --------------------------------------------------------
    // WRITE OFFER
    // --------------------------------------------------------

    await set(
      ref(
        db,
        `pandal/signals/${viewerId}/${sessionId}/offer`
      ),
      {
        type:
          "offer",

        sdp:
          offer.sdp
      }
    );


    showActiveStream();


    console.log(
      "Viewer WebRTC session:",
      sessionId
    );

  } catch (error) {

    console.error(
      "WebRTC connection error:",
      error
    );

    showOfflineStream();

    await cleanupViewerSession();
  }
}


// ============================================================
// BROADCAST LISTENER
// ============================================================

onValue(
  broadcastRef,
  async (snapshot) => {

    const broadcast =
      snapshot.val();


    if (
      !broadcast ||
      broadcast.active !== true ||
      !broadcast.broadcastId
    ) {

      showOfflineStream();


      if (
        currentBroadcastId ||
        peerConnection
      ) {

        await cleanupViewerSession();
      }

      return;
    }


    const broadcastId =
      String(
        broadcast.broadcastId
      );


    if (
      currentBroadcastId ===
        broadcastId &&
      peerConnection
    ) {

      return;
    }


    await connectToBroadcast(
      broadcastId
    );
  },
  (error) => {

    console.error(
      "Broadcast listener error:",
      error
    );

    showOfflineStream();
  }
);


// ============================================================
// INITIAL STATE
// ============================================================

showOfflineStream();


// ============================================================
// PAGE CLEANUP
// ============================================================

window.addEventListener(
  "pagehide",
  () => {

    if (peerConnection) {

      try {

        peerConnection.close();

      } catch (error) {

        console.warn(
          "Peer close error:",
          error
        );
      }
    }


    peerConnection =
      null;


    if (liveVideo) {

      liveVideo.srcObject =
        null;
    }
  }
);


// ============================================================
// END OF APP.JS
// ============================================================
