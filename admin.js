// ============================================================
// GANPATI DIGITAL DARSHAN
// admin.js
// Firebase Auth + Broadcast + WebRTC Signaling
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  remove,
  push,
  onValue,
  onChildAdded,
  off
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


// ============================================================
// FIREBASE
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

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);


// ============================================================
// WEBRTC
// ============================================================

const ICE_SERVERS = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302"
    ]
  }
];


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

const preview =
  document.getElementById("preview");

const startBroadcastBtn =
  document.getElementById("startBroadcast");

const stopBroadcastBtn =
  document.getElementById("stopBroadcast");

const broadcastMessage =
  document.getElementById("broadcastMessage");

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

let broadcastId = null;

let broadcasting = false;

let viewerListener = null;

let broadcastListener = null;

const peerConnections = new Map();

const viewerAnswerListeners = new Map();

const viewerCandidateListeners = new Map();

const recoveryTimers = new Map();

const viewerCreationLocks = new Set();


// ============================================================
// HELPERS
// ============================================================

function createId(prefix = "id") {

  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );

}


function setLoginStatus(
  message,
  type = ""
) {

  if (!loginStatus) {
    return;
  }

  loginStatus.textContent = message;

  loginStatus.className = "";

  if (type) {
    loginStatus.classList.add(type);
  }

}


function setAnnouncementStatus(
  message,
  type = ""
) {

  if (!announcementStatus) {
    return;
  }

  announcementStatus.textContent =
    message;

  announcementStatus.className = "";

  if (type) {
    announcementStatus.classList.add(type);
  }

}


function setBroadcastStatus(
  message
) {

  if (broadcastStatus) {
    broadcastStatus.textContent =
      message;
  }

}


function setConnectionState(
  message
) {

  if (connectionState) {
    connectionState.textContent =
      message;
  }

}


function removePreloader() {

  if (!preloader) {
    return;
  }

  preloader.classList.add("done");

  setTimeout(() => {

    if (
      preloader &&
      preloader.parentNode
    ) {
      preloader.remove();
    }

  }, 700);

}


function updateBroadcastButtons() {

  if (startBroadcastBtn) {
    startBroadcastBtn.disabled =
      broadcasting;
  }

  if (stopBroadcastBtn) {
    stopBroadcastBtn.disabled =
      !broadcasting;
  }

}


// ============================================================
// AUTHENTICATION
// ============================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const email =
        emailInput?.value.trim();

      const password =
        passwordInput?.value;

      if (!email || !password) {

        setLoginStatus(
          "Enter your email and password.",
          "error"
        );

        return;
      }

      setLoginStatus(
        "Signing in..."
      );

      try {

        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        setLoginStatus("");

      } catch (error) {

        console.error(
          "[Auth] Login error:",
          error
        );

        setLoginStatus(
          "Login failed. Check your email and password.",
          "error"
        );

      }

    }
  );

}


if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        if (broadcasting) {
          await stopBroadcast();
        }

        await signOut(auth);

      } catch (error) {

        console.error(
          "[Auth] Logout error:",
          error
        );

      }

    }
  );

}


onAuthStateChanged(
  auth,
  user => {

    if (user) {

      if (loginPanel) {
        loginPanel.classList.add(
          "hidden"
        );
      }

      if (dashboard) {
        dashboard.classList.remove(
          "hidden"
        );
      }

      setConnectionState(
        `Signed in as ${
          user.email || "Admin"
        }`
      );

      loadPrayers();

    } else {

      if (dashboard) {
        dashboard.classList.add(
          "hidden"
        );
      }

      if (loginPanel) {
        loginPanel.classList.remove(
          "hidden"
        );
      }

      setConnectionState(
        "Not signed in."
      );

    }

    removePreloader();

  }
);


// ============================================================
// CAMERA
// ============================================================

async function getCameraStream() {

  if (localStream) {
    return localStream;
  }

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    throw new Error(
      "Camera API is not supported by this browser."
    );

  }

  localStream =
    await navigator.mediaDevices.getUserMedia(
      {
        video: {
          facingMode: "environment",

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

        audio: true
      }
    );

  if (preview) {

    preview.srcObject =
      localStream;

    preview.muted =
      true;

    preview.autoplay =
      true;

    preview.playsInline =
      true;

    preview
      .play()
      .catch(() => {});

  }

  return localStream;

}


// ============================================================
// SEND BROADCASTER ICE CANDIDATE
// ============================================================

