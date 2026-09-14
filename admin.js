/* ============================================================
   GANPATI DIGITAL DARSHAN
   ADMIN DASHBOARD + WEBRTC BROADCASTER

   Features:
   - Firebase Authentication
   - Firebase Realtime Database
   - Camera + microphone broadcast
   - Native WebRTC
   - STUN + TURN
   - Multiple viewers
   - ICE candidate queuing
   - Automatic peer recovery
   - Broadcaster restart handling
   - Viewer cleanup
   - Sankalp/prayer management
   - Announcement publishing
   - Safe logout
   - Preloader fallback

   IMPORTANT:
   Replace the TURN values in ICE_SERVERS with your
   real TURN provider credentials.
============================================================ */


/* ============================================================
   FIREBASE IMPORTS
============================================================ */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

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
  get,
  onValue,
  onChildAdded
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* ============================================================
   FIREBASE CONFIG
============================================================ */

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


/* ============================================================
   INITIALIZE FIREBASE
============================================================ */

const firebaseApp =
  initializeApp(firebaseConfig);

const auth =
  getAuth(firebaseApp);

const database =
  getDatabase(firebaseApp);


/* ============================================================
   WEBRTC ICE SERVERS
============================================================

   STUN:
   Used for discovering public network addresses.

   TURN:
   Used when direct peer-to-peer communication is impossible.

   Replace the TURN placeholders with your REAL credentials.

============================================================ */

const ICE_SERVERS = [

  /* -------------------------
     Google STUN
  ------------------------- */

  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302"
    ]
  },


  /* -------------------------
     YOUR TURN SERVER
  -------------------------

     Example:

     {
       urls: [
         "turn:example.com:3478?transport=udp",
         "turn:example.com:3478?transport=tcp",
         "turns:example.com:5349?transport=tcp"
       ],
       username: "username",
       credential: "password"
     }

  ------------------------- */

  {
    urls: [
      "turn:YOUR-TURN-SERVER:3478?transport=udp",
      "turn:YOUR-TURN-SERVER:3478?transport=tcp",
      "turns:YOUR-TURN-SERVER:5349?transport=tcp"
    ],

    username:
      "YOUR_TURN_USERNAME",

    credential:
      "YOUR_TURN_PASSWORD"
  }

];


/* ============================================================
   DOM REFERENCES
============================================================ */

/* Login */

const loginPanel =
  document.getElementById(
    "loginPanel"
  );

const dashboard =
  document.getElementById(
    "dashboard"
  );

const loginForm =
  document.getElementById(
    "loginForm"
  );

const emailInput =
  document.getElementById(
    "email"
  );

const passwordInput =
  document.getElementById(
    "password"
  );

const loginStatus =
  document.getElementById(
    "loginStatus"
  );


/* Dashboard */

const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );

const connectionState =
  document.getElementById(
    "connectionState"
  );


/* Broadcast */

const broadcastStatus =
  document.getElementById(
    "broadcastStatus"
  );

const preview =
  document.getElementById(
    "preview"
  );

const startBroadcast =
  document.getElementById(
    "startBroadcast"
  );

const stopBroadcast =
  document.getElementById(
    "stopBroadcast"
  );

const broadcastMessage =
  document.getElementById(
    "broadcastMessage"
  );


/* Prayers */

const adminPrayers =
  document.getElementById(
    "adminPrayers"
  );


/* Announcements */

const announcementForm =
  document.getElementById(
    "announcementForm"
  );

const announcementTitle =
  document.getElementById(
    "announcementTitle"
  );

const announcementText =
  document.getElementById(
    "announcementText"
  );

const announcementStatus =
  document.getElementById(
    "announcementStatus"
  );


/* ============================================================
   GLOBAL STATE
============================================================ */

let currentUser =
  null;


/* -------------------------
   Broadcast state
------------------------- */

let localStream =
  null;

let broadcasting =
  false;

let broadcastId =
  null;

let broadcastStartedAt =
  null;


/* -------------------------
   Firebase listeners
------------------------- */

let viewersListenerUnsubscribe =
  null;

let broadcastListenerUnsubscribe =
  null;

let prayersListenerUnsubscribe =
  null;


