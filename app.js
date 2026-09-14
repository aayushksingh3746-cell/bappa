import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onValue,
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


const firebaseApp =
  initializeApp(firebaseConfig);

const database =
  getDatabase(firebaseApp);


const $ = selector =>
  document.querySelector(selector);


/* =========================================================
   PRELOADER
========================================================= */

function hidePreloader() {

  const preloader =
    $("#preloader");

  if (preloader) {
    preloader.classList.add("done");
  }

}


window.addEventListener(
  "load",
  () => {

    setTimeout(
      hidePreloader,
      500
    );

  }
);


setTimeout(
  hidePreloader,
  2000
);


/* =========================================================
   COUNTDOWN
========================================================= */

const countdownTarget =
  new Date(
    "2026-09-24T00:00:00+05:30"
  ).getTime();


function updateCountdown() {

  const remaining =
    countdownTarget - Date.now();


  const countdown =
    $("#countdown");


  if (!countdown) return;


  if (remaining <= 0) {

    countdown.innerHTML = `
      <strong style="
        font-family:'Playfair Display',serif;
        color:var(--gold);
        font-size:clamp(1.3rem,4vw,2rem);
      ">
        Ganpati Bappa Pudhchya Varshi Lavkar Ya
      </strong>
    `;

    return;
  }


  const days =
    Math.floor(
      remaining / 86400000
    );


  const hours =
    Math.floor(
      (remaining % 86400000) / 3600000
    );


  const minutes =
    Math.floor(
      (remaining % 3600000) / 60000
    );


  const seconds =
    Math.floor(
      (remaining % 60000) / 1000
    );


  $("#days").textContent =
    String(days).padStart(2,"0");

  $("#hours").textContent =
    String(hours).padStart(2,"0");

  $("#minutes").textContent =
    String(minutes).padStart(2,"0");

  $("#seconds").textContent =
    String(seconds).padStart(2,"0");

}


updateCountdown();

setInterval(
  updateCountdown,
  1000
);


/* =========================================================
   HERO SANKALP BUTTON
========================================================= */

$("#heroSankalp")?.addEventListener(
  "click",
  () => {

    document
      .querySelector("#sankalp")
      ?.scrollIntoView({
        behavior: "smooth"
      });

  }
);


/* =========================================================
   DIGITAL SANKALP
========================================================= */

const prayerForm =
  $("#prayerForm");

const prayerInput =
  $("#prayerInput");

const prayerWall =
  $("#prayerWall");

const prayerStatus =
  $("#prayerStatus");


const prayersReference =
  ref(
    database,
    "pandal/prayers_wall"
  );


onChildAdded(
  prayersReference,
  snapshot => {

    const prayer =
      snapshot.val();


    if (
      !prayer ||
      typeof prayer.text !== "string"
    ) {
      return;
    }


    const article =
      document.createElement("article");

    article.className =
      "prayer-card";


    article.textContent =
      prayer.text;


    const label =
      document.createElement("small");

    label.textContent =
      "ॐ Sankalp";


    article.appendChild(label);


    prayerWall.appendChild(article);


    while (
      prayerWall.children.length > 50
    ) {

      prayerWall.firstElementChild
        .remove();

    }

  }
);


prayerForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const text =
      prayerInput.value.trim();


    if (!text) return;


    prayerStatus.textContent =
      "Offering your prayer...";


    try {

      await push(
        prayersReference,
        {
          text,
          createdAt:
            serverTimestamp()
        }
      );


      prayerInput.value = "";

      prayerStatus.textContent =
        "Your Sankalp has been offered. ॐ";

    }

    catch (error) {

      console.error(error);

      prayerStatus.textContent =
        "Could not submit right now. Please try again.";

    }

  }
);


/* =========================================================
   AARTI PLAYER
========================================================= */

const tracks = [

  [
    "Gajanana",
    "./assets/Gajanana.mp3"
  ],

  [
    "Deva Ho Deva",
    "./assets/Ganpati Bappa Moriya Humse Badhkar Kaun 128 Kbps.mp3"
  ],

  [
    "Jalwa",
    "./assets/Jalwa Mera Hi Jalwa Wanted 128 Kbps.mp3"
  ],

  [
    "Sukhkarta Dukhharta",
    "./assets/Keshav_Kumar_-_Sukhkarta_Dukhharta_(mp3.pm).mp3"
  ],

  [
    "Jai Ganesh Deva",
    "./assets/Kumar_Vishu_Vandana_Vajpai_-_Jai_Ganesh_Jai_Ganesh_Deva_(mp3.pm).mp3"
  ],

  [
    "Morya Re (Don)",
    "./assets/Maurya Re Don 2006 128 Kbps.mp3"
  ],

  [
    "Shendur Laal Chadhayo",
    "./assets/Shendur Laal Chadhayo Aarti 128 Kbps.mp3"
  ],

  [
    "Suno Ganpati Bappa Morya",
    "./assets/Suno Ganpati Bappa Morya Judwaa 2 128 Kbps.mp3"
  ],

  [
    "Shree Ganeshay Dheemahi",
    "./assets/Viruddh_-_Shree_Ganeshay_Dheemahi_(mp3.pm).mp3"
  ]

];


