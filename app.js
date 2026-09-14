// ============================================================
// GANPATI PANDAL — app.js
// Firebase + Sankalp + Aarti + Pushpanjali + WebRTC Viewer
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  set,
  onChildAdded,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624"
};


// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

let firebaseApp = null;
let database = null;

try {

  firebaseApp = initializeApp(firebaseConfig);
  database = getDatabase(firebaseApp);

  console.log("Firebase initialized successfully.");

} catch (error) {

  console.error(
    "Firebase initialization failed:",
    error
  );

}


// ============================================================
// HELPER
// ============================================================

const $ = (selector) =>
  document.querySelector(selector);


const byId = (id) =>
  document.getElementById(id);


function safeText(value) {

  return String(value ?? "")
    .replace(/[&<>"']/g, function (character) {

      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];

    });

}


// ============================================================
// PRELOADER
// ============================================================

function hidePreloader() {

  const preloader =
    byId("preloader");

  if (!preloader) {
    return;
  }

  preloader.classList.add("done");

  setTimeout(function () {

    if (
      preloader &&
      preloader.parentNode
    ) {

      preloader.remove();

    }

  }, 900);

}


// These are only backup handlers.
// index.html already contains an independent preloader.

window.addEventListener(
  "load",
  function () {

    setTimeout(
      hidePreloader,
      500
    );

  }
);

setTimeout(
  hidePreloader,
  2500
);


// ============================================================
// COUNTDOWN
// Target: 24 September 2026, 00:00 IST
// ============================================================

function startCountdown() {

  const days =
    byId("days");

  const hours =
    byId("hours");

  const minutes =
    byId("minutes");

  const seconds =
    byId("seconds");

  const countdown =
    byId("countdown");


  if (
    !days ||
    !hours ||
    !minutes ||
    !seconds
  ) {

    return;

  }


  // IST = UTC + 05:30
  const target =
    new Date(
      "2026-09-24T00:00:00+05:30"
    ).getTime();


  function updateCountdown() {

    const now =
      Date.now();

    const difference =
      target - now;


    if (difference <= 0) {

      days.textContent = "00";
      hours.textContent = "00";
      minutes.textContent = "00";
      seconds.textContent = "00";

      if (countdown) {

        countdown.innerHTML = `
          <div class="countdown-finished">
            Ganpati Bappa Pudhchya Varshi Lavkar Ya
          </div>
        `;

      }

      return;

    }


    const totalSeconds =
      Math.floor(
        difference / 1000
      );


    const d =
      Math.floor(
        totalSeconds / 86400
      );


    const h =
      Math.floor(
        (totalSeconds % 86400) / 3600
      );


    const m =
      Math.floor(
        (totalSeconds % 3600) / 60
      );


    const s =
      totalSeconds % 60;


    days.textContent =
      String(d).padStart(2, "0");

    hours.textContent =
      String(h).padStart(2, "0");

    minutes.textContent =
      String(m).padStart(2, "0");

    seconds.textContent =
      String(s).padStart(2, "0");

  }


  updateCountdown();

  setInterval(
    updateCountdown,
    1000
  );

}


startCountdown();


// ============================================================
// SANKALP
// ============================================================

const prayerForm =
  byId("prayerForm");

const prayerInput =
  byId("prayerInput");

const prayerStatus =
  byId("prayerStatus");

const prayerWall =
  byId("prayerWall");


function setPrayerStatus(
  message,
  error = false
) {

  if (!prayerStatus) {
    return;
  }

  prayerStatus.textContent =
    message;

  prayerStatus.style.color =
    error
      ? "#d98989"
      : "";

}


function renderPrayer(
  data,
  key
) {

  if (!prayerWall) {
    return;
  }


  const text =
    safeText(data?.text);


  if (!text) {
    return;
  }


  const card =
    document.createElement("article");

  card.className =
    "prayer-card";


  card.innerHTML = `
    <div>${text}</div>
    <small>ॐ Bappa bless you</small>
  `;


  card.dataset.id =
    key || "";


  prayerWall.appendChild(card);


  // Keep wall manageable.
  while (
    prayerWall.children.length > 50
  ) {

    prayerWall.firstElementChild?.remove();

  }

}