/* -------------------------
   Viewer peer connections

   Map:

   viewerId -> RTCPeerConnection
------------------------- */

const peerConnections =
  new Map();


/* -------------------------
   Viewer ICE queues

   Map:

   viewerId -> Array<Candidate>
------------------------- */

const viewerIceQueues =
  new Map();


/* -------------------------
   Answer listeners

   Map:

   viewerId -> unsubscribe function
------------------------- */

const answerListeners =
  new Map();


/* -------------------------
   Viewer ICE listeners

   Map:

   viewerId -> unsubscribe function
------------------------- */

const viewerCandidateListeners =
  new Map();


/* -------------------------
   Recovery timers

   Map:

   viewerId -> timeout
------------------------- */

const recoveryTimers =
  new Map();


/* -------------------------
   Recovery attempts

   Map:

   viewerId -> number
------------------------- */

const recoveryAttempts =
  new Map();


/* -------------------------
   Prevent duplicate peer
   creation
------------------------- */

const viewerCreationLocks =
  new Set();


/* ============================================================
   UTILITY FUNCTIONS
============================================================ */

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

  element.className =
    "form-status";

  if (type) {
    element.classList.add(
      type
    );
  }
}


/* ============================================================
   CONNECTION STATUS
============================================================ */

function setConnectionState(
  message
) {

  if (!connectionState) {
    return;
  }

  connectionState.textContent =
    message;
}


/* ============================================================
   BROADCAST BUTTON STATE
============================================================ */

function updateBroadcastUI(
  active
) {

  if (broadcastStatus) {

    broadcastStatus.textContent =
      active
        ? "LIVE"
        : "OFFLINE";

  }


  if (startBroadcast) {

    startBroadcast.disabled =
      active;

  }


  if (stopBroadcast) {

    stopBroadcast.disabled =
      !active;

  }

}


/* ============================================================
   PRELOADER SAFETY
============================================================ */

function removePreloader() {

  const preloader =
    document.getElementById(
      "preloader"
    );

  if (!preloader) {
    return;
  }

  preloader.classList.add(
    "done"
  );

  setTimeout(() => {

    if (
      preloader &&
      preloader.parentNode
    ) {

      preloader.remove();

    }

  }, 600);

}


/*
   Static fallback.

   This prevents the dashboard from
   remaining visually blocked if a
   Firebase request or module fails.
*/

setTimeout(
  removePreloader,
  2500
);


/* ============================================================
   AUTH STATE
============================================================ */

onAuthStateChanged(
  auth,
  async (user) => {

    currentUser =
      user || null;


    if (user) {

      /* -------------------------
         Show dashboard
      ------------------------- */

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
        "Connected"
      );


      /* -------------------------
         Load admin data
      ------------------------- */

      await loadPrayers();

      listenToBroadcastState();


    } else {

      /* -------------------------
         Show login
      ------------------------- */

      if (loginPanel) {

        loginPanel.classList.remove(
          "hidden"
        );

      }


      if (dashboard) {

        dashboard.classList.add(
          "hidden"
        );

      }


      setConnectionState(
        "Not signed in"
      );

    }


    removePreloader();

  }
);


/* ============================================================
   LOGIN
============================================================ */

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const email =
        emailInput
          ?.value
          .trim();

      const password =
        passwordInput
          ?.value || "";


      if (
        !email ||
        !password
      ) {

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


        setStatus(
          loginStatus,
          "Login successful.",
          "success"
        );


      } catch (error) {

        console.error(
          "LOGIN ERROR:",
          error
        );


        setStatus(
          loginStatus,
          getFirebaseErrorMessage(
            error
          ),
          "error"
        );

      }

    }
  );

}


/* ============================================================
   FIREBASE ERROR MESSAGE
============================================================ */

function getFirebaseErrorMessage(
  error
) {

  if (!error) {
    return "Something went wrong.";
  }


  const code =
    error.code || "";


  switch (code) {

    case "auth/invalid-credential":

      return "Incorrect email or password.";


    case "auth/invalid-login-credentials":

      return "Incorrect email or password.";


    case "auth/user-not-found":

      return "No account exists with this email.";


    case "auth/wrong-password":

      return "Incorrect password.";


    case "auth/too-many-requests":

      return "Too many attempts. Please try again later.";


    case "auth/network-request-failed":

      return "Network error. Check your internet connection.";


    default:

      return (
        error.message ||
        "Authentication failed."
      );

  }

}


