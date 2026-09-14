/* =========================================================
   GANESH PANDAL — ADMIN DASHBOARD
   Firebase Auth + Realtime Database + WebRTC
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
   FIREBASE
========================================================= */

const firebaseConfig = {

  apiKey:
    "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",

  authDomain:
    "ganpati-5f24e.firebaseapp.com",

  databaseURL:
    "https://ganpati-5f24e-default-rtdb.firebaseio.com",

  projectId:
    "ganpati-5f24e",

  storageBucket:
    "ganpati-5f24e.firebasestorage.app",

  messagingSenderId:
    "512949354669",

  appId:
    "1:512949354669:web:f561488c630203a9ae4624"

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

let localStream =
  null;

let broadcasting =
  false;

let viewersListenerStarted =
  false;

const viewerPeers =
  new Map();

const viewerCandidateListeners =
  new Map();


/* =========================================================
   CONNECTION TEST
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

      if (loginStatus) {

        loginStatus.textContent =
          "Enter email and password.";

      }

      return;

    }


    if (loginStatus) {

      loginStatus.textContent =
        "Signing in...";

    }


    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );


      if (loginStatus) {

        loginStatus.textContent =
          "";

      }

    }

    catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      if (loginStatus) {

        loginStatus.textContent =
          error.message ||
          "Login failed.";

      }

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


      if (connectionState) {

        connectionState.textContent =
          "Logged in as " +
          user.email;

      }


      loadAdminPrayers();

      loadExistingBroadcast();

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

    try {

      await stopBroadcast();

      await signOut(auth);

    }

    catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  }
);


/* =========================================================
   PRAYERS
========================================================= */

function loadAdminPrayers() {

  if (!adminPrayers) return;


  adminPrayers.innerHTML =
    "";


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

          const confirmed =
            confirm(
              "Delete this Sankalp?"
            );


          if (!confirmed) return;


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
              "Prayer delete error:",
              error
            );

          }

        }
      );


      wrapper.appendChild(
        text
      );

      wrapper.appendChild(
        deleteButton
      );


      adminPrayers.prepend(
        wrapper
      );

    },

    error => {

      console.error(
        "Prayer listener error:",
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

      if (announcementStatus) {

        announcementStatus.textContent =
          "Enter announcement title and message.";

      }

      return;

    }


    if (announcementStatus) {

      announcementStatus.textContent =
        "Publishing announcement...";

    }


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
          title: title,

          message: message,

          createdAt:
            serverTimestamp(),

          author:
            auth.currentUser.uid
        }
      );


      announcementForm.reset();


      if (announcementStatus) {

        announcementStatus.textContent =
          "Announcement published successfully.";

      }

    }

    catch (error) {

      console.error(
        "Announcement error:",
        error
      );


      if (announcementStatus) {

        announcementStatus.textContent =
          "Error: " +
          error.message;

      }

    }

  }
);


