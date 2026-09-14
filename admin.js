// ============================================================
// GANPATI PANDAL — ADMIN STUDIO
// Firebase Auth + Realtime Database + WebRTC Broadcaster
// ============================================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onValue,
  onChildAdded,
  push,
  onDisconnect,
  get,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",

  authDomain: "ganpati-5f24e.firebaseapp.com",

  databaseURL:
    "https://ganpati-5f24e-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId: "ganpati-5f24e",

  storageBucket:
    "ganpati-5f24e.firebasestorage.app",

  messagingSenderId:
    "512949354669",

  appId:
    "1:512949354669:web:f561488c630203a9ae4624"
};


// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getDatabase(app);


// ============================================================
// DOM
// ============================================================

const preloader =
  document.getElementById("preloader");

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

const broadcastMessage =
  document.getElementById("broadcastMessage");

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
// STATE
// ============================================================

let localStream = null;

let broadcasting = false;

let broadcastId = null;

let broadcastCleanup = null;

const viewerConnections = new Map();


// ============================================================
// CONSTANTS
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
// HELPERS
// ============================================================

function show(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}


function hide(element) {
  if (element) {
    element.classList.add("hidden");
  }
}


function setStatus(element, message, type = "") {
  if (!element) return;

  element.textContent = message;

  element.classList.remove(
    "success",
    "error",
    "warning"
  );

  if (type) {
    element.classList.add(type);
  }
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function generateId(prefix = "") {
  const randomPart =
    Math.random()
      .toString(36)
      .slice(2, 10);

  const timePart =
    Date.now().toString(36);

  return `${prefix}${timePart}-${randomPart}`;
}


function formatDate(timestamp) {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}


// ============================================================
// PRELOADER
// ============================================================

window.addEventListener("load", () => {
  setTimeout(() => {
    if (preloader) {
      preloader.classList.add("hidden");
    }
  }, 350);
});


// ============================================================
// FIREBASE CONNECTION STATUS
// ============================================================

const connectedRef =
  ref(db, ".info/connected");

onValue(
  connectedRef,
  (snapshot) => {

    const connected =
      snapshot.val() === true;

    if (connected) {

      setStatus(
        connectionState,
        "Firebase Connected",
        "success"
      );

    } else {

      setStatus(
        connectionState,
        "Offline",
        "error"
      );
    }
  }
);


// ============================================================
// AUTHENTICATION
// ============================================================

loginForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    if (!email || !password) {
      setStatus(
        loginStatus,
        "Enter your email and password.",
        "error"
      );

      return;
    }

    setStatus(
      loginStatus,
      "Signing in..."
    );

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      passwordInput.value = "";

      setStatus(
        loginStatus,
        ""
      );

    } catch (error) {

      console.error(
        "Firebase login error:",
        error
      );

      let message =
        "Unable to sign in.";

      if (
        error.code ===
        "auth/invalid-credential"
      ) {
        message =
          "Invalid email or password.";
      }

      if (
        error.code ===
        "auth/user-not-found"
      ) {
        message =
          "No administrator account exists with this email.";
      }

      if (
        error.code ===
        "auth/wrong-password"
      ) {
        message =
          "Incorrect password.";
      }

      if (
        error.code ===
        "auth/too-many-requests"
      ) {
        message =
          "Too many attempts. Try again later.";
      }

      setStatus(
        loginStatus,
        message,
        "error"
      );
    }
  }
);


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (user) {

      hide(loginPanel);
      show(dashboard);
      show(logoutBtn);

      setStatus(
        connectionState,
        "Authenticated",
        "success"
      );

      await loadAdminData();

    } else {

      show(loginPanel);
      hide(dashboard);
      hide(logoutBtn);

      await emergencyStopBroadcast();
    }
  }
);


// ============================================================
// LOGOUT
// ============================================================

logoutBtn?.addEventListener(
  "click",
  async () => {

    try {

      await emergencyStopBroadcast();

      await signOut(auth);

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );
    }
  }
);


