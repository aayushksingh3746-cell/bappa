/* =========================================================
   GANPATI PANDAL — ADMIN.JS
   Firebase + Authentication + RTDB + Native WebRTC
========================================================= */


/* =========================================================
   1. PRELOADER
   IMPORTANT:
   This runs BEFORE Firebase initialization.
   Firebase can never keep the preloader stuck.
========================================================= */

(function () {

  let hidden = false;

  function hidePreloader() {

    if (hidden) return;
    hidden = true;

    const preloader = document.getElementById("preloader");

    if (!preloader) return;

    preloader.style.opacity = "0";
    preloader.style.visibility = "hidden";
    preloader.style.pointerEvents = "none";

    setTimeout(() => {

      if (preloader && preloader.parentNode) {
        preloader.parentNode.removeChild(preloader);
      }

    }, 700);
  }


  /* Normal page load */
  if (document.readyState === "complete") {

    setTimeout(hidePreloader, 300);

  } else {

    window.addEventListener("load", () => {
      setTimeout(hidePreloader, 300);
    });

  }


  /* Absolute fallback */
  setTimeout(hidePreloader, 2500);

})();


/* =========================================================
   2. FIREBASE IMPORTS
========================================================= */

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
  get,
  push,
  remove,
  onValue,
  onChildAdded,
  onChildRemoved,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* =========================================================
   3. FIREBASE CONFIG
========================================================= */

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


/* =========================================================
   4. INITIALIZE FIREBASE
========================================================= */

let app;
let auth;
let database;

try {

  app = initializeApp(firebaseConfig);

  auth = getAuth(app);

  database = getDatabase(app);

  console.log("Firebase initialized successfully.");

} catch (error) {

  console.error(
    "Firebase initialization failed:",
    error
  );

}


/* =========================================================
   5. DOM HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   6. MAIN ELEMENTS
========================================================= */

const loginPanel =
  $("loginPanel");

const loginForm =
  $("loginForm");

const emailInput =
  $("email");

const passwordInput =
  $("password");

const loginStatus =
  $("loginStatus");

const dashboard =
  $("dashboard");

const logoutBtn =
  $("logoutBtn");

const connectionState =
  $("connectionState");


/* =========================================================
   7. LOGIN
========================================================= */

if (loginForm) {

  loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    if (!auth) {

      if (loginStatus) {
        loginStatus.textContent =
          "Firebase could not be initialized.";
      }

      return;
    }


    const email =
      emailInput
        ? emailInput.value.trim()
        : "";

    const password =
      passwordInput
        ? passwordInput.value
        : "";


    if (!email || !password) {

      if (loginStatus) {
        loginStatus.textContent =
          "Enter your email and password.";
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
          "Login successful.";
      }

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      if (loginStatus) {

        let message =
          "Login failed.";

        if (
          error.code ===
          "auth/invalid-credential"
        ) {
          message =
            "Invalid email or password.";
        }

        else if (
          error.code ===
          "auth/user-not-found"
        ) {
          message =
            "User account not found.";
        }

        else if (
          error.code ===
          "auth/wrong-password"
        ) {
          message =
            "Incorrect password.";
        }

        else if (
          error.code ===
          "auth/too-many-requests"
        ) {
          message =
            "Too many attempts. Try again later.";
        }

        else {
          message =
            error.message;
        }

        loginStatus.textContent =
          message;
      }

    }

  });

}


/* =========================================================
   8. LOGOUT
========================================================= */

