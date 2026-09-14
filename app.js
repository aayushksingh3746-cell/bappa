/* =========================================================
   GANPATI DIGITAL DARSHAN
   app.js
   Firebase + Sankalp + Aarti + Native WebRTC Viewer
   ========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  set,
  remove,
  onValue,
  onChildAdded,
  onChildRemoved,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* =========================================================
   FIREBASE
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  databaseURL: "https://ganpati-5f24e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


/* =========================================================
   ELEMENTS
   ========================================================= */

const activeStreamUI =
  document.getElementById("active-stream-ui");

const offlineStreamUI =
  document.getElementById("offline-stream-ui");

const liveVideo =
  document.getElementById("liveVideo");

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

const announcements =
  document.getElementById("announcements");


/* =========================================================
   PRELOADER
   ========================================================= */

function removePreloader() {

  const preloader =
    document.getElementById("preloader");

  if (!preloader) return;

  preloader.classList.add("done");

  setTimeout(() => {

    if (preloader && preloader.parentNode) {
      preloader.remove();
    }

  }, 900);
}

window.addEventListener("load", () => {
  setTimeout(removePreloader, 500);
});

setTimeout(removePreloader, 2200);


/* =========================================================
   COUNTDOWN
   ========================================================= */

const targetDate =
  new Date("2026-09-24T00:00:00+05:30").getTime();

function updateCountdown() {

  const now = Date.now();
  const difference = targetDate - now;

  const days =
    document.getElementById("days");

  const hours =
    document.getElementById("hours");

  const minutes =
    document.getElementById("minutes");

  const seconds =
    document.getElementById("seconds");

  if (!days || !hours || !minutes || !seconds) {
    return;
  }

  if (difference <= 0) {

    days.textContent = "00";
    hours.textContent = "00";
    minutes.textContent = "00";
    seconds.textContent = "00";

    const countdown =
      document.getElementById("countdown");

    if (countdown) {
      countdown.innerHTML =
        "<strong>Ganpati Bappa Pudhchya Varshi Lavkar Ya</strong>";
    }

    return;
  }

  const totalSeconds =
    Math.floor(difference / 1000);

  const d =
    Math.floor(totalSeconds / 86400);

  const h =
    Math.floor((totalSeconds % 86400) / 3600);

  const m =
    Math.floor((totalSeconds % 3600) / 60);

  const s =
    totalSeconds % 60;

  days.textContent =
    String(d).padStart(2, "0");

  hours.textContent =
    String(h).padStart(2, "0");

  minutes.textContent =
    String(m).padStart(2, "0");

  seconds.textContent =
    String(s).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);


/* =========================================================
   SANKALP
   ========================================================= */

if (prayerForm) {

  prayerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const text =
      prayerInput.value.trim();

    if (!text) return;

    if (text.length > 50) {

      prayerStatus.textContent =
        "Please keep your prayer within 50 characters.";

      return;
    }

    prayerStatus.textContent =
      "Offering your prayer...";

    try {

      const prayersRef =
        ref(db, "pandal/prayers_wall");

      const newPrayer =
        push(prayersRef);

      await set(newPrayer, {
        text: text,
        createdAt: serverTimestamp()
      });

      prayerInput.value = "";

      prayerStatus.textContent =
        "Your Sankalp has been offered. Ganpati Bappa Morya!";

      setTimeout(() => {

        if (prayerStatus) {
          prayerStatus.textContent = "";
        }

      }, 4000);

    } catch (error) {

      console.error(
        "Sankalp error:",
        error
      );

      prayerStatus.textContent =
        "Unable to offer the prayer right now. Please try again.";
    }
  });
}


/* =========================================================
   HERO SANKALP BUTTON
   ========================================================= */

if (heroSankalp) {

  heroSankalp.addEventListener("click", () => {

    const section =
      document.getElementById("sankalp");

    if (section) {

      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      setTimeout(() => {

        if (prayerInput) {
          prayerInput.focus();
        }

      }, 700);
    }

  });
}


/* =========================================================
   LOAD SANKALP WALL
   ========================================================= */