function connectPrayerWall() {

  if (
    !database ||
    !prayerWall
  ) {

    return;

  }


  try {

    const prayersRef =
      ref(
        database,
        "pandal/prayers_wall"
      );


    onChildAdded(
      prayersRef,
      function (snapshot) {

        try {

          renderPrayer(
            snapshot.val(),
            snapshot.key
          );

        } catch (error) {

          console.error(
            "Prayer rendering error:",
            error
          );

        }

      },
      function (error) {

        console.error(
          "Prayer wall listener error:",
          error
        );

        setPrayerStatus(
          "Prayer wall is temporarily unavailable.",
          true
        );

      }
    );

  } catch (error) {

    console.error(
      "Could not connect to prayer wall:",
      error
    );

  }

}


if (prayerForm) {

  prayerForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      if (!database) {

        setPrayerStatus(
          "Prayer service is unavailable right now.",
          true
        );

        return;

      }


      const text =
        prayerInput?.value
          ?.trim();


      if (!text) {

        setPrayerStatus(
          "Please write a prayer.",
          true
        );

        return;

      }


      if (text.length > 50) {

        setPrayerStatus(
          "Prayer must be 50 characters or less.",
          true
        );

        return;

      }


      const button =
        prayerForm.querySelector(
          "button[type='submit']"
        );


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "Offering...";

      }


      setPrayerStatus(
        "Offering your prayer..."
      );


      try {

        const prayersRef =
          ref(
            database,
            "pandal/prayers_wall"
          );


        const newPrayer =
          push(prayersRef);


        await set(
          newPrayer,
          {
            text: text,
            createdAt:
              Date.now()
          }
        );


        if (prayerInput) {

          prayerInput.value =
            "";

        }


        setPrayerStatus(
          "Your Sankalp has been offered. ॐ"
        );


      } catch (error) {

        console.error(
          "Prayer submission error:",
          error
        );


        setPrayerStatus(
          "Unable to offer the prayer. Please try again.",
          true
        );

      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "Offer Prayer";

        }

      }

    }
  );

}


connectPrayerWall();


// ============================================================
// HERO SANKALP BUTTON
// ============================================================

const heroSankalp =
  byId("heroSankalp");


if (heroSankalp) {

  heroSankalp.addEventListener(
    "click",
    function () {

      const section =
        byId("sankalp");

      if (!section) {
        return;
      }


      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });


      setTimeout(
        function () {

          prayerInput?.focus();

        },
        700
      );

    }
  );

}


// ============================================================
// AARTI PLAYER
// ============================================================

const tracks = [

  {
    title: "Gajanana",
    src: "./assets/Gajanana.mp3"
  },

  {
    title: "Ganpati Bappa Moriya",
    src: "./assets/Ganpati Bappa Moriya Humse Badhkar Kaun 128 Kbps.mp3"
  },

  {
    title: "Jalwa Mera Hi Jalwa",
    src: "./assets/Jalwa Mera Hi Jalwa Wanted 128 Kbps.mp3"
  },

  {
    title: "Sukhkarta Dukhharta",
    src: "./assets/Keshav_Kumar_-_Sukhkarta_Dukhharta_(mp3.pm).mp3"
  },

  {
    title: "Jai Ganesh Jai Ganesh Deva",
    src: "./assets/Kumar_Vishu_Vandana_Vajpai_-_Jai_Ganesh_Jai_Ganesh_Deva_(mp3.pm).mp3"
  },

  {
    title: "Maurya Re",
    src: "./assets/Maurya Re Don 2006 128 Kbps.mp3"
  },

  {
    title: "Shendur Laal Chadhayo",
    src: "./assets/Shendur Laal Chadhayo Aarti 128 Kbps.mp3"
  },

  {
    title: "Suno Ganpati Bappa Morya",
    src: "./assets/Suno Ganpati Bappa Morya Judwaa 2 128 Kbps.mp3"
  },

  {
    title: "Shree Ganeshay Dheemahi",
    src: "./assets/Viruddh_-_Shree_Ganeshay_Dheemahi_(mp3.pm).mp3"
  }

];


const audio =
  byId("aartiAudio");

const playPause =
  byId("playPause");

const playIcon =
  byId("playIcon");

const progress =
  byId("progress");

const currentTimeElement =
  byId("currentTime");

const durationElement =
  byId("duration");

const trackTitle =
  byId("trackTitle");

const trackNumber =
  byId("trackNumber");

const trackList =
  byId("trackList");


let currentTrack =
  0;


function formatTime(seconds) {

  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {

    return "0:00";

  }


  const minutes =
    Math.floor(
      seconds / 60
    );


  const secs =
    Math.floor(
      seconds % 60
    );


  return (
    minutes +
    ":" +
    String(secs).padStart(2, "0")
  );

}


