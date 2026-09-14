// ============================================================
// GANPATI DIGITAL DARSHAN — ADMIN.JS
// Firebase + WebRTC Broadcaster
// Automatic reconnection + TURN support
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  push,
  onValue,
  off,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  databaseURL: "https://ganpati-5f24e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624"
};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


// ============================================================
// TURN / STUN CONFIGURATION
// ============================================================
//
// IMPORTANT:
// Replace the TURN placeholders with REAL TURN credentials.
//
// Example:
//
// {
//   urls: "turn:your-server.com:3478",
//   username: "YOUR_USERNAME",
//   credential: "YOUR_PASSWORD"
// }
//
// Do NOT put fake credentials here.
//

const ICE_SERVERS = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302"
    ]
  },

  // ==========================================================
  // TURN SERVER
  // ==========================================================
  //
  // Uncomment and fill this section when you have a TURN server.
  //
  /*
  {
    urls: [
      "turn:YOUR_TURN_SERVER:3478",
      "turn:YOUR_TURN_SERVER:3478?transport=tcp",
      "turns:YOUR_TURN_SERVER:5349"
    ],
    username: "YOUR_TURN_USERNAME",
    credential: "YOUR_TURN_PASSWORD"
  }
  */
];


// ============================================================
// WEBRTC SETTINGS
// ============================================================

const RTC_CONFIGURATION = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require"
};


// ============================================================
// DOM
// ============================================================

const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginStatus = document.getElementById("loginStatus");

const logoutBtn = document.getElementById("logoutBtn");
const connectionState = document.getElementById("connectionState");

const broadcastStatus = document.getElementById("broadcastStatus");
const preview = document.getElementById("preview");

const startBroadcastBtn = document.getElementById("startBroadcast");
const stopBroadcastBtn = document.getElementById("stopBroadcast");

const broadcastMessage = document.getElementById("broadcastMessage");

const adminPrayers = document.getElementById("adminPrayers");

const announcementForm = document.getElementById("announcementForm");
const announcementTitle = document.getElementById("announcementTitle");
const announcementText = document.getElementById("announcementText");
const announcementStatus = document.getElementById("announcementStatus");


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let localStream = null;

let broadcasting = false;

let broadcastId = null;

let viewerListener = null;

let broadcastStateListener = null;

let prayersListener = null;

let peerConnections = new Map();

let viewerCreationLocks = new Map();

let recoveryTimers = new Map();

let viewerCandidatesListeners = new Map();

let answerListeners = new Map();

let broadcasterCandidateRefs = new Map();

let visibilityRecoveryTimer = null;

let isCleaningUp = false;


// ============================================================
// CONSTANTS
// ============================================================

const RECOVERY_DELAY = 1500;

const MAX_RECOVERY_DELAY = 15000;

const VIEWER_STALE_TIME = 30000;


// ============================================================
// HELPERS
// ============================================================

function log(...args) {
  console.log("[Admin]", ...args);
}


function warn(...args) {
  console.warn("[Admin]", ...args);
}


function error(...args) {
  console.error("[Admin]", ...args);
}


function setLoginStatus(message, type = "") {
  if (!loginStatus) return;

  loginStatus.textContent = message;

  loginStatus.className = type;
}


function setBroadcastStatus(message) {
  if (!broadcastStatus) return;

  broadcastStatus.textContent = message;
}


function setConnectionState(message) {
  if (!connectionState) return;

  connectionState.textContent = message;
}


function generateId(prefix = "") {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9)
  );
}


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, user => {
  currentUser = user;

  if (user) {
    log("Authenticated:", user.email);

    if (loginPanel) {
      loginPanel.classList.add("hidden");
    }

    if (dashboard) {
      dashboard.classList.remove("hidden");
    }

    setConnectionState("Connected");

    loadPrayers();
    startBroadcastStateListener();

  } else {
    log("No authenticated user.");

    if (loginPanel) {
      loginPanel.classList.remove("hidden");
    }

    if (dashboard) {
      dashboard.classList.add("hidden");
    }

    stopBroadcast();
  }
});


if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      setLoginStatus("Enter email and password.", "error");
      return;
    }

    setLoginStatus("Signing in...");

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setLoginStatus("Login successful.", "success");

    } catch (err) {
      error("Login error:", err);

      setLoginStatus(
        err?.message || "Login failed.",
        "error"
      );
    }
  });
}