async function sendBroadcasterCandidate(
  viewerId,
  candidate
) {

  if (
    !viewerId ||
    !candidate
  ) {
    return;
  }

  const candidateRef =
    push(
      ref(
        db,
        `pandal/signals/${viewerId}/broadcasterCandidates`
      )
    );

  await set(
    candidateRef,
    candidate.toJSON()
  );

}


// ============================================================
// LISTENER CLEANUP
// ============================================================

function cleanupViewerListeners(
  viewerId
) {

  const answerData =
    viewerAnswerListeners.get(
      viewerId
    );

  if (answerData) {

    off(
      answerData.ref,
      "value",
      answerData.callback
    );

    viewerAnswerListeners.delete(
      viewerId
    );

  }


  const candidateData =
    viewerCandidateListeners.get(
      viewerId
    );

  if (candidateData) {

    off(
      candidateData.ref,
      "child_added",
      candidateData.callback
    );

    viewerCandidateListeners.delete(
      viewerId
    );

  }

}


// ============================================================
// CLOSE VIEWER PEER
// ============================================================

function closeViewerPeer(
  viewerId
) {

  const peer =
    peerConnections.get(
      viewerId
    );

  if (peer) {

    try {

      peer.onicecandidate =
        null;

      peer.onconnectionstatechange =
        null;

      peer.oniceconnectionstatechange =
        null;

      peer.close();

    } catch (_) {}

  }

  peerConnections.delete(
    viewerId
  );

  cleanupViewerListeners(
    viewerId
  );

  const timer =
    recoveryTimers.get(
      viewerId
    );

  if (timer) {

    clearTimeout(timer);

    recoveryTimers.delete(
      viewerId
    );

  }

  viewerCreationLocks.delete(
    viewerId
  );

}


// ============================================================
// VIEWER ANSWER
// ============================================================

function listenForViewerAnswer(
  viewerId,
  peer
) {

  const answerRef =
    ref(
      db,
      `pandal/signals/${viewerId}/answer`
    );

  const callback =
    async snapshot => {

      const answer =
        snapshot.val();

      if (!answer || !peer) {
        return;
      }

      try {

        if (
          peer.signalingState ===
          "have-local-offer"
        ) {

          await peer.setRemoteDescription(
            new RTCSessionDescription(
              answer
            )
          );

          console.log(
            "[WebRTC] Answer received:",
            viewerId
          );

        }

      } catch (error) {

        console.warn(
          "[WebRTC] Answer error:",
          error
        );

      }

    };

  onValue(
    answerRef,
    callback,
    error => {

      console.error(
        "[WebRTC] Answer listener error:",
        error
      );

    }
  );

  viewerAnswerListeners.set(
    viewerId,
    {
      ref: answerRef,
      callback
    }
  );

}


// ============================================================
// VIEWER ICE
// ============================================================

function listenForViewerCandidates(
  viewerId,
  peer
) {

  const candidatesRef =
    ref(
      db,
      `pandal/signals/${viewerId}/viewerCandidates`
    );

  const callback =
    async snapshot => {

      const candidateData =
        snapshot.val();

      if (!candidateData) {
        return;
      }

      try {

        await peer.addIceCandidate(
          new RTCIceCandidate(
            candidateData
          )
        );

      } catch (error) {

        console.warn(
          "[WebRTC] Viewer ICE error:",
          error
        );

      }

    };

  onChildAdded(
    candidatesRef,
    callback,
    error => {

      console.error(
        "[WebRTC] Candidate listener error:",
        error
      );

    }
  );

  viewerCandidateListeners.set(
    viewerId,
    {
      ref: candidatesRef,
      callback
    }
  );

}


// ============================================================
// RECOVERY
// ============================================================

function scheduleViewerRecovery(
  viewerId
) {

  if (!broadcasting) {
    return;
  }

  if (
    recoveryTimers.has(
      viewerId
    )
  ) {
    return;
  }

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

          const viewerRef =
            ref(
              db,
              `pandal/viewers/${viewerId}`
            );

          const snapshot =
            await new Promise(
              resolve => {

                onValue(
                  viewerRef,
                  resolve,
                  {
                    onlyOnce: true
                  }
                );

              }
            );

          const viewer =
            snapshot.val();

          if (
            !viewer ||
            viewer.active !== true ||
            viewer.broadcastId !==
              broadcastId
          ) {
            return;
          }

          await createViewerConnection(
            viewerId
          );

        } catch (error) {

          console.error(
            "[Recovery] Viewer recovery failed:",
            error
          );

        }

      },
      3000
    );

  recoveryTimers.set(
    viewerId,
    timer
  );

}


// ============================================================
// CREATE VIEWER CONNECTION
// ============================================================