const audio =
  $("#aartiAudio");

const trackList =
  $("#trackList");

let currentTrack = 0;


tracks.forEach(
  (track,index) => {

    const button =
      document.createElement("button");


    button.type =
      "button";


    button.textContent =
      `${index + 1}. ${track[0]}`;


    button.addEventListener(
      "click",
      () => {

        loadTrack(
          index,
          true
        );

      }
    );


    trackList.appendChild(
      button
    );

  }
);


function loadTrack(
  index,
  autoplay = false
) {

  currentTrack =
    index;


  audio.src =
    tracks[index][1];


  $("#trackTitle").textContent =
    tracks[index][0];


  $("#trackNumber").textContent =
    `${index + 1} / ${tracks.length}`;


  trackList
    .querySelectorAll("button")
    .forEach(
      (button,index) => {

        button.classList.toggle(
          "active",
          index === currentTrack
        );

      }
    );


  if (autoplay) {

    audio
      .play()
      .catch(
        error =>
          console.warn(
            "Audio playback blocked:",
            error
          )
      );

  }

}


$("#playPause")?.addEventListener(
  "click",
  () => {

    if (audio.paused) {

      audio.play()
        .catch(
          error =>
            console.warn(
              error
            )
        );

    }

    else {

      audio.pause();

    }

  }
);


audio.addEventListener(
  "play",
  () => {

    $("#playIcon").textContent =
      "Ⅱ";

  }
);


audio.addEventListener(
  "pause",
  () => {

    $("#playIcon").textContent =
      "▶";

  }
);


audio.addEventListener(
  "timeupdate",
  () => {

    if (audio.duration) {

      $("#progress").value =
        (
          audio.currentTime /
          audio.duration
        ) * 100;

    }


    $("#currentTime").textContent =
      formatTime(
        audio.currentTime
      );


    $("#duration").textContent =
      formatTime(
        audio.duration
      );

  }
);


$("#progress")?.addEventListener(
  "input",
  event => {

    if (!audio.duration) {
      return;
    }


    audio.currentTime =
      (
        Number(event.target.value) /
        100
      ) * audio.duration;

  }
);


audio.addEventListener(
  "ended",
  () => {

    const next =
      (currentTrack + 1) %
      tracks.length;


    loadTrack(
      next,
      true
    );

  }
);


function formatTime(seconds) {

  if (
    !Number.isFinite(seconds)
  ) {
    return "0:00";
  }


  const minutes =
    Math.floor(
      seconds / 60
    );


  const remainingSeconds =
    Math.floor(
      seconds % 60
    );


  return `${minutes}:${String(
    remainingSeconds
  ).padStart(2,"0")}`;

}


loadTrack(0);


/* =========================================================
   PUSHPANJALI
========================================================= */

const bellAudio =
  $("#bellAudio");

const canvas =
  $("#petalCanvas");

const context =
  canvas.getContext("2d");


let petals = [];

let petalAnimationRunning =
  false;


function resizeCanvas() {

  const ratio =
    window.devicePixelRatio || 1;


  canvas.width =
    window.innerWidth * ratio;

  canvas.height =
    window.innerHeight * ratio;


  context.setTransform(
    ratio,
    0,
    0,
    ratio,
    0,
    0
  );

}


resizeCanvas();

window.addEventListener(
  "resize",
  resizeCanvas
);


$("#pushpanjali")?.addEventListener(
  "click",
  () => {

    bellAudio.currentTime = 0;

    bellAudio
      .play()
      .catch(
        error =>
          console.warn(
            "Bell playback blocked:",
            error
          )
      );


    createPetals();

  }
);