if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await stopBroadcast();
      await signOut(auth);
    } catch (err) {
      error("Logout error:", err);
    }
  });
}


// ============================================================
// CAMERA
// ============================================================

async function getCameraStream() {

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Camera access is not supported by this browser."
    );
  }

  if (localStream) {
    return localStream;
  }

  log("Requesting camera and microphone...");

  localStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: {
        ideal: 1280
      },
      height: {
        ideal: 720
      },
      frameRate: {
        ideal: 30,
        max: 30
      }
    },

    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  if (preview) {
    preview.srcObject = localStream;

    try {
      await preview.play();
    } catch (_) {}
  }

  return localStream;
}


// ============================================================
// START BROADCAST
// ============================================================

if (startBroadcastBtn) {
  startBroadcastBtn.addEventListener(
    "click",
    startBroadcast
  );
}


async function startBroadcast() {

  if (!currentUser) {
    setBroadcastStatus(
      "Please login before starting the broadcast."
    );
    return;
  }

  if (broadcasting) {
    setBroadcastStatus("Broadcast is already live.");
    return;
  }

  isCleaningUp = false;

  try {

    setBroadcastStatus(
      "Starting camera..."
    );

    setConnectionState(
      "Opening camera..."
    );

    await getCameraStream();

    broadcastId = generateId("broadcast_");

    broadcasting = true;

    await set(
      ref(db, "pandal/broadcast"),
      {
        active: true,
        id: broadcastId,
        startedAt: Date.now(),
        hostUid: currentUser.uid
      }
    );

    setBroadcastStatus(
      "LIVE — waiting for viewers..."
    );

    setConnectionState(
      "Broadcast live"
    );

    if (startBroadcastBtn) {
      startBroadcastBtn.disabled = true;
    }

    if (stopBroadcastBtn) {
      stopBroadcastBtn.disabled = false;
    }

    startViewerListener();

    log(
      "Broadcast started:",
      broadcastId
    );

  } catch (err) {

    error("Broadcast start error:", err);

    broadcasting = false;

    setBroadcastStatus(
      err?.message ||
      "Unable to start broadcast."
    );

    setConnectionState(
      "Broadcast failed"
    );

    stopLocalCamera();
  }
}


// ============================================================
// STOP BROADCAST
// ============================================================

if (stopBroadcastBtn) {
  stopBroadcastBtn.addEventListener(
    "click",
    stopBroadcast
  );
}


async function stopBroadcast() {

  if (isCleaningUp) {
    return;
  }

  isCleaningUp = true;

  log("Stopping broadcast...");

  broadcasting = false;

  stopViewerListener();

  clearAllRecoveryTimers();

  closeAllViewerPeers();

  clearAllSignalListeners();

  try {

    if (broadcastId) {

      await remove(
        ref(db, "pandal/broadcast")
      );
    }

  } catch (err) {
    error(
      "Unable to remove broadcast state:",
      err
    );
  }

  stopLocalCamera();

  broadcastId = null;

  if (startBroadcastBtn) {
    startBroadcastBtn.disabled = false;
  }

  if (stopBroadcastBtn) {
    stopBroadcastBtn.disabled = true;
  }

  setBroadcastStatus(
    "Broadcast offline."
  );

  setConnectionState(
    "Ready"
  );

  isCleaningUp = false;
}


// ============================================================
// STOP CAMERA
// ============================================================

function stopLocalCamera() {

  if (!localStream) {
    return;
  }

  localStream
    .getTracks()
    .forEach(track => {

      try {
        track.stop();
      } catch (_) {}

    });

  localStream = null;

  if (preview) {
    preview.srcObject = null;
  }
}


// ============================================================
// VIEWER LISTENER
// ============================================================