if (logoutBtn) {

  logoutBtn.addEventListener("click", async function () {

    if (!auth) return;

    try {

      await signOut(auth);

      console.log("Logged out.");

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  });

}


/* =========================================================
   9. AUTH STATE
========================================================= */

if (auth) {

  onAuthStateChanged(
    auth,
    function (user) {

      if (user) {

        console.log(
          "Admin logged in:",
          user.email
        );


        if (loginPanel) {
          loginPanel.style.display =
            "none";
        }


        if (dashboard) {
          dashboard.style.display =
            "block";
        }


        startAdminFunctions();

      }

      else {

        console.log(
          "No admin logged in."
        );


        if (loginPanel) {
          loginPanel.style.display =
            "block";
        }


        if (dashboard) {
          dashboard.style.display =
            "none";
        }

      }

    }
  );

}


/* =========================================================
   10. FIREBASE CONNECTION STATUS
========================================================= */

function monitorConnection() {

  if (!database) return;

  const connectedRef =
    ref(database, ".info/connected");


  onValue(
    connectedRef,
    function (snapshot) {

      const connected =
        snapshot.val() === true;


      if (connectionState) {

        connectionState.textContent =
          connected
            ? "Firebase Connected"
            : "Firebase Offline";

        connectionState.classList.toggle(
          "online",
          connected
        );

        connectionState.classList.toggle(
          "offline",
          !connected
        );

      }

    },
    function (error) {

      console.error(
        "Connection monitor error:",
        error
      );

      if (connectionState) {
        connectionState.textContent =
          "Connection Error";
      }

    }
  );

}


/* =========================================================
   11. ADMIN PRAYER WALL
========================================================= */

const adminPrayers =
  $("adminPrayers");


const prayersMap =
  new Map();


function createPrayerElement(
  id,
  prayer
) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "admin-prayer-item";

  wrapper.dataset.id =
    id;


  const text =
    document.createElement("div");

  text.className =
    "admin-prayer-text";

  text.textContent =
    prayer.text || "";


  const meta =
    document.createElement("div");

  meta.className =
    "admin-prayer-meta";


  if (prayer.createdAt) {

    try {

      meta.textContent =
        new Date(
          prayer.createdAt
        ).toLocaleString(
          "en-IN"
        );

    } catch {

      meta.textContent =
        "";

    }

  }


  const deleteButton =
    document.createElement("button");

  deleteButton.type =
    "button";

  deleteButton.textContent =
    "Delete";

  deleteButton.className =
    "delete-prayer";


  deleteButton.addEventListener(
    "click",
    async function () {

      const confirmed =
        confirm(
          "Delete this Sankalp?"
        );

      if (!confirmed) return;


      try {

        await remove(
          ref(
            database,
            "pandal/prayers_wall/" + id
          )
        );

      } catch (error) {

        console.error(
          "Prayer delete error:",
          error
        );

        alert(
          "Could not delete prayer."
        );

      }

    }
  );


  wrapper.appendChild(text);

  wrapper.appendChild(meta);

  wrapper.appendChild(deleteButton);


  return wrapper;
}


function loadPrayers() {

  if (!database) return;

  if (!adminPrayers) return;


  adminPrayers.innerHTML =
    "";


  const prayersRef =
    ref(
      database,
      "pandal/prayers_wall"
    );


  onChildAdded(
    prayersRef,
    function (snapshot) {

      const id =
        snapshot.key;

      const prayer =
        snapshot.val();


      prayersMap.set(
        id,
        prayer
      );


      const element =
        createPrayerElement(
          id,
          prayer
        );


      adminPrayers.prepend(
        element
      );

    },
    function (error) {

      console.error(
        "Prayer listener error:",
        error
      );

      adminPrayers.textContent =
        "Unable to load prayers.";

    }
  );


  onChildRemoved(
    prayersRef,
    function (snapshot) {

      const id =
        snapshot.key;


      prayersMap.delete(
        id
      );


      const element =
        adminPrayers.querySelector(
          `[data-id="${id}"]`
        );


      if (element) {
        element.remove();
      }

    }
  );

}


/* =========================================================
   12. ANNOUNCEMENTS
========================================================= */

const announcementForm =
  $("announcementForm");

const announcementTitle =
  $("announcementTitle");

const announcementText =
  $("announcementText");

const announcementStatus =
  $("announcementStatus");


