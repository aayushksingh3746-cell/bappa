/* =========================================================
   GANPATI DIGITAL DARSHAN — PUBLIC APP
   Firebase RTDB + Sankalp + Announcements + Aarti + WebRTC
========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  remove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* =========================================================
   FIREBASE CONFIG
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",

  authDomain:
    "ganpati-5f24e.firebaseapp.com",

  databaseURL:
    "https://ganpati-5f24e-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId:
    "ganpati-5f24e",

  storageBucket:
    "ganpati-5f24e.firebasestorage.app",

  messagingSenderId:
    "512949354669",

  appId:
    "1:512949354669:web:f561488c630203a9ae4624"
};


/* =========================================================
   INITIALIZE FIREBASE
========================================================= */

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

console.log("Ganpati Digital Darshan initialized");


/* =========================================================
   HELPER
========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   PRELOADER
========================================================= */

let preloaderHidden = false;

function hidePreloader() {

  if (preloaderHidden) return;

  const preloader = $("preloader");

  if (!preloader) return;

  preloaderHidden = true;

  preloader.classList.add("done");

  setTimeout(() => {

    if (preloader.parentNode) {
      preloader.remove();
    }

  }, 900);

}


window.addEventListener("load", () => {

  setTimeout(
    hidePreloader,
    500
  );

});


setTimeout(
  hidePreloader,
  2500
);


/* =========================================================
   COUNTDOWN
========================================================= */

/*
  Change this date if your countdown should target
  another Ganpati event / visarjan date.
*/

const COUNTDOWN_DATE =
  "2026-09-24T00:00:00+05:30";


function updateCountdown() {

  const countdown = $("countdown");

  if (!countdown) return;

  const target =
    new Date(COUNTDOWN_DATE).getTime();

  const difference =
    target - Date.now();


  if (difference <= 0) {

    countdown.innerHTML = `
      <div class="countdown-finished">
        Ganpati Bappa Pudhchya Varshi Lavkar Ya 🙏
      </div>
    `;

    return;

  }


  const days =
    Math.floor(
      difference / 86400000
    );

  const hours =
    Math.floor(
      (difference / 3600000) % 24
    );

  const minutes =
    Math.floor(
      (difference / 60000) % 60
    );

  const seconds =
    Math.floor(
      (difference / 1000) % 60
    );


  const daysEl = $("days");
  const hoursEl = $("hours");
  const minutesEl = $("minutes");
  const secondsEl = $("seconds");


  if (daysEl) {
    daysEl.textContent =
      String(days).padStart(2, "0");
  }

  if (hoursEl) {
    hoursEl.textContent =
      String(hours).padStart(2, "0");
  }

  if (minutesEl) {
    minutesEl.textContent =
      String(minutes).padStart(2, "0");
  }

  if (secondsEl) {
    secondsEl.textContent =
      String(seconds).padStart(2, "0");
  }

}


updateCountdown();

const countdownTimer =
  setInterval(
    updateCountdown,
    1000
  );


/* =========================================================
   SANKALP
========================================================= */

const prayerForm =
  $("prayerForm");

const prayerInput =
  $("prayerInput");

const prayerStatus =
  $("prayerStatus");

const prayerWall =
  $("prayerWall");


function setPrayerStatus(message) {

  if (prayerStatus) {
    prayerStatus.textContent =
      message;
  }

}


if (prayerForm) {

  prayerForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const text =
        prayerInput?.value.trim();


      if (!text) {

        setPrayerStatus(
          "Please write your Sankalp."
        );

        prayerInput?.focus();

        return;

      }


      if (text.length > 50) {

        setPrayerStatus(
          "Maximum 50 characters allowed."
        );

        return;

      }


      setPrayerStatus(
        "Offering your Sankalp..."
      );


      try {

        const prayerRef =
          push(
            ref(
              database,
              "pandal/prayers_wall"
            )
          );


        await set(
          prayerRef,
          {
            text,
            createdAt: Date.now()
          }
        );


        prayerForm.reset();


        setPrayerStatus(
          "Your Sankalp has been offered 🙏"
        );


        setTimeout(() => {

          if (
            prayerStatus &&
            prayerStatus.textContent ===
              "Your Sankalp has been offered 🙏"
          ) {

            prayerStatus.textContent = "";

          }

        }, 3500);

      }

      catch (error) {

        console.error(
          "Sankalp error:",
          error
        );


        setPrayerStatus(
          "Unable to offer your Sankalp right now. Please try again."
        );

      }

    }
  );

}