/* =========================================================
   CHECK CURRENT BROADCAST
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


      if (
        data?.active === true
      ) {

        broadcasting =
          true;


        updateBroadcastUI(
          true
        );

      }

      else {

        broadcasting =
          false;


        updateBroadcastUI(
          false
        );

      }

    },

    error => {

      console.error(
        "Broadcast status error:",
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

  if (broadcasting) {

    return;

  }


  if (!navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia) {

    showBroadcastMessage(
      "Camera access is not supported in this browser."
    );

    return;

  }


  showBroadcastMessage(
    "Requesting camera permission..."
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


    /*
      IMPORTANT:
      Tell the public website that
      the broadcast is LIVE.
    */

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
      "Live Darshan is now LIVE."
    );


    /*
      Restart the viewer listener so
      viewers who were already on the
      website can connect.
    */

    viewersListenerStarted =
      false;


    listenForViewers();

  }

  catch (error) {

    console.error(
      "START BROADCAST ERROR:",
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

  try {

    broadcasting =
      false;


    /*
      Tell public website
      that the stream is offline.
    */

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


    /*
      Tell every viewer connection
      to close.
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
      Close peer connections.
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

  catch (error) {

    console.error(
      "STOP BROADCAST ERROR:",
      error
    );


    showBroadcastMessage(
      "Stop error: " +
      error.message
    );

  }

}


/* =========================================================
   CAMERA STOP
========================================================= */

function stopLocalCamera() {

  if (!localStream) return;


  localStream
    .getTracks()
    .forEach(
      track => {

        track.stop();

      }
    );


  localStream =
    null;


  if (preview) {

    preview.srcObject =
      null;

  }

}


/* =========================================================
   BROADCAST UI
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


  if (startBroadcastBtn) {

    startBroadcastBtn.disabled =
      live;

  }


  if (stopBroadcastBtn) {

    stopBroadcastBtn.disabled =
      !live;

  }

}


/* =========================================================
   BROADCAST MESSAGE
========================================================= */

function showBroadcastMessage(
  message
) {

  if (!broadcastMessage) return;


  broadcastMessage.textContent =
    message;

}


/* =========================================================
   VIEWER LISTENER
========================================================= */

function listenForViewers() {

  if (
    viewersListenerStarted
  ) {

    return;

  }


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

      if (!broadcasting) {

        console.log(
          "Viewer ignored because broadcast is OFF."
        );

        return;

      }


      const viewerId =
        snapshot.key;


      if (!viewerId) return;


      if (
        viewerPeers.has(
          viewerId
        )
      ) {

        return;

      }


      console.log(
        "New viewer:",
        viewerId
      );


      createViewerConnection(
        viewerId
      );

    },

    error => {

      console.error(
        "Viewer listener error:",
        error
      );

    }
  );

}


/* =========================================================
   CREATE PEER FOR VIEWER
========================================================= */

async function createViewerConnection(
  viewerId
) {

  if (!broadcasting) return;


  if (
    viewerPeers.has(
      viewerId
    )
  ) {

    return;

  }


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
      Add camera + microphone
      tracks to the peer.
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
      Send broadcaster ICE
      candidates to viewer.
    */

    peer.onicecandidate =
      event => {

        if (
          !event.candidate
        ) {

          return;

        }


        push(
          ref(
            database,
            `pandal/signals/${viewerId}/broadcasterCandidates`
          ),
          event.candidate.toJSON()
        )
        .catch(
          error => {

            console.error(
              "Broadcaster ICE write error:",
              error
            );

          }
        );

      };


    /*
      Connection state.
    */

    peer.onconnectionstatechange =
      () => {

        console.log(
          "Viewer",
          viewerId,
          "state:",
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
      Listen for viewer's answer.
    */

    onValue(
      ref(
        database,
        `pandal/signals/${viewerId}/answer`
      ),

      async snapshot => {

        const answer =
          snapshot.val();


        if (!answer) return;


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


            console.log(
              "Viewer answer received:",
              viewerId
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
      Listen for viewer ICE.
    */

    const candidatesRef =
      ref(
        database,
        `pandal/signals/${viewerId}/viewerCandidates`
      );


    onChildAdded(
      candidatesRef,

      async snapshot => {

        const candidate =
          snapshot.val();


        if (!candidate) return;


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
            "Viewer ICE candidate error:",
            error
          );

        }

      }
    );


    /*
      Create offer.
    */

    const offer =
      await peer
        .createOffer();


    await peer
      .setLocalDescription(
        offer
      );


    /*
      Write offer.
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
      "Offer sent to:",
      viewerId
    );

  }

  catch (error) {

    console.error(
      "Viewer connection error:",
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


  try {

    await remove(
      ref(
        database,
        `pandal/viewers/${viewerId}`
      )
    );

  }

  catch (_) {}

}


/* =========================================================
   PAGE EXIT
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


/* =========================================================
   INITIAL MESSAGE
========================================================= */

console.log(
  "Ganesh Pandal Admin loaded successfully."
);
