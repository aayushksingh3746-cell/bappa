// ============================================================
// GANPATI PANDAL — PUBLIC DIGITAL DARSHAN
// Firebase + Sankalp + Announcements + Aarti + WebRTC Viewer
// ============================================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  remove
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

const db = getDatabase(app);


// ============================================================
// DOM
// ============================================================

const preloader =
  document.getElementById("preloader");

const liveVideo =
  document.getElementById("liveVideo");

const activeStreamUI =
  document.getElementById("active-stream-ui");

const offlineStreamUI =
  document.getElementById("offline-stream-ui");

const prayerForm =
  document.getElementById("prayerForm");

const prayerInput =
  document.getElementById("prayerInput");

const prayerStatus =
  document.getElementById("prayerStatus");

const prayerWall =
  document.getElementById("prayerWall");

const heroSankalp =
  document.getElementById("heroSankalp");

const pushpanjali =
  document.getElementById("pushpanjali");

const announcements =
  document.getElementById("announcements");

const petalCanvas =
  document.getElementById("petalCanvas");


// ============================================================
// WEBRTC CONFIG
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
// WEBRTC STATE
// ============================================================

let viewerId = null;

let sessionId = null;

let currentBroadcastId = null;

let peerConnection = null;

let viewerCandidatesUnsubscribe = null;

let broadcasterCandidatesUnsubscribe = null;

let offerUnsubscribe = null;

let answerUnsubscribe = null;

let closedUnsubscribe = null;

let broadcastUnsubscribe = null;

let viewerDisconnectRef = null;

let remoteStream = null;

let pendingRemoteCandidates = [];

let remoteDescriptionReady = false;

let viewerStarted = false;

let viewerClosing = false;


