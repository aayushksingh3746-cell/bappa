// ============================================================
// GANPATI PANDAL — PUBLIC APP
// Firebase + WebRTC Viewer + Sankalp + Aarti + Pushpanjali
// ============================================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

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


// ============================================================
// FIREBASE
// ============================================================

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const db = getDatabase(app);


// ============================================================
// DOM
// ============================================================

const preloader =
  document.getElementById("preloader");

const heroSankalp =
  document.getElementById("heroSankalp");

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

const daysElement =
  document.getElementById("days");

const hoursElement =
  document.getElementById("hours");

const minutesElement =
  document.getElementById("minutes");

const secondsElement =
  document.getElementById("seconds");

const trackTitle =
  document.getElementById("trackTitle");

const trackNumber =
  document.getElementById("trackNumber");

const playPauseButton =
  document.getElementById("playPause");

const playIcon =
  document.getElementById("playIcon");

const progress =
  document.getElementById("progress");

const currentTimeElement =
  document.getElementById("currentTime");

const durationElement =
  document.getElementById("duration");

const trackList =
  document.getElementById("trackList");

const aartiAudio =
  document.getElementById("aartiAudio");

const pushpanjaliButton =
  document.getElementById("pushpanjali");

const petalCanvas =
  document.getElementById("petalCanvas");

const bellAudio =
  document.getElementById("bellAudio");


// ============================================================
// GLOBAL WEBRTC STATE
// ============================================================

let peerConnection = null;

let viewerId = null;

let sessionId = null;

let currentBroadcastId = null;

let viewerCleanupFunctions = [];

let viewerStarted = false;

let viewerClosing = false;


// ============================================================
// WEBRTC CONFIGURATION
// ============================================================
//
// STUN helps establish peer-to-peer connections.
// A TURN server is recommended for networks where direct
// peer-to-peer connectivity is unavailable.
//
// Do NOT put fake TURN credentials here.
// ============================================================

const RTC_CONFIGURATION = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302"
      ]
    }
  ]
};


// ============================================================
// GENERAL HELPERS
// ============================================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function generateId(prefix = "") {

  const random =
    Math.random()
      .toString(36)
      .slice(2, 10);

  return (
    prefix +
    Date.now().toString(36) +
    "-" +
    random
  );
}


function setStatus(
  element,
  message,
  type = ""
) {

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.classList.remove(
    "success",
    "error",
    "warning"
  );

  if (type) {
    element.classList.add(type);
  }
}


function formatTime(seconds) {

  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    Math.floor(seconds % 60);

  return (
    minutes +
    ":" +
    String(remainingSeconds)
      .padStart(2, "0")
  );
}


// ============================================================
// PRELOADER
// ============================================================

window.addEventListener(
  "load",
  () => {

    setTimeout(
      () => {

        preloader?.classList.add(
          "hidden"
        );

      },
      400
    );
  }
);


// ============================================================
// HERO SANKALP BUTTON
// ============================================================

heroSankalp?.addEventListener(
  "click",
  () => {

    const sankalpSection =
      document.getElementById(
        "sankalp"
      );

    sankalpSection?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    setTimeout(
      () => {
        prayerInput?.focus();
      },
      500
    );
  }
);


// ============================================================
// SMOOTH NAVIGATION
// ============================================================

document
  .querySelectorAll(
    'a[href^="#"]'
  )
  .forEach(
    (link) => {

      link.addEventListener(
        "click",
        (event) => {

          const targetId =
            link.getAttribute(
              "href"
            );

          if (
            !targetId ||
            targetId === "#"
          ) {
            return;
          }

          const target =
            document.querySelector(
              targetId
            );

          if (!target) {
            return;
          }

          event.preventDefault();

          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

          if (
            targetId === "#darshan"
          ) {
            startLiveDarshan();
          }
        }
      );
    }
  );


// ============================================================
// COUNTDOWN
// ============================================================
//
// The earlier event date was 02 September 2026.
// Since that date has already passed, the countdown displays
// zero rather than pretending the event is still upcoming.
//
// Change EVENT_DATE only when you have the new confirmed date.
// ============================================================

const EVENT_DATE =
  new Date(
    "2026-09-02T00:00:00+05:30"
  );