if (announcementForm) {

  announcementForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      if (!database) {

        if (announcementStatus) {
          announcementStatus.textContent =
            "Firebase is unavailable.";
        }

        return;
      }


      const title =
        announcementTitle
          ? announcementTitle.value.trim()
          : "";

      const message =
        announcementText
          ? announcementText.value.trim()
          : "";


      if (!title || !message) {

        if (announcementStatus) {
          announcementStatus.textContent =
            "Enter both title and message.";
        }

        return;
      }


      const user =
        auth
          ? auth.currentUser
          : null;


      if (!user) {

        if (announcementStatus) {
          announcementStatus.textContent =
            "Please login again.";
        }

        return;
      }


      if (announcementStatus) {
        announcementStatus.textContent =
          "Publishing...";
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

            title:
              title,

            message:
              message,

            createdAt:
              Date.now(),

            author:
              user.email || "Admin"

          }
        );


        if (announcementTitle) {
          announcementTitle.value =
            "";
        }


        if (announcementText) {
          announcementText.value =
            "";
        }


        if (announcementStatus) {
          announcementStatus.textContent =
            "Announcement published successfully.";
        }


      } catch (error) {

        console.error(
          "Announcement error:",
          error
        );


        if (announcementStatus) {
          announcementStatus.textContent =
            "Could not publish announcement.";
        }

      }

    }
  );

}


/* =========================================================
   13. BROADCAST ELEMENTS
========================================================= */

const broadcastStatus =
  $("broadcastStatus");

const preview =
  $("preview");

const startBroadcastButton =
  $("startBroadcast");

const stopBroadcastButton =
  $("stopBroadcast");

const broadcastMessage =
  $("broadcastMessage");


/* =========================================================
   14. WEBRTC VARIABLES
========================================================= */

let localStream =
  null;

let broadcasting =
  false;

let viewersListenerStarted =
  false;

const peerConnections =
  new Map();


const rtcConfiguration = {

  iceServers: [

    {
      urls:
        "stun:stun.l.google.com:19302"
    },

    {
      urls:
        "stun:stun1.l.google.com:19302"
    }

  ]

};


/* =========================================================
   15. BROADCAST STATUS
========================================================= */

function loadBroadcastStatus() {

  if (!database) return;


  const broadcastRef =
    ref(
      database,
      "pandal/broadcast"
    );


  onValue(
    broadcastRef,
    function (snapshot) {

      const data =
        snapshot.val();


      const active =
        data &&
        data.active === true;


      if (broadcastStatus) {

        broadcastStatus.textContent =
          active
            ? "LIVE"
            : "OFFLINE";

        broadcastStatus.classList.toggle(
          "live",
          active
        );

      }


      if (
        startBroadcastButton
      ) {

        startBroadcastButton.disabled =
          active;

      }


      if (
        stopBroadcastButton
      ) {

        stopBroadcastButton.disabled =
          !active;

      }

    },
    function (error) {

      console.error(
        "Broadcast status error:",
        error
      );

    }
  );

}


/* =========================================================
   16. CREATE WEBRTC PEER
========================================================= */

