// ============================================================
// GANPATI DIGITAL DARSHAN
// app.js
// Firebase + WebRTC Viewer
// Automatic reconnection + TURN support
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  off,
  remove
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

const app =
  initializeApp(firebaseConfig);

const db =
  getDatabase(app);


// ============================================================
// WEBRTC ICE SERVERS
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
// DOM
// ============================================================

const liveVideo =
  document.getElementById(
    "liveVideo"
  );

const activeStreamUI =
  document.getElementById(
    "active-stream-ui"
  );

const offlineStreamUI =
  document.getElementById(
    "offline-stream-ui"
  );


// ============================================================
// VIEWER STATE
// ============================================================

const viewerId =
  generateId("viewer-");

let broadcastId = null;

let peerConnection = null;

let broadcastListener = null;

let offerListener = null;

let broadcasterCandidateListener =
  null;

let closedListener = null;

let viewerStateRef = null;

let reconnectTimer = null;

let reconnectAttempts = 0;

let connecting = false;

let online =
  navigator.onLine;

let manuallyStopped = false;


// ============================================================
// SETTINGS
// ============================================================

const MAX_RECONNECT_DELAY =
  15000;


// ============================================================
// HELPERS
// ============================================================

function log(...args) {
  console.log("[Ganpati Viewer]", ...args);
}


function warn(...args) {
  console.warn("[Ganpati Viewer]", ...args);
}