async function createViewerConnection(
  viewerId
) {

  if (
    !broadcasting ||
    !localStream ||
    !viewerId
  ) {
    return;
  }

  if (
    viewerCreationLocks.has(
      viewerId
    )
  ) {
    return;
  }

  const existingPeer =
    peerConnections.get(
      viewerId
    );

  if (existingPeer) {

    const state =
      existingPeer.connectionState;

    if (
      state === "new" ||
      state === "connecting" ||
      state === "connected"
    ) {
      return;
    }

    closeViewerPeer(
      viewerId
    );

  }

  viewerCreationLocks.add(
    viewerId
  );

  try {

    const peer =
      new RTCPeerConnection(
        {
          iceServers:
            ICE_SERVERS,

          iceCandidatePoolSize:
            10,

          bundlePolicy:
            "max-bundle",

          rtcpMuxPolicy:
            "require"
        }
      );

    peerConnections.set(
      viewerId,
      peer
    );


    localStream
      .getTracks()
      .forEach(
        track => {

          peer.addTrack(
            track,
            localStream
          );

        }
      );


    peer.onicecandidate =
      async event => {

        if (!event.candidate) {
          return;
        }

        try {

          await sendBroadcasterCandidate(
            viewerId,
            event.candidate
          );

        } catch (error) {

          console.warn(
            "[WebRTC] Candidate send failed:",
            error
          );

        }

      };


    peer.onconnectionstatechange =
      () => {

        const state =
          peer.connectionState;

        console.log(
          `[WebRTC] Viewer ${viewerId}:`,
          state
        );


        if (
          state === "connected"
        ) {

          setBroadcastStatus(
            "LIVE — viewer connected"
          );

        }


        if (
          state === "failed" ||
          state === "disconnected"
        ) {

          scheduleViewerRecovery(
            viewerId
          );

        }


        if (
          state === "closed"
        ) {

          peerConnections.delete(
            viewerId
          );

        }

      };


    peer.oniceconnectionstatechange =
      () => {

        const state =
          peer.iceConnectionState;

        console.log(
          `[WebRTC] ICE ${viewerId}:`,
          state
        );


        if (
          state === "failed"
        ) {

          scheduleViewerRecovery(
            viewerId
          );

        }

      };


    listenForViewerAnswer(
      viewerId,
      peer
    );

    listenForViewerCandidates(
      viewerId,
      peer
    );


    const offer =
      await peer.createOffer(
        {
          offerToReceiveAudio:
            false,

          offerToReceiveVideo:
            false
        }
      );


    await peer.setLocalDescription(
      offer
    );


    await set(
      ref(
        db,
        `pandal/signals/${viewerId}/offer`
      ),
      {
        type:
          peer.localDescription.type,

        sdp:
          peer.localDescription.sdp
      }
    );


    console.log(
      "[WebRTC] Offer sent:",
      viewerId
    );

  } catch (error) {

    console.error(
      "[WebRTC] Peer creation failed:",
      error
    );

    closeViewerPeer(
      viewerId
    );

    scheduleViewerRecovery(
      viewerId
    );

  } finally {

    viewerCreationLocks.delete(
      viewerId
    );

  }

}


// ============================================================
// VIEWER LISTENER
// ============================================================