/* =========================================================
   SANKALP WALL
========================================================= */

const prayerIds =
  new Set();


if (prayerWall) {

  onChildAdded(
    ref(
      database,
      "pandal/prayers_wall"
    ),

    snapshot => {

      const data =
        snapshot.val();


      if (!data) return;


      if (
        prayerIds.has(snapshot.key)
      ) {

        return;

      }


      prayerIds.add(snapshot.key);


      const item =
        document.createElement("article");

      /*
        Keep both classes so this works with
        your existing CSS and the new naming.
      */

      item.className =
        "prayer-card prayer-item";


      const text =
        document.createElement("p");

      text.textContent =
        data.text || "";


      const label =
        document.createElement("small");

      label.textContent =
        "🙏 Sankalp";


      item.appendChild(text);
      item.appendChild(label);


      prayerWall.prepend(item);


      while (
        prayerWall.children.length > 50
      ) {

        prayerWall.lastElementChild.remove();

      }

    },

    error => {

      console.error(
        "Prayer wall error:",
        error
      );

    }
  );

}


/* =========================================================
   HERO SANKALP BUTTON
========================================================= */

$("heroSankalp")?.addEventListener(
  "click",
  () => {

    const section =
      $("sankalp");


    if (!section) return;


    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });


    setTimeout(() => {

      prayerInput?.focus();

    }, 650);

  }
);


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

const announcements =
  $("announcements");


if (announcements) {

  const announcementIds =
    new Set();


  onChildAdded(
    ref(
      database,
      "pandal/announcements"
    ),

    snapshot => {

      const data =
        snapshot.val();


      if (!data) return;


      if (
        announcementIds.has(snapshot.key)
      ) {

        return;

      }


      announcementIds.add(
        snapshot.key
      );


      const article =
        document.createElement("article");

      article.className =
        "announcement-item";


      const title =
        document.createElement("h3");

      title.textContent =
        data.title ||
        "Announcement";


      const message =
        document.createElement("p");

      message.textContent =
        data.message || "";


      article.appendChild(title);
      article.appendChild(message);


      announcements.prepend(
        article
      );

    },

    error => {

      console.error(
        "Announcements error:",
        error
      );

    }
  );

}


/* =========================================================
   AARTI PLAYER
========================================================= */

/*
  Playlist order follows the tracks you supplied.
*/

const tracks = [

  {
    title:
      "Sukhkarta Dukhharta",

    src:
      "assets/Keshav_Kumar_-_Sukhkarta_Dukhharta_(mp3.pm).mp3"
  },

  {
    title:
      "Jai Ganesh Deva",

    src:
      "assets/Kumar_Vishu_Vandana_Vajpai_-_Jai_Ganesh_Jai_Ganesh_Deva_(mp3.pm).mp3"
  },

  {
    title:
      "Shendur Laal Chadhayo",

    src:
      "assets/Shendur Laal Chadhayo Aarti 128 Kbps.mp3"
  },

  {
    title:
      "Shree Ganeshay Dheemahi",

    src:
      "assets/Viruddh_-_Shree_Ganeshay_Dheemahi_(mp3.pm).mp3"
  },

  {
    title:
      "Gajanana",

    src:
      "assets/Gajanana.mp3"
  },

  {
    title:
      "Deva Ho Deva",

    src:
      "assets/Ganpati Bappa Moriya Humse Badhkar Kaun 128 Kbps.mp3"
  },

  {
    title:
      "Jalwa",

    src:
      "assets/Jalwa Mera Hi Jalwa Wanted 128 Kbps.mp3"
  },

  {
    title:
      "Morya Re (Don)",

    src:
      "assets/Maurya Re Don 2006 128 Kbps.mp3"
  },

  {
    title:
      "Suno Ganpati Bappa Morya",

    src:
      "assets/Suno Ganpati Bappa Morya Judwaa 2 128 Kbps.mp3"
  }

];