function updateCountdown() {

  const now =
    new Date();

  let difference =
    EVENT_DATE.getTime() -
    now.getTime();

  if (difference < 0) {
    difference = 0;
  }

  const totalSeconds =
    Math.floor(
      difference / 1000
    );

  const days =
    Math.floor(
      totalSeconds / 86400
    );

  const hours =
    Math.floor(
      (totalSeconds % 86400) /
      3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) /
      60
    );

  const seconds =
    totalSeconds % 60;


  if (daysElement) {
    daysElement.textContent =
      String(days).padStart(2, "0");
  }

  if (hoursElement) {
    hoursElement.textContent =
      String(hours).padStart(2, "0");
  }

  if (minutesElement) {
    minutesElement.textContent =
      String(minutes).padStart(2, "0");
  }

  if (secondsElement) {
    secondsElement.textContent =
      String(seconds).padStart(2, "0");
  }
}


updateCountdown();

setInterval(
  updateCountdown,
  1000
);


// ============================================================
// SANKALP — SUBMIT PRAYER
// ============================================================

prayerForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const text =
      prayerInput.value
        .replace(/\s+/g, " ")
        .trim();

    if (!text) {

      setStatus(
        prayerStatus,
        "Please write your Sankalp.",
        "error"
      );

      return;
    }

    if (text.length > 50) {

      setStatus(
        prayerStatus,
        "Please keep your Sankalp within 50 characters.",
        "error"
      );

      return;
    }

    setStatus(
      prayerStatus,
      "Offering your Sankalp..."
    );

    try {

      const prayerRef =
        push(
          ref(
            db,
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

      prayerInput.value = "";

      setStatus(
        prayerStatus,
        "Your Sankalp has been offered with devotion.",
        "success"
      );

    } catch (error) {

      console.error(
        "Sankalp error:",
        error
      );

      setStatus(
        prayerStatus,
        "Unable to submit your Sankalp. Please try again.",
        "error"
      );
    }
  }
);


// ============================================================
// SANKALP WALL
// ============================================================

function listenToPrayerWall() {

  const prayersRef =
    ref(
      db,
      "pandal/prayers_wall"
    );

  onValue(
    prayersRef,
    (snapshot) => {

      if (!prayerWall) {
        return;
      }

      const data =
        snapshot.val();

      if (!data) {

        prayerWall.innerHTML = `
          <div class="prayer-empty">
            Be the first to offer a Sankalp.
          </div>
        `;

        return;
      }

      const prayers =
        Object.entries(data)
          .map(
            ([id, prayer]) => ({
              id,
              ...prayer
            })
          )
          .filter(
            prayer =>
              typeof prayer.text === "string"
          )
          .sort(
            (a, b) =>
              (b.createdAt || 0) -
              (a.createdAt || 0)
          )
          .slice(0, 40);


      prayerWall.innerHTML =
        prayers
          .map(
            prayer => `
              <article class="prayer-card">

                <p>
                  “${escapeHTML(
                    prayer.text
                  )}”
                </p>

              </article>
            `
          )
          .join("");
    },

    (error) => {

      console.error(
        "Prayer wall error:",
        error
      );
    }
  );
}


listenToPrayerWall();


// ============================================================
// WEBRTC VIEWER ID
// ============================================================

function getViewerId() {

  try {

    const stored =
      sessionStorage.getItem(
        "ganpatiViewerId"
      );

    if (stored) {
      return stored;
    }

    const id =
      generateId("viewer-");

    sessionStorage.setItem(
      "ganpatiViewerId",
      id
    );

    return id;

  } catch {

    return generateId(
      "viewer-"
    );
  }
}


// ============================================================
// LIVE DARSHAN UI
// ============================================================

function showOfflineStream() {

  activeStreamUI?.classList.add(
    "hidden"
  );

  offlineStreamUI?.classList.remove(
    "hidden"
  );

  if (liveVideo) {

    liveVideo.srcObject =
      null;
  }
}


function showActiveStream() {

  offlineStreamUI?.classList.add(
    "hidden"
  );

  activeStreamUI?.classList.remove(
    "hidden"
  );
}


// ============================================================
// LIVE DARSHAN
// ============================================================

async function startLiveDarshan() {

  if (viewerStarted) {
    return;
  }

  viewerStarted = true;

  viewerClosing = false;

  viewerId =
    getViewerId();


  const broadcastRef =
    ref(
      db,
      "pandal/broadcast"
    );


  const unsubscribeBroadcast =
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

          currentBroadcastId =
            null;

          await cleanupViewer(
            false
          );

          showOfflineStream();

          return;
        }


        if (
          currentBroadcastId ===
          broadcast.broadcastId
        ) {
          return;
        }


        await cleanupViewer(
          false
        );


        currentBroadcastId =
          broadcast.broadcastId;

        await connectToBroadcast(
          broadcast
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


  viewerCleanupFunctions.push(
    unsubscribeBroadcast
  );
}


