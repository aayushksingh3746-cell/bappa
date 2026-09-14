/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  remove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* =========================================================
   FIREBASE CONFIG
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


/* =========================================================
   INITIALIZE FIREBASE
========================================================= */

const app =
  initializeApp(firebaseConfig);

const database =
  getDatabase(app);

console.log("Firebase initialized");


/* =========================================================
   HELPER
========================================================= */

const $ = id =>
  document.getElementById(id);


/* =========================================================
   PRELOADER
========================================================= */

function hidePreloader() {

  const preloader =
    $("preloader");

  if (!preloader) return;

  preloader.classList.add("done");

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
  2500
);


/* =========================================================
   COUNTDOWN
========================================================= */

const countdown =
  $("countdown");


function updateCountdown() {

  if (!countdown) return;

  const target =
    new Date(
      "2026-09-24T00:00:00+05:30"
    ).getTime();

  const now =
    Date.now();

  const difference =
    target - now;


  if (difference <= 0) {

    countdown.innerHTML = `
      <div class="countdown-finished">
        Ganpati Bappa Pudhchya Varshi Lavkar Ya
      </div>
    `;

    return;
  }


  const days =
    Math.floor(
      difference /
      86400000
    );

  const hours =
    Math.floor(
      (difference / 3600000) % 24
    );

  const minutes =
    Math.floor(
      (difference / 60000) % 60
    );

  const seconds =
    Math.floor(
      (difference / 1000) % 60
    );


  if ($("days"))
    $("days").textContent =
      String(days).padStart(2, "0");

  if ($("hours"))
    $("hours").textContent =
      String(hours).padStart(2, "0");

  if ($("minutes"))
    $("minutes").textContent =
      String(minutes).padStart(2, "0");

  if ($("seconds"))
    $("seconds").textContent =
      String(seconds).padStart(2, "0");

}


updateCountdown();

setInterval(
  updateCountdown,
  1000
);


/* =========================================================
   SANKALP
========================================================= */

const prayerForm =
  $("prayerForm");

const prayerInput =
  $("prayerInput");

const prayerStatus =
  $("prayerStatus");

const prayerWall =
  $("prayerWall");


if (prayerForm) {

  prayerForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const text =
        prayerInput?.value.trim();


      if (!text) {

        prayerStatus.textContent =
          "Please write your Sankalp.";

        return;

      }


      if (text.length > 50) {

        prayerStatus.textContent =
          "Maximum 50 characters allowed.";

        return;

      }


      prayerStatus.textContent =
        "Offering your Sankalp...";


      try {

        console.log(
          "Submitting Sankalp..."
        );


        const prayerRef =
          push(
            ref(
              database,
              "pandal/prayers_wall"
            )
          );


        await Promise.race([

          set(
            prayerRef,
            {
              text: text,
              createdAt: Date.now()
            }
          ),

          new Promise(
            (_, reject) => {

              setTimeout(
                () => {

                  reject(
                    new Error(
                      "Firebase connection timed out."
                    )
                  );

                },
                10000
              );

            }
          )

        ]);


        console.log(
          "Sankalp saved:",
          prayerRef.key
        );


        prayerForm.reset();


        prayerStatus.textContent =
          "Your Sankalp has been offered 🙏";

      }

      catch (error) {

        console.error(
          "SANKALP ERROR:",
          error
        );


        prayerStatus.textContent =
          "Firebase error: " +
          (
            error.message ||
            "Unable to connect."
          );

      }

    }
  );

}


/* =========================================================
   PRAYER WALL
========================================================= */

if (prayerWall) {

  onChildAdded(
    ref(
      database,
      "pandal/prayers_wall"
    ),

    snapshot => {

      const prayer =
        snapshot.val();


      if (!prayer) return;


      const item =
        document.createElement("div");


      item.className =
        "prayer-item";


      const text =
        document.createElement("p");


      text.textContent =
        prayer.text || "";


      item.appendChild(
        text
      );


      prayerWall.prepend(
        item
      );


      while (
        prayerWall.children.length > 50
      ) {

        prayerWall.lastElementChild.remove();

      }

    },

    error => {

      console.error(
        "Prayer wall error:",
        error
      );

    }
  );

}


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

