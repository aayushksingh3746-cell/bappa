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
   PRELOADER
========================================================= */

function hidePreloader() {

  $("#preloader")
    ?.classList
    .add("done");

}


window.addEventListener(
  "load",
  () => {

    setTimeout(
      hidePreloader,
      400
    );

  }
);


setTimeout(
  hidePreloader,
  2000
);


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(
  auth,
  user => {

    if (user) {

      $("#loginPanel")
        .classList
        .add("hidden");


      $("#dashboard")
        .classList
        .remove("hidden");


      $("#logoutBtn")
        .classList
        .remove("hidden");


      $("#connectionState")
        .textContent =
        "Authenticated";


      loadPrayers();

      listenForViewers();

    }

    else {

      $("#loginPanel")
        .classList
        .remove("hidden");


      $("#dashboard")
        .classList
        .add("hidden");


      $("#logoutBtn")
        .classList
        .add("hidden");

    }

  }
);


/* LOGIN */

$("#loginForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const email =
        $("#email")
          .value
          .trim();


      const password =
        $("#password")
          .value;


      $("#loginStatus")
        .textContent =
        "Signing in...";


      try {

        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


        $("#loginStatus")
          .textContent = "";

      }

      catch (error) {

        console.error(error);


        if (
          error.code ===
          "auth/invalid-credential"
        ) {

          $("#loginStatus")
            .textContent =
            "Invalid email or password.";

        }

        else {

          $("#loginStatus")
            .textContent =
            "Sign-in failed. Check Firebase Authentication.";

        }

      }

    }
  );


/* LOGOUT */

$("#logoutBtn")
  .addEventListener(
    "click",
    () => {

      signOut(auth);

    }
  );


/* =========================================================
   PRAYER ADMIN
========================================================= */

function loadPrayers() {

  const container =
    $("#adminPrayers");


  container.innerHTML = "";


  onChildAdded(
    ref(
      database,
      "pandal/prayers_wall"
    ),

    snapshot => {

      const prayer =
        snapshot.val();


      if (!prayer) {
        return;
      }


      const item =
        document.createElement("div");


      item.className =
        "admin-item";


      const strong =
        document.createElement("strong");


      strong.textContent =
        prayer.text || "";


      const label =
        document.createElement("span");


      label.textContent =
        "Sankalp";


      item.appendChild(
        strong
      );


      item.appendChild(
        label
      );


      container.prepend(
        item
      );


      while (
        container.children.length > 50
      ) {

        container.lastElementChild
          .remove();

      }

    }
  );

}


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

$("#announcementForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const title =
        $("#announcementTitle")
          .value
          .trim();


      const message =
        $("#announcementText")
          .value
          .trim();


      const status =
        $("#announcementStatus");


      status.textContent =
        "Publishing...";


      try {

        await push(
          ref(
            database,
            "pandal/announcements"
          ),
          {

            title,

            message,

            createdAt:
              serverTimestamp(),

            author:
              auth.currentUser.uid

          }
        );


        event.target.reset();


        status.textContent =
          "Announcement published.";

      }

      catch (error) {

        console.error(error);

        status.textContent =
          "Could not publish announcement.";

      }

    }
  );


/* =========================================================
   WEBRTC BROADCAST
========================================================= */

let localStream =
  null;


let broadcasting =
  false;


const peerConnections =
  new Map();


const viewerListeners =
  new Map();


let viewersListenerStarted =
  false;


/* START */

$("#startBroadcast")
  .addEventListener(
    "click",
    startBroadcast
  );


/* STOP */

$("#stopBroadcast")
  .addEventListener(
    "click",
    stopBroadcast
  );


async function startBroadcast() {

  if (broadcasting) {
    return;
  }


  const message =
    $("#broadcastMessage");


  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({

          video: {

            facingMode:
              "user",

            width: {
              ideal: 1280
            },

            height: {
              ideal: 720
            }

          },

          audio: true

        });


    $("#preview")
      .srcObject =
      localStream;


    broadcasting = true;


    $("#broadcastStatus")
      .textContent =
      "LIVE";


    message.textContent =
      "Camera is live. Keep this page open while broadcasting.";


    listenForViewers();

  }

  catch (error) {

    console.error(error);


    message.textContent =
      "Camera or microphone access was denied or unavailable.";

  }

}


/* VIEWERS */

function listenForViewers() {

  if (viewersListenerStarted) {
    return;
  }


  viewersListenerStarted = true;


  onChildAdded(
    ref(
      database,
      "pandal/viewers"
    ),

    snapshot => {

      if (
        !broadcasting
      ) {

        return;

      }


      const viewerId =
        snapshot.key;


      if (
        peerConnections.has(
          viewerId
        )
      ) {

        return;

      }


      createViewerConnection(
        viewerId
      )
      .catch(
        error =>
          console.error(
            "Peer creation failed:",
            error
          )
      );

    }
  );

}


/* CREATE PEER */

async function createViewerConnection(
  viewerId
) {

  if (!localStream) {
    return;
  }


  const peer =
    new RTCPeerConnection({

      iceServers: [

        {
          urls:
            "stun:stun.l.google.com:19302"
        }

      ]

    });


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
    event => {

      if (
        event.candidate
      ) {

        push(
          ref(
            database,
            `pandal/signals/${viewerId}/broadcasterCandidates`
          ),
          event.candidate.toJSON()
        );

      }

    };


  peer.onconnectionstatechange =
    () => {

      const state =
        peer.connectionState;


      if (
        [
          "failed",
          "closed",
          "disconnected"
        ].includes(state)
      ) {

        closePeer(
          viewerId
        );

      }

    };


  onChildAdded(
    ref(
      database,
      `pandal/signals/${viewerId}/viewerCandidates`
    ),

    snapshot => {

      peer
        .addIceCandidate(
          snapshot.val()
        )
        .catch(
          () => {}
        );

    }
  );


  const offer =
    await peer.createOffer();


  await peer.setLocalDescription(
    offer
  );


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


  onValue(
    ref(
      database,
      `pandal/signals/${viewerId}/answer`
    ),

    async snapshot => {

      const answer =
        snapshot.val();


      if (
        !answer ||
        peer.signalingState ===
        "stable"
      ) {

        return;

      }


      try {

        await peer
          .setRemoteDescription(
            answer
          );

      }

      catch (error) {

        console.error(
          "Answer error:",
          error
        );

      }

    }
  );


  viewerListeners.set(
    viewerId,
    true
  );

}


/* CLOSE PEER */

async function closePeer(
  viewerId
) {

  const peer =
    peerConnections.get(
      viewerId
    );


  if (peer) {

    peer.close();

  }


  peerConnections.delete(
    viewerId
  );


  await set(
    ref(
      database,
      `pandal/signals/${viewerId}/closed`
    ),
    true
  )
  .catch(
    () => {}
  );


  await remove(
    ref(
      database,
      `pandal/signals/${viewerId}`
    )
  )
  .catch(
    () => {}
  );

}


/* STOP BROADCAST */

async function stopBroadcast() {

  broadcasting = false;


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

  }


  localStream = null;


  $("#preview")
    .srcObject =
    null;


  $("#broadcastStatus")
    .textContent =
    "Offline";


  $("#broadcastMessage")
    .textContent =
    "Broadcast stopped.";


  const ids =
    Array.from(
      peerConnections.keys()
    );


  for (
    const viewerId of ids
  ) {

    await closePeer(
      viewerId
    );

  }

}