const audio =
  $("aartiAudio");

const trackTitle =
  $("trackTitle");

const trackNumber =
  $("trackNumber");

const trackList =
  $("trackList");

const playPause =
  $("playPause");

const playIcon =
  $("playIcon");

const progress =
  $("progress");

const currentTime =
  $("currentTime");

const duration =
  $("duration");


let currentTrack = 0;


function formatTime(seconds) {

  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {

    return "0:00";

  }


  const minutes =
    Math.floor(seconds / 60);

  const secondsPart =
    Math.floor(seconds % 60);


  return (
    minutes +
    ":" +
    String(secondsPart).padStart(2, "0")
  );

}


/* =========================================================
   AUDIO UI
========================================================= */

function setPlayingUI(isPlaying) {

  if (playIcon) {

    playIcon.textContent =
      isPlaying
        ? "❚❚"
        : "▶";

  }


  if (playPause) {

    playPause.setAttribute(
      "aria-label",
      isPlaying
        ? "Pause"
        : "Play"
    );

  }

}


function updateTrackList() {

  if (!trackList) return;


  trackList
    .querySelectorAll("[data-track]")
    .forEach(button => {

      const isActive =
        Number(button.dataset.track) ===
        currentTrack;


      button.classList.toggle(
        "active",
        isActive
      );

      button.setAttribute(
        "aria-current",
        isActive
          ? "true"
          : "false"
      );

    });

}


/* =========================================================
   LOAD TRACK
========================================================= */

function loadTrack(
  index,
  autoplay = false
) {

  if (!audio) return;


  if (
    index < 0 ||
    index >= tracks.length
  ) {

    index = 0;

  }


  currentTrack =
    index;


  const track =
    tracks[currentTrack];


  audio.pause();


  audio.src =
    track.src;


  audio.load();


  if (trackTitle) {

    trackTitle.textContent =
      track.title;

  }


  if (trackNumber) {

    trackNumber.textContent =
      `${currentTrack + 1} / ${tracks.length}`;

  }


  if (progress) {

    progress.value = 0;

  }


  if (currentTime) {

    currentTime.textContent =
      "0:00";

  }


  if (duration) {

    duration.textContent =
      "0:00";

  }


  setPlayingUI(false);

  updateTrackList();


  if (autoplay) {

    audio.play()
      .then(() => {

        setPlayingUI(true);

      })
      .catch(error => {

        console.warn(
          "Autoplay/playback blocked:",
          error
        );

        setPlayingUI(false);

      });

  }

}


/* =========================================================
   BUILD TRACK LIST
========================================================= */