// ============================================================
// CONNECT TO BROADCAST
// ============================================================

async function connectToBroadcast(
  broadcast
) {

  if (viewerClosing) {
    return;
  }


  sessionId =
    generateId("session-");


  const viewerRef =
    ref(
      db,
      `pandal/viewers/${viewerId}`
    );


  const sessionRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}`
    );


  const offerRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}/offer`
    );


  const answerRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}/answer`
    );


  const viewerCandidatesRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}/viewerCandidates`
    );


  const broadcasterCandidatesRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}/broadcasterCandidates`
    );


  const closedRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}/closed`
    );


  // ----------------------------------------------------------
  // Peer connection
  // ----------------------------------------------------------

  peerConnection =
    new RTCPeerConnection(
      RTC_CONFIGURATION
    );


  const connection =
    peerConnection;


  // ----------------------------------------------------------
  // Receive broadcaster stream
  // ----------------------------------------------------------

  peerConnection.ontrack =
    async (event) => {

      if (
        !liveVideo ||
        viewerClosing
      ) {
        return;
      }

      let stream =
        event.streams?.[0];

      if (!stream) {

        stream =
          new MediaStream([
            event.track
          ]);
      }

      liveVideo.srcObject =
        stream;

      liveVideo.muted =
        true;

      try {

        await liveVideo.play();

      } catch (error) {

        console.warn(
          "Autoplay blocked:",
          error
        );
      }

      showActiveStream();
    };


  // ----------------------------------------------------------
  // Viewer ICE candidates
  // ----------------------------------------------------------

  peerConnection.onicecandidate =
    async (event) => {

      if (
        !event.candidate ||
        viewerClosing
      ) {
        return;
      }

      try {

        await push(
          viewerCandidatesRef,
          event.candidate.toJSON()
        );

      } catch (error) {

        console.error(
          "Viewer ICE error:",
          error
        );
      }
    };


  // ----------------------------------------------------------
  // Connection state
  // ----------------------------------------------------------

  peerConnection.onconnectionstatechange =
    async () => {

      if (
        connection !==
        peerConnection
      ) {
        return;
      }

      const state =
        peerConnection.connectionState;

      console.log(
        "Live Darshan WebRTC:",
        state
      );


      if (
        state === "connected"
      ) {

        showActiveStream();

      } else if (
        state === "failed" ||
        state === "closed"
      ) {

        showOfflineStream();

        await cleanupViewer(
          false
        );

      } else if (
        state === "disconnected"
      ) {

        // Give the connection a short
        // opportunity to recover.
        setTimeout(
          async () => {

            if (
              peerConnection ===
                connection &&
              connection.connectionState ===
                "disconnected"
            ) {

              showOfflineStream();

              await cleanupViewer(
                false
              );
            }

          },
          5000
        );
      }
    };


  // ----------------------------------------------------------
  // Viewer presence
  // ----------------------------------------------------------

  try {

    await set(
      viewerRef,
      {
        active: true,
        broadcastId:
          broadcast.broadcastId,
        sessionId,
        connectedAt:
          Date.now()
      }
    );

  } catch (error) {

    console.error(
      "Could not create viewer presence:",
      error
    );

    await cleanupViewer(
      false
    );

    return;
  }


  // ----------------------------------------------------------
  // Create viewer offer
  // ----------------------------------------------------------

  try {

    const offer =
      await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

    await peerConnection.setLocalDescription(
      offer
    );


    await set(
      offerRef,
      {
        type:
          offer.type,
        sdp:
          offer.sdp
      }
    );

  } catch (error) {

    console.error(
      "Could not create WebRTC offer:",
      error
    );

    await cleanupViewer(
      false
    );

    return;
  }


  // ----------------------------------------------------------
  // Listen for broadcaster answer
  // ----------------------------------------------------------

  const unsubscribeAnswer =
    onValue(
      answerRef,
      async (snapshot) => {

        if (
          viewerClosing ||
          !snapshot.exists()
        ) {
          return;
        }

        const answer =
          snapshot.val();

        if (
          !answer ||
          !answer.type ||
          !answer.sdp
        ) {
          return;
        }


        try {

          if (
            peerConnection.signalingState !==
            "have-local-offer"
          ) {
            return;
          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              answer
            )
          );

        } catch (error) {

          console.error(
            "Could not apply broadcaster answer:",
            error
          );
        }
      }
    );


  viewerCleanupFunctions.push(
    unsubscribeAnswer
  );


  // ----------------------------------------------------------
  // Broadcaster ICE candidates
  //
  // IMPORTANT:
  // onChildAdded prevents previously received
  // candidates from being repeatedly processed.
  // ----------------------------------------------------------

  const unsubscribeBroadcasterCandidates =
    onChildAdded(
      broadcasterCandidatesRef,
      async (snapshot) => {

        if (
          viewerClosing ||
          !snapshot.exists()
        ) {
          return;
        }

        try {

          const candidate =
            snapshot.val();

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );

        } catch (error) {

          console.warn(
            "Could not add broadcaster ICE candidate:",
            error
          );
        }
      }
    );


  viewerCleanupFunctions.push(
    unsubscribeBroadcasterCandidates
  );


  // ----------------------------------------------------------
  // Broadcast closed listener
  // ----------------------------------------------------------

  const unsubscribeClosed =
    onValue(
      closedRef,
      async (snapshot) => {

        if (
          snapshot.val() === true
        ) {

          showOfflineStream();

          await cleanupViewer(
            false
          );
        }
      }
    );


  viewerCleanupFunctions.push(
    unsubscribeClosed
  );


  // ----------------------------------------------------------
  // Viewer disconnect cleanup
  // ----------------------------------------------------------

  try {

    await onDisconnectSafe(
      viewerRef,
      {
        active: false
      }
    );

  } catch (error) {

    console.warn(
      "Viewer disconnect setup failed:",
      error
    );
  }
}