function startViewerListener() {

  if (viewerListener) {
    return;
  }

  const viewersRef =
    ref(db, "pandal/viewers");

  const callback = async snapshot => {

    try {

      if (!broadcasting) {
        return;
      }

      const viewers =
        snapshot.val();

      if (!viewers) {

        setBroadcastStatus(
          "LIVE — waiting for viewers..."
        );

        return;
      }

      const activeViewerIds =
        new Set();

      for (
        const [viewerId, viewer]
        of Object.entries(viewers)
      ) {

        if (
          viewer &&
          viewer.active === true &&
          viewer.broadcastId === broadcastId
        ) {

          activeViewerIds.add(viewerId);

          if (!peerConnections.has(viewerId)) {

            await createViewerConnection(
              viewerId
            );
          }
        }
      }

      for (
        const viewerId
        of peerConnections.keys()
      ) {

        if (
          !activeViewerIds.has(viewerId)
        ) {

          closeViewerPeer(
            viewerId
          );
        }
      }

      if (activeViewerIds.size > 0) {

        setBroadcastStatus(
          `LIVE — ${activeViewerIds.size} viewer${
            activeViewerIds.size === 1
              ? ""
              : "s"
          }`
        );
      }

    } catch (err) {

      error(
        "Viewer snapshot processing error:",
        err
      );
    }
  };


  const errorCallback = err => {

    error(
      "Firebase viewer listener error:",
      err
    );

    if (
      err?.code ===
      "PERMISSION_DENIED"
    ) {

      setBroadcastStatus(
        "Firebase permission denied for viewers."
      );

    } else {

      setBroadcastStatus(
        "Viewer connection lost — retrying..."
      );

      scheduleViewerListenerRecovery();
    }
  };


  onValue(
    viewersRef,
    callback,
    errorCallback
  );

  viewerListener = {
    ref: viewersRef,
    callback
  };

  log("Viewer listener started.");
}


// ============================================================
// VIEWER LISTENER RECOVERY
// ============================================================

function scheduleViewerListenerRecovery() {

  if (!broadcasting) {
    return;
  }

  setTimeout(() => {

    if (!broadcasting) {
      return;
    }

    stopViewerListener();

    startViewerListener();

  }, 2000);
}


// ============================================================
// STOP VIEWER LISTENER
// ============================================================

function stopViewerListener() {

  if (!viewerListener) {
    return;
  }

  try {

    off(
      viewerListener.ref,
      "value",
      viewerListener.callback
    );

  } catch (err) {

    error(
      "Error stopping viewer listener:",
      err
    );
  }

  viewerListener = null;
}


// ============================================================
// CREATE VIEWER CONNECTION
// ============================================================

async function createViewerConnection(
  viewerId,
  forceRestart = false
) {

  if (!broadcasting) {
    return;
  }

  if (
    viewerCreationLocks.has(viewerId)
  ) {

    return viewerCreationLocks.get(
      viewerId
    );
  }

  if (
    peerConnections.has(viewerId) &&
    !forceRestart
  ) {

    return;
  }

  const creationPromise =
    createViewerConnectionInternal(
      viewerId,
      forceRestart
    );

  viewerCreationLocks.set(
    viewerId,
    creationPromise
  );

  try {

    await creationPromise;

  } finally {

    viewerCreationLocks.delete(
      viewerId
    );
  }
}


// ============================================================
// INTERNAL VIEWER CONNECTION
// ============================================================