function loadPrayerWall() {

  if (!prayerWall) return;

  const prayersRef =
    ref(db, "pandal/prayers_wall");

  onValue(
    prayersRef,
    (snapshot) => {

      prayerWall.innerHTML = "";

      const data =
        snapshot.val();

      if (!data) {

        prayerWall.innerHTML = `
          <div class="empty-state">
            Be the first to offer a Sankalp.
          </div>
        `;

        return;
      }

      const prayers =
        Object.entries(data)
          .map(([id, prayer]) => ({
            id,
            ...prayer
          }))
          .sort(
            (a, b) =>
              (b.createdAt || 0) -
              (a.createdAt || 0)
          );

      prayers.forEach((prayer) => {

        const card =
          document.createElement("article");

        card.className = "prayer-card";

        const text =
          document.createElement("p");

        text.textContent =
          prayer.text || "";

        card.appendChild(text);

        prayerWall.appendChild(card);
      });

    },
    (error) => {

      console.error(
        "Prayer wall error:",
        error
      );

    }
  );
}

loadPrayerWall();


/* =========================================================
   AARTI PLAYER
   ========================================================= */

const tracks = [

  {
    title: "Gajanana",
    src: "./assets/Gajanana.mp3"
  },

  {
    title: "Ganpati Bappa Moriya Humse Badhkar Kaun",
    src: "./assets/Ganpati Bappa Moriya Humse Badhkar Kaun 128 Kbps.mp3"
  },

  {
    title: "Jalwa Mera Hi Jalwa",
    src: "./assets/Jalwa Mera Hi Jalwa Wanted 128 Kbps.mp3"
  },

  {
    title: "Sukhkarta Dukhharta",
    src: "./assets/Keshav_Kumar_-_Sukhkarta_Dukhharta_(mp3.pm).mp3"
  },

  {
    title: "Jai Ganesh Jai Ganesh Deva",
    src: "./assets/Kumar_Vishu_Vandana_Vajpai_-_Jai_Ganesh_Jai_Ganesh_Deva_(mp3.pm).mp3"
  },

  {
    title: "Maurya Re",
    src: "./assets/Maurya Re Don 2006 128 Kbps.mp3"
  },

  {
    title: "Shendur Laal Chadhayo",
    src: "./assets/Shendur Laal Chadhayo Aarti 128 Kbps.mp3"
  },

  {
    title: "Suno Ganpati Bappa Morya",
    src: "./assets/Suno Ganpati Bappa Morya Judwaa 2 128 Kbps.mp3"
  },

  {
    title: "Shree Ganeshay Dheemahi",
    src: "./assets/Viruddh_-_Shree_Ganeshay_Dheemahi_(mp3.pm).mp3"
  }

];

const audio =
  document.getElementById("aartiAudio");

const playPause =
  document.getElementById("playPause");

const playIcon =
  document.getElementById("playIcon");

const trackTitle =
  document.getElementById("trackTitle");

const trackNumber =
  document.getElementById("trackNumber");

const trackList =
  document.getElementById("trackList");

const progress =
  document.getElementById("progress");

const currentTimeEl =
  document.getElementById("currentTime");

const durationEl =
  document.getElementById("duration");

let currentTrack = 0;


function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60);

  return (
    minutes +
    ":" +
    String(secs).padStart(2, "0")
  );
}


