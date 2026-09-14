/* =========================================================
   GANPATI DIGITAL DARSHAN
   ADMIN.JS
   Firebase + WebRTC Broadcaster
   Session-based signaling with automatic recovery
========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* =========================================================
   FIREBASE
========================================================= */

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

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);


/* =========================================================
   WEBRTC ICE SERVERS
========================================================= */

/*
   STUN works immediately.

   TURN:
   Add your REAL TURN credentials below.

   Example:

   {
     urls: [
       "turn:your-server.com:3478",
       "turn:your-server.com:3478?transport=tcp",
       "turns:your-server.com:5349"
     ],
     username: "REAL_USERNAME",
     credential: "REAL_PASSWORD"
   }

   Do NOT put Firebase credentials here.
*/

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


/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);

const loginPanel = $("loginPanel");
const dashboard = $("dashboard");

const loginForm = $("loginForm");
const emailInput = $("email");
const passwordInput = $("password");
const loginStatus = $("loginStatus");

const logoutBtn = $("logoutBtn");

const connectionState = $("connectionState");

const broadcastStatus = $("broadcastStatus");
const preview = $("preview");
const startBroadcastBtn = $("startBroadcast");
const stopBroadcastBtn = $("stopBroadcast");
const broadcastMessage = $("broadcastMessage");

const adminPrayers = $("adminPrayers");

const announcementForm = $("announcementForm");
const announcementTitle = $("announcementTitle");
const announcementText = $("announcementText");
const announcementStatus = $("announcementStatus");


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let localStream = null;

let broadcastActive = false;
let currentBroadcastId = null;

let viewerListenerUnsubscribe = null;

const peers = new Map();

let stoppingBroadcast = false;

let networkRecoveryTimer = null;


/* =========================================================
   HELPERS
========================================================= */

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}


function setStatus(message) {
  setText(connectionState, message);
}


function setBroadcastStatus(message) {
  setText(broadcastStatus, message);
}


function showLogin() {
  if (loginPanel) loginPanel.hidden = false;
  if (dashboard) dashboard.hidden = true;
}


function showDashboard() {
  if (loginPanel) loginPanel.hidden = true;
  if (dashboard) dashboard.hidden = false;
}


function randomId(length = 20) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}


function getViewerId(snapshotKey) {
  return String(snapshotKey || "");
}


function getSessionSignalRef(viewerId, sessionId) {
  return ref(
    db,
    `pandal/signals/${viewerId}/${sessionId}`
  );
}


function getViewerRef(viewerId) {
  return ref(
    db,
    `pandal/viewers/${viewerId}`
  );
}


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(auth, user => {
  currentUser = user || null;

  if (user) {
    showDashboard();

    setStatus(
      navigator.onLine
        ? "Connected"
        : "Offline — waiting for network"
    );

    loadPrayers();
    loadAnnouncements();

  } else {
    showLogin();
    stopBroadcast().catch(console.error);
  }
});


if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = emailInput?.value.trim();
    const password = passwordInput?.value || "";

    setText(loginStatus, "Signing in…");

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setText(loginStatus, "");

    } catch (error) {
      console.error("Login error:", error);

      setText(
        loginStatus,
        "Login failed. Check your email and password."
      );
    }
  });
}


if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await stopBroadcast();

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  });
}


/* =========================================================
   NETWORK
========================================================= */

window.addEventListener("offline", () => {
  setStatus("Connection interrupted — reconnecting…");

  clearTimeout(networkRecoveryTimer);

  networkRecoveryTimer = setTimeout(() => {
    recoverBroadcast();
  }, 2500);
});


window.addEventListener("online", () => {
  setStatus("Connection restored.");

  if (broadcastActive) {
    clearTimeout(networkRecoveryTimer);

    networkRecoveryTimer = setTimeout(() => {
      recoverBroadcast();
    }, 1000);
  }
});


/* =========================================================
   BROADCAST START / STOP
========================================================= */

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