// ============================================================
// GENERAL HELPERS
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
  return (
    prefix +
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
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
// SMOOTH HERO SANKALP BUTTON
// ============================================================

heroSankalp?.addEventListener(
  "click",
  () => {

    const section =
      document.getElementById("sankalp");

    if (!section) return;

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    setTimeout(() => {

      prayerInput?.focus();

    }, 700);

  }
);


// ============================================================
// SANKALP SUBMISSION
// ============================================================

prayerForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const text =
      prayerInput?.value.trim();

    if (!text) {

      setStatus(
        prayerStatus,
        "Please write your Sankalp.",
        "error"
      );

      return;
    }


    if (text.length > 50) {

      setStatus(
        prayerStatus,
        "Sankalp must be 50 characters or less.",
        "error"
      );

      return;
    }


    const submitButton =
      prayerForm.querySelector(
        'button[type="submit"]'
      );


    if (submitButton) {
      submitButton.disabled = true;
    }


    setStatus(
      prayerStatus,
      "Offering your Sankalp..."
    );


    try {

      const prayersRef =
        ref(
          db,
          "pandal/prayers_wall"
        );


      const prayerRef =
        push(prayersRef);


      await set(
        prayerRef,
        {
          text,
          createdAt: Date.now()
        }
      );


      if (prayerInput) {
        prayerInput.value = "";
      }


      setStatus(
        prayerStatus,
        "Your Sankalp has been offered. Ganpati Bappa Morya!",
        "success"
      );


    } catch (error) {

      console.error(
        "Sankalp error:",
        error
      );


      setStatus(
        prayerStatus,
        "Could not submit your Sankalp. Please try again.",
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
// SANKALP WALL
// ============================================================

function listenToPrayerWall() {

  const prayersRef =
    ref(
      db,
      "pandal/prayers_wall"
    );


  onValue(
    prayersRef,
    snapshot => {

      if (!prayerWall) return;


      const data =
        snapshot.val();


      if (!data) {

        prayerWall.innerHTML = `
          <div class="prayer-item">
            <strong>Be the first to offer a Sankalp.</strong>
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


      prayerWall.innerHTML =
        prayers
          .map(
            prayer => `
              <div class="prayer-item">

                <div class="prayer-item-content">

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
        "Sankalp wall error:",
        error
      );

      if (prayerWall) {

        prayerWall.innerHTML = `
          <div class="prayer-item">
            Unable to load Sankalps.
          </div>
        `;

      }

    }
  );
}


listenToPrayerWall();


// ============================================================
// ANNOUNCEMENTS
// ============================================================

function listenToAnnouncements() {

  if (!announcements) {
    return;
  }


  const announcementsRef =
    ref(
      db,
      "pandal/announcements"
    );


  onValue(
    announcementsRef,
    snapshot => {

      const data =
        snapshot.val();


      if (!data) {

        announcements.innerHTML = `
          <p class="form-status">
            No announcements yet.
          </p>
        `;

        return;
      }


      const items =
        Object.entries(data)
          .map(
            ([id, announcement]) => ({
              id,
              ...announcement
            })
          )
          .filter(
            item =>
              item &&
              typeof item.title === "string" &&
              typeof item.message === "string"
          )
          .sort(
            (a, b) =>
              (b.createdAt || 0) -
              (a.createdAt || 0)
          )
          .slice(0, 20);


      if (!items.length) {

        announcements.innerHTML = `
          <p class="form-status">
            No announcements yet.
          </p>
        `;

        return;
      }


      announcements.innerHTML =
        items
          .map(
            item => `
              <article class="announcement-item">

                <div class="announcement-meta">
                  ${escapeHTML(
                    formatDate(
                      item.createdAt
                    )
                  )}
                </div>

                <h3>
                  ${escapeHTML(item.title)}
                </h3>

                <p>
                  ${escapeHTML(item.message)}
                </p>

              </article>
            `
          )
          .join("");

    },
    error => {

      console.error(
        "Announcement listener error:",
        error
      );

      announcements.innerHTML = `
        <p class="form-status">
          Unable to load announcements.
        </p>
      `;

    }
  );
}


listenToAnnouncements();


// ============================================================
// LIVE DARSHAN UI
// ============================================================

function showOfflineDarshan() {

  hide(activeStreamUI);
  show(offlineStreamUI);

  if (liveVideo) {

    liveVideo.pause();

    liveVideo.srcObject = null;

  }

}


function showLiveDarshan() {

  show(activeStreamUI);
  hide(offlineStreamUI);

}


// ============================================================
// BROADCAST LISTENER
// ============================================================

function listenToBroadcast() {

  const broadcastRef =
    ref(
      db,
      "pandal/broadcast"
    );


  broadcastUnsubscribe =
    onValue(
      broadcastRef,
      async snapshot => {

        const broadcast =
          snapshot.val();


        if (
          !broadcast ||
          broadcast.active !== true ||
          !broadcast.broadcastId
        ) {

          console.log(
            "Live Darshan is offline."
          );


          showOfflineDarshan();


          await cleanupViewer();

          return;
        }


        console.log(
          "Live Darshan detected:",
          broadcast.broadcastId
        );


        showLiveDarshan();


        // ------------------------------------------------------
        // Same broadcast?
        // ------------------------------------------------------

        if (
          viewerStarted &&
          currentBroadcastId ===
            broadcast.broadcastId
        ) {

          return;
        }


        // ------------------------------------------------------
        // A new broadcast started.
        // ------------------------------------------------------

        await cleanupViewer();


        currentBroadcastId =
          broadcast.broadcastId;


        await startViewer(
          currentBroadcastId
        );

      },
      error => {

        console.error(
          "Broadcast listener error:",
          error
        );

        showOfflineDarshan();

      }
    );
}


listenToBroadcast();


// ============================================================
// START VIEWER
// ============================================================

async function startViewer(
  broadcastId
) {

  if (
    viewerStarted ||
    viewerClosing
  ) {
    return;
  }


  viewerStarted =
    true;


  viewerId =
    generateId("viewer-");


  sessionId =
    generateId("session-");


  currentBroadcastId =
    broadcastId;


  remoteDescriptionReady =
    false;


  pendingRemoteCandidates =
    [];


  console.log(
    "Starting viewer:",
    viewerId,
    sessionId
  );


  const signalBase =
    `pandal/signals/${viewerId}/${sessionId}`;


  const viewerRef =
    ref(
      db,
      `pandal/viewers/${viewerId}`
    );


  const offerRef =
    ref(
      db,
      `${signalBase}/offer`
    );


  const answerRef =
    ref(
      db,
      `${signalBase}/answer`
    );


  const viewerCandidatesRef =
    ref(
      db,
      `${signalBase}/viewerCandidates`
    );


  const broadcasterCandidatesRef =
    ref(
      db,
      `${signalBase}/broadcasterCandidates`
    );


  const closedRef =
    ref(
      db,
      `${signalBase}/closed`
    );


  viewerDisconnectRef =
    viewerRef;


  try {

    // --------------------------------------------------------
    // Tell admin that a viewer exists.
    // --------------------------------------------------------

    await set(
      viewerRef,
      {
        active: true,
        broadcastId,
        sessionId,
        createdAt: Date.now()
      }
    );


    // --------------------------------------------------------
    // Automatically deactivate viewer if browser disconnects.
    // --------------------------------------------------------

    const { onDisconnect } =
      await import(
        "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js"
      );


    await onDisconnect(
      viewerRef
    ).update({
      active: false
    });


    // --------------------------------------------------------
    // Create WebRTC peer.
    // --------------------------------------------------------

    peerConnection =
      new RTCPeerConnection(
        RTC_CONFIGURATION
      );


    // ========================================================
    // IMPORTANT FIX:
    // RECEIVE VIDEO/AUDIO FROM ADMIN
    // ========================================================

    peerConnection.ontrack =
      event => {

        console.log(
          "WebRTC remote track received:",
          event.track.kind
        );


        // ------------------------------------------------------
        // Prefer the MediaStream supplied by WebRTC.
        // ------------------------------------------------------

        if (
          event.streams &&
          event.streams.length > 0
        ) {

          remoteStream =
            event.streams[0];

        } else {

          // ----------------------------------------------------
          // Fallback: create our own MediaStream.
          // ----------------------------------------------------

          if (!remoteStream) {
            remoteStream =
              new MediaStream();
          }

          remoteStream.addTrack(
            event.track
          );
        }


        // ------------------------------------------------------
        // Attach stream to video element.
        // ------------------------------------------------------

        if (liveVideo) {

          if (
            liveVideo.srcObject !==
            remoteStream
          ) {

            liveVideo.srcObject =
              remoteStream;
          }


          liveVideo.autoplay =
            true;

          liveVideo.playsInline =
            true;


          // Important:
          // muted allows autoplay on mobile browsers.
          liveVideo.muted =
            true;


          liveVideo.play()
            .then(() => {

              console.log(
                "Live video is playing."
              );

              // Try to restore audio after playback.
              setTimeout(() => {

                if (
                  liveVideo &&
                  liveVideo.srcObject ===
                    remoteStream
                ) {

                  liveVideo.muted =
                    false;

                }

              }, 1000);

            })
            .catch(error => {

              console.warn(
                "Autoplay blocked:",
                error
              );

            });

        }

      };


    // ========================================================
    // ICE FROM VIEWER
    // ========================================================

    peerConnection.onicecandidate =
      async event => {

        if (
          !event.candidate ||
          viewerClosing
        ) {
          return;
        }


        try {

          await push(
            viewerCandidatesRef,
            event.candidate.toJSON()
          );

        } catch (error) {

          console.error(
            "Viewer ICE error:",
            error
          );

        }

      };


    // ========================================================
    // CONNECTION STATE
    // ========================================================

    peerConnection.onconnectionstatechange =
      () => {

        if (
          !peerConnection ||
          viewerClosing
        ) {
          return;
        }


        const state =
          peerConnection.connectionState;


        console.log(
          "Viewer connection state:",
          state
        );


        if (
          state === "connected"
        ) {

          showLiveDarshan();

          console.log(
            "LIVE DARSHAN CONNECTED"
          );

        }


        if (
          state === "failed"
        ) {

          console.warn(
            "WebRTC connection failed."
          );


          // Allow broadcast listener to
          // establish a new session.
          cleanupViewer()
            .catch(console.error);

        }


        if (
          state === "closed"
        ) {

          cleanupViewer()
            .catch(console.error);

        }

      };


    // ========================================================
    // ICE CONNECTION STATE
    // ========================================================

    peerConnection.oniceconnectionstatechange =
      () => {

        if (!peerConnection) {
          return;
        }


        console.log(
          "ICE state:",
          peerConnection.iceConnectionState
        );

      };


    // ========================================================
    // RECEIVE BROADCASTER ICE
    // ========================================================

    broadcasterCandidatesUnsubscribe =
      onChildAdded(
        broadcasterCandidatesRef,
        async snapshot => {

          if (
            viewerClosing ||
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

            // --------------------------------------------------
            // Candidate may arrive before answer.
            // Queue it.
            // --------------------------------------------------

            if (
              !remoteDescriptionReady
            ) {

              pendingRemoteCandidates.push(
                candidate
              );

              return;
            }


            await peerConnection.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );


          } catch (error) {

            console.warn(
              "Could not add broadcaster ICE:",
              error
            );

          }

        }
      );


    // ========================================================
    // RECEIVE ANSWER FROM ADMIN
    // ========================================================

    answerUnsubscribe =
      onValue(
        answerRef,
        async snapshot => {

          if (
            viewerClosing ||
            !snapshot.exists()
          ) {
            return;
          }


          const answer =
            snapshot.val();


          if (
            !answer ||
            answer.type !== "answer" ||
            !answer.sdp
          ) {

            return;
          }


          try {

            // --------------------------------------------------
            // Prevent duplicate answers.
            // --------------------------------------------------

            if (
              peerConnection
                .currentRemoteDescription
            ) {

              return;
            }


            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(
                answer
              )
            );


            remoteDescriptionReady =
              true;


            // --------------------------------------------------
            // Add ICE candidates that arrived early.
            // --------------------------------------------------

            const queuedCandidates =
              pendingRemoteCandidates;


            pendingRemoteCandidates =
              [];


            for (
              const candidate
              of queuedCandidates
            ) {

              try {

                await peerConnection.addIceCandidate(
                  new RTCIceCandidate(
                    candidate
                  )
                );

              } catch (error) {

                console.warn(
                  "Queued broadcaster ICE failed:",
                  error
                );

              }

            }


            console.log(
              "WebRTC answer applied."
            );


          } catch (error) {

            console.error(
              "Could not apply WebRTC answer:",
              error
            );


            await cleanupViewer();

          }

        }
      );


    // ========================================================
    // RECEIVE ADMIN CLOSED SIGNAL
    // ========================================================

    closedUnsubscribe =
      onValue(
        closedRef,
        async snapshot => {

          if (
            snapshot.val() === true
          ) {

            console.log(
              "Admin closed the live session."
            );


            await cleanupViewer();

          }

        }
      );


    // ========================================================
    // CREATE VIEWER OFFER
    // ========================================================

    const offer =
      await peerConnection.createOffer(
        {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        }
      );


    await peerConnection.setLocalDescription(
      offer
    );


    // --------------------------------------------------------
    // Send offer to admin.
    // --------------------------------------------------------

    await set(
      offerRef,
      {
        type:
          offer.type,
        sdp:
          offer.sdp
      }
    );


    console.log(
      "WebRTC viewer offer sent."
    );


  } catch (error) {

    console.error(
      "Viewer start error:",
      error
    );


    await cleanupViewer();

  }

}


// ============================================================
// CLEANUP VIEWER
// ============================================================

async function cleanupViewer() {

  if (viewerClosing) {
    return;
  }


  viewerClosing =
    true;


  console.log(
    "Cleaning up viewer..."
  );


  // ----------------------------------------------------------
  // Remove Firebase listeners
  // ----------------------------------------------------------

  if (
    broadcasterCandidatesUnsubscribe
  ) {

    broadcasterCandidatesUnsubscribe();

    broadcasterCandidatesUnsubscribe =
      null;
  }


  if (answerUnsubscribe) {

    answerUnsubscribe();

    answerUnsubscribe =
      null;
  }


  if (closedUnsubscribe) {

    closedUnsubscribe();

    closedUnsubscribe =
      null;
  }


  if (offerUnsubscribe) {

    offerUnsubscribe();

    offerUnsubscribe =
      null;
  }


  // ----------------------------------------------------------
  // Close WebRTC
  // ----------------------------------------------------------

  if (peerConnection) {

    try {

      peerConnection.ontrack =
        null;

      peerConnection.onicecandidate =
        null;

      peerConnection.onconnectionstatechange =
        null;

      peerConnection.oniceconnectionstatechange =
        null;

      peerConnection.close();

    } catch (error) {

      console.warn(
        "Peer close warning:",
        error
      );

    }

  }


  peerConnection =
    null;


  // ----------------------------------------------------------
  // Stop remote tracks
  // ----------------------------------------------------------

  if (remoteStream) {

    remoteStream
      .getTracks()
      .forEach(track => {

        try {
          track.stop();
        } catch (error) {
          console.warn(error);
        }

      });

  }


  remoteStream =
    null;


  if (liveVideo) {

    liveVideo.pause();

    liveVideo.srcObject =
      null;

  }


  // ----------------------------------------------------------
  // Remove viewer from Firebase
  // ----------------------------------------------------------

  if (viewerDisconnectRef) {

    try {

      await remove(
        viewerDisconnectRef
      );

    } catch (error) {

      console.warn(
        "Could not remove viewer:",
        error
      );

    }

  }


  viewerDisconnectRef =
    null;


  // ----------------------------------------------------------
  // Reset state
  // ----------------------------------------------------------

  viewerId =
    null;

  sessionId =
    null;

  currentBroadcastId =
    null;

  viewerStarted =
    false;

  pendingRemoteCandidates =
    [];

  remoteDescriptionReady =
    false;


  viewerClosing =
    false;

}


// ============================================================
// USER INTERACTION — ENABLE AUDIO
// ============================================================

function enableLiveAudio() {

  if (!liveVideo) {
    return;
  }


  if (
    liveVideo.srcObject
  ) {

    liveVideo.muted =
      false;

    liveVideo.volume =
      1;


    liveVideo.play()
      .catch(error => {

        console.warn(
          "Could not enable live audio:",
          error
        );

      });

  }

}


// ============================================================
// ENABLE AUDIO ON FIRST USER INTERACTION
// ============================================================

[
  "click",
  "touchstart",
  "pointerdown"
].forEach(eventName => {

  document.addEventListener(
    eventName,
    () => {

      enableLiveAudio();

    },
    {
      once: true,
      passive: true
    }
  );

});


// ============================================================
// LIVE VIDEO SAFETY SETTINGS
// ============================================================

if (liveVideo) {

  liveVideo.autoplay =
    true;

  liveVideo.playsInline =
    true;

  liveVideo.setAttribute(
    "playsinline",
    ""
  );

  liveVideo.setAttribute(
    "webkit-playsinline",
    ""
  );

}


// ============================================================
// AARTI PLAYER
// ============================================================

const aartiAudio =
  document.getElementById("aartiAudio");

const trackTitle =
  document.getElementById("trackTitle");

const trackNumber =
  document.getElementById("trackNumber");

const playPause =
  document.getElementById("playPause");

const playIcon =
  document.getElementById("playIcon");

const progress =
  document.getElementById("progress");

const currentTime =
  document.getElementById("currentTime");

const duration =
  document.getElementById("duration");

const trackList =
  document.getElementById("trackList");


// ============================================================
// AARTI TRACKS
// ============================================================

const aartiTracks = [

  {
    title: "Sukhkarta Dukhharta",
    src: "./assets/Keshav_Kumar_-_Sukhkarta_Dukhharta_(mp3.pm).mp3",
    category: "Traditional Aarti"
  },

  {
    title: "Jai Ganesh Jai Ganesh Deva",
    src: "./assets/Kumar_Vishu_Vandana_Vajpai_-_Jai_Ganesh_Jai_Ganesh_Deva_(mp3.pm).mp3",
    category: "Traditional Aarti"
  },

  {
    title: "Shendur Laal Chadhayo",
    src: "./assets/Shendur Laal Chadhayo Aarti 128 Kbps.mp3",
    category: "Traditional Aarti"
  },

  {
    title: "Shree Ganeshay Dheemahi",
    src: "./assets/Viruddh_-_Shree_Ganeshay_Dheemahi_(mp3.pm).mp3",
    category: "Traditional Aarti"
  },

  {
    title: "Gajanana",
    src: "./assets/Gajanana.mp3",
    category: "Festival Anthem"
  },

  {
    title: "Deva Ho Deva",
    src: "./assets/Ganpati Bappa Moriya Humse Badhkar Kaun 128 Kbps.mp3",
    category: "Festival Anthem"
  },

  {
    title: "Jalwa Mera Hi Jalwa",
    src: "./assets/Jalwa Mera Hi Jalwa Wanted 128 Kbps.mp3",
    category: "Festival Anthem"
  },

  {
    title: "Morya Re",
    src: "./assets/Maurya Re Don 2006 128 Kbps.mp3",
    category: "Festival Anthem"
  },

  {
    title: "Suno Ganpati Bappa Morya",
    src: "./assets/Suno Ganpati Bappa Morya Judwaa 2 128 Kbps.mp3",
    category: "Festival Anthem"
  }

];


let currentTrackIndex =
  0;


// ============================================================
// FORMAT AUDIO TIME
// ============================================================

function formatAudioTime(seconds) {

  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {

    return "0:00";

  }


  const minutes =
    Math.floor(
      seconds / 60
    );


  const secs =
    Math.floor(
      seconds % 60
    );


  return (
    minutes +
    ":" +
    String(secs).padStart(2, "0")
  );

}


// ============================================================
// LOAD TRACK
// ============================================================

function loadTrack(
  index,
  autoPlay = false
) {

  if (
    !aartiAudio ||
    !aartiTracks[index]
  ) {
    return;
  }


  currentTrackIndex =
    index;


  const track =
    aartiTracks[index];


  aartiAudio.src =
    track.src;


  aartiAudio.load();


  if (trackTitle) {

    trackTitle.textContent =
      track.title;

  }


  if (trackNumber) {

    trackNumber.textContent =
      String(index + 1).padStart(
        2,
        "0"
      );

  }


  if (progress) {

    progress.value =
      0;

  }


  if (currentTime) {

    currentTime.textContent =
      "0:00";

  }


  if (duration) {

    duration.textContent =
      "0:00";

  }


  updateTrackList();


  if (autoPlay) {

    aartiAudio.play()
      .catch(error => {

        console.warn(
          "Aarti autoplay blocked:",
          error
        );

      });

  }

}


// ============================================================
// RENDER TRACK LIST
// ============================================================

function renderTrackList() {

  if (!trackList) {
    return;
  }


  trackList.innerHTML =
    aartiTracks
      .map(
        (track, index) => `
          <button
            type="button"
            class="track-item ${
              index === currentTrackIndex
                ? "active"
                : ""
            }"
            data-track-index="${index}"
          >

            <span class="track-index">
              ${String(index + 1).padStart(2, "0")}
            </span>

            <span class="track-info">

              <strong>
                ${escapeHTML(track.title)}
              </strong>

              <small>
                ${escapeHTML(track.category)}
              </small>

            </span>

          </button>
        `
      )
      .join("");


  trackList
    .querySelectorAll(
      "[data-track-index]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const index =
            Number(
              button.dataset.trackIndex
            );


          loadTrack(
            index,
            true
          );

        }
      );

    });

}