function renderTrackList() {

  if (!trackList) return;

  trackList.innerHTML = "";

  tracks.forEach((track, index) => {

    const button =
      document.createElement("button");

    button.type = "button";
    button.className = "track-item";

    if (index === currentTrack) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <span>${index + 1}</span>
      <strong></strong>
    `;

    button.querySelector("strong")
      .textContent = track.title;

    button.addEventListener(
      "click",
      () => {

        loadTrack(index);
        playTrack();

      }
    );

    trackList.appendChild(button);
  });
}


function loadTrack(index) {

  currentTrack =
    (index + tracks.length) %
    tracks.length;

  const track =
    tracks[currentTrack];

  if (audio) {
    audio.src = track.src;
    audio.load();
  }

  if (trackTitle) {
    trackTitle.textContent =
      track.title;
  }

  if (trackNumber) {
    trackNumber.textContent =
      `${currentTrack + 1} / ${tracks.length}`;
  }

  if (progress) {
    progress.value = 0;
  }

  if (currentTimeEl) {
    currentTimeEl.textContent = "0:00";
  }

  if (durationEl) {
    durationEl.textContent = "0:00";
  }

  renderTrackList();
}


async function playTrack() {

  if (!audio) return;

  try {

    await audio.play();

    if (playIcon) {
      playIcon.textContent = "❚❚";
    }

  } catch (error) {

    console.warn(
      "Audio play blocked:",
      error
    );

  }
}


function pauseTrack() {

  if (!audio) return;

  audio.pause();

  if (playIcon) {
    playIcon.textContent = "▶";
  }
}


if (playPause) {

  playPause.addEventListener(
    "click",
    () => {

      if (!audio) return;

      if (audio.paused) {
        playTrack();
      } else {
        pauseTrack();
      }

    }
  );
}


if (audio) {

  audio.addEventListener(
    "loadedmetadata",
    () => {

      if (durationEl) {
        durationEl.textContent =
          formatTime(audio.duration);
      }

    }
  );


  audio.addEventListener(
    "timeupdate",
    () => {

      if (!audio.duration) return;

      const percentage =
        (audio.currentTime /
          audio.duration) * 100;

      if (progress) {
        progress.value = percentage;
      }

      if (currentTimeEl) {
        currentTimeEl.textContent =
          formatTime(audio.currentTime);
      }

    }
  );


  audio.addEventListener(
    "ended",
    () => {

      currentTrack++;

      if (currentTrack >= tracks.length) {
        currentTrack = 0;
      }

      loadTrack(currentTrack);
      playTrack();

    }
  );
}


if (progress) {

  progress.addEventListener(
    "input",
    () => {

      if (!audio || !audio.duration) return;

      audio.currentTime =
        (Number(progress.value) / 100) *
        audio.duration;

    }
  );
}


loadTrack(0);


/* =========================================================
   PUSHPANJALI
   ========================================================= */

const pushpanjali =
  document.getElementById("pushpanjali");

const bellAudio =
  document.getElementById("bellAudio");

const petalCanvas =
  document.getElementById("petalCanvas");


if (pushpanjali) {

  pushpanjali.addEventListener(
    "click",
    () => {

      if (bellAudio) {

        bellAudio.currentTime = 0;

        bellAudio.play().catch(
          () => {}
        );
      }

      createPetals();
    }
  );
}


function createPetals() {

  if (!petalCanvas) return;

  const canvas =
    petalCanvas;

  const ctx =
    canvas.getContext("2d");

  canvas.width =
    window.innerWidth;

  canvas.height =
    window.innerHeight;

  const petals = [];

  for (let i = 0; i < 55; i++) {

    petals.push({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,
      size: 5 + Math.random() * 8,
      speed: 1 + Math.random() * 2.5,
      rotation: Math.random() * Math.PI,
      rotationSpeed:
        -0.04 + Math.random() * 0.08,
      drift:
        -0.5 + Math.random()
    });

  }

  let start =
    performance.now();

  function animate(now) {

    const elapsed =
      now - start;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    petals.forEach((petal) => {

      petal.y += petal.speed;
      petal.x += petal.drift;
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
        Math.max(
          0,
          1 - elapsed / 4500
        );

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
        "#D89B32";

      ctx.fill();

      ctx.restore();

    });

    if (elapsed < 4500) {

      requestAnimationFrame(
        animate
      );

    } else {

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

    }
  }

  requestAnimationFrame(
    animate
  );
}


/* =========================================================
   ANNOUNCEMENTS
   ========================================================= */

if (announcements) {

  const announcementsRef =
    ref(db, "pandal/announcements");

  onValue(
    announcementsRef,
    (snapshot) => {

      announcements.innerHTML = "";

      const data =
        snapshot.val();

      if (!data) {

        announcements.innerHTML = `
          <div class="empty-state">
            No announcements yet.
          </div>
        `;

        return;
      }

      const list =
        Object.values(data)
          .sort(
            (a, b) =>
              (b.createdAt || 0) -
              (a.createdAt || 0)
          );

      list.forEach((item) => {

        const article =
          document.createElement("article");

        article.className =
          "announcement-card";

        const title =
          document.createElement("h3");

        title.textContent =
          item.title || "Announcement";

        const message =
          document.createElement("p");

        message.textContent =
          item.message || "";

        article.appendChild(title);
        article.appendChild(message);

        announcements.appendChild(article);

      });

    },
    (error) => {

      console.error(
        "Announcements error:",
        error
      );

    }
  );
}


/* =========================================================
   LIVE DARSHAN
   NATIVE WEBRTC VIEWER
   ========================================================= */

let viewerId = null;
let viewerPC = null;

let offerUnsubscribe = null;
let answerUnsubscribe = null;
let viewerCandidatesUnsubscribe = null;
let broadcasterCandidatesUnsubscribe = null;
let closedUnsubscribe = null;

let currentBroadcastId = null;

let receivedOffer = false;
let receivedRemoteCandidateIds = new Set();


/* ---------------------------------------------------------
   WEBRTC CONFIG
   --------------------------------------------------------- */

const rtcConfiguration = {

  iceServers: [

    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302"
      ]
    },

    {
      urls: "stun:stun2.l.google.com:19302"
    },

    {
      urls: "stun:stun3.l.google.com:19302"
    }

  ]

};


/* ---------------------------------------------------------
   SHOW OFFLINE
   --------------------------------------------------------- */

function showOffline() {

  if (activeStreamUI) {
    activeStreamUI.classList.add("hidden");
  }

  if (offlineStreamUI) {
    offlineStreamUI.classList.remove("hidden");
  }

  if (liveVideo) {

    try {
      liveVideo.pause();
    } catch (error) {}

    liveVideo.srcObject = null;
  }
}


/* ---------------------------------------------------------
   SHOW LIVE
   --------------------------------------------------------- */

function showLive() {

  if (offlineStreamUI) {
    offlineStreamUI.classList.add("hidden");
  }

  if (activeStreamUI) {
    activeStreamUI.classList.remove("hidden");
  }
}


/* ---------------------------------------------------------
   CLEAN VIEWER
   --------------------------------------------------------- */

async function cleanupViewer() {

  console.log("Cleaning viewer...");

  if (offerUnsubscribe) {
    offerUnsubscribe();
    offerUnsubscribe = null;
  }

  if (answerUnsubscribe) {
    answerUnsubscribe();
    answerUnsubscribe = null;
  }

  if (viewerCandidatesUnsubscribe) {
    viewerCandidatesUnsubscribe();
    viewerCandidatesUnsubscribe = null;
  }

  if (broadcasterCandidatesUnsubscribe) {
    broadcasterCandidatesUnsubscribe();
    broadcasterCandidatesUnsubscribe = null;
  }

  if (closedUnsubscribe) {
    closedUnsubscribe();
    closedUnsubscribe = null;
  }

  if (viewerPC) {

    try {
      viewerPC.ontrack = null;
      viewerPC.onicecandidate = null;
      viewerPC.onconnectionstatechange = null;
      viewerPC.oniceconnectionstatechange = null;
      viewerPC.close();
    } catch (error) {
      console.warn(error);
    }

    viewerPC = null;
  }

  if (liveVideo) {
    liveVideo.srcObject = null;
  }

  if (viewerId) {

    try {

      await remove(
        ref(
          db,
          `pandal/viewers/${viewerId}`
        )
      );

    } catch (error) {

      console.warn(
        "Viewer cleanup failed:",
        error
      );

    }
  }

  viewerId = null;
  currentBroadcastId = null;
  receivedOffer = false;
  receivedRemoteCandidateIds.clear();

  showOffline();
}


/* ---------------------------------------------------------
   CREATE VIEWER
   --------------------------------------------------------- */

async function createViewer() {

  await cleanupViewer();

  viewerId =
    "viewer-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 9);

  console.log(
    "Creating viewer:",
    viewerId
  );

  viewerPC =
    new RTCPeerConnection(
      rtcConfiguration
    );


  /* -------------------------------------------------------
     RECEIVE STREAM
     ------------------------------------------------------- */

  viewerPC.ontrack = (event) => {

    console.log(
      "================================"
    );

    console.log(
      "LIVE STREAM RECEIVED"
    );

    console.log(
      "Streams:",
      event.streams
    );

    console.log(
      "================================"
    );

    if (
      event.streams &&
      event.streams.length > 0
    ) {

      const stream =
        event.streams[0];

      if (liveVideo) {

        liveVideo.srcObject =
          stream;

        liveVideo.autoplay = true;
        liveVideo.playsInline = true;
        liveVideo.muted = true;

        showLive();

        const playPromise =
          liveVideo.play();

        if (playPromise) {

          playPromise.catch(
            (error) => {

              console.warn(
                "Video autoplay blocked:",
                error
              );

              /*
               * A tap anywhere on the video
               * will retry playback.
               */

              const retryPlay =
                () => {

                  liveVideo.play()
                    .catch(() => {});

                  document.removeEventListener(
                    "click",
                    retryPlay
                  );

                };

              document.addEventListener(
                "click",
                retryPlay,
                { once: true }
              );

            }
          );
        }
      }
    }
  };


  /* -------------------------------------------------------
     RECEIVE ICE CANDIDATES
     ------------------------------------------------------- */

  viewerPC.onicecandidate =
    async (event) => {

      if (!event.candidate) {
        return;
      }

      if (!viewerId) {
        return;
      }

      try {

        const candidateRef =
          push(
            ref(
              db,
              `pandal/signals/${viewerId}/viewerCandidates`
            )
          );

        await set(
          candidateRef,
          event.candidate.toJSON()
        );

        console.log(
          "Viewer ICE candidate sent"
        );

      } catch (error) {

        console.error(
          "Viewer ICE send error:",
          error
        );

      }
    };


  /* -------------------------------------------------------
     CONNECTION STATE
     ------------------------------------------------------- */

  viewerPC.onconnectionstatechange =
    () => {

      console.log(
        "WebRTC connection:",
        viewerPC.connectionState
      );

      if (
        viewerPC.connectionState ===
        "connected"
      ) {

        showLive();

      }

      if (
        viewerPC.connectionState ===
        "failed"
      ) {

        console.error(
          "WebRTC connection failed"
        );

        /*
         * Try a fresh connection.
         */

        setTimeout(() => {

          if (currentBroadcastId) {
            createViewer();
          }

        }, 1500);

      }

      if (
        viewerPC.connectionState ===
        "disconnected"
      ) {

        console.warn(
          "WebRTC disconnected"
        );

      }

    };


  viewerPC.oniceconnectionstatechange =
    () => {

      console.log(
        "ICE state:",
        viewerPC.iceConnectionState
      );

    };


  /* -------------------------------------------------------
     REGISTER VIEWER IN FIREBASE
     ------------------------------------------------------- */

  await set(
    ref(
      db,
      `pandal/viewers/${viewerId}`
    ),
    {
      createdAt: serverTimestamp(),
      active: true
    }
  );


  /* -------------------------------------------------------
     LISTEN FOR BROADCASTER OFFER
     ------------------------------------------------------- */

  const offerRef =
    ref(
      db,
      `pandal/signals/${viewerId}/offer`
    );

  offerUnsubscribe =
    onValue(
      offerRef,
      async (snapshot) => {

        const offer =
          snapshot.val();

        if (!offer) {
          return;
        }

        if (receivedOffer) {
          return;
        }

        receivedOffer = true;

        console.log(
          "Broadcaster offer received"
        );

        try {

          await viewerPC.setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          );

          console.log(
            "Remote offer applied"
          );


          /* ------------------------------------------------
             CREATE ANSWER
             ------------------------------------------------ */

          const answer =
            await viewerPC.createAnswer();

          await viewerPC.setLocalDescription(
            answer
          );

          console.log(
            "Viewer answer created"
          );


          await set(
            ref(
              db,
              `pandal/signals/${viewerId}/answer`
            ),
            {
              type:
                answer.type,

              sdp:
                answer.sdp
            }
          );

          console.log(
            "Viewer answer sent"
          );

        } catch (error) {

          console.error(
            "Offer handling error:",
            error
          );

          receivedOffer = false;

        }

      }
    );


  /* -------------------------------------------------------
     LISTEN FOR BROADCASTER ICE
     ------------------------------------------------------- */

  const broadcasterCandidatesRef =
    ref(
      db,
      `pandal/signals/${viewerId}/broadcasterCandidates`
    );

  broadcasterCandidatesUnsubscribe =
    onChildAdded(
      broadcasterCandidatesRef,
      async (snapshot) => {

        const id =
          snapshot.key;

        const candidate =
          snapshot.val();

        if (!candidate) {
          return;
        }

        if (
          receivedRemoteCandidateIds.has(id)
        ) {
          return;
        }

        receivedRemoteCandidateIds.add(id);

        console.log(
          "Broadcaster ICE received"
        );

        try {

          /*
           * If remote description is not
           * ready yet, wait briefly.
           */

          if (
            !viewerPC.remoteDescription
          ) {

            console.log(
              "Waiting for remote description..."
            );

            let attempts = 0;

            while (
              !viewerPC.remoteDescription &&
              attempts < 50
            ) {

              await new Promise(
                resolve =>
                  setTimeout(
                    resolve,
                    100
                  )
              );

              attempts++;
            }
          }

          if (
            viewerPC.remoteDescription
          ) {

            await viewerPC.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );

            console.log(
              "Broadcaster ICE added"
            );

          }

        } catch (error) {

          console.warn(
            "Remote ICE error:",
            error
          );

        }

      }
    );


  /* -------------------------------------------------------
     BROADCAST CLOSED
     ------------------------------------------------------- */

  const closedRef =
    ref(
      db,
      `pandal/signals/${viewerId}/closed`
    );

  closedUnsubscribe =
    onValue(
      closedRef,
      async (snapshot) => {

        if (
          snapshot.val() === true
        ) {

          console.log(
            "Broadcaster closed stream"
          );

          await cleanupViewer();

        }

      }
    );


  console.log(
    "Viewer is ready and waiting for offer..."
  );
}


/* =========================================================
   BROADCAST STATUS LISTENER
   ========================================================= */

const broadcastRef =
  ref(
    db,
    "pandal/broadcast"
  );


onValue(
  broadcastRef,
  async (snapshot) => {

    const broadcast =
      snapshot.val();

    console.log(
      "Broadcast state:",
      broadcast
    );


    /* -----------------------------------------------------
       NO BROADCAST
       ----------------------------------------------------- */

    if (
      !broadcast ||
      broadcast.active !== true
    ) {

      console.log(
        "No active broadcast"
      );

      if (
        viewerPC ||
        viewerId
      ) {

        await cleanupViewer();

      } else {

        showOffline();

      }

      return;
    }


    /* -----------------------------------------------------
       BROADCAST ACTIVE
       ----------------------------------------------------- */

    const broadcastId =
      broadcast.id ||
      broadcast.startedAt ||
      "active";


    console.log(
      "Active broadcast:",
      broadcastId
    );


    /*
     * Don't recreate the connection on every
     * Firebase update.
     */

    if (
      currentBroadcastId ===
      String(broadcastId)
    ) {

      return;
    }


    currentBroadcastId =
      String(broadcastId);


    await createViewer();

  },
  (error) => {

    console.error(
      "Broadcast listener error:",
      error
    );

    showOffline();

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
        liveVideo &&
        liveVideo.srcObject &&
        liveVideo.paused
      ) {

        liveVideo.play()
          .catch(() => {});

      }

    }

  }
);


/* =========================================================
   CLEANUP WHEN LEAVING PAGE
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (viewerId) {

      /*
       * Best effort cleanup.
       */

      remove(
        ref(
          db,
          `pandal/viewers/${viewerId}`
        )
      ).catch(() => {});

    }

    if (viewerPC) {

      try {
        viewerPC.close();
      } catch (error) {}

    }

  }
);


/* =========================================================
   RESIZE PETAL CANVAS
   ========================================================= */

window.addEventListener(
  "resize",
  () => {

    if (!petalCanvas) return;

    petalCanvas.width =
      window.innerWidth;

    petalCanvas.height =
      window.innerHeight;

  }
);


/* =========================================================
   INITIAL STATE
   ========================================================= */

showOffline();

console.log(
  "Ganpati Digital Darshan app loaded."
);