async function startBroadcast() {

  if (broadcastActive) {
    return;
  }

  if (!currentUser) {
    setBroadcastStatus(
      "Please sign in first."
    );

    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setBroadcastStatus(
      "Camera access is not supported by this browser."
    );

    return;
  }

  if (!navigator.onLine) {
    setBroadcastStatus(
      "No internet connection."
    );

    return;
  }

  stoppingBroadcast = false;

  setBroadcastStatus(
    "Requesting camera and microphone…"
  );

  try {

    localStream =
      await navigator.mediaDevices.getUserMedia({
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

        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

    if (preview) {
      preview.srcObject = localStream;

      if ("play" in preview) {
        await preview.play().catch(() => {});
      }
    }

    currentBroadcastId =
      `broadcast_${Date.now()}_${randomId(10)}`;

    broadcastActive = true;

    await set(
      ref(db, "pandal/broadcast"),
      {
        active: true,
        id: currentBroadcastId,
        startedAt: Date.now(),
        startedBy: currentUser.uid
      }
    );

    setBroadcastStatus(
      "LIVE — waiting for viewers"
    );

    setStatus("Broadcast is live.");

    if (startBroadcastBtn) {
      startBroadcastBtn.disabled = true;
    }

    if (stopBroadcastBtn) {
      stopBroadcastBtn.disabled = false;
    }

    listenForViewers();

  } catch (error) {

    console.error(
      "Camera/microphone error:",
      error
    );

    broadcastActive = false;

    stopLocalMedia();

    if (
      error?.name === "NotAllowedError"
    ) {
      setBroadcastStatus(
        "Camera or microphone permission was denied."
      );
    } else if (
      error?.name === "NotFoundError"
    ) {
      setBroadcastStatus(
        "No camera or microphone was found."
      );
    } else {
      setBroadcastStatus(
        `Unable to start broadcast: ${error?.message || "Unknown error"}`
      );
    }
  }
}


/* =========================================================
   STOP BROADCAST
========================================================= */

async function stopBroadcast() {

  if (stoppingBroadcast) {
    return;
  }

  stoppingBroadcast = true;

  broadcastActive = false;

  clearTimeout(networkRecoveryTimer);

  stopViewerListener();

  for (const [viewerId] of peers) {
    await closePeer(viewerId, true);
  }

  stopLocalMedia();

  try {
    await set(
      ref(db, "pandal/broadcast"),
      {
        active: false,
        id: currentBroadcastId || null,
        stoppedAt: Date.now()
      }
    );
  } catch (error) {
    console.error(
      "Failed to update broadcast state:",
      error
    );
  }

  currentBroadcastId = null;

  if (startBroadcastBtn) {
    startBroadcastBtn.disabled = false;
  }

  if (stopBroadcastBtn) {
    stopBroadcastBtn.disabled = true;
  }

  setBroadcastStatus("Broadcast is offline.");

  setStatus("Broadcast stopped.");

  stoppingBroadcast = false;
}


/* =========================================================
   LOCAL MEDIA CLEANUP
========================================================= */

function stopLocalMedia() {

  if (!localStream) {
    if (preview) {
      preview.srcObject = null;
    }

    return;
  }

  for (const track of localStream.getTracks()) {
    try {
      track.stop();
    } catch (error) {
      console.warn(
        "Track stop error:",
        error
      );
    }
  }

  localStream = null;

  if (preview) {
    preview.srcObject = null;
  }
}


/* =========================================================
   VIEWER LISTENER
========================================================= */

function listenForViewers() {

  stopViewerListener();

  const viewersRef =
    ref(db, "pandal/viewers");

  viewerListenerUnsubscribe =
    onValue(
      viewersRef,
      snapshot => {

        if (!broadcastActive) {
          return;
        }

        const viewers = snapshot.val() || {};

        const activeViewerIds =
          new Set();

        Object.entries(viewers).forEach(
          ([viewerId, viewer]) => {

            if (!viewer) {
              return;
            }

            if (
              viewer.active !== true
            ) {
              return;
            }

            if (
              viewer.broadcastId !==
              currentBroadcastId
            ) {
              return;
            }

            if (
              !viewer.sessionId
            ) {
              return;
            }

            activeViewerIds.add(
              viewerId
            );

            const existing =
              peers.get(viewerId);

            if (
              !existing ||
              existing.sessionId !==
                viewer.sessionId
            ) {

              if (existing) {
                closePeer(
                  viewerId,
                  false
                ).catch(console.error);
              }

              createViewerPeer(
                viewerId,
                viewer.sessionId
              ).catch(error => {
                console.error(
                  `Viewer ${viewerId} error:`,
                  error
                );
              });
            }
          }
        );

        for (
          const [viewerId, peerInfo]
          of peers
        ) {

          if (
            !activeViewerIds.has(
              viewerId
            )
          ) {

            closePeer(
              viewerId,
              false
            ).catch(console.error);
          }
        }

        updateViewerStatus();
      },

      error => {

        console.error(
          "Viewer listener error:",
          error
        );

        setBroadcastStatus(
          `Viewer listener error: ${error?.code || error?.message || "Permission denied"}`
        );

        /*
          The broadcast itself remains alive.
          Retry the listener instead of stopping camera.
        */

        setTimeout(() => {

          if (broadcastActive) {
            listenForViewers();
          }

        }, 3000);
      }
    );
}


function stopViewerListener() {

  if (
    typeof viewerListenerUnsubscribe ===
    "function"
  ) {
    viewerListenerUnsubscribe();
  }

  viewerListenerUnsubscribe = null;
}


/* =========================================================
   CREATE VIEWER PEER
========================================================= */

async function createViewerPeer(
  viewerId,
  sessionId
) {

  if (!broadcastActive) {
    return;
  }

  if (!localStream) {
    return;
  }

  const viewerRef =
    getViewerRef(viewerId);

  const sessionRef =
    getSessionSignalRef(
      viewerId,
      sessionId
    );

  const existing =
    peers.get(viewerId);

  if (existing) {

    if (
      existing.sessionId ===
      sessionId
    ) {
      return;
    }

    await closePeer(
      viewerId,
      false
    );
  }

  const pc =
    new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      iceTransportPolicy: "all"
    });

  const peer = {
    pc,
    sessionId,
    cleanup: [],
    recovering: false
  };

  peers.set(
    viewerId,
    peer
  );

  /*
    Add camera and microphone.
  */

  for (
    const track
    of localStream.getTracks()
  ) {
    pc.addTrack(
      track,
      localStream
    );
  }

  /*
    Broadcaster ICE candidates.
  */

  pc.onicecandidate =
    async event => {

      if (
        !event.candidate
      ) {
        return;
      }

      const current =
        peers.get(viewerId);

      if (
        !current ||
        current.sessionId !==
          sessionId
      ) {
        return;
      }

      try {

        await set(
          push(
            ref(
              db,
              `pandal/signals/${viewerId}/${sessionId}/broadcasterCandidates`
            )
          ),
          event.candidate.toJSON()
        );

      } catch (error) {

        console.error(
          "Broadcaster ICE write failed:",
          error
        );
      }
    };


  /*
    Connection state.
  */

  pc.onconnectionstatechange =
    () => {

      const state =
        pc.connectionState;

      console.log(
        `Viewer ${viewerId} connection:`,
        state
      );

      if (
        state === "connected"
      ) {

        peer.recovering = false;

        setBroadcastStatus(
          "LIVE — viewer connected"
        );

        return;
      }

      if (
        state === "disconnected"
      ) {

        schedulePeerRecovery(
          viewerId,
          sessionId
        );

        return;
      }

      if (
        state === "failed"
      ) {

        schedulePeerRecovery(
          viewerId,
          sessionId
        );

        return;
      }

      if (
        state === "closed"
      ) {

        closePeer(
          viewerId,
          false
        ).catch(console.error);
      }
    };


  /*
    Read viewer ICE candidates.
  */

  const viewerCandidatesRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}/viewerCandidates`
    );

  const unsubViewerCandidates =
    onValue(
      viewerCandidatesRef,
      snapshot => {

        const current =
          peers.get(viewerId);

        if (
          !current ||
          current.sessionId !==
            sessionId
        ) {
          return;
        }

        const data =
          snapshot.val() || {};

        Object.values(data)
          .forEach(
            async candidate => {

              try {

                await pc.addIceCandidate(
                  new RTCIceCandidate(
                    candidate
                  )
                );

              } catch (error) {

                console.warn(
                  "Viewer ICE candidate failed:",
                  error
                );
              }
            }
          );
      }
    );

  peer.cleanup.push(
    unsubViewerCandidates
  );


  /*
    Read viewer answer.
  */

  const answerRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}/answer`
    );

  const unsubAnswer =
    onValue(
      answerRef,
      async snapshot => {

        const answer =
          snapshot.val();

        if (!answer) {
          return;
        }

        const current =
          peers.get(viewerId);

        if (
          !current ||
          current.sessionId !==
            sessionId
        ) {
          return;
        }

        if (
          pc.signalingState !==
          "have-local-offer"
        ) {
          return;
        }

        try {

          await pc.setRemoteDescription(
            new RTCSessionDescription(
              answer
            )
          );

        } catch (error) {

          console.error(
            "Answer processing failed:",
            error
          );
        }
      }
    );

  peer.cleanup.push(
    unsubAnswer
  );


  /*
    Viewer can explicitly close session.
  */

  const closedRef =
    ref(
      db,
      `pandal/signals/${viewerId}/${sessionId}/closed`
    );

  const unsubClosed =
    onValue(
      closedRef,
      snapshot => {

        if (
          snapshot.val() === true
        ) {

          closePeer(
            viewerId,
            false
          ).catch(console.error);
        }
      }
    );

  peer.cleanup.push(
    unsubClosed
  );


  /*
    Make sure viewer still owns this session
    before creating an offer.
  */

  try {

    const viewerSnapshot =
      await new Promise(
        resolve => {

          const unsubscribe =
            onValue(
              viewerRef,
              snap => {
                unsubscribe();
                resolve(snap);
              },
              error => {
                unsubscribe();
                console.error(
                  "Viewer state check failed:",
                  error
                );
                resolve(null);
              },
              {
                onlyOnce: true
              }
            );
        }
      );

    const viewer =
      viewerSnapshot?.val();

    if (
      !viewer ||
      viewer.active !== true ||
      viewer.broadcastId !==
        currentBroadcastId ||
      viewer.sessionId !==
        sessionId
    ) {

      await closePeer(
        viewerId,
        false
      );

      return;
    }


    /*
      Create offer.
    */

    const offer =
      await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });

    const current =
      peers.get(viewerId);

    if (
      !current ||
      current.sessionId !==
        sessionId
    ) {
      return;
    }

    await pc.setLocalDescription(
      offer
    );

    await set(
      ref(
        db,
        `pandal/signals/${viewerId}/${sessionId}/offer`
      ),
      {
        type:
          pc.localDescription.type,
        sdp:
          pc.localDescription.sdp
      }
    );

    updateViewerStatus();

  } catch (error) {

    console.error(
      `Failed to create offer for ${viewerId}:`,
      error
    );

    await closePeer(
      viewerId,
      false
    );
  }
}