function reportError(...args) {
  console.error("[Ganpati Viewer]", ...args);
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


// ============================================================
// UI
// ============================================================

function showLiveUI() {
  activeStreamUI?.classList.remove(
    "hidden"
  );

  offlineStreamUI?.classList.add(
    "hidden"
  );
}


function showOfflineUI() {
  activeStreamUI?.classList.add(
    "hidden"
  );

  offlineStreamUI?.classList.remove(
    "hidden"
  );
}


function showConnectingUI() {
  activeStreamUI?.classList.remove(
    "hidden"
  );

  offlineStreamUI?.classList.add(
    "hidden"
  );
}


// ============================================================
// BROADCAST LISTENER
// ============================================================

function startBroadcastListener() {
  if (broadcastListener) {
    return;
  }

  const broadcastRef =
    ref(db, "pandal/broadcast");

  const callback =
    async snapshot => {
      const broadcast =
        snapshot.val();

      if (
        !broadcast ||
        broadcast.active !== true
      ) {
        log(
          "Broadcast is offline."
        );

        broadcastId = null;

        await cleanupPeer();

        showOfflineUI();

        return;
      }

      if (
        broadcastId === broadcast.id &&
        peerConnection
      ) {
        return;
      }

      log(
        "Broadcast detected:",
        broadcast.id
      );

      broadcastId =
        broadcast.id;

      reconnectAttempts = 0;

      await connectToBroadcast();
    };

  const errorCallback =
    error => {
      reportError(
        "Broadcast listener error:",
        error
      );

      showConnectingUI();

      scheduleReconnect(true);
    };

  onValue(
    broadcastRef,
    callback,
    errorCallback
  );

  broadcastListener = {
    ref: broadcastRef,
    callback
  };
}


// ============================================================
// CONNECT TO BROADCAST
// ============================================================

async function connectToBroadcast() {
  if (
    manuallyStopped ||
    !broadcastId ||
    !online
  ) {
    return;
  }

  if (connecting) {
    return;
  }

  connecting = true;

  try {
    showConnectingUI();

    await cleanupPeer();

    const pc =
      new RTCPeerConnection(
        RTC_CONFIGURATION
      );

    peerConnection = pc;


    // --------------------------------------------------------
    // REMOTE VIDEO
    // --------------------------------------------------------

    pc.ontrack = event => {
      if (
        !event.streams ||
        !event.streams[0]
      ) {
        return;
      }

      log(
        "Remote video stream received."
      );

      liveVideo.srcObject =
        event.streams[0];

      showLiveUI();

      liveVideo
        ?.play()
        .catch(() => {});

      reconnectAttempts = 0;
    };


    // --------------------------------------------------------
    // CONNECTION STATE
    // --------------------------------------------------------

    pc.onconnectionstatechange =
      () => {
        const state =
          pc.connectionState;

        log(
          "Connection:",
          state
        );

        if (state === "connected") {
          reconnectAttempts = 0;
          showLiveUI();
          return;
        }

        if (state === "disconnected") {
          scheduleReconnect(false);
          return;
        }

        if (state === "failed") {
          scheduleReconnect(true);
          return;
        }

        if (state === "closed") {
          scheduleReconnect(false);
        }
      };


    // --------------------------------------------------------
    // ICE STATE
    // --------------------------------------------------------

    pc.oniceconnectionstatechange =
      () => {
        const state =
          pc.iceConnectionState;

        log(
          "ICE:",
          state
        );

        if (
          state === "connected" ||
          state === "completed"
        ) {
          reconnectAttempts = 0;
        }

        if (state === "disconnected") {
          scheduleReconnect(false);
        }

        if (state === "failed") {
          scheduleReconnect(true);
        }
      };


    // --------------------------------------------------------
    // SEND VIEWER ICE
    // --------------------------------------------------------

    pc.onicecandidate =
      async event => {
        if (!event.candidate) {
          return;
        }

        try {
          await push(
            ref(
              db,
              `pandal/signals/${viewerId}/viewerCandidates`
            ),
            event.candidate.toJSON()
          );
        } catch (error) {
          reportError(
            "Viewer ICE send error:",
            error
          );
        }
      };


    // --------------------------------------------------------
    // REGISTER VIEWER
    // --------------------------------------------------------

    viewerStateRef =
      ref(
        db,
        `pandal/viewers/${viewerId}`
      );

    await set(
      viewerStateRef,
      {
        active: true,
        broadcastId,
        joinedAt: Date.now()
      }
    );


    // --------------------------------------------------------
    // OFFER LISTENER
    // --------------------------------------------------------

    const offerRef =
      ref(
        db,
        `pandal/signals/${viewerId}/offer`
      );

    const offerCallback =
      async snapshot => {
        const offer =
          snapshot.val();

        if (!offer) {
          return;
        }

        if (
          offer.broadcastId &&
          offer.broadcastId !==
            broadcastId
        ) {
          return;
        }

        if (
          peerConnection !== pc
        ) {
          return;
        }

        try {
          if (
            pc.signalingState !==
            "stable"
          ) {
            return;
          }

          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: offer.type,
              sdp: offer.sdp
            })
          );

          const answer =
            await pc.createAnswer();

          await pc.setLocalDescription(
            answer
          );

          await set(
            ref(
              db,
              `pandal/signals/${viewerId}/answer`
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
            "Answer sent to broadcaster."
          );

        } catch (error) {
          reportError(
            "Offer processing error:",
            error
          );

          scheduleReconnect(true);
        }
      };

    onValue(
      offerRef,
      offerCallback,
      error => {
        reportError(
          "Offer listener error:",
          error
        );

        scheduleReconnect();
      }
    );

    offerListener = {
      ref: offerRef,
      callback: offerCallback
    };


    // --------------------------------------------------------
    // BROADCASTER ICE
    // --------------------------------------------------------

    const broadcasterCandidatesRef =
      ref(
        db,
        `pandal/signals/${viewerId}/broadcasterCandidates`
      );

    const broadcasterCandidatesCallback =
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
            peerConnection !== pc
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
              "Broadcaster ICE candidate error:",
              error
            );
          }
        }
      };

    onValue(
      broadcasterCandidatesRef,
      broadcasterCandidatesCallback,
      error => {
        reportError(
          "Broadcaster ICE listener error:",
          error
        );

        scheduleReconnect();
      }
    );

    broadcasterCandidateListener = {
      ref:
        broadcasterCandidatesRef,
      callback:
        broadcasterCandidatesCallback
    };


    // --------------------------------------------------------
    // BROADCAST CLOSED SIGNAL
    // --------------------------------------------------------

    const closedRef =
      ref(
        db,
        `pandal/signals/${viewerId}/closed`
      );

    const closedCallback =
      snapshot => {
        if (
          snapshot.val() === true
        ) {
          log(
            "Broadcaster closed connection."
          );

          cleanupPeer();

          showOfflineUI();
        }
      };

    onValue(
      closedRef,
      closedCallback
    );

    closedListener = {
      ref: closedRef,
      callback: closedCallback
    };

    connecting = false;

  } catch (error) {
    reportError(
      "Broadcast connection error:",
      error
    );

    connecting = false;

    scheduleReconnect(true);
  }
}