function renderTrackList() {

  if (!trackList) {
    return;
  }


  trackList.innerHTML =
    "";


  tracks.forEach(
    function (track, index) {

      const button =
        document.createElement("button");


      button.type =
        "button";


      button.textContent =
        `${index + 1}. ${track.title}`;


      if (
        index === currentTrack
      ) {

        button.classList.add(
          "active"
        );

      }


      button.addEventListener(
        "click",
        function () {

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


function updatePlayerUI() {

  const track =
    tracks[currentTrack];


  if (!track) {
    return;
  }


  if (trackTitle) {

    trackTitle.textContent =
      track.title;

  }


  if (trackNumber) {

    trackNumber.textContent =
      `${currentTrack + 1} / ${tracks.length}`;

  }


  if (progress) {

    progress.value =
      "0";

  }


  if (currentTimeElement) {

    currentTimeElement.textContent =
      "0:00";

  }


  if (durationElement) {

    durationElement.textContent =
      "0:00";

  }


  renderTrackList();

}


function loadTrack(
  index,
  autoplay = false
) {

  if (
    !audio ||
    !tracks[index]
  ) {

    return;

  }


  currentTrack =
    index;


  audio.src =
    tracks[index].src;

  audio.load();


  updatePlayerUI();


  if (autoplay) {

    audio.play()
      .then(
        function () {

          updatePlayButton();

        }
      )
      .catch(
        function (error) {

          console.warn(
            "Audio playback was blocked or file is unavailable:",
            error
          );

          updatePlayButton();

        }
      );

  }

}


function updatePlayButton() {

  if (!playIcon) {
    return;
  }


  playIcon.textContent =
    audio &&
    !audio.paused
      ? "❚❚"
      : "▶";


  if (playPause) {

    playPause.setAttribute(
      "aria-label",
      audio && !audio.paused
        ? "Pause"
        : "Play"
    );

  }

}


if (audio) {

  loadTrack(
    0,
    false
  );


  audio.addEventListener(
    "loadedmetadata",
    function () {

      if (durationElement) {

        durationElement.textContent =
          formatTime(
            audio.duration
          );

      }

    }
  );


  audio.addEventListener(
    "timeupdate",
    function () {

      if (
        !audio.duration ||
        !Number.isFinite(audio.duration)
      ) {

        return;

      }


      if (progress) {

        progress.value =
          String(
            (audio.currentTime /
              audio.duration) *
            100
          );

      }


      if (currentTimeElement) {

        currentTimeElement.textContent =
          formatTime(
            audio.currentTime
          );

      }

    }
  );


  audio.addEventListener(
    "play",
    updatePlayButton
  );


  audio.addEventListener(
    "pause",
    updatePlayButton
  );


  audio.addEventListener(
    "ended",
    function () {

      const next =
        currentTrack + 1;


      if (next < tracks.length) {

        loadTrack(
          next,
          true
        );

      } else {

        loadTrack(
          0,
          false
        );

      }

    }
  );


  audio.addEventListener(
    "error",
    function () {

      console.warn(
        "Audio file could not be loaded:",
        tracks[currentTrack]?.src
      );

      updatePlayButton();

    }
  );

}


if (playPause && audio) {

  playPause.addEventListener(
    "click",
    function () {

      if (audio.paused) {

        audio.play()
          .catch(
            function (error) {

              console.warn(
                "Audio playback failed:",
                error
              );

            }
          );

      } else {

        audio.pause();

      }

    }
  );

}


if (progress && audio) {

  progress.addEventListener(
    "input",
    function () {

      if (
        !audio.duration ||
        !Number.isFinite(audio.duration)
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

}


// ============================================================
// PUSHPANJALI
// ============================================================

const pushpanjali =
  byId("pushpanjali");

const bellAudio =
  byId("bellAudio");

const petalCanvas =
  byId("petalCanvas");


let petalAnimationFrame =
  null;


const petals = [];


function resizePetalCanvas() {

  if (!petalCanvas) {
    return;
  }


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
    window.innerWidth + "px";

  petalCanvas.style.height =
    window.innerHeight + "px";

}


function createPetal() {

  return {

    x:
      Math.random() *
      window.innerWidth,

    y:
      -20 -
      Math.random() *
      100,

    size:
      5 +
      Math.random() * 8,

    speed:
      1.2 +
      Math.random() * 2.3,

    drift:
      -1 +
      Math.random() * 2,

    rotation:
      Math.random() * Math.PI * 2,

    rotationSpeed:
      -.04 +
      Math.random() * .08,

    opacity:
      .55 +
      Math.random() * .4

  };

}


function drawPetals() {

  if (!petalCanvas) {
    return;
  }


  const context =
    petalCanvas.getContext("2d");


  if (!context) {
    return;
  }


  const ratio =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );


  context.setTransform(
    ratio,
    0,
    0,
    ratio,
    0,
    0
  );


  context.clearRect(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );


  for (
    let i = 0;
    i < petals.length;
    i++
  ) {

    const petal =
      petals[i];


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


    context.fillStyle =
      "#CBA153";


    context.beginPath();


    context.ellipse(
      0,
      0,
      petal.size,
      petal.size * .55,
      0,
      0,
      Math.PI * 2
    );


    context.fill();

    context.restore();


    if (
      petal.y >
      window.innerHeight + 30
    ) {

      petals[i] =
        createPetal();

    }

  }


  if (petals.length > 0) {

    petalAnimationFrame =
      requestAnimationFrame(
        drawPetals
      );

  } else {

    petalAnimationFrame =
      null;

  }

}


function startPetals() {

  if (!petalCanvas) {
    return;
  }


  resizePetalCanvas();


  for (
    let i = 0;
    i < 65;
    i++
  ) {

    const petal =
      createPetal();


    petal.y =
      Math.random() *
      window.innerHeight;


    petals.push(
      petal
    );

  }


  if (!petalAnimationFrame) {

    drawPetals();

  }


  setTimeout(
    function () {

      petals.length =
        0;

      if (
        petalAnimationFrame
      ) {

        cancelAnimationFrame(
          petalAnimationFrame
        );

        petalAnimationFrame =
          null;

      }


      if (petalCanvas) {

        const context =
          petalCanvas.getContext("2d");

        context?.clearRect(
          0,
          0,
          petalCanvas.width,
          petalCanvas.height
        );

      }

    },
    5500
  );

}


if (pushpanjali) {

  pushpanjali.addEventListener(
    "click",
    function () {

      if (bellAudio) {

        bellAudio.currentTime =
          0;


        bellAudio.play()
          .catch(
            function (error) {

              console.warn(
                "Bell playback blocked:",
                error
              );

            }
          );

      }


      startPetals();

    }
  );

}


window.addEventListener(
  "resize",
  resizePetalCanvas
);


// ============================================================
// WEBRTC VIEWER
// Firebase RTDB signaling
// ============================================================

let viewerPeerConnection =
  null;

let viewerId =
  null;

let viewerSignalRef =
  null;

let viewerSignalListener =
  null;

let viewerStarted =
  false;


const activeStreamUI =
  byId("active-stream-ui");

const offlineStreamUI =
  byId("offline-stream-ui");

const liveVideo =
  byId("liveVideo");


function showOffline() {

  activeStreamUI?.classList.add(
    "hidden"
  );

  offlineStreamUI?.classList.remove(
    "hidden"
  );

}


function showLive() {

  offlineStreamUI?.classList.add(
    "hidden"
  );

  activeStreamUI?.classList.remove(
    "hidden"
  );

}


function createViewerId() {

  return (
    "viewer_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );

}


async function closeViewerConnection() {

  try {

    if (
      viewerSignalListener &&
      viewerSignalRef
    ) {

      // Listener cleanup is handled by the
      // page lifecycle in most browsers.

      viewerSignalListener =
        null;

    }

  } catch (error) {

    console.warn(
      "Signal listener cleanup:",
      error
    );

  }


  if (viewerPeerConnection) {

    try {

      viewerPeerConnection.close();

    } catch (error) {

      console.warn(
        "Peer close error:",
        error
      );

    }

  }


  viewerPeerConnection =
    null;


  if (liveVideo) {

    try {

      liveVideo.pause();

      liveVideo.srcObject =
        null;

    } catch (error) {

      console.warn(
        "Video cleanup error:",
        error
      );

    }

  }


  viewerStarted =
    false;

}


async function startViewer() {

  if (
    viewerStarted ||
    !database ||
    !liveVideo
  ) {

    return;

  }


  viewerStarted =
    true;


  viewerId =
    createViewerId();


  try {

    viewerPeerConnection =
      new RTCPeerConnection({

        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302"
          }
        ]

      });


    viewerPeerConnection.ontrack =
      function (event) {

        if (
          event.streams &&
          event.streams[0]
        ) {

          liveVideo.srcObject =
            event.streams[0];

          showLive();

          liveVideo.play()
            .catch(
              function () {}
            );

        }

      };


    viewerPeerConnection.onconnectionstatechange =
      function () {

        const state =
          viewerPeerConnection
            ?.connectionState;


        console.log(
          "Viewer connection:",
          state
        );


        if (
          state === "failed" ||
          state === "disconnected" ||
          state === "closed"
        ) {

          showOffline();

        }

      };


    viewerPeerConnection.onicecandidate =
      async function (event) {

        if (
          !event.candidate ||
          !viewerSignalRef
        ) {

          return;

        }


        try {

          await push(
            viewerSignalRef,
            {
              type: "candidate",
              candidate:
                event.candidate.toJSON
                  ? event.candidate.toJSON()
                  : event.candidate
            }
          );

        } catch (error) {

          console.error(
            "ICE candidate error:",
            error
          );

        }

      };


    viewerSignalRef =
      ref(
        database,
        `pandal/signals/${viewerId}`
      );


    /*
      Tell broadcaster that a viewer exists.
      The broadcaster should listen for new viewer
      IDs under pandal/viewers.
    */

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


    /*
      Listen for broadcaster signaling messages.
    */

    viewerSignalListener =
      onChildAdded(
        viewerSignalRef,
        async function (snapshot) {

          const message =
            snapshot.val();


          if (!message) {
            return;
          }


          try {

            if (
              message.type ===
              "offer"
            ) {

              await viewerPeerConnection
                .setRemoteDescription(
                  new RTCSessionDescription(
                    message.offer
                  )
                );


              const answer =
                await viewerPeerConnection
                  .createAnswer();


              await viewerPeerConnection
                .setLocalDescription(
                  answer
                );


              await push(
                viewerSignalRef,
                {
                  type: "answer",
                  answer: {
                    type:
                      answer.type,
                    sdp:
                      answer.sdp
                  }
                }
              );

            }


            else if (
              message.type ===
              "candidate"
            ) {

              if (
                message.candidate
              ) {

                await viewerPeerConnection
                  .addIceCandidate(
                    new RTCIceCandidate(
                      message.candidate
                    )
                  );

              }

            }

          } catch (error) {

            console.error(
              "WebRTC signaling error:",
              error
            );

          }

        }
      );


    console.log(
      "WebRTC viewer started:",
      viewerId
    );


  } catch (error) {

    console.error(
      "Could not start WebRTC viewer:",
      error
    );

    showOffline();

    viewerStarted =
      false;

  }

}


async function monitorBroadcast() {

  if (!database) {

    showOffline();

    return;

  }


  try {

    const broadcastRef =
      ref(
        database,
        "pandal/broadcast"
      );


    onValue(
      broadcastRef,
      async function (snapshot) {

        const data =
          snapshot.val();


        /*
          Expected broadcaster status:
          {
            active: true,
            startedAt: 123456789
          }
        */

        if (
          data &&
          data.active === true
        ) {

          await startViewer();

        } else {

          showOffline();

          await closeViewerConnection();

        }

      },
      function (error) {

        console.error(
          "Broadcast status listener error:",
          error
        );

        showOffline();

      }
    );


  } catch (error) {

    console.error(
      "Broadcast monitor error:",
      error
    );

    showOffline();

  }

}


monitorBroadcast();


// ============================================================
// CLEANUP
// ============================================================

window.addEventListener(
  "beforeunload",
  function () {

    if (
      database &&
      viewerId
    ) {

      try {

        remove(
          ref(
            database,
            `pandal/viewers/${viewerId}`
          )
        );

      } catch (error) {

        console.warn(
          "Viewer cleanup failed:",
          error
        );

      }

    }


    try {

      viewerPeerConnection?.close();

    } catch (error) {

      console.warn(
        "WebRTC shutdown error:",
        error
      );

    }

  }
);


// ============================================================
// GLOBAL ERROR PROTECTION
// ============================================================

window.addEventListener(
  "error",
  function (event) {

    console.error(
      "Application error:",
      event.error || event.message
    );

    // Never allow an application error
    // to trap the user behind the preloader.

    hidePreloader();

  }
);


window.addEventListener(
  "unhandledrejection",
  function (event) {

    console.error(
      "Unhandled promise rejection:",
      event.reason
    );

    hidePreloader();

  }
);


console.log(
  "Ganpati Pandal app.js loaded successfully."
);
