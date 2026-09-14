/* =========================================================
   GANESH CHATURTHI PANDAL — ADMIN
   Firebase Auth + RTDB + WebRTC Broadcaster
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
  onChildAdded,
  push,
  set,
  remove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* =========================================================
   FIREBASE CONFIG
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


const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const database =
  getDatabase(app);


const $ =
  selector =>
    document.querySelector(selector);


/* =========================================================
   ELEMENTS
========================================================= */

const loginPanel =
  $("#loginPanel");

const loginForm =
  $("#loginForm");

const emailInput =
  $("#email");

const passwordInput =
  $("#password");

const loginStatus =
  $("#loginStatus");

const dashboard =
  $("#dashboard");

const logoutBtn =
  $("#logoutBtn");

const connectionState =
  $("#connectionState");

const broadcastStatus =
  $("#broadcastStatus");

const preview =
  $("#preview");

const startBroadcastBtn =
  $("#startBroadcast");

const stopBroadcastBtn =
  $("#stopBroadcast");

const broadcastMessage =
  $("#broadcastMessage");

const adminPrayers =
  $("#adminPrayers");

const announcementForm =
  $("#announcementForm");

const announcementTitle =
  $("#announcementTitle");

const announcementText =
  $("#announcementText");

const announcementStatus =
  $("#announcementStatus");


/* =========================================================
   STATE
========================================================= */

let localStream = null;
let broadcasting = false;
let viewersListenerStarted = false;

const viewerPeers =
  new Map();


/* =========================================================
   FIREBASE CONNECTION
========================================================= */

onValue(
  ref(database, ".info/connected"),

  snapshot => {

    if (!connectionState) return;


    if (snapshot.val() === true) {

      connectionState.textContent =
        "Firebase Connected";

      connectionState.classList.add(
        "connected"
      );

    }

    else {

      connectionState.textContent =
        "Firebase Offline";

      connectionState.classList.remove(
        "connected"
      );

    }

  },

  error => {

    console.error(
      "Connection listener:",
      error
    );

  }
);


/* =========================================================
   LOGIN
========================================================= */

loginForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const email =
      emailInput?.value.trim();

    const password =
      passwordInput?.value;


    if (!email || !password) {

      if (loginStatus)
        loginStatus.textContent =
          "Enter email and password.";

      return;

    }


    if (loginStatus)
      loginStatus.textContent =
        "Signing in...";


    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );


      if (loginStatus)
        loginStatus.textContent = "";

    }

    catch (error) {

      console.error(
        "Login error:",
        error
      );


      if (loginStatus)
        loginStatus.textContent =
          error.message;

    }

  }
);


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
  auth,
  user => {

    if (user) {

      loginPanel?.classList.add(
        "hidden"
      );

      dashboard?.classList.remove(
        "hidden"
      );


      if (connectionState)
        connectionState.textContent =
          "Logged in: " +
          user.email;


      loadAdminPrayers();

      loadExistingBroadcast();

      viewersListenerStarted =
        false;

      listenForViewers();

    }

    else {

      loginPanel?.classList.remove(
        "hidden"
      );

      dashboard?.classList.add(
        "hidden"
      );


      stopLocalCamera();

    }

  }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn?.addEventListener(
  "click",
  async () => {

    await stopBroadcast()
      .catch(error =>
        console.error(
          "Stop error:",
          error
        )
      );


    await signOut(auth)
      .catch(error =>
        console.error(
          "Logout error:",
          error
        )
      );

  }
);


/* =========================================================
   ADMIN PRAYERS
========================================================= */

function loadAdminPrayers() {

  if (!adminPrayers) return;


  adminPrayers.innerHTML = "";


  onChildAdded(
    ref(
      database,
      "pandal/prayers_wall"
    ),

    snapshot => {

      const data =
        snapshot.val();


      if (!data) return;


      const wrapper =
        document.createElement("div");

      wrapper.className =
        "admin-prayer";


      const text =
        document.createElement("p");

      text.textContent =
        data.text || "";


      const deleteButton =
        document.createElement("button");

      deleteButton.type =
        "button";

      deleteButton.textContent =
        "Delete";


      deleteButton.addEventListener(
        "click",
        async () => {

          if (
            !confirm(
              "Delete this Sankalp?"
            )
          ) return;


          try {

            await remove(
              ref(
                database,
                `pandal/prayers_wall/${snapshot.key}`
              )
            );


            wrapper.remove();

          }

          catch (error) {

            console.error(
              "Delete error:",
              error
            );

          }

        }
      );


      wrapper.appendChild(text);
      wrapper.appendChild(deleteButton);

      adminPrayers.prepend(wrapper);

    },

    error => {

      console.error(
        "Admin prayer error:",
        error
      );

    }
  );

}


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

announcementForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const title =
      announcementTitle?.value.trim();

    const message =
      announcementText?.value.trim();


    if (!title || !message) {

      if (announcementStatus)
        announcementStatus.textContent =
          "Enter title and message.";

      return;

    }


    if (announcementStatus)
      announcementStatus.textContent =
        "Publishing...";


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
            serverTimestamp(),
          author:
            auth.currentUser.uid
        }
      );


      announcementForm.reset();


      if (announcementStatus)
        announcementStatus.textContent =
          "Announcement published.";

    }

    catch (error) {

      console.error(
        "Announcement error:",
        error
      );


      if (announcementStatus)
        announcementStatus.textContent =
          "Error: " +
          error.message;

    }

  }
);


/* =========================================================
   EXISTING BROADCAST
========================================================= */

function loadExistingBroadcast() {

  onValue(
    ref(
      database,
      "pandal/broadcast"
    ),

    snapshot => {

      const data =
        snapshot.val();


      broadcasting =
        data?.active === true;


      updateBroadcastUI(
        broadcasting
      );

    },

    error => {

      console.error(
        "Broadcast listener:",
        error
      );

    }
  );

}


/* =========================================================
   START BROADCAST
========================================================= */

startBroadcastBtn?.addEventListener(
  "click",
  startBroadcast
);


async function startBroadcast() {

  if (broadcasting)
    return;


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    showBroadcastMessage(
      "Camera is not supported here. Use HTTPS."
    );

    return;

  }


  showBroadcastMessage(
    "Requesting camera and microphone..."
  );


  try {

    localStream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          facingMode: "environment"
        },

        audio: true

      });


    if (preview) {

      preview.srcObject =
        localStream;

      preview.muted =
        true;

      preview.autoplay =
        true;

      preview.playsInline =
        true;

    }


    broadcasting =
      true;


    /* PUBLIC LIVE FLAG */

    await set(
      ref(
        database,
        "pandal/broadcast"
      ),
      {
        active: true,
        startedAt:
          serverTimestamp()
      }
    );


    updateBroadcastUI(
      true
    );


    showBroadcastMessage(
      "Live Darshan is LIVE."
    );


    /*
      Important:
      restart viewer detection.
    */

    viewersListenerStarted =
      false;

    listenForViewers();

  }

  catch (error) {

    console.error(
      "Start broadcast error:",
      error
    );


    broadcasting =
      false;


    stopLocalCamera();


    updateBroadcastUI(
      false
    );


    showBroadcastMessage(
      "Camera error: " +
      error.message
    );

  }

}


/* =========================================================
   STOP BROADCAST
========================================================= */

stopBroadcastBtn?.addEventListener(
  "click",
  stopBroadcast
);


async function stopBroadcast() {

  broadcasting =
    false;


  try {

    await set(
      ref(
        database,
        "pandal/broadcast"
      ),
      {
        active: false,
        stoppedAt:
          serverTimestamp()
      }
    );

  }

  catch (error) {

    console.error(
      "Broadcast status error:",
      error
    );

  }


  /*
    Notify viewers.
  */

  for (
    const viewerId
    of viewerPeers.keys()
  ) {

    await set(
      ref(
        database,
        `pandal/signals/${viewerId}/closed`
      ),
      true
    )
    .catch(() => {});

  }


  /*
    Close peers.
  */

  viewerPeers.forEach(
    peer => {

      try {
        peer.close();
      }
      catch (_) {}

    }
  );


  viewerPeers.clear();


  stopLocalCamera();


  updateBroadcastUI(
    false
  );


  showBroadcastMessage(
    "Live Darshan stopped."
  );

}


/* =========================================================
   CAMERA
========================================================= */

function stopLocalCamera() {

  if (!localStream)
    return;


  localStream
    .getTracks()
    .forEach(
      track => track.stop()
    );


  localStream = null;


  if (preview)
    preview.srcObject = null;

}


/* =========================================================
   UI
========================================================= */