function updateTrackList() {

  if (!trackList) {
    return;
  }


  trackList
    .querySelectorAll(
      "[data-track-index]"
    )
    .forEach(button => {

      const index =
        Number(
          button.dataset.trackIndex
        );


      button.classList.toggle(
        "active",
        index === currentTrackIndex
      );

    });

}


renderTrackList();

loadTrack(
  0,
  false
);


// ============================================================
// AARTI PLAY / PAUSE
// ============================================================

playPause?.addEventListener(
  "click",
  () => {

    if (!aartiAudio) {
      return;
    }


    if (
      aartiAudio.paused
    ) {

      aartiAudio.play()
        .catch(error => {

          console.warn(
            "Aarti play error:",
            error
          );

        });

    } else {

      aartiAudio.pause();

    }

  }
);


// ============================================================
// AARTI PLAY STATE
// ============================================================

aartiAudio?.addEventListener(
  "play",
  () => {

    if (playIcon) {

      playIcon.textContent =
        "❚❚";

    }

  }
);


aartiAudio?.addEventListener(
  "pause",
  () => {

    if (playIcon) {

      playIcon.textContent =
        "▶";

    }

  }
);


// ============================================================
// AARTI TIME UPDATE
// ============================================================

aartiAudio?.addEventListener(
  "timeupdate",
  () => {

    if (
      !aartiAudio.duration
    ) {
      return;
    }


    if (progress) {

      progress.value =
        (
          aartiAudio.currentTime /
          aartiAudio.duration
        ) * 100;

    }


    if (currentTime) {

      currentTime.textContent =
        formatAudioTime(
          aartiAudio.currentTime
        );

    }

  }
);