async function createViewerConnectionInternal(
  viewerId,
  forceRestart = false
) {

  if (!broadcasting) {
    return;
  }

  log(
    "Creating connection for viewer:",
    viewerId
  );

  if (forceRestart) {
    closeViewerPeer(viewerId);
  }

  const pc =
    new RTCPeerConnection(
      RTC_CONFIGURATION
    );

  peerConnections.set(
    viewerId,
    pc
  );

  if (!localStream) {

    await getCameraStream();
  }

  localStream
    .getTracks()
    .forEach(track => {

      try {

        pc.addTrack(
          track,
          localStream
        );

      } catch (err) {

        error(
          "addTrack error:",
          err
        );
      }

    });


  // ----------------------------------------------------------
  // CONNECTION STATE
  // ----------------------------------------------------------

  pc.onconnectionstatechange = () => {

    const state =
      pc.connectionState;

    log(
      `Viewer ${viewerId} connectionState:`,
      state
    );

    if (
      state === "connected"
    ) {

      clearRecoveryTimer(
        viewerId
      );

      setBroadcastStatus(
        "LIVE — viewer connected"
      );

    }

    if (
      state === "failed"
    ) {

      scheduleViewerRecovery(
        viewerId,
        true
      );

    }

    if (
      state === "disconnected"
    ) {

      scheduleViewerRecovery(
        viewerId,
        false
      );
    }

    if (
      state === "closed"
    ) {

      closeViewerPeer(
        viewerId
      );
    }
  };


  // ----------------------------------------------------------
  // ICE STATE
  // ----------------------------------------------------------

  pc.oniceconnectionstatechange =
    () => {

      const state =
        pc.iceConnectionState;

      log(
        `Viewer ${viewerId} ICE:`,
        state
      );

      if (
        state === "connected" ||
        state === "completed"
      ) {

        clearRecoveryTimer(
          viewerId
        );
      }

      if (
        state === "failed"
      ) {

        scheduleViewerRecovery(
          viewerId,
          true
        );
      }

      if (
        state === "disconnected"
      ) {

        scheduleViewerRecovery(
          viewerId,
          false
        );
      }
    };


  // ----------------------------------------------------------
  // ICE CANDIDATES
  // ----------------------------------------------------------

  pc.onicecandidate = async event => {

    if (
      !event.candidate
    ) {
      return;
    }

    try {

      const candidatesRef =
        ref(
          db,
          `pandal/signals/${viewerId}/broadcasterCandidates`
        );

      await push(
        candidatesRef,
        event.candidate.toJSON()
      );

    } catch (err) {

      error(
        "Unable to send broadcaster ICE candidate:",
        err
      );
    }
  };


  // ----------------------------------------------------------
  // ANSWER LISTENER
  // ----------------------------------------------------------

  const answerRef =
    ref(
      db,
      `pandal/signals/${viewerId}/answer`
    );

  const answerCallback =
    async snapshot => {

      const answer =
        snapshot.val();

      if (!answer) {
        return;
      }

      if (
        !peerConnections.has(
          viewerId
        )
      ) {
        return;
      }

      try {

        if (
          pc.signalingState !==
          "have-local-offer"
        ) {
          return;
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription(
            answer
          )
        );

        log(
          "Answer applied:",
          viewerId
        );

      } catch (err) {

        error(
          "Answer error:",
          err
        );

        scheduleViewerRecovery(
          viewerId,
          true
        );
      }
    };


  onValue(
    answerRef,
    answerCallback,
    err => {

      error(
        "Answer listener error:",
        err
      );
    }
  );


  answerListeners.set(
    viewerId,
    {
      ref: answerRef,
      callback: answerCallback
    }
  );


  // ----------------------------------------------------------
  // VIEWER ICE CANDIDATES
  // ----------------------------------------------------------

  const viewerCandidatesRef =
    ref(
      db,
      `pandal/signals/${viewerId}/viewerCandidates`
    );

  const viewerCandidatesCallback =
    async snapshot => {

      const candidates =
        snapshot.val();

      if (!candidates) {
        return;
      }

      for (
        const candidate
        of Object.values(candidates)
      ) {

        try {

          await pc.addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );

        } catch (err) {

          warn(
            "ICE candidate error:",
            err
          );
        }
      }
    };


  onValue(
    viewerCandidatesRef,
    viewerCandidatesCallback,
    err => {

      error(
        "Viewer candidate listener error:",
        err
      );
    }
  );


  viewerCandidatesListeners.set(
    viewerId,
    {
      ref: viewerCandidatesRef,
      callback:
        viewerCandidatesCallback
    }
  );


  // ----------------------------------------------------------
  // OFFER
  // ----------------------------------------------------------

  try {

    const offer =
      await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });

    await pc.setLocalDescription(
      offer
    );

    await set(
      ref(
        db,
        `pandal/signals/${viewerId}/offer`
      ),
      {
        type:
          pc.localDescription.type,

        sdp:
          pc.localDescription.sdp,

        broadcastId
      }
    );

    log(
      "Offer sent to viewer:",
      viewerId
    );

  } catch (err) {

    error(
      "Offer creation error:",
      err
    );

    scheduleViewerRecovery(
      viewerId,
      true
    );
  }
}


// ============================================================
// VIEWER RECOVERY
// ============================================================

function scheduleViewerRecovery(
  viewerId,
  immediate = false
) {

  if (!broadcasting) {
    return;
  }

  if (
    recoveryTimers.has(viewerId)
  ) {

    return;
  }

  const currentPeer =
    peerConnections.get(
      viewerId
    );

  let delay =
    immediate
      ? 500
      : RECOVERY_DELAY;

  if (currentPeer) {

    const attempts =
      Number(
        currentPeer.__recoveryAttempts || 0
      );

    delay = Math.min(
      RECOVERY_DELAY *
      Math.pow(2, attempts),
      MAX_RECOVERY_DELAY
    );

    currentPeer.__recoveryAttempts =
      attempts + 1;
  }

  log(
    `Scheduling recovery for ${viewerId} in ${delay}ms`
  );

  const timer =
    setTimeout(
      async () => {

        recoveryTimers.delete(
          viewerId
        );

        if (!broadcasting) {
          return;
        }

        try {

          await createViewerConnection(
            viewerId,
            true
          );

        } catch (err) {

          error(
            "Viewer recovery error:",
            err
          );

          scheduleViewerRecovery(
            viewerId,
            false
          );
        }

      },
      delay
    );

  recoveryTimers.set(
    viewerId,
    timer
  );
}