/* ============================================================
   LOGOUT
============================================================ */

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        await stopBroadcastInternal(
          true
        );

      } catch (error) {

        console.warn(
          "STOP DURING LOGOUT:",
          error
        );

      }


      try {

        await signOut(
          auth
        );

      } catch (error) {

        console.error(
          "LOGOUT ERROR:",
          error
        );

      }

    }
  );

}


/* ============================================================
   GET CAMERA + MICROPHONE
============================================================ */

async function getCameraStream() {

  if (localStream) {
    return localStream;
  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    throw new Error(
      "Camera API is not available in this browser."
    );

  }


  try {

    localStream =
      await navigator.mediaDevices.getUserMedia({

        video: {

          facingMode:
            "user",

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


    /* -------------------------
       Admin preview
    ------------------------- */

    if (preview) {

      preview.srcObject =
        localStream;

      preview.muted =
        true;

      preview.autoplay =
        true;

      preview.playsInline =
        true;


      try {

        await preview.play();

      } catch (error) {

        console.warn(
          "PREVIEW PLAY:",
          error
        );

      }

    }


    return localStream;


  } catch (error) {

    console.error(
      "CAMERA/MIC ERROR:",
      error
    );


    setStatus(
      broadcastMessage,
      "Unable to access camera or microphone. Check browser permissions.",
      "error"
    );


    throw error;

  }

}


/* ============================================================
   START BROADCAST
============================================================ */

if (startBroadcast) {

  startBroadcast.addEventListener(
    "click",
    async () => {

      if (broadcasting) {
        return;
      }


      try {

        setStatus(
          broadcastMessage,
          "Requesting camera and microphone..."
        );


        setConnectionState(
          "Starting camera..."
        );


        await getCameraStream();


        /*
           Every broadcast gets a unique ID.
        */

        broadcastStartedAt =
          Date.now();


        broadcastId =
          "broadcast-" +
          broadcastStartedAt +
          "-" +
          Math.random()
            .toString(36)
            .substring(2, 9);


        /*
           IMPORTANT:

           Write broadcast state BEFORE
           accepting viewers.
        */

        await set(
          ref(
            database,
            "pandal/broadcast"
          ),
          {

            active: true,

            id:
              broadcastId,

            startedAt:
              broadcastStartedAt

          }
        );


        broadcasting =
          true;


        updateBroadcastUI(
          true
        );


        setConnectionState(
          "Broadcasting"
        );


        setStatus(
          broadcastMessage,
          "Live Darshan is now LIVE.",
          "success"
        );


        /*
           Start watching for viewers.
        */

        startViewerListener();


        console.log(
          "BROADCAST STARTED:",
          broadcastId
        );


      } catch (error) {

        console.error(
          "START BROADCAST ERROR:",
          error
        );


        broadcasting =
          false;


        updateBroadcastUI(
          false
        );


        setConnectionState(
          "Connected"
        );


        setStatus(
          broadcastMessage,
          "Broadcast could not be started.",
          "error"
        );


        /*
           If Firebase state was accidentally
           written before an error occurred,
           make sure it is marked inactive.
        */

        try {

          await update(
            ref(
              database,
              "pandal/broadcast"
            ),
            {
              active: false,
              closedAt: Date.now()
            }
          );

        } catch (_) {}

      }

    }
  );

}


/* ============================================================
   STOP BROADCAST BUTTON
============================================================ */

if (stopBroadcast) {

  stopBroadcast.addEventListener(
    "click",
    async () => {

      await stopBroadcastInternal(
        false
      );

    }
  );

}


/* ============================================================
   STOP BROADCAST
============================================================ */

async function stopBroadcastInternal(
  duringLogout = false
) {

  /*
     Mark local state first.

     This prevents new viewers from
     creating connections while shutdown
     is happening.
  */

  broadcasting =
    false;


  /* -------------------------
     Stop viewer listener
  ------------------------- */

  stopViewerListener();


  /* -------------------------
     Close all peers
  ------------------------- */

  const viewerIds =
    Array.from(
      peerConnections.keys()
    );


  for (
    const viewerId of viewerIds
  ) {

    await closeViewerConnection(
      viewerId,
      true
    );

  }


  peerConnections.clear();


  /* -------------------------
     Cancel recovery timers
  ------------------------- */

  for (
    const timer of recoveryTimers.values()
  ) {

    clearTimeout(
      timer
    );

  }


  recoveryTimers.clear();
  recoveryAttempts.clear();
  viewerCreationLocks.clear();


  /* -------------------------
     Stop local media
  ------------------------- */

  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        (track) => {

          try {

            track.stop();

          } catch (_) {}

        }
      );

    localStream =
      null;

  }


  /* -------------------------
     Clear preview
  ------------------------- */

  if (preview) {

    preview.srcObject =
      null;

  }


  /* -------------------------
     Firebase broadcast state
  ------------------------- */

  try {

    await update(
      ref(
        database,
        "pandal/broadcast"
      ),
      {

        active: false,

        closedAt:
          Date.now()

      }
    );

  } catch (error) {

    console.error(
      "BROADCAST CLOSE FIREBASE ERROR:",
      error
    );

  }


  broadcastId =
    null;

  broadcastStartedAt =
    null;


  updateBroadcastUI(
    false
  );


  setConnectionState(
    currentUser
      ? "Connected"
      : "Not signed in"
  );


  if (!duringLogout) {

    setStatus(
      broadcastMessage,
      "Live Darshan stopped."
    );

  }

}


/* ============================================================
   VIEWER LISTENER
============================================================ */

function startViewerListener() {

  if (!broadcasting) {
    return;
  }


  /*
     Make sure there isn't an old listener.
  */

  stopViewerListener();


  const viewersRef =
    ref(
      database,
      "pandal/viewers"
    );


  viewersListenerUnsubscribe =
    onChildAdded(
      viewersRef,
      async (snapshot) => {

        if (!broadcasting) {
          return;
        }


        const viewerId =
          snapshot.key;

        const viewer =
          snapshot.val();


        if (
          !viewerId ||
          !viewer
        ) {

          return;

        }


        /*
           Ignore disconnected viewers.
        */

        if (
          viewer.active !== true
        ) {

          return;

        }


        /*
           If viewer belongs to an older
           broadcast, ignore it.
        */

        if (
          viewer.broadcastId &&
          broadcastId &&
          viewer.broadcastId !==
            broadcastId
        ) {

          return;

        }


        /*
           Don't create duplicate peer.
        */

        if (
          peerConnections.has(
            viewerId
          )
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


        console.log(
          "NEW VIEWER:",
          viewerId
        );


        await createViewerConnection(
          viewerId
        );

      },
      (error) => {

        console.error(
          "VIEWERS LISTENER ERROR:",
          error
        );


        setConnectionState(
          "Viewer listener error"
        );

      }
    );

}


/* ============================================================
   STOP VIEWER LISTENER
============================================================ */

function stopViewerListener() {

  if (
    viewersListenerUnsubscribe
  ) {

    try {

      viewersListenerUnsubscribe();

    } catch (_) {}

    viewersListenerUnsubscribe =
      null;

  }

}


/* ============================================================
   CREATE VIEWER CONNECTION
============================================================ */

async function createViewerConnection(
  viewerId
) {

  if (
    !broadcasting ||
    !localStream
  ) {

    return;

  }


  if (
    peerConnections.has(
      viewerId
    )
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


  viewerCreationLocks.add(
    viewerId
  );


  try {

    /*
       Clean any previous signaling
       state belonging to this viewer.

       The viewer has a unique ID, so this
       is safe for this connection.
    */

    try {

      await remove(
        ref(
          database,
          `pandal/signals/${viewerId}`
        )
      );

    } catch (_) {}


    /* -------------------------
       Create peer
    ------------------------- */

    const pc =
      new RTCPeerConnection({

        iceServers:
          ICE_SERVERS,

        iceCandidatePoolSize:
          10,

        bundlePolicy:
          "max-bundle",

        rtcpMuxPolicy:
          "require"

      });


    peerConnections.set(
      viewerId,
      pc
    );


    viewerIceQueues.set(
      viewerId,
      []
    );


    recoveryAttempts.set(
      viewerId,
      0
    );


    /* ========================================================
       ADD CAMERA + MICROPHONE
    ======================================================== */

    localStream
      .getTracks()
      .forEach(
        (track) => {

          try {

            pc.addTrack(
              track,
              localStream
            );

          } catch (error) {

            console.error(
              "ADD TRACK ERROR:",
              error
            );

          }

        }
      );


    /* ========================================================
       CONNECTION STATE
    ======================================================== */

    pc.onconnectionstatechange =
      () => {

        const state =
          pc.connectionState;


        console.log(
          "VIEWER",
          viewerId,
          "CONNECTION:",
          state
        );


        switch (state) {

          case "new":

            setConnectionState(
              `Connecting viewer ${viewerId}...`
            );

            break;


          case "connecting":

            setConnectionState(
              `Connecting viewer ${viewerId}...`
            );

            break;


          case "connected":

            setConnectionState(
              `Viewer ${viewerId} connected`
            );


            recoveryAttempts.set(
              viewerId,
              0
            );


            break;


          case "disconnected":

            console.warn(
              "VIEWER DISCONNECTED:",
              viewerId
            );


            scheduleViewerRecovery(
              viewerId
            );

            break;


          case "failed":

            console.warn(
              "VIEWER CONNECTION FAILED:",
              viewerId
            );


            scheduleViewerRecovery(
              viewerId
            );

            break;


          case "closed":

            break;

        }

      };


    /* ========================================================
       ICE CONNECTION STATE
    ======================================================== */

    pc.oniceconnectionstatechange =
      () => {

        const state =
          pc.iceConnectionState;


        console.log(
          "VIEWER",
          viewerId,
          "ICE:",
          state
        );


        if (
          state ===
          "connected"
        ) {

          recoveryAttempts.set(
            viewerId,
            0
          );

        }


        if (
          state ===
          "completed"
        ) {

          recoveryAttempts.set(
            viewerId,
            0
          );

        }


        if (
          state ===
          "failed"
        ) {

          console.warn(
            "ICE FAILED:",
            viewerId
          );


          scheduleViewerRecovery(
            viewerId
          );

        }

      };


    /* ========================================================
       ICE CANDIDATE
    ======================================================== */

    pc.onicecandidate =
      async (event) => {

        if (
          !event.candidate
        ) {

          return;

        }


        try {

          await push(
            ref(
              database,
              `pandal/signals/${viewerId}/broadcasterCandidates`
            ),
            event.candidate.toJSON()
          );


        } catch (error) {

          console.error(
            "BROADCASTER ICE SEND ERROR:",
            error
          );

        }

      };


    /* ========================================================
       ANSWER LISTENER
    ======================================================== */

    const answerRef =
      ref(
        database,
        `pandal/signals/${viewerId}/answer`
      );


    const unsubscribeAnswer =
      onValue(
        answerRef,
        async (snapshot) => {

          const answer =
            snapshot.val();


          if (!answer) {
            return;
          }


          try {

            /*
               Only apply answer while waiting
               for a remote answer.
            */

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


            console.log(
              "ANSWER APPLIED:",
              viewerId
            );


            /*
               Now that the remote SDP is
               available, queued candidates
               can safely be added.
            */

            await flushViewerIce(
              viewerId
            );


          } catch (error) {

            console.error(
              "ANSWER APPLY ERROR:",
              viewerId,
              error
            );


            scheduleViewerRecovery(
              viewerId
            );

          }

        }
      );


    answerListeners.set(
      viewerId,
      unsubscribeAnswer
    );


    /* ========================================================
       VIEWER ICE LISTENER
    ======================================================== */

    const viewerCandidatesRef =
      ref(
        database,
        `pandal/signals/${viewerId}/viewerCandidates`
      );


    const unsubscribeViewerIce =
      onChildAdded(
        viewerCandidatesRef,
        async (snapshot) => {

          const candidate =
            snapshot.val();


          if (!candidate) {
            return;
          }


          /*
             Candidate may arrive BEFORE
             remote description.

             Queue it.
          */

          if (
            !pc.remoteDescription
          ) {

            const queue =
              viewerIceQueues.get(
                viewerId
              ) || [];


            queue.push(
              candidate
            );


            viewerIceQueues.set(
              viewerId,
              queue
            );


            return;

          }


          try {

            await pc.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );


          } catch (error) {

            console.warn(
              "VIEWER ICE ADD ERROR:",
              viewerId,
              error
            );

          }

        }
      );


    viewerCandidateListeners.set(
      viewerId,
      unsubscribeViewerIce
    );


    /* ========================================================
       CREATE OFFER
    ======================================================== */

    const offer =
      await pc.createOffer({

        offerToReceiveAudio:
          false,

        offerToReceiveVideo:
          false

      });


    await pc.setLocalDescription(
      offer
    );


    /*
       Wait until ICE gathering has started.
       Trickle ICE still sends candidates
       separately through onicecandidate.
    */

    await set(
      ref(
        database,
        `pandal/signals/${viewerId}/offer`
      ),
      {

        type:
          offer.type,

        sdp:
          offer.sdp

      }
    );


    console.log(
      "OFFER SENT:",
      viewerId
    );


  } catch (error) {

    console.error(
      "CREATE VIEWER CONNECTION ERROR:",
      viewerId,
      error
    );


    await closeViewerConnection(
      viewerId,
      false
    );


    if (broadcasting) {

      scheduleViewerRecovery(
        viewerId
      );

    }


  } finally {

    viewerCreationLocks.delete(
      viewerId
    );

  }

}


/* ============================================================
   FLUSH QUEUED VIEWER ICE
============================================================ */

async function flushViewerIce(
  viewerId
) {

  const pc =
    peerConnections.get(
      viewerId
    );


  if (!pc) {
    return;
  }


  if (
    !pc.remoteDescription
  ) {

    return;

  }


  const queue =
    viewerIceQueues.get(
      viewerId
    ) || [];


  while (
    queue.length > 0
  ) {

    const candidate =
      queue.shift();


    try {

      await pc.addIceCandidate(
        new RTCIceCandidate(
          candidate
        )
      );


    } catch (error) {

      console.warn(
        "QUEUED ICE ERROR:",
        viewerId,
        error
      );

    }

  }


  viewerIceQueues.set(
    viewerId,
    []
  );

}


/* ============================================================
   AUTOMATIC VIEWER RECOVERY
============================================================ */

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


  let attempts =
    recoveryAttempts.get(
      viewerId
    ) || 0;


  attempts += 1;


  recoveryAttempts.set(
    viewerId,
    attempts
  );


  /*
     Exponential backoff:

     Attempt 1: 2 seconds
     Attempt 2: 4 seconds
     Attempt 3: 6 seconds
     ...
     Maximum: 10 seconds
  */

  const delay =
    Math.min(
      10000,
      2000 * attempts
    );


  console.log(
    `RECOVERY FOR ${viewerId} IN ${delay}ms`
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


        /*
           Verify viewer is still active.
        */

        try {

          const snapshot =
            await get(
              ref(
                database,
                `pandal/viewers/${viewerId}`
              )
            );


          const viewer =
            snapshot.val();


          if (
            !viewer ||
            viewer.active !== true
          ) {

            console.log(
              "VIEWER NO LONGER ACTIVE:",
              viewerId
            );


            await closeViewerConnection(
              viewerId,
              false
            );


            return;

          }


          /*
             Close old peer first.
          */

          await closeViewerConnection(
            viewerId,
            false
          );


          /*
             Recreate connection.
          */

          if (
            broadcasting &&
            localStream
          ) {

            await createViewerConnection(
              viewerId
            );

          }


        } catch (error) {

          console.error(
            "VIEWER RECOVERY ERROR:",
            viewerId,
            error
          );


          /*
             Try again later.
          */

          if (broadcasting) {

            scheduleViewerRecovery(
              viewerId
            );

          }

        }

      },
      delay
    );


  recoveryTimers.set(
    viewerId,
    timer
  );

}