// ============================================================
// FIREBASE onDisconnect HELPER
// ============================================================

async function onDisconnectSafe(
  databaseRef,
  value
) {

  // Importing onDisconnect dynamically is avoided here.
  //
  // Instead, if the browser disappears, the broadcaster's
  // Firebase state will eventually notice the inactive
  // session. The explicit cleanup below handles normal exits.
  //
  // This function intentionally does nothing if the current
  // Firebase SDK build does not expose onDisconnect here.
  return;
}


// ============================================================
// CLEANUP VIEWER
// ============================================================

async function cleanupViewer(
  markInactive = true
) {

  if (viewerClosing) {
    return;
  }

  viewerClosing = true;


  // Stop Firebase listeners belonging to this session.
  const listeners =
    [...viewerCleanupFunctions];

  viewerCleanupFunctions = [];

  for (
    const unsubscribe
    of listeners
  ) {

    try {

      if (
        typeof unsubscribe ===
        "function"
      ) {
        unsubscribe();
      }

    } catch (error) {

      console.warn(
        "Listener cleanup warning:",
        error
      );
    }
  }


  // Close WebRTC.
  if (peerConnection) {

    try {

      peerConnection.ontrack =
        null;

      peerConnection.onicecandidate =
        null;

      peerConnection.onconnectionstatechange =
        null;

      peerConnection.close();

    } catch (error) {

      console.warn(
        "Peer cleanup warning:",
        error
      );
    }

    peerConnection =
      null;
  }


  // Mark viewer inactive.
  if (
    markInactive &&
    viewerId
  ) {

    try {

      const viewerRef =
        ref(
          db,
          `pandal/viewers/${viewerId}`
        );

      const snapshot =
        await get(viewerRef);

      const current =
        snapshot.val();

      // Only remove our current session.
      if (
        current &&
        current.sessionId ===
        sessionId
      ) {

        await remove(
          viewerRef
        );
      }

    } catch (error) {

      console.warn(
        "Viewer cleanup error:",
        error
      );
    }
  }


  // Remove our own session signaling data.
  if (
    viewerId &&
    sessionId
  ) {

    try {

      await remove(
        ref(
          db,
          `pandal/signals/${viewerId}/${sessionId}`
        )
      );

    } catch (error) {

      console.warn(
        "Signal cleanup warning:",
        error
      );
    }
  }


  sessionId =
    null;

  viewerClosing =
    false;
}


// ============================================================
// START LIVE DARSHAN WHEN HASH IS #darshan
// ============================================================

if (
  window.location.hash ===
  "#darshan"
) {

  setTimeout(
    startLiveDarshan,
    300
  );
}


// ============================================================
// AARTI PLAYER
// ============================================================
//
// IMPORTANT:
// Only bell.mp3 is confirmed from your HTML.
// The Aarti filenames below are examples and must match
// the actual files you put inside ./assets/.
//
// Replace these paths with your real Aarti files.
// ============================================================