function updateBroadcastUI(
  live
) {

  if (broadcastStatus) {

    broadcastStatus.textContent =
      live
        ? "● LIVE"
        : "● OFFLINE";

    broadcastStatus.classList.toggle(
      "live",
      live
    );

  }


  if (startBroadcastBtn)
    startBroadcastBtn.disabled =
      live;


  if (stopBroadcastBtn)
    stopBroadcastBtn.disabled =
      !live;

}


function showBroadcastMessage(
  message
) {

  if (broadcastMessage)
    broadcastMessage.textContent =
      message;

}


/* =========================================================
   VIEWER LISTENER
========================================================= */

function listenForViewers() {

  if (
    viewersListenerStarted
  )
    return;


  viewersListenerStarted =
    true;


  console.log(
    "Listening for viewers..."
  );


  onChildAdded(
    ref(
      database,
      "pandal/viewers"
    ),

    snapshot => {

      if (!broadcasting)
        return;


      const viewerId =
        snapshot.key;


      if (!viewerId)
        return;


      if (
        viewerPeers.has(
          viewerId
        )
      )
        return;


      createViewerConnection(
        viewerId
      );

    },

    error => {

      console.error(
        "Viewer listener:",
        error
      );

    }
  );

}


/* =========================================================
   VIEWER CONNECTION
========================================================= */

async function createViewerConnection(
  viewerId
) {

  if (!broadcasting)
    return;


  try {

    const peer =
      new RTCPeerConnection({

        iceServers: [

          {
            urls:
              "stun:stun.l.google.com:19302"
          }

        ]

      });


    viewerPeers.set(
      viewerId,
      peer
    );


    /*
      CAMERA + AUDIO
    */

    if (localStream) {

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

    }


    /*
      BROADCASTER ICE
    */

    peer.onicecandidate =
      event => {

        if (
          !event.candidate
        )
          return;


        push(
          ref(
            database,
            `pandal/signals/${viewerId}/broadcasterCandidates`
          ),
          event.candidate.toJSON()
        )
        .catch(
          error =>
            console.error(
              "ICE write error:",
              error
            )
        );

      };


    /*
      STATE
    */

    peer.onconnectionstatechange =
      () => {

        console.log(
          viewerId,
          peer.connectionState
        );


        if (
          peer.connectionState ===
            "failed" ||

          peer.connectionState ===
            "disconnected" ||

          peer.connectionState ===
            "closed"
        ) {

          removeViewer(
            viewerId
          );

        }

      };


    /*
      VIEWER ANSWER
    */

    onValue(
      ref(
        database,
        `pandal/signals/${viewerId}/answer`
      ),

      async snapshot => {

        const answer =
          snapshot.val();


        if (!answer)
          return;


        try {

          if (
            peer.signalingState ===
            "have-local-offer"
          ) {

            await peer
              .setRemoteDescription(
                new RTCSessionDescription(
                  answer
                )
              );

          }

        }

        catch (error) {

          console.error(
            "Answer error:",
            error
          );

        }

      }
    );


    /*
      VIEWER ICE
    */

    onChildAdded(
      ref(
        database,
        `pandal/signals/${viewerId}/viewerCandidates`
      ),

      async snapshot => {

        const candidate =
          snapshot.val();


        if (!candidate)
          return;


        try {

          await peer
            .addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );

        }

        catch (error) {

          console.error(
            "Viewer ICE error:",
            error
          );

        }

      }
    );


    /*
      CREATE OFFER
    */

    const offer =
      await peer.createOffer();


    await peer.setLocalDescription(
      offer
    );


    /*
      WRITE OFFER
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
      "Offer sent:",
      viewerId
    );

  }

  catch (error) {

    console.error(
      "Create viewer error:",
      error
    );


    removeViewer(
      viewerId
    );

  }

}


/* =========================================================
   REMOVE VIEWER
========================================================= */

async function removeViewer(
  viewerId
) {

  const peer =
    viewerPeers.get(
      viewerId
    );


  if (peer) {

    try {
      peer.close();
    }
    catch (_) {}

  }


  viewerPeers.delete(
    viewerId
  );


  await remove(
    ref(
      database,
      `pandal/viewers/${viewerId}`
    )
  )
  .catch(() => {});

}


/* =========================================================
   EXIT
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    viewerPeers.forEach(
      peer => {

        try {
          peer.close();
        }
        catch (_) {}

      }
    );

  }
);


console.log(
  "Admin JavaScript loaded."
);