/* ============================================================
   CLOSE VIEWER CONNECTION
============================================================ */

async function closeViewerConnection(
  viewerId,
  sendClosedSignal = true
) {

  /*
     Cancel recovery timer.
  */

  const timer =
    recoveryTimers.get(
      viewerId
    );


  if (timer) {

    clearTimeout(
      timer
    );


    recoveryTimers.delete(
      viewerId
    );

  }


  /*
     Remove answer listener.
  */

  const answerUnsubscribe =
    answerListeners.get(
      viewerId
    );


  if (answerUnsubscribe) {

    try {

      answerUnsubscribe();

    } catch (_) {}

  }


  answerListeners.delete(
    viewerId
  );


  /*
     Remove viewer ICE listener.
  */

  const candidateUnsubscribe =
    viewerCandidateListeners.get(
      viewerId
    );


  if (candidateUnsubscribe) {

    try {

      candidateUnsubscribe();

    } catch (_) {}

  }


  viewerCandidateListeners.delete(
    viewerId
  );


  /*
     Close RTCPeerConnection.
  */

  const pc =
    peerConnections.get(
      viewerId
    );


  if (pc) {

    try {

      pc.onicecandidate =
        null;

      pc.onconnectionstatechange =
        null;

      pc.oniceconnectionstatechange =
        null;

      pc.close();

    } catch (_) {}

  }


  peerConnections.delete(
    viewerId
  );


  viewerIceQueues.delete(
    viewerId
  );


  viewerCreationLocks.delete(
    viewerId
  );


  /*
     Tell viewer that this peer was
     closed.

     During complete broadcast shutdown
     this is useful.

     During recovery it is also harmless.
  */

  if (sendClosedSignal) {

    try {

      await set(
        ref(
          database,
          `pandal/signals/${viewerId}/closed`
        ),
        {

          closed: true,

          at: Date.now()

        }
      );

    } catch (error) {

      console.warn(
        "CLOSED SIGNAL ERROR:",
        error
      );

    }

  }

}