if (trackList) {

  trackList.innerHTML = "";


  tracks.forEach(
    (track, index) => {

      const button =
        document.createElement("button");


      button.type =
        "button";


      button.className =
        "track-item";


      button.dataset.track =
        index;


      button.textContent =
        `${index + 1}. ${track.title}`;


      button.addEventListener(
        "click",
        () => {

          loadTrack(
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


/* =========================================================
   PLAY / PAUSE
========================================================= */

playPause?.addEventListener(
  "click",
  async () => {

    if (!audio) return;


    try {

      if (audio.paused) {

        await audio.play();

        setPlayingUI(true);

      }

      else {

        audio.pause();

        setPlayingUI(false);

      }

    }

    catch (error) {

      console.error(
        "Audio playback error:",
        error
      );

    }

  }
);


/* =========================================================
   AUDIO EVENTS
========================================================= */

audio?.addEventListener(
  "loadedmetadata",
  () => {

    if (duration) {

      duration.textContent =
        formatTime(audio.duration);

    }

  }
);


audio?.addEventListener(
  "timeupdate",
  () => {

    if (currentTime) {

      currentTime.textContent =
        formatTime(
          audio.currentTime
        );

    }


    if (
      progress &&
      Number.isFinite(audio.duration) &&
      audio.duration > 0
    ) {

      progress.value =
        (
          audio.currentTime /
          audio.duration
        ) * 100;

    }

  }
);


audio?.addEventListener(
  "play",
  () => {

    setPlayingUI(true);

  }
);


audio?.addEventListener(
  "pause",
  () => {

    setPlayingUI(false);

  }
);


audio?.addEventListener(
  "error",
  () => {

    console.error(
      "Unable to load audio:",
      tracks[currentTrack]?.src
    );

    setPlayingUI(false);

  }
);


/* =========================================================
   PROGRESS SEEK
========================================================= */

progress?.addEventListener(
  "input",
  () => {

    if (
      !audio ||
      !Number.isFinite(audio.duration) ||
      audio.duration <= 0
    ) {

      return;

    }


    audio.currentTime =
      (
        Number(progress.value) /
        100
      ) *
      audio.duration;

  }
);


/* =========================================================
   AUTO NEXT TRACK
========================================================= */

audio?.addEventListener(
  "ended",
  () => {

    const nextTrack =
      (
        currentTrack + 1
      ) %
      tracks.length;


    loadTrack(
      nextTrack,
      true
    );

  }
);


/* Initial track */

loadTrack(0);


/* =========================================================
   PUSHPANJALI
========================================================= */

const pushpanjali =
  $("pushpanjali");

const petalCanvas =
  $("petalCanvas");

const bellAudio =
  $("bellAudio");


let petalContext = null;
let petals = [];
let petalAnimationFrame = null;
let petalAnimationTimeout = null;


function resizePetalCanvas() {

  if (!petalCanvas) return;


  const ratio =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );


  petalCanvas.width =
    window.innerWidth * ratio;

  petalCanvas.height =
    window.innerHeight * ratio;


  petalCanvas.style.width =
    `${window.innerWidth}px`;

  petalCanvas.style.height =
    `${window.innerHeight}px`;


  if (petalContext) {

    petalContext.setTransform(
      ratio,
      0,
      0,
      ratio,
      0,
      0
    );

  }

}


function setupPetals() {

  if (!petalCanvas) return;


  petalContext =
    petalCanvas.getContext("2d");


  resizePetalCanvas();


  window.addEventListener(
    "resize",
    resizePetalCanvas
  );

}


function createPetals() {

  if (!petalCanvas) return;


  petals = [];


  for (
    let i = 0;
    i < 70;
    i++
  ) {

    petals.push({

      x:
        Math.random() *
        window.innerWidth,

      y:
        -Math.random() *
        window.innerHeight,

      size:
        5 + Math.random() * 8,

      speed:
        1 + Math.random() * 3,

      rotation:
        Math.random() *
        Math.PI *
        2,

      rotationSpeed:
        -0.04 +
        Math.random() *
        0.08,

      drift:
        -0.8 +
        Math.random() *
        1.6

    });

  }

}


function stopPetalAnimation() {

  if (petalAnimationFrame) {

    cancelAnimationFrame(
      petalAnimationFrame
    );

    petalAnimationFrame =
      null;

  }

  petals = [];

  if (petalContext) {

    petalContext.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );

  }

}


function animatePetals() {

  if (
    !petalContext ||
    petals.length === 0
  ) {

    petalAnimationFrame =
      null;

    return;

  }


  petalContext.clearRect(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );


  petals.forEach(
    petal => {

      petal.y +=
        petal.speed;

      petal.x +=
        petal.drift;

      petal.rotation +=
        petal.rotationSpeed;


      if (
        petal.y >
        window.innerHeight + 20
      ) {

        petal.y =
          -20;

      }


      petalContext.save();


      petalContext.translate(
        petal.x,
        petal.y
      );


      petalContext.rotate(
        petal.rotation
      );


      petalContext.fillStyle =
        "rgba(203,161,83,.85)";


      petalContext.beginPath();


      petalContext.ellipse(
        0,
        0,
        petal.size,
        petal.size * 0.55,
        0,
        0,
        Math.PI * 2
      );


      petalContext.fill();


      petalContext.restore();

    }
  );


  petalAnimationFrame =
    requestAnimationFrame(
      animatePetals
    );

}


pushpanjali?.addEventListener(
  "click",
  () => {

    if (bellAudio) {

      bellAudio.currentTime =
        0;

      bellAudio.play()
        .catch(() => {});

    }


    createPetals();


    petalCanvas?.classList.add(
      "active"
    );


    if (!petalAnimationFrame) {

      animatePetals();

    }


    clearTimeout(
      petalAnimationTimeout
    );


    petalAnimationTimeout =
      setTimeout(
        () => {

          petalCanvas?.classList.remove(
            "active"
          );

          stopPetalAnimation();

        },
        5000
      );

  }
);


setupPetals();


/* =========================================================
   WEBRTC LIVE DARSHAN
========================================================= */

const liveVideo =
  $("liveVideo");

const activeStreamUI =
  $("active-stream-ui");

const offlineStreamUI =
  $("offline-stream-ui");


let viewerId = null;
let viewerPeer = null;

let viewerSignalsStarted =
  false;

let remoteDescriptionSet =
  false;

let candidateQueue = [];

let currentBroadcastActive =
  false;


/* =========================================================
   SHOW / HIDE STREAM
========================================================= */

function showOffline() {

  activeStreamUI
    ?.classList.add("hidden");

  offlineStreamUI
    ?.classList.remove("hidden");


  if (liveVideo) {

    liveVideo.pause();

    liveVideo.srcObject =
      null;

  }

}


function showLive() {

  offlineStreamUI
    ?.classList.add("hidden");

  activeStreamUI
    ?.classList.remove("hidden");

}


/* =========================================================
   BROADCAST STATUS
========================================================= */

onValue(
  ref(
    database,
    "pandal/broadcast"
  ),

  snapshot => {

    const data =
      snapshot.val();


    const isActive =
      data?.active === true;


    if (
      isActive ===
      currentBroadcastActive
    ) {

      return;

    }


    currentBroadcastActive =
      isActive;


    if (currentBroadcastActive) {

      showLive();

      startViewer();

    }

    else {

      showOffline();

      closeViewer();

    }

  },

  error => {

    console.error(
      "Broadcast status error:",
      error
    );


    currentBroadcastActive =
      false;

    showOffline();

  }
);


/* =========================================================
   CREATE VIEWER ID
========================================================= */

function createViewerId() {

  return (
    "viewer_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );

}


/* =========================================================
   START VIEWER
========================================================= */

async function startViewer() {

  if (
    viewerPeer ||
    !currentBroadcastActive
  ) {

    return;

  }


  try {

    viewerId =
      createViewerId();


    viewerSignalsStarted =
      false;

    remoteDescriptionSet =
      false;

    candidateQueue = [];


    viewerPeer =
      new RTCPeerConnection({

        iceServers: [

          {
            urls:
              "stun:stun.l.google.com:19302"
          }

        ]

      });


    const peer =
      viewerPeer;


    /* -----------------------------------------------------
       REMOTE VIDEO
    ----------------------------------------------------- */

    peer.ontrack =
      event => {

        const stream =
          event.streams?.[0];


        if (
          !stream ||
          viewerPeer !== peer
        ) {

          return;

        }


        if (liveVideo) {

          liveVideo.srcObject =
            stream;

          liveVideo.autoplay =
            true;

          liveVideo.playsInline =
            true;

          liveVideo.play()
            .catch(() => {});

        }


        showLive();

      };


    /* -----------------------------------------------------
       VIEWER ICE
    ----------------------------------------------------- */

    peer.onicecandidate =
      event => {

        if (
          !event.candidate ||
          !viewerId ||
          viewerPeer !== peer
        ) {

          return;

        }


        push(
          ref(
            database,
            `pandal/signals/${viewerId}/viewerCandidates`
          ),
          event.candidate.toJSON()
        )
        .catch(error => {

          console.error(
            "Viewer ICE error:",
            error
          );

        });

      };


    /* -----------------------------------------------------
       CONNECTION STATE
    ----------------------------------------------------- */

    peer.onconnectionstatechange =
      () => {

        if (
          viewerPeer !== peer
        ) {

          return;

        }


        const state =
          peer.connectionState;


        console.log(
          "Viewer connection:",
          state
        );


        if (
          state === "failed" ||
          state === "closed"
        ) {

          closeViewer();

        }

      };


    /* -----------------------------------------------------
       REGISTER VIEWER
    ----------------------------------------------------- */

    await set(
      ref(
        database,
        `pandal/viewers/${viewerId}`
      ),
      {
        createdAt:
          Date.now()
      }
    );


    listenForViewerSignals();

  }

  catch (error) {

    console.error(
      "Viewer startup error:",
      error
    );


    closeViewer();

  }

}


/* =========================================================
   VIEWER SIGNALS
========================================================= */

function listenForViewerSignals() {

  if (
    viewerSignalsStarted ||
    !viewerId
  ) {

    return;

  }


  viewerSignalsStarted =
    true;


  const signalPath =
    `pandal/signals/${viewerId}`;


  /* =======================================================
     OFFER
  ======================================================= */

  onValue(
    ref(
      database,
      `${signalPath}/offer`
    ),

    async snapshot => {

      const offer =
        snapshot.val();


      if (
        !offer ||
        !viewerPeer ||
        remoteDescriptionSet
      ) {

        return;

      }


      try {

        await viewerPeer
          .setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          );


        remoteDescriptionSet =
          true;


        /*
          ICE candidates received before
          the offer are now safe to add.
        */

        for (
          const candidate
          of candidateQueue
        ) {

          try {

            await viewerPeer
              .addIceCandidate(
                candidate
              );

          }

          catch (error) {

            console.warn(
              "Queued ICE candidate failed:",
              error
            );

          }

        }


        candidateQueue = [];


        const answer =
          await viewerPeer
            .createAnswer();


        await viewerPeer
          .setLocalDescription(
            answer
          );


        await set(
          ref(
            database,
            `${signalPath}/answer`
          ),
          {
            type:
              answer.type,

            sdp:
              answer.sdp
          }
        );

      }

      catch (error) {

        console.error(
          "Offer handling error:",
          error
        );

      }

    }
  );


  /* =======================================================
     BROADCASTER ICE
  ======================================================= */

  onChildAdded(
    ref(
      database,
      `${signalPath}/broadcasterCandidates`
    ),

    async snapshot => {

      const data =
        snapshot.val();


      if (
        !data ||
        !viewerPeer
      ) {

        return;

      }


      try {

        const candidate =
          new RTCIceCandidate(
            data
          );


        if (!remoteDescriptionSet) {

          candidateQueue.push(
            candidate
          );

          return;

        }


        await viewerPeer
          .addIceCandidate(
            candidate
          );

      }

      catch (error) {

        console.error(
          "Broadcaster ICE error:",
          error
        );

      }

    }
  );


  /* =======================================================
     CLOSED SIGNAL
  ======================================================= */

  onValue(
    ref(
      database,
      `${signalPath}/closed`
    ),

    snapshot => {

      if (
        snapshot.val() === true
      ) {

        closeViewer();

      }

    }
  );

}


/* =========================================================
   CLOSE VIEWER
========================================================= */

async function closeViewer() {

  const oldViewerId =
    viewerId;


  viewerId =
    null;

  viewerSignalsStarted =
    false;

  remoteDescriptionSet =
    false;

  candidateQueue = [];


  const peer =
    viewerPeer;


  viewerPeer =
    null;


  if (peer) {

    try {

      peer.ontrack =
        null;

      peer.onicecandidate =
        null;

      peer.onconnectionstatechange =
        null;

      peer.close();

    }

    catch (_) {}

  }


  if (liveVideo) {

    liveVideo.pause();

    liveVideo.srcObject =
      null;

  }


  if (oldViewerId) {

    try {

      await remove(
        ref(
          database,
          `pandal/viewers/${oldViewerId}`
        )
      );

    }

    catch (error) {

      console.warn(
        "Viewer cleanup failed:",
        error
      );

    }

  }


  if (
    !currentBroadcastActive
  ) {

    showOffline();

  }

}


/* =========================================================
   CLEANUP ON PAGE EXIT
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    const id =
      viewerId;


    if (!id) return;


    remove(
      ref(
        database,
        `pandal/viewers/${id}`
      )
    )
    .catch(() => {});

  }
);


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    /*
      Do not destroy WebRTC when the user
      temporarily switches tabs. Browsers
      can continue the connection in the
      background.
    */

    if (
      document.visibilityState ===
      "visible" &&
      currentBroadcastActive &&
      !viewerPeer
    ) {

      startViewer();

    }

  }
);