// ============================================================
// AARTI METADATA
// ============================================================

aartiAudio?.addEventListener(
  "loadedmetadata",
  () => {

    if (duration) {

      duration.textContent =
        formatAudioTime(
          aartiAudio.duration
        );

    }

  }
);


// ============================================================
// AARTI PROGRESS SEEK
// ============================================================

progress?.addEventListener(
  "input",
  () => {

    if (
      !aartiAudio ||
      !aartiAudio.duration
    ) {
      return;
    }


    const percentage =
      Number(
        progress.value
      );


    aartiAudio.currentTime =
      (
        percentage /
        100
      ) *
      aartiAudio.duration;

  }
);


// ============================================================
// AUTO NEXT TRACK
// ============================================================

aartiAudio?.addEventListener(
  "ended",
  () => {

    const nextIndex =
      (
        currentTrackIndex + 1
      ) %
      aartiTracks.length;


    loadTrack(
      nextIndex,
      true
    );

  }
);


// ============================================================
// PUSHpanjali / PETALS
// ============================================================

let petalAnimationRunning =
  false;


function startPetalAnimation() {

  if (
    !petalCanvas ||
    petalAnimationRunning
  ) {
    return;
  }


  const ctx =
    petalCanvas.getContext(
      "2d"
    );


  if (!ctx) {
    return;
  }


  const width =
    window.innerWidth;


  const height =
    window.innerHeight;


  petalCanvas.width =
    width;


  petalCanvas.height =
    height;


  const petals =
    Array.from(
      {
        length: 70
      },
      () => ({
        x:
          Math.random() *
          width,

        y:
          -20 -
          Math.random() *
          height * 0.3,

        size:
          4 +
          Math.random() * 7,

        speed:
          1.5 +
          Math.random() * 3,

        rotation:
          Math.random() *
          Math.PI *
          2,

        rotationSpeed:
          (
            Math.random() -
            0.5
          ) *
          0.08,

        drift:
          (
            Math.random() -
            0.5
          ) *
          1.2,

        opacity:
          0.6 +
          Math.random() *
          0.4
      })
    );


  petalAnimationRunning =
    true;


  const startTime =
    performance.now();


  function animate(now) {

    const elapsed =
      now -
      startTime;


    ctx.clearRect(
      0,
      0,
      width,
      height
    );


    petals.forEach(
      petal => {

        petal.y +=
          petal.speed;

        petal.x +=
          petal.drift;

        petal.rotation +=
          petal.rotationSpeed;


        ctx.save();


        ctx.translate(
          petal.x,
          petal.y
        );


        ctx.rotate(
          petal.rotation
        );


        ctx.globalAlpha =
          petal.opacity;


        ctx.beginPath();


        ctx.ellipse(
          0,
          0,
          petal.size,
          petal.size * 0.55,
          0,
          0,
          Math.PI * 2
        );


        ctx.fillStyle =
          "#CBA153";


        ctx.fill();


        ctx.restore();

      }
    );


    if (
      elapsed < 5000
    ) {

      requestAnimationFrame(
        animate
      );

    } else {

      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      petalAnimationRunning =
        false;

    }

  }


  requestAnimationFrame(
    animate
  );

}