/* ============================================================
   FIREBASE BROADCAST STATE LISTENER
============================================================ */

function listenToBroadcastState() {

  if (
    broadcastListenerUnsubscribe
  ) {

    try {

      broadcastListenerUnsubscribe();

    } catch (_) {}

  }


  const broadcastRef =
    ref(
      database,
      "pandal/broadcast"
    );


  broadcastListenerUnsubscribe =
    onValue(
      broadcastRef,
      (snapshot) => {

        const data =
          snapshot.val();


        if (
          data?.active === true &&
          broadcasting
        ) {

          updateBroadcastUI(
            true
          );

        }

      },
      (error) => {

        console.error(
          "BROADCAST STATE LISTENER:",
          error
        );

      }
    );

}


/* ============================================================
   LOAD PRAYERS
============================================================ */

async function loadPrayers() {

  if (!adminPrayers) {
    return;
  }


  /*
     Remove old listener.
  */

  if (
    prayersListenerUnsubscribe
  ) {

    try {

      prayersListenerUnsubscribe();

    } catch (_) {}

  }


  const prayersRef =
    ref(
      database,
      "pandal/prayers_wall"
    );


  prayersListenerUnsubscribe =
    onValue(
      prayersRef,
      (snapshot) => {

        renderAdminPrayers(
          snapshot.val()
        );

      },
      (error) => {

        console.error(
          "PRAYER LISTENER ERROR:",
          error
        );


        adminPrayers.innerHTML =
          "<p>Unable to load prayers.</p>";

      }
    );

}