/* =========================================================
   PEER RECOVERY
========================================================= */

function schedulePeerRecovery(
  viewerId,
  sessionId
) {

  const peer =
    peers.get(viewerId);

  if (!peer) {
    return;
  }

  if (
    peer.sessionId !==
    sessionId
  ) {
    return;
  }

  if (
    peer.recovering
  ) {
    return;
  }

  peer.recovering = true;

  setTimeout(
    async () => {

      const current =
        peers.get(viewerId);

      if (
        !current ||
        current.sessionId !==
          sessionId
      ) {
        return;
      }

      if (
        !broadcastActive
      ) {
        return;
      }

      /*
        Fresh peer using the SAME session is not enough
        when signaling may be stale.

        Close old peer and wait for viewer's next
        registration/reconnect.
      */

      await closePeer(
        viewerId,
        false
      );

      /*
        Viewer remains registered.
        The viewer will detect its failed connection
        and generate a fresh session.
      */

      updateViewerStatus();

    },
    2500
  );
}


/* =========================================================
   CLOSE PEER
========================================================= */

async function closePeer(
  viewerId,
  markClosed = false
) {

  const peer =
    peers.get(viewerId);

  if (!peer) {
    return;
  }

  peers.delete(
    viewerId
  );

  for (
    const unsubscribe
    of peer.cleanup || []
  ) {

    try {
      unsubscribe();
    } catch (error) {
      console.warn(
        "Listener cleanup error:",
        error
      );
    }
  }

  if (markClosed) {

    try {

      await set(
        ref(
          db,
          `pandal/signals/${viewerId}/${peer.sessionId}/closed`
        ),
        true
      );

    } catch (error) {

      console.warn(
        "Unable to mark peer closed:",
        error
      );
    }
  }

  try {
    peer.pc.onicecandidate = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
  } catch (error) {
    console.warn(
      "Peer close error:",
      error
    );
  }
}


