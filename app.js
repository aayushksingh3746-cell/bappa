import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624",
  measurementId: "G-1J5J8CBVRD"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

/* =========================================================
   NAVIGATION
========================================================= */

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle?.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

document.querySelectorAll(".main-nav a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
  });
});

window.addEventListener("scroll", () => {

  const header = document.querySelector(".site-header");

  if (window.scrollY > 50) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }

});

/* =========================================================
   HERO PARALLAX
========================================================= */

const heroContent = document.getElementById("heroContent");

window.addEventListener("scroll", () => {

  if (!heroContent) return;

  const scroll = window.scrollY;

  if (scroll < window.innerHeight) {

    heroContent.style.transform =
      `translateY(${-scroll * 1.5}px)`;

    heroContent.style.opacity =
      Math.max(0, 1 - scroll / (window.innerHeight * .75));

  }

}, { passive: true });

/* =========================================================
   GOLD DUST PARTICLES
========================================================= */

const canvas = document.getElementById("dustCanvas");
const ctx = canvas.getContext("2d");

let particles = [];

function resizeCanvas() {

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  particles = [];

  const count = Math.min(
    90,
    Math.floor(window.innerWidth / 12)
  );

  for (let i = 0; i < count; i++) {

    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.7 + .4,
      speedX: (Math.random() - .5) * .12,
      speedY: (Math.random() - .5) * .12,
      alpha: Math.random() * .15
    });

  }

}

function drawParticles() {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  particles.forEach(p => {

    p.x += p.speedX;
    p.y += p.speedY;

    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;

    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      `rgba(203,161,83,${p.alpha})`;

    ctx.fill();

  });

  requestAnimationFrame(drawParticles);
}

resizeCanvas();
drawParticles();

window.addEventListener(
  "resize",
  resizeCanvas
);

/* =========================================================
   FIREBASE LIVE DARSHAN
========================================================= */

const liveReference = ref(db, "live");

const livePlayer = document.querySelector(".live-player");
const liveStatusText = document.getElementById("liveStatusText");
const liveIframe = document.getElementById("liveIframe");
const viewerCount = document.getElementById("viewerCount");

onValue(
  liveReference,
  snapshot => {

    const data = snapshot.val() || {};

    const isLive = data.isLive === true;

    if (isLive) {

      livePlayer.classList.add("is-live");

      liveStatusText.textContent = "LIVE";

      viewerCount.textContent =
        data.viewerCount ?? "[Viewers]";

      if (
        data.streamUrl &&
        liveIframe.src !== data.streamUrl
      ) {
        liveIframe.src = data.streamUrl;
      }

    } else {

      livePlayer.classList.remove("is-live");

      liveStatusText.textContent = "OFFLINE";

      viewerCount.textContent = "[Viewers]";

      liveIframe.src = "";

    }

  },
  error => {

    console.error(
      "Live status error:",
      error
    );

  }
);

/* =========================================================
   AARTI PLAYER
========================================================= */

const tracks = {

  traditional: [
    {
      title: "Sukhkarta Dukhaharta",
      src: "./assets/audio/sukhkarta-dukhaharta.mp3"
    },
    {
      title: "Jai Ganesh Deva",
      src: "./assets/audio/jai-ganesh-deva.mp3"
    },
    {
      title: "Prathama Tula Vandito",
      src: "./assets/audio/prathama-tula-vandito.mp3"
    },
    {
      title: "Shendur Laal Chadhayo",
      src: "./assets/audio/shendur-laal-chadhayo.mp3"
    },
    {
      title: "Shree Ganeshay Dheemahi",
      src: "./assets/audio/shree-ganeshay-dheemahi.mp3"
    }
  ],

  anthems: [
    {
      title: "Deva Shree Ganesha",
      src: "./assets/audio/deva-shree-ganesha.mp3"
    },
    {
      title: "Morya Re",
      src: "./assets/audio/morya-re.mp3"
    },
    {
      title: "Deva Ho Deva",
      src: "./assets/audio/deva-ho-deva.mp3"
    },
    {
      title: "Suno Ganpati Bappa Morya",
      src: "./assets/audio/suno-ganpati-bappa-morya.mp3"
    },
    {
      title: "Jalwa",
      src: "./assets/audio/jalwa.mp3"
    },
    {
      title: "Gajanana",
      src: "./assets/audio/gajanana.mp3"
    },
    {
      title: "Mourya Re",
      src: "./assets/audio/mourya-re.mp3"
    }
  ]

};

const traditionalContainer =
  document.getElementById("traditionalTracks");

const anthemContainer =
  document.getElementById("anthemTracks");