pushpanjali?.addEventListener(
  "click",
  () => {

    const bell =
      document.getElementById(
        "bellAudio"
      );


    if (bell) {

      bell.currentTime =
        0;


      bell.play()
        .catch(() => {});

    }


    startPetalAnimation();

  }
);


// ============================================================
// RESIZE PETAL CANVAS
// ============================================================

window.addEventListener(
  "resize",
  () => {

    if (!petalCanvas) {
      return;
    }


    petalCanvas.width =
      window.innerWidth;

    petalCanvas.height =
      window.innerHeight;

  }
);


// ============================================================
// PAGE EXIT
// ============================================================

window.addEventListener(
  "pagehide",
  () => {

    cleanupViewer()
      .catch(() => {});

  }
);


// ============================================================
// INITIAL DARSHAN STATE
// ============================================================

showOfflineDarshan();


// ============================================================
// DEBUG INFORMATION
// ============================================================

console.log(
  "Ganpati Digital Darshan initialized."
);

console.log(
  "WebRTC viewer ready."
);


// ============================================================
// END
// ============================================================

One HTML change is important

Make sure your "index.html" video element is exactly like this:

:::writing{variant="standard" id="74106" title="Live Darshan video element"}

<div id="active-stream-ui" class="hidden">

  <div class="live-badge">
    <span></span>
    LIVE DARSHAN
  </div>

  <video
    id="liveVideo"
    autoplay
    playsinline
    webkit-playsinline
    muted
  ></video>

</div>

Do not use a "<source>" inside this video. The WebRTC "MediaStream" is attached directly by JavaScript.

Also make sure your CSS isn't hiding the video with something like "display:none", "opacity:0", or a zero height. A safe rule is:

#liveVideo {
  width: 100%;
  height: 100%;
  min-height: 420px;
  display: block;
  object-fit: cover;
  background: #000;
  border-radius: inherit;
}

With this setup, the flow is:

Admin camera → WebRTC track → Firebase signaling → Public viewer "ontrack" → "liveVideo.srcObject" → actual Live Darshan video.

If you still get a black screen after these two replacements, the next thing to check is the exact browser console error, because then we'll know whether it's a WebRTC negotiation issue, a Firebase signaling issue, or a browser autoplay issue.