/* =========================================================
   VIEWER STATUS
========================================================= */

function updateViewerStatus() {

  if (!broadcastActive) {
    return;
  }

  const count =
    peers.size;

  if (count === 0) {

    setBroadcastStatus(
      "LIVE — waiting for viewers"
    );

  } else if (count === 1) {

    setBroadcastStatus(
      "LIVE — 1 viewer connected"
    );

  } else {

    setBroadcastStatus(
      `LIVE — ${count} viewers connected`
    );
  }
}


/* =========================================================
   RECOVER ENTIRE BROADCAST
========================================================= */

async function recoverBroadcast() {

  if (
    !broadcastActive ||
    stoppingBroadcast
  ) {
    return;
  }

  if (!navigator.onLine) {
    setStatus(
      "Offline — waiting for network"
    );
    return;
  }

  setStatus(
    "Reconnecting broadcast…"
  );

  /*
    We do NOT stop the camera.
    We do NOT create a new broadcast ID.

    Existing viewers with valid sessions can reconnect.
  */

  try {

    await set(
      ref(db, "pandal/broadcast"),
      {
        active: true,
        id: currentBroadcastId,
        startedAt: Date.now(),
        startedBy: currentUser?.uid || null
      }
    );

    listenForViewers();

    setStatus(
      "Broadcast reconnected."
    );

  } catch (error) {

    console.error(
      "Broadcast recovery failed:",
      error
    );

    setStatus(
      "Reconnection failed — retrying…"
    );

    clearTimeout(
      networkRecoveryTimer
    );

    networkRecoveryTimer =
      setTimeout(
        recoverBroadcast,
        4000
      );
  }
}