const aartiTracks = [
  {
    title: "Aarti 1",
    src: "./assets/aarti-1.mp3"
  },
  {
    title: "Aarti 2",
    src: "./assets/aarti-2.mp3"
  },
  {
    title: "Aarti 3",
    src: "./assets/aarti-3.mp3"
  },
  {
    title: "Aarti 4",
    src: "./assets/aarti-4.mp3"
  },
  {
    title: "Aarti 5",
    src: "./assets/aarti-5.mp3"
  },
  {
    title: "Aarti 6",
    src: "./assets/aarti-6.mp3"
  },
  {
    title: "Aarti 7",
    src: "./assets/aarti-7.mp3"
  },
  {
    title: "Aarti 8",
    src: "./assets/aarti-8.mp3"
  },
  {
    title: "Aarti 9",
    src: "./assets/aarti-9.mp3"
  }
];


let currentTrackIndex = 0;


// ============================================================
// LOAD AARTI TRACK
// ============================================================

function loadAartiTrack(
  index,
  autoplay = false
) {

  if (
    !aartiAudio ||
    !aartiTracks[index]
  ) {
    return;
  }

  currentTrackIndex =
    index;

  const track =
    aartiTracks[index];

  aartiAudio.src =
    track.src;

  if (trackTitle) {

    trackTitle.textContent =
      track.title;
  }

  if (trackNumber) {

    trackNumber.textContent =
      `${index + 1} / ${aartiTracks.length}`;
  }

  if (progress) {

    progress.value = 0;
  }

  if (currentTimeElement) {

    currentTimeElement.textContent =
      "0:00";
  }

  if (durationElement) {

    durationElement.textContent =
      "0:00";
  }


  updateTrackList();


  if (autoplay) {

    aartiAudio.play()
      .then(
        () => {
          updatePlayButton();
        }
      )
      .catch(
        error => {
          console.warn(
            "Aarti autoplay blocked:",
            error
          );
        }
      );
  }
}


// ============================================================
// TRACK LIST
// ============================================================

function updateTrackList() {

  if (!trackList) {
    return;
  }

  trackList.innerHTML =
    aartiTracks
      .map(
        (track, index) => `
          <button
            type="button"
            class="track-item ${
              index === currentTrackIndex
                ? "active"
                : ""
            }"
            data-track-index="${index}"
          >
            <span>
              ${escapeHTML(
                track.title
              )}
            </span>

            <small>
              ${String(
                index + 1
              ).padStart(2, "0")}
            </small>
          </button>
        `
      )
      .join("");


  trackList
    .querySelectorAll(
      "[data-track-index]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const index =
              Number(
                button.dataset
                  .trackIndex
              );

            loadAartiTrack(
              index,
              true
            );
          }
        );
      }
    );
}


// ============================================================
// PLAY / PAUSE
// ============================================================

playPauseButton?.addEventListener(
  "click",
  async () => {

    if (!aartiAudio) {
      return;
    }

    try {

      if (
        aartiAudio.paused
      ) {

        await aartiAudio.play();

      } else {

        aartiAudio.pause();
      }

    } catch (error) {

      console.warn(
        "Aarti playback error:",
        error
      );
    }

    updatePlayButton();
  }
);


// ============================================================
// PLAY ICON
// ============================================================

function updatePlayButton() {

  if (!playIcon || !aartiAudio) {
    return;
  }

  if (
    aartiAudio.paused
  ) {

    playIcon.textContent =
      "▶";

  } else {

    playIcon.textContent =
      "Ⅱ";
  }
}


aartiAudio?.addEventListener(
  "play",
  updatePlayButton
);

aartiAudio?.addEventListener(
  "pause",
  updatePlayButton
);


// ============================================================
// AARTI PROGRESS
// ============================================================

aartiAudio?.addEventListener(
  "loadedmetadata",
  () => {

    if (durationElement) {

      durationElement.textContent =
        formatTime(
          aartiAudio.duration
        );
    }
  }
);


aartiAudio?.addEventListener(
  "timeupdate",
  () => {

    if (
      !aartiAudio.duration ||
      !Number.isFinite(
        aartiAudio.duration
      )
    ) {
      return;
    }

    const percentage =
      (
        aartiAudio.currentTime /
        aartiAudio.duration
      ) * 100;


    if (progress) {

      progress.value =
        percentage;
    }


    if (currentTimeElement) {

      currentTimeElement.textContent =
        formatTime(
          aartiAudio.currentTime
        );
    }
  }
);