const announcements =
  $("announcements");


if (announcements) {

  onChildAdded(
    ref(
      database,
      "pandal/announcements"
    ),

    snapshot => {

      const data =
        snapshot.val();


      if (!data) return;


      const article =
        document.createElement("article");


      article.className =
        "announcement-item";


      const title =
        document.createElement("h3");


      title.textContent =
        data.title || "Announcement";


      const message =
        document.createElement("p");


      message.textContent =
        data.message || "";


      article.appendChild(
        title
      );


      article.appendChild(
        message
      );


      announcements.prepend(
        article
      );

    },

    error => {

      console.error(
        "Announcement error:",
        error
      );

    }
  );

}


/* =========================================================
   HERO SANKALP BUTTON
========================================================= */

const heroSankalp =
  $("heroSankalp");


if (heroSankalp) {

  heroSankalp.addEventListener(
    "click",
    () => {

      const section =
        $("sankalp");


      if (section) {

        section.scrollIntoView({
          behavior: "smooth"
        });

      }


      setTimeout(
        () => {
          prayerInput?.focus();
        },
        600
      );

    }
  );

}


/* =========================================================
   AARTI PLAYER
========================================================= */

const tracks = [

  {
    title: "Gajanana",
    src: "assets/Gajanana.mp3"
  },

  {
    title: "Ganpati Bappa Moriya",
    src: "assets/Ganpati Bappa Moriya Humse Badhkar Kaun 128 Kbps.mp3"
  },

  {
    title: "Jalwa Mera Hi Jalwa",
    src: "assets/Jalwa Mera Hi Jalwa Wanted 128 Kbps.mp3"
  },

  {
    title: "Sukhkarta Dukhharta",
    src: "assets/Keshav_Kumar_-_Sukhkarta_Dukhharta_(mp3.pm).mp3"
  },

  {
    title: "Jai Ganesh Jai Ganesh Deva",
    src: "assets/Kumar_Vishu_Vandana_Vajpai_-_Jai_Ganesh_Jai_Ganesh_Deva_(mp3.pm).mp3"
  },

  {
    title: "Maurya Re",
    src: "assets/Maurya Re Don 2006 128 Kbps.mp3"
  },

  {
    title: "Shendur Laal Chadhayo",
    src: "assets/Shendur Laal Chadhayo Aarti 128 Kbps.mp3"
  },

  {
    title: "Suno Ganpati Bappa Morya",
    src: "assets/Suno Ganpati Bappa Morya Judwaa 2 128 Kbps.mp3"
  },

  {
    title: "Shree Ganeshay Dheemahi",
    src: "assets/Viruddh_-_Shree_Ganeshay_Dheemahi_(mp3.pm).mp3"
  }

];


const audio =
  $("aartiAudio");

const trackTitle =
  $("trackTitle");

const trackNumber =
  $("trackNumber");

const trackList =
  $("trackList");

const playPause =
  $("playPause");

const playIcon =
  $("playIcon");

const progress =
  $("progress");

const currentTime =
  $("currentTime");

const duration =
  $("duration");


let currentTrack = 0;


function formatTime(seconds) {

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


  const secondsPart =
    Math.floor(
      seconds % 60
    );


  return (
    minutes +
    ":" +
    String(secondsPart)
      .padStart(2, "0")
  );

}


function updateTrackList() {

  if (!trackList) return;


  trackList
    .querySelectorAll("[data-track]")
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          Number(
            button.dataset.track
          ) === currentTrack
        );

      }
    );

}


