/* =========================================================
   GANPATI DIGITAL DARSHAN
   APP.JS
   Firebase + WebRTC Viewer
   Session-based signaling
   Automatic reconnection
========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue,
  set,
  remove,
  push
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

const firebaseApp =
  initializeApp(firebaseConfig);

const db =
  getDatabase(firebaseApp);


/* =========================================================
   WEBRTC
========================================================= */

const ICE_SERVERS = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302"
    ]
  }

  /*
  REAL TURN SERVER GOES HERE:

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

const $ =
  id => document.getElementById(id);

const liveVideo =
  $("liveVideo");

const activeStreamUI =
  $("active-stream-ui");

const offlineStreamUI =
  $("offline-stream-ui");


/* =========================================================
   VIEWER STATE
========================================================= */

let viewerId =
  getOrCreateViewerId();

let sessionId =
  null;

let currentBroadcastId =
  null;

let viewerPeer =
  null;

let viewerStarted =
  false;

let viewerStarting =
  false;

let stoppingViewer =
  false;

let broadcastUnsubscribe =
  null;

let offerUnsubscribe =
  null;

let broadcasterCandidatesUnsubscribe =
  null;

let closedUnsubscribe =
  null;

let recoveryTimer =
  null;

let recoveryAttempt =
  0;


/* =========================================================
   ID HELPERS
========================================================= */

function randomId(length = 24) {

  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let result = "";

  for (
    let i = 0;
    i < length;
    i++
  ) {
    result +=
      chars[
        Math.floor(
          Math.random() *
          chars.length
        )
      ];
  }

  return result;
}


function getOrCreateViewerId() {

  const key =
    "ganpatiViewerId";

  let id =
    localStorage.getItem(key);

  if (!id) {

    id =
      `viewer_${Date.now()}_${randomId(12)}`;

    localStorage.setItem(
      key,
      id
    );
  }

  return id;
}


function createSessionId() {

  return (
    `session_${Date.now()}_${randomId(16)}`
  );
}


/* =========================================================
   UI
========================================================= */

function showLiveUI() {

  if (activeStreamUI) {
    activeStreamUI.classList.remove(
      "hidden"
    );
  }

  if (offlineStreamUI) {
    offlineStreamUI.classList.add(
      "hidden"
    );
  }
}


function showOfflineUI(
  message =
    "Live darshan is currently offline."
) {

  if (activeStreamUI) {
    activeStreamUI.classList.add(
      "hidden"
    );
  }

  if (offlineStreamUI) {
    offlineStreamUI.classList.remove(
      "hidden"
    );
  }

  const messageElement =
    document.querySelector(
      "#offline-stream-ui p"
    );

  if (messageElement) {
    messageElement.textContent =
      message;
  }
}


function setVideoVisible() {

  if (!liveVideo) {
    return;
  }

  liveVideo.style.display =
    "block";
}


function resetVideo() {

  if (!liveVideo) {
    return;
  }

  try {
    liveVideo.pause();
  } catch (_) {}

  liveVideo.srcObject =
    null;

  liveVideo.style.display =
    "none";
}


/* =========================================================
   BROADCAST LISTENER
========================================================= */

function startBroadcastListener() {

  if (broadcastUnsubscribe) {
    broadcastUnsubscribe();
  }

  broadcastUnsubscribe =
    onValue(
      ref(db, "pandal/broadcast"),
      snapshot => {

        const broadcast =
          snapshot.val();

        if (
          !broadcast ||
          broadcast.active !== true ||
          !broadcast.id
        ) {

          currentBroadcastId =
            null;

          stopViewerConnection(
            false
          );

          showOfflineUI(
            "The live darshan stream will appear here when the pandal team starts broadcasting."
          );

          return;
        }

        const newBroadcastId =
          String(broadcast.id);

        /*
          Same broadcast:
          keep the existing session.
        */

        if (
          currentBroadcastId ===
          newBroadcastId &&
          viewerStarted
        ) {
          return;
        }

        /*
          New broadcast:
          completely replace old signaling session.
        */

        currentBroadcastId =
          newBroadcastId;

        recoveryAttempt = 0;

        connectToBroadcast();

      },
      error => {

        console.error(
          "Broadcast listener error:",
          error
        );

        showOfflineUI(
          "Unable to connect to the live service. Retrying…"
        );

        scheduleRecovery();
      }
    );
}


/* =========================================================
   START VIEWER
========================================================= */

async function startViewer() {

  if (
    viewerStarted ||
    viewerStarting
  ) {
    return;
  }

  viewerStarting = true;
  stoppingViewer = false;

  startBroadcastListener();

  viewerStarting = false;
}