function startViewerListener() {

  if (viewerListener) {

    console.log(
      "[Viewer Listener] Already running."
    );

    return;
  }

  const viewersRef =
    ref(
      db,
      "pandal/viewers"
    );


  const callback =
    async snapshot => {

      try {

        const viewers =
          snapshot.val();


        console.log(
          "[Viewer Listener] Snapshot:",
          viewers
        );


        if (!broadcasting) {
          return;
        }


        if (!viewers) {

          setBroadcastStatus(
            "LIVE — waiting for viewers..."
          );

          return;
        }


        for (
          const [
            viewerId,
            viewer
          ] of Object.entries(
            viewers
          )
        ) {

          if (
            viewer &&
            viewer.active === true &&
            viewer.broadcastId ===
              broadcastId
          ) {

            console.log(
              "[Viewer Listener] Viewer found:",
              viewerId
            );


            if (
              !peerConnections.has(
                viewerId
              )
            ) {

              await createViewerConnection(
                viewerId
              );

            }

          } else {

            if (
              peerConnections.has(
                viewerId
              )
            ) {

              closeViewerPeer(
                viewerId
              );

            }

          }

        }

      } catch (error) {

        console.error(
          "[Viewer Listener] Processing error:",
          error
        );

      }

    };


  const errorCallback =
    error => {

      console.error(
        "[Viewer Listener] FIREBASE ERROR:",
        error
      );

      console.error(
        "[Viewer Listener] Error code:",
        error?.code
      );

      console.error(
        "[Viewer Listener] Error message:",
        error?.message
      );


      if (
        error?.code ===
        "PERMISSION_DENIED"
      ) {

        setBroadcastStatus(
          "Firebase permission denied for viewers."
        );

      } else {

        setBroadcastStatus(
          `Viewer listener error: ${
            error?.message ||
            error?.code ||
            "Unknown error"
          }`
        );

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


  console.log(
    "[Viewer Listener] Started."
  );

}


// ============================================================
// STOP VIEWER LISTENER
// ============================================================

function stopViewerListener() {

  if (!viewerListener) {
    return;
  }

  off(
    viewerListener.ref,
    "value",
    viewerListener.callback
  );

  viewerListener =
    null;

  console.log(
    "[Viewer Listener] Stopped."
  );

}


// ============================================================
// START BROADCAST
// ============================================================

async function startBroadcast() {

  if (broadcasting) {
    return;
  }


  if (!auth.currentUser) {

    setBroadcastStatus(
      "Please sign in first."
    );

    return;
  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    setBroadcastStatus(
      "Camera access is not supported by this browser."
    );

    return;
  }


  try {

    setBroadcastStatus(
      "Requesting camera and microphone..."
    );


    await getCameraStream();


    broadcastId =
      createId(
        "broadcast"
      );


    broadcasting =
      true;


    await set(
      ref(
        db,
        "pandal/broadcast"
      ),
      {
        active: true,

        id: broadcastId,

        startedAt:
          Date.now()
      }
    );


    updateBroadcastButtons();


    setBroadcastStatus(
      "LIVE — waiting for viewers..."
    );


    setConnectionState(
      "Broadcast is active."
    );


    startViewerListener();


    console.log(
      "[Broadcast] Started:",
      broadcastId
    );

  } catch (error) {

    console.error(
      "[Broadcast] Start failed:",
      error
    );


    broadcasting =
      false;

    broadcastId =
      null;


    updateBroadcastButtons();


    if (
      error?.name ===
      "NotAllowedError"
    ) {

      setBroadcastStatus(
        "Camera/microphone permission was denied."
      );

    } else if (
      error?.name ===
      "NotFoundError"
    ) {

      setBroadcastStatus(
        "Camera or microphone was not found."
      );

    } else if (
      error?.code ===
      "PERMISSION_DENIED"
    ) {

      setBroadcastStatus(
        "Firebase permission denied."
      );

    } else {

      setBroadcastStatus(
        `Unable to start broadcast: ${
          error?.message ||
          "Unknown error"
        }`
      );

    }

  }

}


// ============================================================
// STOP BROADCAST
// ============================================================

async function stopBroadcast() {

  broadcasting =
    false;


  stopViewerListener();


  for (
    const viewerId
    of peerConnections.keys()
  ) {

    closeViewerPeer(
      viewerId
    );

  }


  peerConnections.clear();

  viewerCreationLocks.clear();


  if (broadcastId) {

    try {

      await set(
        ref(
          db,
          "pandal/broadcast"
        ),
        {
          active: false,

          id: broadcastId,

          stoppedAt:
            Date.now()
        }
      );

    } catch (error) {

      console.warn(
        "[Broadcast] Unable to update broadcast:",
        error
      );

    }

  }


  broadcastId =
    null;


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track => {
          track.stop();
        }
      );

    localStream =
      null;

  }


  if (preview) {
    preview.srcObject =
      null;
  }


  updateBroadcastButtons();


  setBroadcastStatus(
    "Broadcast stopped."
  );


  setConnectionState(
    "Broadcast offline."
  );

}


// ============================================================
// BUTTONS
// ============================================================

if (startBroadcastBtn) {

  startBroadcastBtn.addEventListener(
    "click",
    startBroadcast
  );

}


if (stopBroadcastBtn) {

  stopBroadcastBtn.addEventListener(
    "click",
    stopBroadcast
  );

}


// ============================================================
// BROADCAST STATE
// ============================================================