/* ============================================================
   RENDER ADMIN PRAYERS
============================================================ */

function renderAdminPrayers(
  data
) {

  if (!adminPrayers) {
    return;
  }


  adminPrayers.innerHTML =
    "";


  if (!data) {

    adminPrayers.innerHTML =
      "<p>No prayers yet.</p>";

    return;

  }


  const entries =
    Object.entries(
      data
    ).sort(
      (a, b) => {

        return (
          Number(
            b[1]?.createdAt ||
            0
          ) -
          Number(
            a[1]?.createdAt ||
            0
          )
        );

      }
    );


  entries.forEach(
    ([id, prayer]) => {

      const wrapper =
        document.createElement(
          "div"
        );


      wrapper.className =
        "admin-prayer";


      const text =
        document.createElement(
          "p"
        );


      text.textContent =
        prayer?.text ||
        "";


      const date =
        document.createElement(
          "small"
        );


      if (
        prayer?.createdAt
      ) {

        date.textContent =
          new Date(
            prayer.createdAt
          ).toLocaleString();

      }


      const deleteButton =
        document.createElement(
          "button"
        );


      deleteButton.type =
        "button";


      deleteButton.textContent =
        "Delete";


      deleteButton.addEventListener(
        "click",
        async () => {

          const confirmed =
            window.confirm(
              "Delete this prayer?"
            );


          if (!confirmed) {
            return;
          }


          try {

            await remove(
              ref(
                database,
                `pandal/prayers_wall/${id}`
              )
            );


          } catch (error) {

            console.error(
              "DELETE PRAYER ERROR:",
              error
            );

          }

        }
      );


      wrapper.appendChild(
        text
      );


      wrapper.appendChild(
        date
      );


      wrapper.appendChild(
        deleteButton
      );


      adminPrayers.appendChild(
        wrapper
      );

    }
  );

}