// ============================================================
// ADMIN DATA
// ============================================================

async function loadAdminData() {

  listenToPrayers();

}


// ============================================================
// PRAYER WALL
// ============================================================

function listenToPrayers() {

  const prayersRef =
    ref(db, "pandal/prayers_wall");

  onValue(
    prayersRef,
    (snapshot) => {

      if (!adminPrayers) return;

      const data =
        snapshot.val();

      if (!data) {

        adminPrayers.innerHTML = `
          <div class="admin-empty">
            No Sankalps yet.
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
          .sort(
            (a, b) =>
              (b.createdAt || 0) -
              (a.createdAt || 0)
          )
          .slice(0, 50);

      adminPrayers.innerHTML =
        prayers
          .map(
            (prayer) => `
              <div class="admin-list-item">

                <div>
                  <strong>
                    ${escapeHTML(prayer.text)}
                  </strong>

                  <small>
                    ${escapeHTML(
                      formatDate(
                        prayer.createdAt
                      )
                    )}
                  </small>
                </div>

              </div>
            `
          )
          .join("");
    }
  );
}


// ============================================================
// ANNOUNCEMENTS
// ============================================================

announcementForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const user = auth.currentUser;

    if (!user) {

      setStatus(
        announcementStatus,
        "You must be signed in.",
        "error"
      );

      return;
    }

    const title =
      announcementTitle.value
        .trim();

    const message =
      announcementText.value
        .trim();

    if (!title || !message) {

      setStatus(
        announcementStatus,
        "Please complete both fields.",
        "error"
      );

      return;
    }

    if (title.length > 80) {

      setStatus(
        announcementStatus,
        "Title is too long.",
        "error"
      );

      return;
    }

    if (message.length > 500) {

      setStatus(
        announcementStatus,
        "Message is too long.",
        "error"
      );

      return;
    }

    setStatus(
      announcementStatus,
      "Publishing..."
    );

    try {

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
            user.email || user.uid
        }
      );

      announcementTitle.value = "";
      announcementText.value = "";

      setStatus(
        announcementStatus,
        "Announcement published.",
        "success"
      );

    } catch (error) {

      console.error(
        "Announcement error:",
        error
      );

      setStatus(
        announcementStatus,
        "Could not publish announcement.",
        "error"
      );
    }
  }
);


// ============================================================
// START BROADCAST
// ============================================================

startBroadcastBtn?.addEventListener(
  "click",
  async () => {

    if (broadcasting) {
      return;
    }

    await startBroadcast();
  }
);


// ============================================================
// STOP BROADCAST
// ============================================================

stopBroadcastBtn?.addEventListener(
  "click",
  async () => {

    await stopBroadcast();
  }
);


// ============================================================
// START CAMERA + BROADCAST
// ============================================================

async function startBroadcast() {

  if (!auth.currentUser) {

    setStatus(
      broadcastMessage,
      "Please sign in first.",
      "error"
    );

    return;
  }

  if (!window.isSecureContext) {

    setStatus(
      broadcastMessage,
      "Camera access requires HTTPS.",
      "error"
    );

    return;
  }

  startBroadcastBtn.disabled = true;

  setStatus(
    broadcastMessage,
    "Requesting camera and microphone..."
  );

  try {

    localStream =
      await navigator.mediaDevices.getUserMedia(
        {
          video: {
            facingMode: "user",
            width: {
              ideal: 1280
            },
            height: {
              ideal: 720
            }
          },

          audio: true
        }
      );

    if (preview) {

      preview.srcObject =
        localStream;

      await preview.play()
        .catch(() => {});
    }

    broadcastId =
      generateId("broadcast-");

    const broadcastRef =
      ref(
        db,
        "pandal/broadcast"
      );

    // Set emergency cleanup if the admin
    // browser disconnects unexpectedly.
    await onDisconnect(
      broadcastRef
    ).set({
      active: false,
      broadcastId,
      stoppedAt: Date.now()
    });

    await set(
      broadcastRef,
      {
        active: true,
        broadcastId,
        startedAt: Date.now(),
        startedBy:
          auth.currentUser.uid
      }
    );

    broadcasting = true;

    setStatus(
      broadcastStatus,
      "LIVE",
      "success"
    );

    setStatus(
      broadcastMessage,
      "Live Darshan is now broadcasting.",
      "success"
    );

    startBroadcastBtn.disabled =
      true;

    stopBroadcastBtn.disabled =
      false;

    listenForViewers();

  } catch (error) {

    console.error(
      "Broadcast start error:",
      error
    );

    if (error.name === "NotAllowedError") {

      setStatus(
        broadcastMessage,
        "Camera or microphone permission was denied.",
        "error"
      );

    } else if (
      error.name ===
      "NotFoundError"
    ) {

      setStatus(
        broadcastMessage,
        "No camera or microphone was found.",
        "error"
      );

    } else {

      setStatus(
        broadcastMessage,
        "Could not start the broadcast.",
        "error"
      );
    }

    startBroadcastBtn.disabled =
      false;

    stopBroadcastBtn.disabled =
      false;

    stopLocalMedia();
  }
}


// ============================================================
// VIEWER MONITORING
// ============================================================

function listenForViewers() {

  if (broadcastCleanup) {
    broadcastCleanup();
    broadcastCleanup = null;
  }

  const viewersRef =
    ref(
      db,
      "pandal/viewers"
    );

  const unsubscribe =
    onValue(
      viewersRef,
      async (snapshot) => {

        if (!broadcasting) {
          return;
        }

        const viewers =
          snapshot.val() || {};

        const activeKeys =
          new Set();

        for (
          const [
            viewerId,
            viewer
          ] of Object.entries(viewers)
        ) {

          if (
            !viewer ||
            viewer.active !== true ||
            viewer.broadcastId !== broadcastId ||
            !viewer.sessionId
          ) {
            continue;
          }

          const sessionId =
            viewer.sessionId;

          const key =
            `${viewerId}/${sessionId}`;

          activeKeys.add(key);

          if (
            !viewerConnections.has(key)
          ) {

            await handleViewer(
              viewerId,
              sessionId
            );
          }
        }

        // Close connections that no longer
        // represent an active viewer session.
        for (
          const [
            key
          ] of viewerConnections
        ) {

          if (!activeKeys.has(key)) {

            await cleanupViewerConnection(
              key
            );
          }
        }
      }
    );

  broadcastCleanup =
    unsubscribe;
}


// ============================================================
// HANDLE ONE VIEWER
// ============================================================

async function handleViewer(
  viewerId,
  sessionId
) {

  if (!broadcasting) {
    return;
  }

  const key =
    `${viewerId}/${sessionId}`;

  if (
    viewerConnections.has(key)
  ) {
    return;
  }

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


  const peerConnection =
    new RTCPeerConnection(
      RTC_CONFIGURATION
    );


  const connectionState = {
    peerConnection,
    candidateUnsubscribe: null,
    offerUnsubscribe: null,
    started: false,
    closed: false
  };


  viewerConnections.set(
    key,
    connectionState
  );


  // ----------------------------------------------------------
  // Add camera + microphone tracks
  // ----------------------------------------------------------

  if (localStream) {

    for (
      const track
      of localStream.getTracks()
    ) {

      peerConnection.addTrack(
        track,
        localStream
      );
    }
  }


  // ----------------------------------------------------------
  // ICE candidates generated by broadcaster
  // ----------------------------------------------------------

  peerConnection.onicecandidate =
    async (event) => {

      if (
        !event.candidate ||
        !broadcasting ||
        connectionState.closed
      ) {
        return;
      }

      try {

        await push(
          broadcasterCandidatesRef,
          event.candidate.toJSON()
        );

      } catch (error) {

        console.error(
          "Broadcaster ICE error:",
          error
        );
      }
    };


  // ----------------------------------------------------------
  // Connection state
  // ----------------------------------------------------------

  peerConnection.onconnectionstatechange =
    async () => {

      const state =
        peerConnection.connectionState;

      console.log(
        `Viewer ${viewerId}:`,
        state
      );

      if (
        state === "failed" ||
        state === "closed" ||
        state === "disconnected"
      ) {

        // Give disconnected WebRTC connections
        // a short chance to recover.
        if (
          state === "disconnected"
        ) {

          setTimeout(
            async () => {

              if (
                peerConnection.connectionState ===
                "disconnected"
              ) {

                await cleanupViewerConnection(
                  key
                );
              }

            },
            5000
          );

        } else {

          await cleanupViewerConnection(
            key
          );
        }
      }
    };


  // ----------------------------------------------------------
  // Listen for viewer ICE candidates
  //
  // IMPORTANT:
  // onChildAdded is used instead of onValue,
  // so old ICE candidates are not repeatedly
  // added to RTCPeerConnection.
  // ----------------------------------------------------------

  connectionState.candidateUnsubscribe =
    onChildAdded(
      viewerCandidatesRef,
      async (snapshot) => {

        if (
          connectionState.closed ||
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
            "Could not add viewer ICE candidate:",
            error
          );
        }
      }
    );


  // ----------------------------------------------------------
  // Watch for viewer offer
  // ----------------------------------------------------------

  connectionState.offerUnsubscribe =
    onValue(
      offerRef,
      async (snapshot) => {

        if (
          connectionState.closed ||
          !snapshot.exists() ||
          connectionState.started
        ) {
          return;
        }

        const offer =
          snapshot.val();

        if (
          !offer ||
          !offer.type ||
          !offer.sdp
        ) {
          return;
        }

        try {

          connectionState.started =
            true;

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          );

          const answer =
            await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(
            answer
          );

          if (
            !broadcasting ||
            connectionState.closed
          ) {
            return;
          }

          await set(
            answerRef,
            {
              type:
                answer.type,
              sdp:
                answer.sdp
            }
          );

          console.log(
            "WebRTC answer sent:",
            key
          );

        } catch (error) {

          console.error(
            "WebRTC offer handling error:",
            error
          );

          await cleanupViewerConnection(
            key
          );
        }
      }
    );


  // ----------------------------------------------------------
  // Session closed listener
  // ----------------------------------------------------------

  const closedUnsubscribe =
    onValue(
      closedRef,
      async (snapshot) => {

        if (
          snapshot.val() === true
        ) {

          await cleanupViewerConnection(
            key
          );
        }
      }
    );


  connectionState.closedUnsubscribe =
    closedUnsubscribe;


  // ----------------------------------------------------------
  // Verify this viewer still belongs to
  // the current broadcast.
  // ----------------------------------------------------------

  try {

    const viewerRef =
      ref(
        db,
        `pandal/viewers/${viewerId}`
      );

    const viewerSnapshot =
      await get(viewerRef);

    const currentViewer =
      viewerSnapshot.val();

    if (
      !currentViewer ||
      currentViewer.active !== true ||
      currentViewer.broadcastId !== broadcastId ||
      currentViewer.sessionId !== sessionId
    ) {

      await cleanupViewerConnection(
        key
      );

      return;
    }

    console.log(
      "Watching viewer:",
      key
    );

  } catch (error) {

    console.error(
      "Viewer verification failed:",
      error
    );
  }
}


// ============================================================
// CLEANUP VIEWER CONNECTION
// ============================================================

async function cleanupViewerConnection(
  key
) {

  const connection =
    viewerConnections.get(key);

  if (!connection) {
    return;
  }

  connection.closed =
    true;


  if (
    connection.offerUnsubscribe
  ) {

    connection.offerUnsubscribe();

    connection.offerUnsubscribe =
      null;
  }


  if (
    connection.candidateUnsubscribe
  ) {

    connection.candidateUnsubscribe();

    connection.candidateUnsubscribe =
      null;
  }


  if (
    connection.closedUnsubscribe
  ) {

    connection.closedUnsubscribe();

    connection.closedUnsubscribe =
      null;
  }


  try {

    connection.peerConnection.onicecandidate =
      null;

    connection.peerConnection.onconnectionstatechange =
      null;

    connection.peerConnection.close();

  } catch (error) {

    console.warn(
      "Peer cleanup warning:",
      error
    );
  }


  viewerConnections.delete(key);
}


// ============================================================
// STOP BROADCAST
// ============================================================

async function stopBroadcast() {

  if (
    !broadcasting &&
    !localStream
  ) {
    return;
  }

  setStatus(
    broadcastMessage,
    "Stopping Live Darshan..."
  );

  broadcasting = false;


  // Stop listening for viewers.
  if (broadcastCleanup) {

    broadcastCleanup();

    broadcastCleanup =
      null;
  }


  // Close all WebRTC connections.
  const keys =
    Array.from(
      viewerConnections.keys()
    );

  for (
    const key of keys
  ) {

    await cleanupViewerConnection(
      key
    );
  }


  // Mark current sessions as closed.
  if (broadcastId) {

    try {

      const viewersSnapshot =
        await get(
          ref(
            db,
            "pandal/viewers"
          )
        );

      const viewers =
        viewersSnapshot.val() || {};

      const closeOperations = [];

      for (
        const [
          viewerId,
          viewer
        ] of Object.entries(viewers)
      ) {

        if (
          viewer &&
          viewer.broadcastId === broadcastId &&
          viewer.sessionId
        ) {

          const closedRef =
            ref(
              db,
              `pandal/signals/${viewerId}/${viewer.sessionId}/closed`
            );

          closeOperations.push(
            set(
              closedRef,
              true
            )
          );
        }
      }

      await Promise.all(
        closeOperations
      );

    } catch (error) {

      console.warn(
        "Could not close viewer sessions:",
        error
      );
    }
  }


  // Remove the public broadcast ONLY if
  // it is still our broadcast.
  try {

    const broadcastRef =
      ref(
        db,
        "pandal/broadcast"
      );

    await runTransaction(
      broadcastRef,
      (current) => {

        if (
          current &&
          current.broadcastId === broadcastId
        ) {

          return null;
        }

        return current;
      }
    );

  } catch (error) {

    console.warn(
      "Broadcast cleanup error:",
      error
    );
  }


  stopLocalMedia();

  broadcastId =
    null;


  setStatus(
    broadcastStatus,
    "Offline"
  );

  setStatus(
    broadcastMessage,
    "Live Darshan has ended."
  );

  startBroadcastBtn.disabled =
    false;

  stopBroadcastBtn.disabled =
    false;
}


// ============================================================
// EMERGENCY STOP
// ============================================================

async function emergencyStopBroadcast() {

  if (
    !broadcasting &&
    !localStream
  ) {
    return;
  }

  try {

    await stopBroadcast();

  } catch (error) {

    console.error(
      "Emergency broadcast stop failed:",
      error
    );

    broadcasting = false;

    stopLocalMedia();
  }
}


// ============================================================
// STOP LOCAL MEDIA
// ============================================================

function stopLocalMedia() {

  if (localStream) {

    for (
      const track
      of localStream.getTracks()
    ) {

      track.stop();
    }

    localStream =
      null;
  }

  if (preview) {

    preview.srcObject =
      null;
  }
}


// ============================================================
// PAGE EXIT
// ============================================================

window.addEventListener(
  "pagehide",
  () => {

    if (!broadcasting) {
      return;
    }

    // Firebase onDisconnect handles the
    // public broadcast state if the page dies.
    stopLocalMedia();

  },
  {
    capture: true
  }
);


// ============================================================
// SAFETY: INITIAL BUTTON STATE
// ============================================================

if (stopBroadcastBtn) {
  stopBroadcastBtn.disabled = true;
}

if (startBroadcastBtn) {
  startBroadcastBtn.disabled = false;
}


// ============================================================
// END
// ============================================================