function clearRecoveryTimer(
  viewerId
) {

  const timer =
    recoveryTimers.get(
      viewerId
    );

  if (!timer) {
    return;
  }

  clearTimeout(timer);

  recoveryTimers.delete(
    viewerId
  );
}


function clearAllRecoveryTimers() {

  for (
    const timer
    of recoveryTimers.values()
  ) {

    clearTimeout(timer);
  }

  recoveryTimers.clear();
}


// ============================================================
// CLOSE VIEWER PEER
// ============================================================

function closeViewerPeer(
  viewerId
) {

  clearRecoveryTimer(
    viewerId
  );

  const pc =
    peerConnections.get(
      viewerId
    );

  if (pc) {

    try {
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    } catch (_) {}

  }

  peerConnections.delete(
    viewerId
  );


  const answerListener =
    answerListeners.get(
      viewerId
    );

  if (answerListener) {

    try {

      off(
        answerListener.ref,
        "value",
        answerListener.callback
      );

    } catch (_) {}

    answerListeners.delete(
      viewerId
    );
  }


  const candidateListener =
    viewerCandidatesListeners.get(
      viewerId
    );

  if (candidateListener) {

    try {

      off(
        candidateListener.ref,
        "value",
        candidateListener.callback
      );

    } catch (_) {}

    viewerCandidatesListeners.delete(
      viewerId
    );
  }

  log(
    "Closed viewer:",
    viewerId
  );
}


// ============================================================
// CLOSE ALL VIEWERS
// ============================================================

function closeAllViewerPeers() {

  for (
    const viewerId
    of peerConnections.keys()
  ) {

    closeViewerPeer(
      viewerId
    );
  }
}


// ============================================================
// CLEAR SIGNAL LISTENERS
// ============================================================

function clearAllSignalListeners() {

  for (
    const listener
    of answerListeners.values()
  ) {

    try {

      off(
        listener.ref,
        "value",
        listener.callback
      );

    } catch (_) {}
  }

  answerListeners.clear();


  for (
    const listener
    of viewerCandidatesListeners.values()
  ) {

    try {

      off(
        listener.ref,
        "value",
        listener.callback
      );

    } catch (_) {}
  }

  viewerCandidatesListeners.clear();
}


// ============================================================
// NETWORK RECOVERY
// ============================================================

window.addEventListener(
  "offline",
  () => {

    warn(
      "Browser reports OFFLINE."
    );

    if (!broadcasting) {
      return;
    }

    setConnectionState(
      "Internet interrupted — reconnecting..."
    );

    setBroadcastStatus(
      "LIVE paused temporarily — waiting for network..."
    );
  }
);


window.addEventListener(
  "online",
  async () => {

    log(
      "Browser reports ONLINE."
    );

    if (!broadcasting) {
      return;
    }

    setConnectionState(
      "Network restored — reconnecting..."
    );

    setBroadcastStatus(
      "Reconnecting live broadcast..."
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          1500
        )
    );

    if (!broadcasting) {
      return;
    }

    stopViewerListener();

    startViewerListener();

    for (
      const viewerId
      of peerConnections.keys()
    ) {

      scheduleViewerRecovery(
        viewerId,
        true
      );
    }

    setConnectionState(
      "Broadcast live"
    );
  }
);


// ============================================================
// PAGE VISIBILITY RECOVERY
// ============================================================

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState !==
      "visible"
    ) {
      return;
    }

    if (!broadcasting) {
      return;
    }

    clearTimeout(
      visibilityRecoveryTimer
    );

    visibilityRecoveryTimer =
      setTimeout(
        () => {

          if (!broadcasting) {
            return;
          }

          log(
            "Page became visible — checking connections."
          );

          startViewerListener();

          for (
            const [
              viewerId,
              pc
            ]
            of peerConnections
          ) {

            if (
              pc.connectionState ===
                "failed" ||
              pc.connectionState ===
                "disconnected" ||
              pc.iceConnectionState ===
                "failed"
            ) {

              scheduleViewerRecovery(
                viewerId,
                true
              );
            }
          }

        },
        1000
      );
  }
);