// ============================================================
// RECONNECT
// ============================================================

function scheduleReconnect(
  immediate = false
) {
  if (
    manuallyStopped ||
    !broadcastId ||
    !online
  ) {
    return;
  }

  if (reconnectTimer) {
    return;
  }

  const delay =
    immediate
      ? 500
      : Math.min(
          1000 *
          Math.pow(
            2,
            reconnectAttempts
          ),
          MAX_RECONNECT_DELAY
        );

  reconnectAttempts++;

  log(
    `Reconnecting in ${delay}ms`
  );

  showConnectingUI();

  reconnectTimer =
    setTimeout(async () => {
      reconnectTimer = null;

      if (
        manuallyStopped ||
        !broadcastId ||
        !online
      ) {
        return;
      }

      await connectToBroadcast();
    }, delay);
}


// ============================================================
// CLEANUP
// ============================================================

async function cleanupPeer() {
  if (reconnectTimer) {
    clearTimeout(
      reconnectTimer
    );

    reconnectTimer = null;
  }

  if (offerListener) {
    try {
      off(
        offerListener.ref,
        "value",
        offerListener.callback
      );
    } catch (_) {}

    offerListener = null;
  }

  if (broadcasterCandidateListener) {
    try {
      off(
        broadcasterCandidateListener.ref,
        "value",
        broadcasterCandidateListener.callback
      );
    } catch (_) {}

    broadcasterCandidateListener =
      null;
  }

  if (closedListener) {
    try {
      off(
        closedListener.ref,
        "value",
        closedListener.callback
      );
    } catch (_) {}

    closedListener = null;
  }

  const pc =
    peerConnection;

  peerConnection = null;

  if (pc) {
    try {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange =
        null;
      pc.oniceconnectionstatechange =
        null;
      pc.close();
    } catch (_) {}
  }

  if (viewerStateRef) {
    try {
      await remove(
        viewerStateRef
      );
    } catch (_) {}

    viewerStateRef = null;
  }

  if (liveVideo) {
    liveVideo.srcObject = null;
  }

  connecting = false;
}


// ============================================================
// NETWORK EVENTS
// ============================================================

window.addEventListener(
  "offline",
  () => {
    online = false;

    warn(
      "Browser reports offline."
    );

    showConnectingUI();

    if (liveVideo) {
      liveVideo.pause();
    }
  }
);


window.addEventListener(
  "online",
  async () => {
    online = true;

    log(
      "Browser reports online."
    );

    if (!broadcastId) {
      return;
    }

    showConnectingUI();

    await new Promise(resolve => {
      setTimeout(
        resolve,
        1500
      );
    });

    reconnectAttempts = 0;

    await connectToBroadcast();
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

    if (
      !broadcastId ||
      !online
    ) {
      return;
    }

    if (
      !peerConnection ||
      peerConnection.connectionState ===
        "failed" ||
      peerConnection.connectionState ===
        "disconnected" ||
      peerConnection.iceConnectionState ===
        "failed"
    ) {
      scheduleReconnect(true);
    }
  }
);


// ============================================================
// START
// ============================================================

startBroadcastListener();


// ============================================================
// PAGE UNLOAD
// ============================================================

window.addEventListener(
  "beforeunload",
  () => {
    manuallyStopped = true;

    try {
      peerConnection?.close();
    } catch (_) {}
  }
);


// ============================================================
// DEBUG
// ============================================================

window.GanpatiViewerDebug = {
  viewerId: () =>
    viewerId,

  broadcastId: () =>
    broadcastId,

  connectionState: () =>
    peerConnection?.connectionState ||
    "none",

  iceConnectionState: () =>
    peerConnection?.iceConnectionState ||
    "none",

  online: () =>
    online
};


log(
  "Ganpati app.js loaded successfully."
);