/* ============================================================
   ANNOUNCEMENTS
============================================================ */

if (announcementForm) {

  announcementForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      if (!currentUser) {

        setStatus(
          announcementStatus,
          "Please log in first.",
          "error"
        );

        return;

      }


      const title =
        announcementTitle
          ?.value
          .trim() ||
        "";


      const message =
        announcementText
          ?.value
          .trim() ||
        "";


      if (
        !title ||
        !message
      ) {

        setStatus(
          announcementStatus,
          "Enter both title and message.",
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
              database,
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
              "Admin"

          }
        );


        announcementForm.reset();


        setStatus(
          announcementStatus,
          "Announcement published successfully.",
          "success"
        );


      } catch (error) {

        console.error(
          "ANNOUNCEMENT ERROR:",
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

}


/* ============================================================
   BROWSER / NETWORK RECOVERY
============================================================ */

window.addEventListener(
  "online",
  () => {

    console.log(
      "ADMIN NETWORK ONLINE"
    );


    if (broadcasting) {

      setConnectionState(
        "Network restored — reconnecting viewers..."
      );


      /*
         Re-check every active viewer.
      */

      for (
        const viewerId of
          peerConnections.keys()
      ) {

        scheduleViewerRecovery(
          viewerId
        );

      }

    }

  }
);


window.addEventListener(
  "offline",
  () => {

    console.warn(
      "ADMIN NETWORK OFFLINE"
    );


    setConnectionState(
      "Network offline"
    );

  }
);


/* ============================================================
   PAGE VISIBILITY RECOVERY
============================================================ */

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


    console.log(
      "ADMIN PAGE VISIBLE AGAIN"
    );


    /*
       Mobile browsers may suspend
       WebRTC connections while the
       page is backgrounded.

       Check connections after returning.
    */

    setTimeout(
      () => {

        for (
          const [
            viewerId,
            pc
          ] of peerConnections
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
              viewerId
            );

          }

        }

      },
      1000
    );

  }
);


/* ============================================================
   BEFORE UNLOAD
============================================================ */

window.addEventListener(
  "beforeunload",
  () => {

    /*
       We cannot reliably await Firebase
       operations during beforeunload,
       so close local WebRTC/media immediately.
    */

    broadcasting =
      false;


    stopViewerListener();


    if (localStream) {

      localStream
        .getTracks()
        .forEach(
          (track) => {

            try {

              track.stop();

            } catch (_) {}

          }
        );

    }


    for (
      const pc of
        peerConnections.values()
    ) {

      try {

        pc.close();

      } catch (_) {}

    }


    peerConnections.clear();

  }
);


/* ============================================================
   INITIAL BUTTON STATE
============================================================ */

updateBroadcastUI(
  false
);


/* ============================================================
   DEBUG INFORMATION
============================================================ */

console.log(
  "===================================="
);

console.log(
  "GANPATI ADMIN.JS LOADED"
);

console.log(
  "Firebase Database:",
  firebaseConfig.databaseURL
);

console.log(
  "WebRTC TURN/STUN configured:",
  ICE_SERVERS.length
);

console.log(
  "===================================="
);