// ============================================================
// BROADCAST STATE LISTENER
// ============================================================

function startBroadcastStateListener() {

  if (broadcastStateListener) {
    return;
  }

  const broadcastRef =
    ref(db, "pandal/broadcast");

  const callback =
    snapshot => {

      const state =
        snapshot.val();

      if (!state?.active) {

        return;
      }

      if (
        broadcasting &&
        state.id === broadcastId
      ) {

        return;
      }

      log(
        "Broadcast state:",
        state
      );
    };


  onValue(
    broadcastRef,
    callback,
    err => {

      error(
        "Broadcast state listener error:",
        err
      );
    }
  );

  broadcastStateListener = {
    ref: broadcastRef,
    callback
  };
}


// ============================================================
// PRAYERS
// ============================================================

function loadPrayers() {

  if (!adminPrayers) {
    return;
  }

  if (prayersListener) {
    return;
  }

  const prayersRef =
    ref(db, "pandal/prayers_wall");

  const callback =
    snapshot => {

      const data =
        snapshot.val();

      adminPrayers.innerHTML = "";

      if (!data) {

        adminPrayers.innerHTML =
          "<p>No prayers yet.</p>";

        return;
      }

      const entries =
        Object.entries(data)
          .sort(
            ([, a], [, b]) =>
              (b?.createdAt || 0) -
              (a?.createdAt || 0)
          );

      for (
        const [
          id,
          prayer
        ]
        of entries
      ) {

        const article =
          document.createElement(
            "article"
          );

        article.className =
          "admin-prayer";

        const text =
          document.createElement(
            "p"
          );

        text.textContent =
          prayer?.text || "";

        const time =
          document.createElement(
            "small"
          );

        if (prayer?.createdAt) {

          time.textContent =
            new Date(
              prayer.createdAt
            ).toLocaleString(
              "en-IN"
            );
        }

        article.appendChild(
          text
        );

        article.appendChild(
          time
        );

        adminPrayers.appendChild(
          article
        );
      }
    };


  onValue(
    prayersRef,
    callback,
    err => {

      error(
        "Prayer listener error:",
        err
      );
    }
  );

  prayersListener = {
    ref: prayersRef,
    callback
  };
}


// ============================================================
// ANNOUNCEMENTS
// ============================================================

if (announcementForm) {

  announcementForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      if (!currentUser) {

        setAnnouncementStatus(
          "Please login first."
        );

        return;
      }

      const title =
        announcementTitle?.value.trim();

      const message =
        announcementText?.value.trim();

      if (!title || !message) {

        setAnnouncementStatus(
          "Enter announcement title and message."
        );

        return;
      }

      try {

        setAnnouncementStatus(
          "Publishing..."
        );

        const announcementRef =
          push(
            ref(
              db,
              "pandal/announcements"
            )
          );

        await set(
          announcementRef,
          {
            title,
            message,
            createdAt:
              Date.now(),
            author:
              currentUser.email ||
              currentUser.uid
          }
        );

        announcementForm.reset();

        setAnnouncementStatus(
          "Announcement published successfully."
        );

      } catch (err) {

        error(
          "Announcement error:",
          err
        );

        setAnnouncementStatus(
          err?.message ||
          "Unable to publish announcement."
        );
      }
    }
  );
}


function setAnnouncementStatus(
  message
) {

  if (!announcementStatus) {
    return;
  }

  announcementStatus.textContent =
    message;
}


// ============================================================
// CLEANUP BEFORE PAGE UNLOAD
// ============================================================

window.addEventListener(
  "beforeunload",
  () => {

    if (!broadcasting) {
      return;
    }

    try {

      navigator.sendBeacon?.(
        ""
      );

    } catch (_) {}

    stopLocalCamera();
  }
);


// ============================================================
// DEBUG
// ============================================================

window.GanpatiAdminDebug = {
  getBroadcastId: () =>
    broadcastId,

  getViewerCount: () =>
    peerConnections.size,

  getViewerIds: () =>
    [...peerConnections.keys()],

  getBroadcasting: () =>
    broadcasting,

  getIceServers: () =>
    ICE_SERVERS
};


log(
  "Ganpati Admin initialized."
);