function loadTrack(index) {

  if (!audio) return;


  currentTrack =
    index;


  const track =
    tracks[index];


  audio.src =
    track.src;


  if (trackTitle) {

    trackTitle.textContent =
      track.title;

  }


  if (trackNumber) {

    trackNumber.textContent =
      `${index + 1} / ${tracks.length}`;

  }


  if (progress) {

    progress.value = 0;

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

}


if (trackList) {

  trackList.innerHTML = "";


  tracks.forEach(
    (track, index) => {

      const button =
        document.createElement("button");


      button.type =
        "button";


      button.className =
        "track-item";


      button.dataset.track =
        index;


      button.textContent =
        `${index + 1}. ${track.title}`;


      button.addEventListener(
        "click",
        () => {

          loadTrack(index);


          audio
            ?.play()
            .then(() => {

              if (playIcon) {

                playIcon.textContent =
                  "❚❚";

              }

            })
            .catch(
              error =>
                console.error(
                  "Audio error:",
                  error
                )
            );

        }
      );


      trackList.appendChild(
        button
      );

    }
  );

}


playPause?.addEventListener(
  "click",
  () => {

    if (!audio) return;


    if (audio.paused) {

      audio
        .play()
        .then(() => {

          if (playIcon) {

            playIcon.textContent =
              "❚❚";

          }

        })
        .catch(
          error =>
            console.error(
              "Audio play error:",
              error
            )
        );

    }

    else {

      audio.pause();


      if (playIcon) {

        playIcon.textContent =
          "▶";

      }

    }

  }
);


audio?.addEventListener(
  "loadedmetadata",
  () => {

    if (duration) {

      duration.textContent =
        formatTime(
          audio.duration
        );

    }

  }
);


audio?.addEventListener(
  "timeupdate",
  () => {

    if (currentTime) {

      currentTime.textContent =
        formatTime(
          audio.currentTime
        );

    }


    if (
      progress &&
      Number.isFinite(
        audio.duration
      ) &&
      audio.duration > 0
    ) {

      progress.value =
        (
          audio.currentTime /
          audio.duration
        ) *
        100;

    }

  }
);


progress?.addEventListener(
  "input",
  () => {

    if (
      audio &&
      Number.isFinite(
        audio.duration
      )
    ) {

      audio.currentTime =
        (
          Number(progress.value) /
          100
        ) *
        audio.duration;

    }

  }
);


audio?.addEventListener(
  "ended",
  () => {

    currentTrack =
      (
        currentTrack + 1
      ) %
      tracks.length;


    loadTrack(
      currentTrack
    );


    audio
      .play()
      .catch(() => {});

  }
);


loadTrack(0);


/* =========================================================
   PUSHPANJALI
========================================================= */

const pushpanjali =
  $("pushpanjali");

const petalCanvas =
  $("petalCanvas");

const bellAudio =
  $("bellAudio");


let petalContext =
  null;

let petals = [];


function resizePetalCanvas() {

  if (!petalCanvas) return;


  petalCanvas.width =
    window.innerWidth;


  petalCanvas.height =
    window.innerHeight;

}


function setupPetals() {

  if (!petalCanvas) return;


  petalContext =
    petalCanvas.getContext("2d");


  resizePetalCanvas();


  window.addEventListener(
    "resize",
    resizePetalCanvas
  );

}


function createPetals() {

  if (!petalCanvas) return;


  petals = [];


  for (
    let i = 0;
    i < 70;
    i++
  ) {

    petals.push({

      x:
        Math.random() *
        petalCanvas.width,

      y:
        -Math.random() *
        petalCanvas.height,

      size:
        5 +
        Math.random() * 8,

      speed:
        1 +
        Math.random() * 3,

      rotation:
        Math.random() *
        Math.PI *
        2,

      rotationSpeed:
        -0.04 +
        Math.random() * 0.08,

      drift:
        -0.8 +
        Math.random() * 1.6

    });

  }

}


function animatePetals() {

  if (!petalContext) return;


  petalContext.clearRect(
    0,
    0,
    petalCanvas.width,
    petalCanvas.height
  );


  petals.forEach(
    petal => {

      petal.y +=
        petal.speed;


      petal.x +=
        petal.drift;


      petal.rotation +=
        petal.rotationSpeed;


      if (
        petal.y >
        petalCanvas.height + 20
      ) {

        petal.y = -20;

      }


      petalContext.save();


      petalContext.translate(
        petal.x,
        petal.y
      );


      petalContext.rotate(
        petal.rotation
      );


      petalContext.fillStyle =
        "rgba(203,161,83,.85)";


      petalContext.beginPath();


      petalContext.ellipse(
        0,
        0,
        petal.size,
        petal.size * 0.55,
        0,
        0,
        Math.PI * 2
      );


      petalContext.fill();


      petalContext.restore();

    }
  );


  requestAnimationFrame(
    animatePetals
  );

}


pushpanjali?.addEventListener(
  "click",
  () => {

    bellAudio
      ?.play()
      .catch(() => {});


    createPetals();


    petalCanvas?.classList.add(
      "active"
    );


    setTimeout(
      () => {

        petalCanvas?.classList.remove(
          "active"
        );

      },
      5000
    );

  }
);


setupPetals();

if (petalCanvas) {
  animatePetals();
}


/* =========================================================
   WEBRTC LIVE DARSHAN
========================================================= */

const liveVideo =
  $("liveVideo");

const activeStreamUI =
  $("active-stream-ui");

const offlineStreamUI =
  $("offline-stream-ui");


let viewerId =
  null;

let viewerPeer =
  null;

let viewerSignalsStarted =
  false;

let remoteDescriptionSet =
  false;

let candidateQueue = [];

let currentBroadcastActive =
  false;


/* =========================================================
   UI
========================================================= */

function showOffline() {

  activeStreamUI
    ?.classList
    .add("hidden");


  offlineStreamUI
    ?.classList
    .remove("hidden");


  if (liveVideo) {

    liveVideo.srcObject =
      null;

  }

}


function showLive() {

  offlineStreamUI
    ?.classList
    .add("hidden");


  activeStreamUI
    ?.classList
    .remove("hidden");

}


/* =========================================================
   BROADCAST STATUS
========================================================= */

onValue(
  ref(
    database,
    "pandal/broadcast"
  ),

  snapshot => {

    const data =
      snapshot.val();


    const active =
      data?.active === true;


    currentBroadcastActive =
      active;


    console.log(
      "Broadcast status:",
      active
    );


    if (active) {

      showLive();

      startViewer();

    }

    else {

      showOffline();

      closeViewer();

    }

  },

  error => {

    console.error(
      "Broadcast listener error:",
      error
    );

    showOffline();

  }
);


/* =========================================================
   CREATE VIEWER ID
========================================================= */

function createViewerId() {

  return (
    "viewer_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );

}


/* =========================================================
   START VIEWER
========================================================= */

async function startViewer() {

  if (
    viewerPeer ||
    !currentBroadcastActive
  ) {

    return;

  }


  try {

    viewerId =
      createViewerId();


    viewerSignalsStarted =
      false;


    remoteDescriptionSet =
      false;


    candidateQueue = [];


    viewerPeer =
      new RTCPeerConnection({

        iceServers: [

          {
            urls:
              "stun:stun.l.google.com:19302"
          }

        ]

      });


    viewerPeer.ontrack =
      event => {

        if (
          liveVideo &&
          event.streams?.[0]
        ) {

          liveVideo.srcObject =
            event.streams[0];


          liveVideo.autoplay =
            true;


          liveVideo.playsInline =
            true;


          liveVideo.play()
            .catch(() => {});


          showLive();

        }

      };


    viewerPeer.onicecandidate =
      event => {

        if (
          !event.candidate ||
          !viewerId
        ) {

          return;

        }


        push(
          ref(
            database,
            `pandal/signals/${viewerId}/viewerCandidates`
          ),
          event.candidate.toJSON()
        )
        .catch(
          error =>
            console.error(
              "Viewer ICE error:",
              error
            )
        );

      };


    viewerPeer.onconnectionstatechange =
      () => {

        if (!viewerPeer) return;


        const state =
          viewerPeer.connectionState;


        console.log(
          "Viewer WebRTC:",
          state
        );


        if (
          state === "failed" ||
          state === "closed"
        ) {

          closeViewer();

        }

      };


    await set(
      ref(
        database,
        `pandal/viewers/${viewerId}`
      ),
      {
        createdAt:
          Date.now()
      }
    );


    console.log(
      "Viewer registered:",
      viewerId
    );


    listenForViewerSignals();

  }

  catch (error) {

    console.error(
      "Viewer startup error:",
      error
    );


    closeViewer();

  }

}


/* =========================================================
   LISTEN FOR SIGNALS
========================================================= */

function listenForViewerSignals() {

  if (
    viewerSignalsStarted ||
    !viewerId
  ) {

    return;

  }


  viewerSignalsStarted =
    true;


  const signalPath =
    `pandal/signals/${viewerId}`;


  /* -------------------------
     OFFER
  ------------------------- */

  onValue(
    ref(
      database,
      `${signalPath}/offer`
    ),

    async snapshot => {

      const offer =
        snapshot.val();


      if (
        !offer ||
        !viewerPeer
      ) {

        return;

      }


      try {

        if (
          viewerPeer.signalingState !==
          "stable"
        ) {

          return;

        }


        await viewerPeer
          .setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          );


        remoteDescriptionSet =
          true;


        for (
          const candidate
          of candidateQueue
        ) {

          try {

            await viewerPeer
              .addIceCandidate(
                candidate
              );

          }

          catch (_) {}

        }


        candidateQueue = [];


        const answer =
          await viewerPeer
            .createAnswer();


        await viewerPeer
          .setLocalDescription(
            answer
          );


        await set(
          ref(
            database,
            `${signalPath}/answer`
          ),
          {
            type:
              answer.type,

            sdp:
              answer.sdp
          }
        );


        console.log(
          "Answer sent"
        );

      }

      catch (error) {

        console.error(
          "Offer error:",
          error
        );

      }

    }
  );


  /* -------------------------
     BROADCASTER ICE
  ------------------------- */

  onChildAdded(
    ref(
      database,
      `${signalPath}/broadcasterCandidates`
    ),

    async snapshot => {

      const data =
        snapshot.val();


      if (
        !data ||
        !viewerPeer
      ) {

        return;

      }


      const candidate =
        new RTCIceCandidate(
          data
        );


      if (!remoteDescriptionSet) {

        candidateQueue.push(
          candidate
        );

        return;

      }


      try {

        await viewerPeer
          .addIceCandidate(
            candidate
          );

      }

      catch (error) {

        console.error(
          "Broadcaster ICE error:",
          error
        );

      }

    }
  );


  /* -------------------------
     ADMIN CLOSED
  ------------------------- */

  onValue(
    ref(
      database,
      `${signalPath}/closed`
    ),

    snapshot => {

      if (
        snapshot.val() === true
      ) {

        closeViewer();

      }

    }
  );

}


/* =========================================================
   CLOSE VIEWER
========================================================= */

async function closeViewer() {

  const oldViewerId =
    viewerId;


  viewerId =
    null;


  viewerSignalsStarted =
    false;


  remoteDescriptionSet =
    false;


  candidateQueue = [];


  if (viewerPeer) {

    try {

      viewerPeer.close();

    }

    catch (_) {}

  }


  viewerPeer =
    null;


  if (liveVideo) {

    liveVideo.srcObject =
      null;

  }


  if (oldViewerId) {

    await remove(
      ref(
        database,
        `pandal/viewers/${oldViewerId}`
      )
    )
    .catch(
      () => {}
    );

  }

}


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (!viewerId) return;


    remove(
      ref(
        database,
        `pandal/viewers/${viewerId}`
      )
    )
    .catch(() => {});

  }
);