function createPetals() {

  const width =
    window.innerWidth;

  const height =
    window.innerHeight;


  petals =
    Array.from(
      { length: 85 },
      () => ({

        x:
          Math.random() *
          width,

        y:
          -Math.random() *
          height *
          .6,

        radius:
          3 +
          Math.random() *
          5,

        speed:
          1.2 +
          Math.random() *
          2.5,

        angle:
          Math.random() *
          Math.PI *
          2,

        rotation:
          Math.random() *
          Math.PI *
          2,

        rotationSpeed:
          (
            Math.random() -
            .5
          ) * .06,

        life: 0

      })
    );


  if (!petalAnimationRunning) {

    petalAnimationRunning = true;

    requestAnimationFrame(
      drawPetals
    );

  }

}


function drawPetals() {

  context.clearRect(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );


  let activePetals = 0;


  petals.forEach(
    petal => {

      petal.y +=
        petal.speed;


      petal.x +=
        Math.sin(
          petal.y * .01 +
          petal.angle
        ) * .7;


      petal.rotation +=
        petal.rotationSpeed;


      petal.life++;


      context.save();


      context.translate(
        petal.x,
        petal.y
      );


      context.rotate(
        petal.rotation
      );


      context.fillStyle =
        petal.life > 170
          ? "rgba(203,161,83,.35)"
          : "rgba(238,156,36,.85)";


      context.beginPath();


      context.ellipse(
        0,
        0,
        petal.radius,
        petal.radius * .55,
        0,
        0,
        Math.PI * 2
      );


      context.fill();


      context.restore();


      if (
        petal.y <
        window.innerHeight + 30
      ) {

        activePetals++;

      }

    }
  );


  if (activePetals > 0) {

    requestAnimationFrame(
      drawPetals
    );

  }

  else {

    petalAnimationRunning =
      false;

    context.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );

  }

}


/* =========================================================
   WEBRTC VIEWER
========================================================= */

const viewerId =
  crypto.randomUUID();


const viewerReference =
  ref(
    database,
    `pandal/viewers/${viewerId}`
  );


let viewerPeer =
  null;


let viewerCleaned =
  false;


async function startViewer() {

  try {

    await set(
      viewerReference,
      {
        createdAt:
          serverTimestamp()
      }
    );


    onValue(
      ref(
        database,
        `pandal/signals/${viewerId}/offer`
      ),

      async snapshot => {

        const offer =
          snapshot.val();


        if (!offer) {
          return;
        }


        if (viewerPeer) {

          viewerPeer.close();

        }


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

            const video =
              $("#liveVideo");


            if (
              video.srcObject !==
              event.streams[0]
            ) {

              video.srcObject =
                event.streams[0];

            }


            $("#active-stream-ui")
              .classList
              .remove("hidden");


            $("#offline-stream-ui")
              .classList
              .add("hidden");

          };


        viewerPeer.onicecandidate =
          event => {

            if (
              event.candidate
            ) {

              push(
                ref(
                  database,
                  `pandal/signals/${viewerId}/viewerCandidates`
                ),
                event.candidate.toJSON()
              );

            }

          };


        viewerPeer.onconnectionstatechange =
          () => {

            const state =
              viewerPeer.connectionState;


            if (
              [
                "failed",
                "closed",
                "disconnected"
              ].includes(state)
            ) {

              $("#active-stream-ui")
                .classList
                .add("hidden");


              $("#offline-stream-ui")
                .classList
                .remove("hidden");

            }

          };


        await viewerPeer
          .setRemoteDescription(
            offer
          );


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
            `pandal/signals/${viewerId}/answer`
          ),
          {
            type:
              answer.type,

            sdp:
              answer.sdp
          }
        );


        onChildAdded(
          ref(
            database,
            `pandal/signals/${viewerId}/broadcasterCandidates`
          ),

          snapshot => {

            viewerPeer
              ?.addIceCandidate(
                snapshot.val()
              )
              .catch(
                () => {}
              );

          }
        );

      }
    );


    onValue(
      ref(
        database,
        `pandal/signals/${viewerId}/closed`
      ),

      snapshot => {

        if (
          snapshot.val() === true
        ) {

          $("#active-stream-ui")
            .classList
            .add("hidden");


          $("#offline-stream-ui")
            .classList
            .remove("hidden");

        }

      }
    );

  }

  catch (error) {

    console.error(
      "Viewer initialization failed:",
      error
    );

  }

}


function cleanupViewer() {

  if (viewerCleaned) {
    return;
  }


  viewerCleaned = true;


  viewerPeer?.close();


  remove(
    viewerReference
  ).catch(
    () => {}
  );


  remove(
    ref(
      database,
      `pandal/signals/${viewerId}`
    )
  ).catch(
    () => {}
  );

}


window.addEventListener(
  "pagehide",
  cleanupViewer
);


startViewer();