async function createBroadcasterPeer(
  viewerId
) {

  if (
    peerConnections.has(
      viewerId
    )
  ) {

    return peerConnections.get(
      viewerId
    );

  }


  const pc =
    new RTCPeerConnection(
      rtcConfiguration
    );


  peerConnections.set(
    viewerId,
    pc
  );


  /* Add camera/microphone */
  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track => {

          pc.addTrack(
            track,
            localStream
          );

        }
      );

  }


  /* ICE candidates generated by broadcaster */

  pc.onicecandidate =
    async function (event) {

      if (!event.candidate)
        return;


      try {

        const candidateRef =
          push(
            ref(
              database,
              "pandal/signals/" +
              viewerId +
              "/broadcasterCandidates"
            )
          );


        await set(
          candidateRef,
          event.candidate.toJSON()
        );

      } catch (error) {

        console.error(
          "Broadcaster ICE error:",
          error
        );

      }

    };


  /* Connection state */

  pc.onconnectionstatechange =
    function () {

      console.log(
        "Viewer",
        viewerId,
        "state:",
        pc.connectionState
      );


      if (
        pc.connectionState ===
          "failed" ||
        pc.connectionState ===
          "closed" ||
        pc.connectionState ===
          "disconnected"
      ) {

        closeViewer(
          viewerId
        );

      }

    };


  /* Create offer */

  const offer =
    await pc.createOffer();


  await pc.setLocalDescription(
    offer
  );


  await set(
    ref(
      database,
      "pandal/signals/" +
      viewerId +
      "/offer"
    ),
    {
      type:
        offer.type,

      sdp:
        offer.sdp
    }
  );


  /* Listen for answer */

  onValue(
    ref(
      database,
      "pandal/signals/" +
      viewerId +
      "/answer"
    ),
    async function (snapshot) {

      const answer =
        snapshot.val();


      if (
        !answer ||
        pc.currentRemoteDescription
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
          "Remote answer error:",
          error
        );

      }

    }
  );


  /* Viewer ICE candidates */

  onChildAdded(
    ref(
      database,
      "pandal/signals/" +
      viewerId +
      "/viewerCandidates"
    ),
    async function (snapshot) {

      const candidate =
        snapshot.val();


      if (!candidate) return;


      try {

        await pc.addIceCandidate(
          new RTCIceCandidate(
            candidate
          )
        );

      } catch (error) {

        console.error(
          "Viewer ICE candidate error:",
          error
        );

      }

    }
  );


  return pc;

}


/* =========================================================
   17. CLOSE VIEWER
========================================================= */

async function closeViewer(
  viewerId
) {

  const pc =
    peerConnections.get(
      viewerId
    );


  if (pc) {

    try {
      pc.close();
    } catch {}

    peerConnections.delete(
      viewerId
    );

  }


  if (!database) return;


  try {

    await set(
      ref(
        database,
        "pandal/signals/" +
        viewerId +
        "/closed"
      ),
      true
    );

  } catch (error) {

    console.error(
      "Viewer close signal error:",
      error
    );

  }

}


/* =========================================================
   18. LISTEN FOR VIEWERS
========================================================= */

function listenForViewers() {

  if (!database) return;

  if (viewersListenerStarted)
    return;

  viewersListenerStarted =
    true;


  const viewersRef =
    ref(
      database,
      "pandal/viewers"
    );


  onChildAdded(
    viewersRef,
    async function (snapshot) {

      if (!broadcasting)
        return;


      const viewerId =
        snapshot.key;


      if (!viewerId)
        return;


      console.log(
        "New viewer:",
        viewerId
      );


      try {

        await createBroadcasterPeer(
          viewerId
        );

      } catch (error) {

        console.error(
          "Could not create viewer peer:",
          error
        );

      }

    },
    function (error) {

      console.error(
        "Viewer listener error:",
        error
      );

    }
  );


  onChildRemoved(
    viewersRef,
    function (snapshot) {

      const viewerId =
        snapshot.key;


      closeViewer(
        viewerId
      );

    }
  );

}


/* =========================================================
   19. START BROADCAST
========================================================= */

