// ============================================================
// GANPATI DIGITAL DARSHAN
// admin.js
// Firebase Authentication + WebRTC Broadcaster
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
  remove,
  push,
  onValue,
  off
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
// FIREBASE INITIALIZATION
// ============================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


// ============================================================
// WEBRTC ICE SERVERS
// ============================================================
//
// STUN works for many connections.
//
// TURN is REQUIRED for reliable operation across restrictive
// mobile networks, CGNAT and some Wi-Fi networks.
//
// Replace the commented TURN section with your REAL credentials.
// Use the same TURN configuration in app.js.
// ============================================================

const ICE_SERVERS = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302"
    ]
  }

  /*
  ,
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


const RTC_CONFIGURATION = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require"
};


// ============================================================
// DOM ELEMENTS
// ============================================================

const loginPanel =
  document.getElementById("loginPanel");

const dashboard =
  document.getElementById("dashboard");

const loginForm =
  document.getElementById("loginForm");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const loginStatus =
  document.getElementById("loginStatus");

const logoutBtn =
  document.getElementById("logoutBtn");

const connectionState =
  document.getElementById("connectionState");

const broadcastStatus =
  document.getElementById("broadcastStatus");

const preview =
  document.getElementById("preview");

const startBroadcastBtn =
  document.getElementById("startBroadcast");

const stopBroadcastBtn =
  document.getElementById("stopBroadcast");

const adminPrayers =
  document.getElementById("adminPrayers");

const announcementForm =
  document.getElementById("announcementForm");

const announcementTitle =
  document.getElementById("announcementTitle");

const announcementText =
  document.getElementById("announcementText");

const announcementStatus =
  document.getElementById("announcementStatus");


// ============================================================
// APPLICATION STATE
// ============================================================

let currentUser = null;

let localStream = null;

let broadcasting = false;

let broadcastId = null;

let viewerListener = null;

let broadcastStateListener = null;

let prayersListener = null;

const peerConnections = new Map();

const viewerCreationLocks = new Map();

const recoveryTimers = new Map();

const answerListeners = new Map();

const viewerCandidateListeners = new Map();

let shuttingDown = false;


// ============================================================
// SETTINGS
// ============================================================

const INITIAL_RECOVERY_DELAY = 1000;

const MAX_RECOVERY_DELAY = 15000;


// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function log(...args) {
  console.log("[Ganpati Admin]", ...args);
}


function warn(...args) {
  console.warn("[Ganpati Admin]", ...args);
}


function reportError(...args) {
  console.error("[Ganpati Admin]", ...args);
}


function generateId(prefix = "") {
  return (
    prefix +
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}


function setLoginStatus(message) {
  if (loginStatus) {
    loginStatus.textContent = message;
  }
}


function setBroadcastStatus(message) {
  if (broadcastStatus) {
    broadcastStatus.textContent = message;
  }
}


function setConnectionState(message) {
  if (connectionState) {
    connectionState.textContent = message;
  }
}


function setAnnouncementStatus(message) {
  if (announcementStatus) {
    announcementStatus.textContent = message;
  }
}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(auth, user => {
  currentUser = user;

  if (user) {
    log("Authenticated:", user.email);

    loginPanel?.classList.add("hidden");
    dashboard?.classList.remove("hidden");

    setConnectionState("Connected");

    loadPrayers();
    startBroadcastStateListener();

    return;
  }

  log("No authenticated user.");

  loginPanel?.classList.remove("hidden");
  dashboard?.classList.add("hidden");

  stopBroadcast();
});


if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email =
      emailInput?.value.trim();

    const password =
      passwordInput?.value || "";

    if (!email || !password) {
      setLoginStatus(
        "Enter your email and password."
      );
      return;
    }

    setLoginStatus("Signing in...");

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setLoginStatus("Login successful.");

    } catch (error) {
      reportError(
        "Login error:",
        error
      );

      setLoginStatus(
        error?.message ||
        "Login failed."
      );
    }
  });
}


if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await stopBroadcast();
      await signOut(auth);
    } catch (error) {
      reportError(
        "Logout error:",
        error
      );
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

  localStream =
    await navigator.mediaDevices.getUserMedia({
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
    } catch (_) {
      // Browser may require a user gesture.
    }
  }

  return localStream;
}


function stopLocalCamera() {
  if (!localStream) {
    return;
  }

  for (const track of localStream.getTracks()) {
    try {
      track.stop();
    } catch (_) {
      // Track is already stopped.
    }
  }

  localStream = null;

  if (preview) {
    preview.srcObject = null;
  }
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
    setBroadcastStatus(
      "Broadcast is already live."
    );
    return;
  }

  shuttingDown = false;

  try {
    setBroadcastStatus(
      "Starting camera..."
    );

    setConnectionState(
      "Opening camera..."
    );

    await getCameraStream();

    broadcastId =
      generateId("broadcast-");

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

    startViewerListener();

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

    log(
      "Broadcast started:",
      broadcastId
    );

  } catch (error) {
    reportError(
      "Start broadcast error:",
      error
    );

    broadcasting = false;

    broadcastId = null;

    stopLocalCamera();

    setBroadcastStatus(
      error?.message ||
      "Unable to start broadcast."
    );

    setConnectionState(
      "Broadcast failed"
    );
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
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  broadcasting = false;

  stopViewerListener();

  clearAllRecoveryTimers();

  closeAllViewerPeers();

  clearAllSignalListeners();

  if (broadcastId) {
    try {
      await remove(
        ref(db, "pandal/broadcast")
      );
    } catch (error) {
      reportError(
        "Unable to remove broadcast state:",
        error
      );
    }
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

  shuttingDown = false;
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
    if (!broadcasting) {
      return;
    }

    try {
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

          if (
            !peerConnections.has(viewerId)
          ) {
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
          closeViewerPeer(viewerId);
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

    } catch (error) {
      reportError(
        "Viewer listener processing error:",
        error
      );
    }
  };

  const errorCallback = error => {
    reportError(
      "Firebase viewer listener error:",
      error
    );

    if (
      error?.code ===
      "PERMISSION_DENIED"
    ) {
      setBroadcastStatus(
        "Firebase permission denied for viewers."
      );
      return;
    }

    setBroadcastStatus(
      "Viewer listener lost — reconnecting..."
    );

    scheduleViewerListenerRecovery();
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
  } catch (error) {
    reportError(
      "Viewer listener cleanup error:",
      error
    );
  }

  viewerListener = null;
}


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

  const promise =
    createViewerConnectionInternal(
      viewerId,
      forceRestart
    );

  viewerCreationLocks.set(
    viewerId,
    promise
  );

  try {
    await promise;
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
  forceRestart
) {
  if (!broadcasting) {
    return;
  }

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

  pc.__recoveryAttempts = 0;

  if (!localStream) {
    await getCameraStream();
  }

  for (
    const track
    of localStream.getTracks()
  ) {
    pc.addTrack(
      track,
      localStream
    );
  }


  // ----------------------------------------------------------
  // CONNECTION STATE
  // ----------------------------------------------------------

  pc.onconnectionstatechange = () => {
    const state =
      pc.connectionState;

    log(
      `Viewer ${viewerId} connection:`,
      state
    );

    if (state === "connected") {
      pc.__recoveryAttempts = 0;
      clearRecoveryTimer(viewerId);

      setBroadcastStatus(
        "LIVE — viewer connected"
      );

      return;
    }

    if (
      state === "disconnected" ||
      state === "failed"
    ) {
      scheduleViewerRecovery(
        viewerId,
        state === "failed"
      );
    }

    if (state === "closed") {
      closeViewerPeer(viewerId);
    }
  };


  // ----------------------------------------------------------
  // ICE STATE
  // ----------------------------------------------------------

  pc.oniceconnectionstatechange = () => {
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
      pc.__recoveryAttempts = 0;
      clearRecoveryTimer(viewerId);
    }

    if (
      state === "disconnected" ||
      state === "failed"
    ) {
      scheduleViewerRecovery(
        viewerId,
        state === "failed"
      );
    }
  };


  // ----------------------------------------------------------
  // BROADCASTER ICE CANDIDATES
  // ----------------------------------------------------------

  pc.onicecandidate = async event => {
    if (!event.candidate) {
      return;
    }

    try {
      await push(
        ref(
          db,
          `pandal/signals/${viewerId}/broadcasterCandidates`
        ),
        event.candidate.toJSON()
      );
    } catch (error) {
      reportError(
        "Broadcaster ICE send error:",
        error
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
        peerConnections.get(viewerId) !== pc
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
          new RTCSessionDescription({
            type: answer.type,
            sdp: answer.sdp
          })
        );

        log(
          "Answer applied:",
          viewerId
        );

      } catch (error) {
        reportError(
          "Answer processing error:",
          error
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
    error => {
      reportError(
        "Answer listener error:",
        error
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
        if (
          peerConnections.get(viewerId) !== pc
        ) {
          return;
        }

        try {
          await pc.addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );
        } catch (error) {
          warn(
            "Viewer ICE candidate error:",
            error
          );
        }
      }
    };

  onValue(
    viewerCandidatesRef,
    viewerCandidatesCallback,
    error => {
      reportError(
        "Viewer candidate listener error:",
        error
      );
    }
  );

  viewerCandidateListeners.set(
    viewerId,
    {
      ref: viewerCandidatesRef,
      callback: viewerCandidatesCallback
    }
  );


  // ----------------------------------------------------------
  // CREATE OFFER
  // ----------------------------------------------------------

  try {
    const offer =
      await pc.createOffer();

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
      "Offer sent:",
      viewerId
    );

  } catch (error) {
    reportError(
      "Offer creation error:",
      error
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

  const pc =
    peerConnections.get(viewerId);

  let attempts =
    pc?.__recoveryAttempts || 0;

  const delay =
    immediate
      ? 500
      : Math.min(
          INITIAL_RECOVERY_DELAY *
          Math.pow(2, attempts),
          MAX_RECOVERY_DELAY
        );

  if (pc) {
    pc.__recoveryAttempts =
      attempts + 1;
  }

  log(
    `Viewer ${viewerId} recovery in ${delay}ms`
  );

  const timer =
    setTimeout(async () => {
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
      } catch (error) {
        reportError(
          "Viewer recovery error:",
          error
        );

        scheduleViewerRecovery(
          viewerId
        );
      }
    }, delay);

  recoveryTimers.set(
    viewerId,
    timer
  );
}


function clearRecoveryTimer(viewerId) {
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
// CLOSE ONE VIEWER
// ============================================================

function closeViewerPeer(viewerId) {
  clearRecoveryTimer(viewerId);

  const pc =
    peerConnections.get(viewerId);

  if (pc) {
    try {
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    } catch (_) {
      // Peer already closed.
    }
  }

  peerConnections.delete(viewerId);

  const answerListener =
    answerListeners.get(viewerId);

  if (answerListener) {
    try {
      off(
        answerListener.ref,
        "value",
        answerListener.callback
      );
    } catch (_) {
      // Listener already removed.
    }

    answerListeners.delete(
      viewerId
    );
  }

  const candidateListener =
    viewerCandidateListeners.get(
      viewerId
    );

  if (candidateListener) {
    try {
      off(
        candidateListener.ref,
        "value",
        candidateListener.callback
      );
    } catch (_) {
      // Listener already removed.
    }

    viewerCandidateListeners.delete(
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
    closeViewerPeer(viewerId);
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
    of viewerCandidateListeners.values()
  ) {
    try {
      off(
        listener.ref,
        "value",
        listener.callback
      );
    } catch (_) {}
  }

  viewerCandidateListeners.clear();
}


// ============================================================
// NETWORK RECOVERY
// ============================================================

window.addEventListener(
  "offline",
  () => {
    if (!broadcasting) {
      return;
    }

    warn(
      "Browser reports offline."
    );

    setConnectionState(
      "Internet interrupted — reconnecting..."
    );

    setBroadcastStatus(
      "Network interrupted — waiting for connection..."
    );
  }
);


window.addEventListener(
  "online",
  () => {
    if (!broadcasting) {
      return;
    }

    log(
      "Browser reports online."
    );

    setConnectionState(
      "Network restored — reconnecting..."
    );

    setBroadcastStatus(
      "Reconnecting live broadcast..."
    );

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
  }
);


// ============================================================
// VISIBILITY RECOVERY
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

    startViewerListener();

    for (
      const [viewerId, pc]
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

      log(
        "Firebase broadcast state:",
        state
      );
    };

  onValue(
    broadcastRef,
    callback,
    error => {
      reportError(
        "Broadcast state listener error:",
        error
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
            ([, first], [, second]) =>
              (second?.createdAt || 0) -
              (first?.createdAt || 0)
          );

      for (
        const [, prayer]
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

        article.appendChild(text);
        article.appendChild(time);

        adminPrayers.appendChild(
          article
        );
      }
    };

  onValue(
    prayersRef,
    callback,
    error => {
      reportError(
        "Prayer listener error:",
        error
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
            createdAt: Date.now(),
            author:
              currentUser.email ||
              currentUser.uid
          }
        );

        announcementForm.reset();

        setAnnouncementStatus(
          "Announcement published successfully."
        );

      } catch (error) {
        reportError(
          "Announcement error:",
          error
        );

        setAnnouncementStatus(
          error?.message ||
          "Unable to publish announcement."
        );
      }
    }
  );
}


// ============================================================
// STARTUP
// ============================================================

log(
  "Ganpati admin.js loaded successfully."
);


// ============================================================
// DEBUG API
// ============================================================

window.GanpatiAdminDebug = {
  broadcastId: () =>
    broadcastId,

  broadcasting: () =>
    broadcasting,

  viewerCount: () =>
    peerConnections.size,

  viewerIds: () =>
    [...peerConnections.keys()],

  connectionStates: () =>
    Object.fromEntries(
      [...peerConnections.entries()]
        .map(([id, pc]) => [
          id,
          {
            connection:
              pc.connectionState,
            ice:
              pc.iceConnectionState
          }
        ])
    )
};