const audio =
  document.getElementById("audioPlayer");

const playButton =
  document.getElementById("playButton");

const player =
  document.querySelector(".aarti-player");

const trackTitle =
  document.getElementById("trackTitle");

const trackCategory =
  document.getElementById("trackCategory");

const trackTime =
  document.getElementById("trackTime");

const audioProgress =
  document.getElementById("audioProgress");

let currentTrack = null;

function createTrackRows(list, container, category) {

  list.forEach((track, index) => {

    const button =
      document.createElement("button");

    button.className = "track-row";

    button.innerHTML = `
      <span class="track-number">
        ${String(index + 1).padStart(2, "0")}
      </span>

      <span class="track-name">
        ${track.title}
      </span>
    `;

    button.addEventListener(
      "click",
      () => playTrack(track, category, button)
    );

    container.appendChild(button);

  });

}

createTrackRows(
  tracks.traditional,
  traditionalContainer,
  "TRADITIONAL AARTIS"
);

createTrackRows(
  tracks.anthems,
  anthemContainer,
  "FESTIVAL ANTHEMS"
);

function playTrack(
  track,
  category,
  selectedButton = null
) {

  currentTrack = track;

  audio.src = track.src;

  trackTitle.textContent = track.title;
  trackCategory.textContent = category;

  document.querySelectorAll(".track-row")
    .forEach(row => {

      row.classList.remove("active");

      const oldEq =
        row.querySelector(".eq");

      if (oldEq) {
        oldEq.remove();
      }

    });

  if (selectedButton) {

    selectedButton.classList.add("active");

    const number =
      selectedButton.querySelector(".track-number");

    number.innerHTML = `
      <span class="eq">
        <span></span>
        <span></span>
        <span></span>
      </span>
    `;

  }

  audio.play()
    .then(() => {

      player.classList.add("playing");

    })
    .catch(error => {

      console.warn(
        "Audio could not autoplay:",
        error
      );

    });

}

playButton.addEventListener(
  "click",
  () => {

    if (!currentTrack) {

      const firstButton =
        traditionalContainer.querySelector(
          ".track-row"
        );

      playTrack(
        tracks.traditional[0],
        "TRADITIONAL AARTIS",
        firstButton
      );

      return;
    }

    if (audio.paused) {

      audio.play();
      player.classList.add("playing");

    } else {

      audio.pause();
      player.classList.remove("playing");

    }

  }
);

audio.addEventListener(
  "timeupdate",
  () => {

    if (!audio.duration) return;

    const percent =
      (audio.currentTime / audio.duration) * 100;

    audioProgress.style.width =
      `${percent}%`;

    trackTime.textContent =
      `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;

  }
);

audio.addEventListener(
  "ended",
  () => {

    player.classList.remove("playing");

  }
);

function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remaining =
    Math.floor(seconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;

}

document
  .querySelector(".progress-track")
  .addEventListener(
    "click",
    event => {

      if (!audio.duration) return;

      const rect =
        event.currentTarget.getBoundingClientRect();

      const percentage =
        (event.clientX - rect.left) /
        rect.width;

      audio.currentTime =
        percentage * audio.duration;

    }
  );

/* =========================================================
   SCROLL REVEAL
========================================================= */

const timelineItems =
  document.querySelectorAll(".timeline-item");

const revealObserver =
  new IntersectionObserver(
    entries => {

      entries.forEach(entry => {

        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }

      });

    },
    {
      threshold: .15
    }
  );

timelineItems.forEach(
  item => revealObserver.observe(item)
);

/* =========================================================
   GALLERY LIGHTBOX
========================================================= */

const lightbox =
  document.getElementById("lightbox");

const lightboxImage =
  document.getElementById("lightboxImage");

const lightboxClose =
  document.getElementById("lightboxClose");

document
  .querySelectorAll(".gallery-item")
  .forEach(item => {

    item.addEventListener(
      "click",
      () => {

        const image =
          item.querySelector("img");

        if (!image) return;

        lightboxImage.src =
          image.src;

        lightboxImage.alt =
          image.alt;

        lightbox.classList.add("open");

        document.body.classList.add(
          "lightbox-open"
        );

      }
    );

  });

function closeLightbox() {

  lightbox.classList.remove("open");

  document.body.classList.remove(
    "lightbox-open"
  );

  lightboxImage.src = "";

}

lightboxClose.addEventListener(
  "click",
  closeLightbox
);

lightbox.addEventListener(
  "click",
  event => {

    if (event.target === lightbox) {
      closeLightbox();
    }

  }
);

document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {
      closeLightbox();
    }

  }
);