/* =========================================================
   CONNECT TO CURRENT BROADCAST
========================================================= */

async function connectToBroadcast() {

  if (
    !currentBroadcastId ||
    !navigator.onLine
  ) {
    return;
  }

  if (viewerStarted) {
    await stopViewerConnection(
      false
    );
  }

  sessionId =
    createSessionId();

  viewerStarted =
    true;

  showOfflineUI(
    "Connecting to live darshan…"
  );

  /*
    Register this exact session.
  */

  try {

    await set(
      ref(
        db,
        `pandal/viewers/${viewerId}`
      ),
      {
        active: true,
        broadcastId:
          currentBroadcastId,
        sessionId,
        joinedAt: Date.now()
      }
    );

  } catch (error) {

    console.error(
      "Viewer registration failed:",
      error
    );

    viewerStarted = false;

    scheduleRecovery();

    return;
  }


  createPeerConnection(
    viewerId,
    sessionId
  );
}


/* =========================================================
   CREATE PEER
========================================================= */

function createPeerConnection(
  thisViewerId,
  thisSessionId
) {

  if (
    !currentBroadcastId ||
    !thisSessionId
  ) {
    return;
  }

  cleanupSignalListeners();

  const pc =
    new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      iceTransportPolicy: "all"
    });

  viewerPeer = {
    pc,
    sessionId: thisSessionId
  };


  /* =======================================================
     REMOTE TRACK
  ======================================================= */

  pc.ontrack =
    async event => {

      const stream =
        event.streams?.[0];

      if (!stream) {
        return;
      }

      if (!liveVideo) {
        return;
      }

      liveVideo.srcObject =
        stream;

      liveVideo.muted =
        false;

      setVideoVisible();

      showLiveUI();

      try {
        await liveVideo.play();
      } catch (error) {
        console.warn(
          "Autoplay blocked:",
          error
        );

        /*
          Browser may require the user to tap the video.
          We don't destroy the connection.
        */
      }
    };


  /* =======================================================
     ICE CANDIDATES
  ======================================================= */

  pc.onicecandidate =
    async event => {

      if (
        !event.candidate
      ) {
        return;
      }

      const current =
        viewerPeer;

      if (
        !current ||
        current.sessionId !==
          thisSessionId
      ) {
        return;
      }

      try {

        await set(
          push(
            ref(
              db,
              `pandal/signals/${thisViewerId}/${thisSessionId}/viewerCandidates`
            )
          ),
          event.candidate.toJSON()
        );

      } catch (error) {

        console.error(
          "Viewer ICE write error:",
          error
        );
      }
    };


  /* =======================================================
     CONNECTION STATE
  ======================================================= */

  pc.onconnectionstatechange =
    () => {

      const state =
        pc.connectionState;

      console.log(
        "Viewer connection state:",
        state
      );

      if (
        state === "connected"
      ) {

        recoveryAttempt = 0;

        showLiveUI();

        return;
      }

      if (
        state === "disconnected"
      ) {

        schedulePeerRecovery();

        return;
      }

      if (
        state === "failed"
      ) {

        schedulePeerRecovery();

        return;
      }

      if (
        state === "closed"
      ) {

        schedulePeerRecovery();
      }
    };


  /* =======================================================
     OFFER LISTENER
  ======================================================= */

  const offerRef =
    ref(
      db,
      `pandal/signals/${thisViewerId}/${thisSessionId}/offer`
    );

  offerUnsubscribe =
    onValue(
      offerRef,
      async snapshot => {

        const offer =
          snapshot.val();

        if (!offer) {
          return;
        }

        /*
          Ignore offers belonging to another session.
        */

        if (
          sessionId !==
          thisSessionId
        ) {
          return;
        }

        const current =
          viewerPeer;

        if (
          !current ||
          current.sessionId !==
            thisSessionId
        ) {
          return;
        }

        if (
          pc.signalingState !==
          "stable"
        ) {

          return;
        }

        try {

          await pc.setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          );

          const answer =
            await pc.createAnswer();

          await pc.setLocalDescription(
            answer
          );

          /*
            Make sure session wasn't replaced
            while the answer was being created.
          */

          if (
            sessionId !==
            thisSessionId
          ) {
            return;
          }

          await set(
            ref(
              db,
              `pandal/signals/${thisViewerId}/${thisSessionId}/answer`
            ),
            {
              type:
                pc.localDescription.type,
              sdp:
                pc.localDescription.sdp
            }
          );

        } catch (error) {

          console.error(
            "Offer/answer error:",
            error
          );

          schedulePeerRecovery();
        }
      }
    );


  /* =======================================================
     BROADCASTER ICE
  ======================================================= */

  const broadcasterCandidatesRef =
    ref(
      db,
      `pandal/signals/${thisViewerId}/${thisSessionId}/broadcasterCandidates`
    );

  broadcasterCandidatesUnsubscribe =
    onValue(
      broadcasterCandidatesRef,
      snapshot => {

        const data =
          snapshot.val() || {};

        const current =
          viewerPeer;

        if (
          !current ||
          current.sessionId !==
            thisSessionId
        ) {
          return;
        }

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

                /*
                  During early ICE negotiation,
                  an occasional candidate can arrive
                  before the remote description.
                */

                console.warn(
                  "Broadcaster ICE candidate not added:",
                  error
                );
              }
            }
          );
      }
    );


  /* =======================================================
     CLOSED SIGNAL
  ======================================================= */

  const closedRef =
    ref(
      db,
      `pandal/signals/${thisViewerId}/${thisSessionId}/closed`
    );

  closedUnsubscribe =
    onValue(
      closedRef,
      snapshot => {

        if (
          snapshot.val() === true
        ) {

          schedulePeerRecovery();
        }
      }
    );
}