function listenToBroadcastState() {

  const broadcastRef =
    ref(
      db,
      "pandal/broadcast"
    );


  const callback =
    snapshot => {

      const data =
        snapshot.val();


      if (
        !data ||
        data.active !== true
      ) {

        if (!broadcasting) {

          setBroadcastStatus(
            "Broadcast offline."
          );

        }

      }

    };


  onValue(
    broadcastRef,
    callback,
    error => {

      console.error(
        "[Broadcast State] Firebase error:",
        error
      );

    }
  );


  broadcastListener = {
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


  const prayersRef =
    ref(
      db,
      "pandal/prayers_wall"
    );


  onValue(
    prayersRef,
    snapshot => {

      adminPrayers.innerHTML =
        "";


      const prayers =
        snapshot.val();


      if (!prayers) {

        adminPrayers.innerHTML =
          "<p>No prayers yet.</p>";

        return;
      }


      const entries =
        Object.entries(
          prayers
        )
        .sort(
          (a, b) =>
            Number(
              b[1]?.createdAt || 0
            ) -
            Number(
              a[1]?.createdAt || 0
            )
        );


      for (
        const [
          id,
          prayer
        ] of entries
      ) {

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "admin-prayer";


        const text =
          document.createElement(
            "p"
          );

        text.textContent =
          prayer.text || "";


        const deleteBtn =
          document.createElement(
            "button"
          );

        deleteBtn.type =
          "button";

        deleteBtn.textContent =
          "Delete";


        deleteBtn.addEventListener(
          "click",
          async () => {

            if (
              !confirm(
                "Delete this prayer?"
              )
            ) {
              return;
            }


            try {

              await remove(
                ref(
                  db,
                  `pandal/prayers_wall/${id}`
                )
              );

            } catch (error) {

              console.error(
                "[Prayer] Delete failed:",
                error
              );

            }

          }
        );


        item.appendChild(
          text
        );

        item.appendChild(
          deleteBtn
        );


        adminPrayers.appendChild(
          item
        );

      }

    },

    error => {

      console.error(
        "[Prayer] Listener error:",
        error
      );

      adminPrayers.innerHTML =
        "<p>Unable to load prayers.</p>";

    }
  );

}


// ============================================================
// ANNOUNCEMENTS
// ============================================================

if (announcementForm) {

  announcementForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (!auth.currentUser) {

        setAnnouncementStatus(
          "Please sign in first.",
          "error"
        );

        return;
      }


      const title =
        announcementTitle?.value.trim();


      const message =
        announcementText?.value.trim();


      if (!title || !message) {

        setAnnouncementStatus(
          "Enter both a title and message.",
          "error"
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
            title: title,

            message: message,

            createdAt:
              Date.now(),

            author:
              auth.currentUser.email ||
              "Admin"
          }
        );


        announcementForm.reset();


        setAnnouncementStatus(
          "Announcement published.",
          "success"
        );


      } catch (error) {

        console.error(
          "[Announcements] Error:",
          error
        );


        setAnnouncementStatus(
          `Unable to publish announcement: ${
            error?.message ||
            "Unknown error"
          }`,
          "error"
        );

      }

    }
  );

}


// ============================================================
// NETWORK
// ============================================================

window.addEventListener(
  "online",
  () => {

    console.log(
      "[Network] Browser reports ONLINE."
    );


    if (!broadcasting) {
      return;
    }


    setBroadcastStatus(
      "Connection restored — broadcast is live."
    );


    setTimeout(
      () => {

        if (!broadcasting) {
          return;
        }


        for (
          const viewerId
          of peerConnections.keys()
        ) {

          scheduleViewerRecovery(
            viewerId
          );

        }

      },
      1000
    );

  }
);


window.addEventListener(
  "offline",
  () => {

    console.warn(
      "[Network] Browser reports OFFLINE."
    );


    /*
     * IMPORTANT:
     * Do not stop the broadcast here.
     *
     * The browser can temporarily report
     * offline while Firebase/WebRTC is
     * reconnecting.
     */

    if (broadcasting) {

      setBroadcastStatus(
        "Connection interrupted — reconnecting..."
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
      document.visibilityState ===
        "visible" &&
      broadcasting
    ) {

      console.log(
        "[Visibility] Admin page visible again."
      );


      for (
        const viewerId
        of peerConnections.keys()
      ) {

        scheduleViewerRecovery(
          viewerId
        );

      }

    }

  }
);


// ============================================================
// PAGE CLEANUP
// ============================================================

window.addEventListener(
  "beforeunload",
  () => {

    if (broadcasting) {

      set(
        ref(
          db,
          "pandal/broadcast"
        ),
        {
          active: false,

          id: broadcastId,

          stoppedAt:
            Date.now()
        }
      )
      .catch(
        () => {}
      );

    }


    for (
      const viewerId
      of peerConnections.keys()
    ) {

      closeViewerPeer(
        viewerId
      );

    }

  }
);


// ============================================================
// INITIALIZATION
// ============================================================

updateBroadcastButtons();

setBroadcastStatus(
  "Broadcast offline."
);

listenToBroadcastState();


console.log(
  "%cGanpati Admin initialized.",
  "font-weight:bold"
);
