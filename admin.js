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
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624"
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
// DOM ELEMENTS
// ============================================================

const preloader = document.getElementById("preloader");

const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginStatus = document.getElementById("loginStatus");

const logoutBtn = document.getElementById("logoutBtn");

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

let broadcastStartedAt = null;

let broadcastCleanup = null;

let prayerListenerActive = false;

const viewerConnections = new Map();


// ============================================================
// WEBRTC CONFIGURATION
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
    hide(preloader);
  }, 350);
});


// ============================================================
// FIREBASE CONNECTION
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
        "Firebase Offline",
        "error"
      );
    }
  },
  (error) => {

    console.error(
      "Firebase connection listener:",
      error
    );

    setStatus(
      connectionState,
      "Connection Error",
      "error"
    );
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
      emailInput?.value.trim();

    const password =
      passwordInput?.value;

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

      if (passwordInput) {
        passwordInput.value = "";
      }

      setStatus(
        loginStatus,
        "Signed in.",
        "success"
      );

    } catch (error) {

      console.error(
        "Firebase login error:",
        error
      );

      let message =
        "Unable to sign in.";

      switch (error.code) {

        case "auth/invalid-credential":
          message =
            "Invalid email or password.";
          break;

        case "auth/user-not-found":
          message =
            "No administrator account exists with this email.";
          break;

        case "auth/wrong-password":
          message =
            "Incorrect password.";
          break;

        case "auth/invalid-email":
          message =
            "Please enter a valid email address.";
          break;

        case "auth/too-many-requests":
          message =
            "Too many attempts. Try again later.";
          break;

        case "auth/network-request-failed":
          message =
            "Network error. Check your internet connection.";
          break;
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

    logoutBtn.disabled = true;

    try {

      await emergencyStopBroadcast();

      await signOut(auth);

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    } finally {

      logoutBtn.disabled = false;
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

  if (prayerListenerActive) {
    return;
  }

  prayerListenerActive = true;

  const prayersRef =
    ref(db, "pandal/prayers_wall");

  onValue(
    prayersRef,
    (snapshot) => {

      if (!adminPrayers) {
        return;
      }

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
          .filter(
            prayer =>
              prayer &&
              typeof prayer.text === "string"
          )
          .sort(
            (a, b) =>
              (b.createdAt || 0) -
              (a.createdAt || 0)
          )
          .slice(0, 50);

      if (!prayers.length) {

        adminPrayers.innerHTML = `
          <div class="admin-empty">
            No Sankalps yet.
          </div>
        `;

        return;
      }

      adminPrayers.innerHTML =
        prayers
          .map(
            prayer => `
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
    },
    error => {

      console.error(
        "Prayer wall error:",
        error
      );

      setStatus(
        broadcastMessage,
        "Could not load Sankalps.",
        "error"
      );
    }
  );
}


// ============================================================
// ANNOUNCEMENTS
// ============================================================

announcementForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const user =
      auth.currentUser;

    if (!user) {

      setStatus(
        announcementStatus,
        "You must be signed in.",
        "error"
      );

      return;
    }

    const title =
      announcementTitle?.value.trim();

    const message =
      announcementText?.value.trim();

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
        "Title is too long. Maximum 80 characters.",
        "error"
      );

      return;
    }

    if (message.length > 500) {

      setStatus(
        announcementStatus,
        "Message is too long. Maximum 500 characters.",
        "error"
      );

      return;
    }

    const submitButton =
      announcementForm.querySelector(
        'button[type="submit"]'
      );

    if (submitButton) {
      submitButton.disabled = true;
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

      if (announcementTitle) {
        announcementTitle.value = "";
      }

      if (announcementText) {
        announcementText.value = "";
      }

      setStatus(
        announcementStatus,
        "Announcement published successfully.",
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

    } finally {

      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }
);


// ============================================================
// START / STOP BUTTONS
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


stopBroadcastBtn?.addEventListener(
  "click",
  async () => {

    await stopBroadcast();
  }
);


// ============================================================
// START BROADCAST
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

  if (broadcasting) {
    return;
  }

  if (!window.isSecureContext) {

    setStatus(
      broadcastMessage,
      "Camera access requires HTTPS. Open the admin page through HTTPS.",
      "error"
    );

    return;
  }

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    setStatus(
      broadcastMessage,
      "This browser does not support camera broadcasting.",
      "error"
    );

    return;
  }

  startBroadcastBtn.disabled = true;
  stopBroadcastBtn.disabled = true;

  setStatus(
    broadcastStatus,
    "STARTING"
  );

  setStatus(
    broadcastMessage,
    "Requesting camera and microphone..."
  );

  try {

    // --------------------------------------------------------
    // Get camera + microphone
    // --------------------------------------------------------

    localStream =
      await navigator.mediaDevices.getUserMedia(
        {
          video: {
            facingMode: {
              ideal: "user"
            },
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
        }
      );


    // --------------------------------------------------------
    // Preview
    // --------------------------------------------------------

    if (preview) {

      preview.srcObject =
        localStream;

      preview.muted = true;
      preview.playsInline = true;

      await preview.play()
        .catch(() => {});
    }


    // --------------------------------------------------------
    // Generate new broadcast session
    // --------------------------------------------------------

    broadcastId =
      generateId("broadcast-");

    broadcastStartedAt =
      Date.now();


    const broadcastRef =
      ref(
        db,
        "pandal/broadcast"
      );


    // --------------------------------------------------------
    // IMPORTANT:
    // Set onDisconnect BEFORE making broadcast LIVE.
    // --------------------------------------------------------

    await onDisconnect(
      broadcastRef
    ).set({
      active: false,
      broadcastId,
      stoppedAt: Date.now()
    });


    // --------------------------------------------------------
    // Publish broadcast state
    // --------------------------------------------------------

    await set(
      broadcastRef,
      {
        active: true,
        broadcastId,
        startedAt:
          broadcastStartedAt,
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


    // --------------------------------------------------------
    // Start watching for viewers
    // --------------------------------------------------------

    listenForViewers();

    console.log(
      "Broadcast started:",
      broadcastId
    );

  } catch (error) {

    console.error(
      "Broadcast start error:",
      error
    );

    broadcasting = false;

    broadcastId = null;

    broadcastStartedAt = null;

    stopLocalMedia();


    if (
      error.name ===
      "NotAllowedError"
    ) {

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

    } else if (
      error.name ===
      "NotReadableError"
    ) {

      setStatus(
        broadcastMessage,
        "Camera or microphone is already being used by another application.",
        "error"
      );

    } else if (
      error.name ===
      "SecurityError"
    ) {

      setStatus(
        broadcastMessage,
        "Browser security blocked camera access.",
        "error"
      );

    } else {

      setStatus(
        broadcastMessage,
        "Could not start the broadcast.",
        "error"
      );
    }

  } finally {

    startBroadcastBtn.disabled =
      broadcasting;

    stopBroadcastBtn.disabled =
      !broadcasting;
  }
}


// ============================================================
// VIEWER MONITORING
// ============================================================

function listenForViewers() {

  if (broadcastCleanup) {

    broadcastCleanup();

    broadcastCleanup =
      null;
  }

  if (!broadcasting) {
    return;
  }

  const viewersRef =
    ref(
      db,
      "pandal/viewers"
    );


  const unsubscribe =
    onValue(
      viewersRef,
      async snapshot => {

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

            // Do not let one broken viewer
            // stop processing other viewers.
            handleViewer(
              viewerId,
              sessionId
            ).catch(error => {

              console.error(
                "Viewer handling error:",
                error
              );

            });
          }
        }


        // ------------------------------------------------------
        // Remove stale connections
        // ------------------------------------------------------

        const existingKeys =
          Array.from(
            viewerConnections.keys()
          );

        for (
          const key
          of existingKeys
        ) {

          if (
            !activeKeys.has(key)
          ) {

            await cleanupViewerConnection(
              key
            );
          }
        }
      },
      error => {

        console.error(
          "Viewer listener error:",
          error
        );
      }
    );


  broadcastCleanup =
    unsubscribe;
}


// ============================================================
// HANDLE VIEWER
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


  const baseSignalPath =
    `pandal/signals/${viewerId}/${sessionId}`;


  const sessionRef =
    ref(
      db,
      baseSignalPath
    );


  const offerRef =
    ref(
      db,
      `${baseSignalPath}/offer`
    );


  const answerRef =
    ref(
      db,
      `${baseSignalPath}/answer`
    );


  const viewerCandidatesRef =
    ref(
      db,
      `${baseSignalPath}/viewerCandidates`
    );


  const broadcasterCandidatesRef =
    ref(
      db,
      `${baseSignalPath}/broadcasterCandidates`
    );


  const closedRef =
    ref(
      db,
      `${baseSignalPath}/closed`
    );


  const peerConnection =
    new RTCPeerConnection(
      RTC_CONFIGURATION
    );


  const connection = {

    peerConnection,

    candidateUnsubscribe: null,

    offerUnsubscribe: null,

    closedUnsubscribe: null,

    started: false,

    closed: false,

    remoteDescriptionSet: false,

    pendingViewerCandidates: []
  };


  viewerConnections.set(
    key,
    connection
  );


  // ==========================================================
  // Add local media tracks
  // ==========================================================

  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {

        try {

          peerConnection.addTrack(
            track,
            localStream
          );

        } catch (error) {

          console.error(
            "Could not add media track:",
            error
          );
        }
      });
  }


  // ==========================================================
  // BROADCASTER ICE
  // ==========================================================

  peerConnection.onicecandidate =
    async event => {

      if (
        !event.candidate ||
        connection.closed ||
        !broadcasting
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
          "Broadcaster ICE candidate error:",
          error
        );
      }
    };


  // ==========================================================
  // CONNECTION STATE
  // ==========================================================

  peerConnection.onconnectionstatechange =
    () => {

      if (connection.closed) {
        return;
      }

      const state =
        peerConnection.connectionState;

      console.log(
        `Viewer ${key}: ${state}`
      );


      if (
        state === "connected"
      ) {

        console.log(
          `Viewer connected: ${key}`
        );
      }


      if (
        state === "failed" ||
        state === "closed"
      ) {

        cleanupViewerConnection(
          key
        ).catch(console.error);

        return;
      }


      if (
        state === "disconnected"
      ) {

        // Allow a short recovery period.
        setTimeout(
          () => {

            const current =
              viewerConnections.get(key);

            if (!current) {
              return;
            }

            if (
              current.peerConnection
                .connectionState ===
              "disconnected"
            ) {

              cleanupViewerConnection(
                key
              ).catch(console.error);
            }

          },
          7000
        );
      }
    };


  // ==========================================================
  // VIEWER ICE CANDIDATES
  // ==========================================================

  connection.candidateUnsubscribe =
    onChildAdded(
      viewerCandidatesRef,
      async snapshot => {

        if (
          connection.closed ||
          !snapshot.exists()
        ) {
          return;
        }

        const candidate =
          snapshot.val();

        if (!candidate) {
          return;
        }


        try {

          // ----------------------------------------------------
          // ICE can arrive BEFORE remote description.
          // Queue it until the offer has been applied.
          // ----------------------------------------------------

          if (
            !connection.remoteDescriptionSet
          ) {

            connection
              .pendingViewerCandidates
              .push(candidate);

            return;
          }


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


  // ==========================================================
  // VIEWER OFFER
  // ==========================================================

  connection.offerUnsubscribe =
    onValue(
      offerRef,
      async snapshot => {

        if (
          connection.closed ||
          connection.started ||
          !snapshot.exists()
        ) {
          return;
        }


        const offer =
          snapshot.val();


        if (
          !offer ||
          offer.type !== "offer" ||
          !offer.sdp
        ) {

          return;
        }


        try {

          connection.started =
            true;


          // ----------------------------------------------------
          // Apply viewer offer
          // ----------------------------------------------------

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          );


          connection.remoteDescriptionSet =
            true;


          // ----------------------------------------------------
          // Add candidates which arrived early
          // ----------------------------------------------------

          const pending =
            connection
              .pendingViewerCandidates;

          connection.pendingViewerCandidates =
            [];


          for (
            const candidate
            of pending
          ) {

            try {

              await peerConnection.addIceCandidate(
                new RTCIceCandidate(
                  candidate
                )
              );

            } catch (error) {

              console.warn(
                "Queued ICE candidate failed:",
                error
              );
            }
          }


          // ----------------------------------------------------
          // Create answer
          // ----------------------------------------------------

          const answer =
            await peerConnection.createAnswer();


          await peerConnection.setLocalDescription(
            answer
          );


          if (
            connection.closed ||
            !broadcasting
          ) {

            return;
          }


          // ----------------------------------------------------
          // Publish answer
          // ----------------------------------------------------

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
            `WebRTC answer sent: ${key}`
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


  // ==========================================================
  // VIEWER CLOSED SESSION
  // ==========================================================

  connection.closedUnsubscribe =
    onValue(
      closedRef,
      snapshot => {

        if (
          snapshot.val() === true
        ) {

          cleanupViewerConnection(
            key
          ).catch(console.error);
        }
      }
    );


  // ==========================================================
  // VERIFY VIEWER
  // ==========================================================

  try {

    const viewerRef =
      ref(
        db,
        `pandal/viewers/${viewerId}`
      );


    const viewerSnapshot =
      await get(viewerRef);


    const viewer =
      viewerSnapshot.val();


    if (
      connection.closed ||
      !viewer ||
      viewer.active !== true ||
      viewer.broadcastId !== broadcastId ||
      viewer.sessionId !== sessionId
    ) {

      await cleanupViewerConnection(
        key
      );

      return;
    }


    console.log(
      `Viewer session accepted: ${key}`
    );

  } catch (error) {

    console.error(
      "Viewer verification failed:",
      error
    );

    await cleanupViewerConnection(
      key
    );
  }
}


// ============================================================
// CLEANUP ONE VIEWER
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


  // ----------------------------------------------------------
  // Remove Firebase listeners
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // Close peer connection
  // ----------------------------------------------------------

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


  viewerConnections.delete(
    key
  );


  console.log(
    `Viewer connection cleaned: ${key}`
  );
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


  const stoppedBroadcastId =
    broadcastId;


  broadcasting = false;


  // ----------------------------------------------------------
  // Stop viewer monitoring
  // ----------------------------------------------------------

  if (broadcastCleanup) {

    broadcastCleanup();

    broadcastCleanup =
      null;
  }


  // ----------------------------------------------------------
  // Close WebRTC connections
  // ----------------------------------------------------------

  const viewerKeys =
    Array.from(
      viewerConnections.keys()
    );


  await Promise.all(
    viewerKeys.map(
      key =>
        cleanupViewerConnection(key)
    )
  );


  // ----------------------------------------------------------
  // Mark active viewer sessions as closed
  // ----------------------------------------------------------

  if (stoppedBroadcastId) {

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
          viewer.active === true &&
          viewer.broadcastId ===
            stoppedBroadcastId &&
          viewer.sessionId
        ) {

          closeOperations.push(
            set(
              ref(
                db,
                `pandal/signals/${viewerId}/${viewer.sessionId}/closed`
              ),
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


  // ----------------------------------------------------------
  // Remove public broadcast state
  // ONLY if it is still our broadcast.
  // ----------------------------------------------------------

  try {

    const broadcastRef =
      ref(
        db,
        "pandal/broadcast"
      );


    await runTransaction(
      broadcastRef,
      current => {

        if (
          current &&
          current.broadcastId ===
            stoppedBroadcastId
        ) {

          return null;
        }


        return current;
      }
    );

  } catch (error) {

    console.warn(
      "Broadcast database cleanup error:",
      error
    );
  }


  // ----------------------------------------------------------
  // Stop camera + microphone
  // ----------------------------------------------------------

  stopLocalMedia();


  broadcastId =
    null;

  broadcastStartedAt =
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
    true;
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


    broadcasting =
      false;


    stopLocalMedia();


    if (startBroadcastBtn) {
      startBroadcastBtn.disabled =
        false;
    }


    if (stopBroadcastBtn) {
      stopBroadcastBtn.disabled =
        true;
    }
  }
}


// ============================================================
// STOP LOCAL MEDIA
// ============================================================

function stopLocalMedia() {

  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {

        try {
          track.stop();
        } catch (error) {
          console.warn(
            "Track stop warning:",
            error
          );
        }

      });

    localStream =
      null;
  }


  if (preview) {

    preview.pause();

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

    /*
     * Do NOT perform large asynchronous Firebase
     * operations here.
     *
     * onDisconnect(broadcastRef) was registered
     * when the broadcast started, so Firebase
     * will automatically mark the broadcast offline
     * if this browser connection disappears.
     */

    stopLocalMedia();

  },
  {
    capture: true
  }
);


// ============================================================
// VISIBILITY CHANGE
// ============================================================

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible" &&
      broadcasting &&
      preview &&
      localStream
    ) {

      preview.play()
        .catch(() => {});
    }
  }
);


// ============================================================
// INITIAL UI STATE
// ============================================================

if (startBroadcastBtn) {
  startBroadcastBtn.disabled = false;
}

if (stopBroadcastBtn) {
  stopBroadcastBtn.disabled = true;
}

setStatus(
  broadcastStatus,
  "Offline"
);


// ============================================================
// END
// ============================================================