/* =========================================================
   SIGNAL LISTENER CLEANUP
========================================================= */

function cleanupSignalListeners() {

  if (
    typeof offerUnsubscribe ===
    "function"
  ) {
    offerUnsubscribe();
  }

  if (
    typeof broadcasterCandidatesUnsubscribe ===
    "function"
  ) {
    broadcasterCandidatesUnsubscribe();
  }

  if (
    typeof closedUnsubscribe ===
    "function"
  ) {
    closedUnsubscribe();
  }

  offerUnsubscribe =
    null;

  broadcasterCandidatesUnsubscribe =
    null;

  closedUnsubscribe =
    null;
}


/* =========================================================
   STOP CURRENT PEER
========================================================= */

async function stopViewerConnection(
  removeRegistration = true
) {

  cleanupSignalListeners();

  const oldSession =
    sessionId;

  viewerStarted =
    false;

  sessionId =
    null;

  if (viewerPeer) {

    try {
      viewerPeer.pc.ontrack =
        null;

      viewerPeer.pc.onicecandidate =
        null;

      viewerPeer.pc.onconnectionstatechange =
        null;

      viewerPeer.pc.close();

    } catch (error) {

      console.warn(
        "Peer cleanup:",
        error
      );
    }

    viewerPeer =
      null;
  }

  resetVideo();

  if (
    removeRegistration &&
    oldSession
  ) {

    try {

      /*
        Only remove registration if the
        database still points to our session.

        A newer session must never be deleted.
      */

      const registrationRef =
        ref(
          db,
          `pandal/viewers/${viewerId}`
        );

      /*
        We cannot atomically compare here with
        simple set/remove. The new session flow
        protects against stale signaling, while
        removal is only used when leaving the page.
      */

      await remove(
        registrationRef
      );

    } catch (error) {

      console.warn(
        "Viewer registration cleanup:",
        error
      );
    }
  }
}


/* =========================================================
   RECOVERY
========================================================= */

function schedulePeerRecovery() {

  if (
    stoppingViewer ||
    !currentBroadcastId
  ) {
    return;
  }

  if (
    !navigator.onLine
  ) {

    showOfflineUI(
      "Connection lost. Waiting for internet…"
    );

    return;
  }

  clearTimeout(
    recoveryTimer
  );

  recoveryAttempt =
    Math.min(
      recoveryAttempt + 1,
      6
    );

  const delay =
    Math.min(
      1000 *
      Math.pow(
        2,
        recoveryAttempt - 1
      ),
      15000
    );

  showOfflineUI(
    "Live connection interrupted. Reconnecting…"
  );

  recoveryTimer =
    setTimeout(
      async () => {

        if (
          !currentBroadcastId ||
          stoppingViewer
        ) {
          return;
        }

        /*
          Generate a completely fresh session.
          This is the important part that prevents
          stale Firebase signaling from being reused.
        */

        await stopViewerConnection(
          false
        );

        await connectToBroadcast();

      },
      delay
    );
}


/* =========================================================
   ONLINE / OFFLINE
========================================================= */

window.addEventListener(
  "offline",
  () => {

    showOfflineUI(
      "Internet connection lost. Waiting for network…"
    );
  }
);