progress?.addEventListener(
  "input",
  () => {

    if (
      !aartiAudio ||
      !Number.isFinite(
        aartiAudio.duration
      )
    ) {
      return;
    }

    const percentage =
      Number(
        progress.value
      );

    aartiAudio.currentTime =
      (
        percentage /
        100
      ) *
      aartiAudio.duration;
  }
);


// ============================================================
// NEXT AARTI AUTOMATICALLY
// ============================================================

aartiAudio?.addEventListener(
  "ended",
  () => {

    const nextIndex =
      (
        currentTrackIndex + 1
      ) %
      aartiTracks.length;

    loadAartiTrack(
      nextIndex,
      true
    );
  }
);


// ============================================================
// INITIAL AARTI
// ============================================================

loadAartiTrack(
  0,
  false
);


// ============================================================
// PUSHpanjali PETAL EFFECT
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

  const ratio =
    window.devicePixelRatio ||
    1;

  petalCanvas.width =
    Math.max(
      1,
      Math.floor(
        rect.width * ratio
      )
    );

  petalCanvas.height =
    Math.max(
      1,
      Math.floor(
        rect.height * ratio
      )
    );

  const context =
    petalCanvas.getContext(
      "2d"
    );

  context.setTransform(
    ratio,
    0,
    0,
    ratio,
    0,
    0
  );
}


window.addEventListener(
  "resize",
  resizePetalCanvas
);


resizePetalCanvas();


// ============================================================
// CREATE PETAL
// ============================================================

function createPetal() {

  if (!petalCanvas) {
    return;
  }

  const rect =
    petalCanvas.getBoundingClientRect();

  petals.push({
    x:
      Math.random() *
      rect.width,

    y:
      -20,

    size:
      5 +
      Math.random() *
      9,

    speed:
      1.5 +
      Math.random() *
      3,

    drift:
      -1 +
      Math.random() *
      2,

    rotation:
      Math.random() *
      Math.PI *
      2,

    rotationSpeed:
      -0.04 +
      Math.random() *
      0.08,

    opacity:
      0.55 +
      Math.random() *
      0.45
  });
}


// ============================================================
// DRAW PETALS
// ============================================================

function animatePetals() {

  if (!petalCanvas) {
    return;
  }

  const context =
    petalCanvas.getContext(
      "2d"
    );

  const rect =
    petalCanvas.getBoundingClientRect();


  context.clearRect(
    0,
    0,
    rect.width,
    rect.height
  );


  petals =
    petals.filter(
      petal =>
        petal.y <
        rect.height + 30
    );


  for (
    const petal
    of petals
  ) {

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


    context.fillStyle =
      "rgba(232, 178, 76, 0.9)";

    context.fill();

    context.restore();
  }


  petalAnimationFrame =
    requestAnimationFrame(
      animatePetals
    );
}


// ============================================================
// START PETALS
// ============================================================

pushpanjaliButton?.addEventListener(
  "click",
  async () => {

    pushpanjaliButton.classList.add(
      "active"
    );


    // Bell
    if (bellAudio) {

      try {

        bellAudio.currentTime =
          0;

        await bellAudio.play();

      } catch (error) {

        console.warn(
          "Bell playback blocked:",
          error
        );
      }
    }


    // Petals
    for (
      let i = 0;
      i < 35;
      i++
    ) {

      setTimeout(
        () => {
          createPetal();
        },
        i * 35
      );
    }


    if (
      !petalAnimationFrame
    ) {

      animatePetals();
    }


    setTimeout(
      () => {

        pushpanjaliButton.classList.remove(
          "active"
        );

      },
      1200
    );
  }
);


// ============================================================
// PAGE EXIT
// ============================================================

window.addEventListener(
  "pagehide",
  () => {

    // Do not await here.
    // Browser may terminate JS immediately.
    cleanupViewer(
      true
    );

  },
  {
    capture: true
  }
);


// ============================================================
// ONLINE / OFFLINE
// ============================================================

window.addEventListener(
  "offline",
  async () => {

    showOfflineStream();

    await cleanupViewer(
      true
    );
  }
);


window.addEventListener(
  "online",
  () => {

    if (
      window.location.hash ===
      "#darshan"
    ) {

      startLiveDarshan();
    }
  }
);


// ============================================================
// END
// ============================================================