/* =========================================================
   PRAYERS
========================================================= */

let prayersUnsubscribe = null;

function loadPrayers() {

  if (prayersUnsubscribe) {
    prayersUnsubscribe();
  }

  prayersUnsubscribe =
    onValue(
      ref(db, "pandal/prayers_wall"),
      snapshot => {

        if (!adminPrayers) {
          return;
        }

        adminPrayers.innerHTML = "";

        const data =
          snapshot.val() || {};

        const entries =
          Object.entries(data)
            .sort(
              ([, a], [, b]) =>
                (b?.createdAt || 0) -
                (a?.createdAt || 0)
            );

        if (!entries.length) {

          adminPrayers.innerHTML =
            "<p>No prayers yet.</p>";

          return;
        }

        entries.forEach(
          ([id, prayer]) => {

            const item =
              document.createElement("div");

            item.className =
              "admin-prayer-item";

            const text =
              document.createElement("div");

            text.textContent =
              prayer?.text || "";

            const time =
              document.createElement("small");

            if (
              prayer?.createdAt
            ) {

              time.textContent =
                new Date(
                  prayer.createdAt
                ).toLocaleString(
                  "en-IN"
                );
            }

            const deleteBtn =
              document.createElement("button");

            deleteBtn.type =
              "button";

            deleteBtn.textContent =
              "Delete";

            deleteBtn.addEventListener(
              "click",
              async () => {

                try {

                  await remove(
                    ref(
                      db,
                      `pandal/prayers_wall/${id}`
                    )
                  );

                } catch (error) {

                  console.error(
                    "Prayer deletion failed:",
                    error
                  );
                }
              }
            );

            item.append(
              text,
              time,
              deleteBtn
            );

            adminPrayers.appendChild(
              item
            );
          }
        );
      },
      error => {

        console.error(
          "Prayer listener error:",
          error
        );

        if (adminPrayers) {
          adminPrayers.textContent =
            "Unable to load prayers.";
        }
      }
    );
}


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

function loadAnnouncements() {

  onValue(
    ref(db, "pandal/announcements"),
    snapshot => {

      const data =
        snapshot.val() || {};

      console.log(
        "Announcements:",
        data
      );
    },
    error => {

      console.error(
        "Announcement listener error:",
        error
      );
    }
  );
}


if (announcementForm) {

  announcementForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const title =
        announcementTitle?.value.trim();

      const message =
        announcementText?.value.trim();

      if (!title || !message) {

        setText(
          announcementStatus,
          "Please enter both title and message."
        );

        return;
      }

      if (!currentUser) {

        setText(
          announcementStatus,
          "Please sign in again."
        );

        return;
      }

      setText(
        announcementStatus,
        "Publishing…"
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
              currentUser.email ||
              currentUser.uid
          }
        );

        announcementForm.reset();

        setText(
          announcementStatus,
          "Announcement published successfully."
        );

      } catch (error) {

        console.error(
          "Announcement publish error:",
          error
        );

        setText(
          announcementStatus,
          "Could not publish announcement. Check Firebase rules."
        );
      }
    }
  );
}


/* =========================================================
   PAGE EXIT
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    for (
      const [, peer]
      of peers
    ) {

      try {
        peer.pc.close();
      } catch (_) {}
    }

    stopLocalMedia();
  }
);


/* =========================================================
   INITIAL UI
========================================================= */

if (stopBroadcastBtn) {
  stopBroadcastBtn.disabled = true;
}

setBroadcastStatus(
  "Broadcast is offline."
);

setStatus(
  navigator.onLine
    ? "Connected"
    : "Offline"
);