window.addEventListener(
  "online",
  () => {

    if (
      currentBroadcastId
    ) {

      clearTimeout(
        recoveryTimer
      );

      recoveryAttempt = 0;

      schedulePeerRecovery();
    }
  }
);


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      if (
        currentBroadcastId &&
        viewerStarted &&
        viewerPeer
      ) {

        const state =
          viewerPeer.pc.connectionState;

        if (
          state === "failed" ||
          state === "disconnected" ||
          state === "closed"
        ) {

          schedulePeerRecovery();
        }
      }
    }
  }
);


/* =========================================================
   VIEWER CLEANUP
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    stoppingViewer =
      true;

    cleanupSignalListeners();

    try {

      if (viewerPeer) {
        viewerPeer.pc.close();
      }

    } catch (_) {}

    /*
      remove() during beforeunload may not finish.
      This is acceptable because the broadcaster
      validates sessions and broadcast IDs.
    */

    try {

      if (sessionId) {

        remove(
          ref(
            db,
            `pandal/viewers/${viewerId}`
          )
        );
      }

    } catch (_) {}
  }
);


/* =========================================================
   INITIALIZE
========================================================= */

showOfflineUI(
  "The live darshan stream will appear here when the pandal team starts broadcasting."
);

startViewer();


/* =========================================================
   SANKALP / PRAYER WALL
   Kept independent from WebRTC.
========================================================= */

const prayerForm =
  $("prayerForm");

const prayerInput =
  $("prayerInput");

const prayerStatus =
  $("prayerStatus");

const prayerWall =
  $("prayerWall");


if (
  prayerForm &&
  prayerInput
) {

  prayerForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const text =
        prayerInput.value.trim();

      if (!text) {

        if (prayerStatus) {
          prayerStatus.textContent =
            "Please enter your sankalp.";
        }

        return;
      }

      if (text.length > 50) {

        if (prayerStatus) {
          prayerStatus.textContent =
            "Maximum 50 characters.";
        }

        return;
      }

      try {

        await set(
          push(
            ref(
              db,
              "pandal/prayers_wall"
            )
          ),
          {
            text,
            createdAt: Date.now()
          }
        );

        prayerInput.value = "";

        if (prayerStatus) {
          prayerStatus.textContent =
            "Your sankalp has been offered. 🙏";
        }

      } catch (error) {

        console.error(
          "Prayer submission failed:",
          error
        );

        if (prayerStatus) {
          prayerStatus.textContent =
            "Unable to submit right now.";
        }
      }
    }
  );
}


if (prayerWall) {

  onValue(
    ref(db, "pandal/prayers_wall"),
    snapshot => {

      const data =
        snapshot.val() || {};

      prayerWall.innerHTML = "";

      const entries =
        Object.values(data)
          .sort(
            (a, b) =>
              (b?.createdAt || 0) -
              (a?.createdAt || 0)
          );

      entries.forEach(
        prayer => {

          const item =
            document.createElement("div");

          item.className =
            "prayer-card";

          item.textContent =
            prayer?.text || "";

          prayerWall.appendChild(
            item
          );
        }
      );
    },
    error => {

      console.error(
        "Prayer wall listener:",
        error
      );
    }
  );
}


/* =========================================================
   ANNOUNCEMENT READER
   Only activates if an announcement container
   exists in the HTML. It does NOT disturb the
   current page if it doesn't exist.
========================================================= */

const announcementContainer =
  document.getElementById(
    "announcementList"
  );

if (announcementContainer) {

  onValue(
    ref(
      db,
      "pandal/announcements"
    ),
    snapshot => {

      const data =
        snapshot.val() || {};

      announcementContainer.innerHTML =
        "";

      const entries =
        Object.entries(data)
          .sort(
            ([, a], [, b]) =>
              (b?.createdAt || 0) -
              (a?.createdAt || 0)
          );

      entries.forEach(
        ([id, announcement]) => {

          const article =
            document.createElement(
              "article"
            );

          article.className =
            "announcement-card";

          const title =
            document.createElement(
              "h3"
            );

          title.textContent =
            announcement?.title ||
            "Announcement";

          const message =
            document.createElement(
              "p"
            );

          message.textContent =
            announcement?.message ||
            "";

          const time =
            document.createElement(
              "small"
            );

          if (
            announcement?.createdAt
          ) {

            time.textContent =
              new Date(
                announcement.createdAt
              ).toLocaleString(
                "en-IN"
              );
          }

          article.append(
            title,
            message,
            time
          );

          announcementContainer
            .appendChild(article);
        }
      );
    },
    error => {

      console.error(
        "Announcement listener:",
        error
      );
    }
  );
}