async function startBroadcast() {

  if (broadcasting)
    return;


  if (!database) {

    showBroadcastMessage(
      "Firebase is not available."
    );

    return;
  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    showBroadcastMessage(
      "Camera access is not supported in this browser."
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
          facingMode:
            "environment",

          width: {
            ideal: 1280
          },

          height: {
            ideal: 720
          }
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

      try {
        await preview.play();
      } catch {}

    }


    broadcasting =
      true;


    if (broadcastStatus) {

      broadcastStatus.textContent =
        "LIVE";

      broadcastStatus.classList.add(
        "live"
      );

    }


    if (startBroadcastButton) {
      startBroadcastButton.disabled =
        true;
    }


    if (stopBroadcastButton) {
      stopBroadcastButton.disabled =
        false;
    }


    await set(
      ref(
        database,
        "pandal/broadcast"
      ),
      {

        active:
          true,

        startedAt:
          serverTimestamp()

      }
    );


    viewersListenerStarted =
      false;


    listenForViewers();


    showBroadcastMessage(
      "Live Darshan is now LIVE."
    );


    console.log(
      "Broadcast started."
    );


  } catch (error) {

    console.error(
      "Broadcast start error:",
      error
    );


    broadcasting =
      false;


    if (localStream) {

      localStream
        .getTracks()
        .forEach(
          track =>
            track.stop()
        );

      localStream =
        null;

    }


    if (preview) {
      preview.srcObject =
        null;
    }


    if (error.name ===
      "NotAllowedError") {

      showBroadcastMessage(
        "Camera/microphone permission was denied."
      );

    }

    else if (
      error.name ===
      "NotFoundError"
    ) {

      showBroadcastMessage(
        "Camera or microphone was not found."
      );

    }

    else {

      showBroadcastMessage(
        "Could not start broadcast: " +
        error.message
      );

    }

  }

}


/* =========================================================
   20. STOP BROADCAST
========================================================= */

async function stopBroadcast() {

  if (!database)
    return;


  broadcasting =
    false;


  /* Stop camera and microphone */

  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

    localStream =
      null;

  }


  if (preview) {
    preview.srcObject =
      null;
  }


  /* Close all peers */

  for (
    const [
      viewerId,
      pc
    ] of peerConnections
  ) {

    try {
      pc.close();
    } catch {}


    try {

      await set(
        ref(
          database,
          "pandal/signals/" +
          viewerId +
          "/closed"
        ),
        true
      );

    } catch {}

  }


  peerConnections.clear();


  try {

    await set(
      ref(
        database,
        "pandal/broadcast"
      ),
      {

        active:
          false,

        closed:
          true,

        stoppedAt:
          serverTimestamp()

      }
    );


    if (broadcastStatus) {

      broadcastStatus.textContent =
        "OFFLINE";

      broadcastStatus.classList.remove(
        "live"
      );

    }


    if (startBroadcastButton) {
      startBroadcastButton.disabled =
        false;
    }


    if (stopBroadcastButton) {
      stopBroadcastButton.disabled =
        true;
    }


    showBroadcastMessage(
      "Live Darshan stopped."
    );


    console.log(
      "Broadcast stopped."
    );


  } catch (error) {

    console.error(
      "Broadcast stop error:",
      error
    );


    showBroadcastMessage(
      "Broadcast stopped locally, but Firebase update failed."
    );

  }

}


/* =========================================================
   21. BROADCAST MESSAGE
========================================================= */

function showBroadcastMessage(
  message
) {

  if (broadcastMessage) {

    broadcastMessage.textContent =
      message;

  }

}


/* =========================================================
   22. BUTTON EVENTS
========================================================= */

if (startBroadcastButton) {

  startBroadcastButton.addEventListener(
    "click",
    startBroadcast
  );

}


if (stopBroadcastButton) {

  stopBroadcastButton.addEventListener(
    "click",
    stopBroadcast
  );

}


/* =========================================================
   23. ADMIN INITIALIZATION
========================================================= */

let adminStarted =
  false;


function startAdminFunctions() {

  if (adminStarted)
    return;

  adminStarted =
    true;


  console.log(
    "Starting admin dashboard..."
  );


  monitorConnection();

  loadPrayers();

  loadBroadcastStatus();


  console.log(
    "Admin dashboard ready."
  );

}


/* =========================================================
   24. GLOBAL ERROR PROTECTION
   Firebase/WebRTC errors must NOT affect preloader.
========================================================= */

window.addEventListener(
  "error",
  function (event) {

    console.error(
      "Admin JavaScript error:",
      event.error || event.message
    );

  }
);


window.addEventListener(
  "unhandledrejection",
  function (event) {

    console.error(
      "Unhandled promise rejection:",
      event.reason
    );

  }
);


console.log(
  "GANPATI ADMIN.JS LOADED"
);
