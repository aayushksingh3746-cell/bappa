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
  onValue,
  push,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* =========================================================
   FIREBASE CONFIG
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624",
  measurementId: "G-1J5J8CBVRD"
};


/* =========================================================
   INITIALIZE FIREBASE
========================================================= */

const firebaseApp =
  initializeApp(firebaseConfig);

const auth =
  getAuth(firebaseApp);

const db =
  getDatabase(firebaseApp);


/* =========================================================
   ELEMENTS
========================================================= */

const loginScreen =
  document.getElementById("loginScreen");

const dashboardShell =
  document.getElementById("dashboardShell");

const loginForm =
  document.getElementById("loginForm");

const authError =
  document.getElementById("authError");

const logoutButton =
  document.getElementById("logoutButton");

const liveToggle =
  document.getElementById("liveToggle");

const liveDashboardStatus =
  document.getElementById(
    "liveDashboardStatus"
  );

const adminUser =
  document.getElementById("adminUser");

const registrationCount =
  document.getElementById(
    "registrationCount"
  );

const helpCount =
  document.getElementById(
    "helpCount"
  );

const announcementForm =
  document.getElementById(
    "announcementForm"
  );

const announcementList =
  document.getElementById(
    "announcementList"
  );


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(
  auth,
  user => {

    if (user) {

      loginScreen.style.display =
        "none";

      dashboardShell.style.display =
        "block";

      adminUser.textContent =
        user.email || "[Authenticated User]";

      startDashboardListeners();

    } else {

      loginScreen.style.display =
        "grid";

      dashboardShell.style.display =
        "none";

    }

  }
);


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    authError.textContent = "";

    const email =
      document.getElementById("email")
        .value
        .trim();

    const password =
      document.getElementById("password")
        .value;

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    } catch (error) {

      console.error(error);

      authError.textContent =
        getFriendlyAuthError(error);

    }

  }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutButton.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  }
);


/* =========================================================
   LIVE STATE
========================================================= */

function startDashboardListeners() {

  const liveRef =
    ref(db, "live");

  onValue(
    liveRef,
    snapshot => {

      const data =
        snapshot.val() || {};

      const isLive =
        data.isLive === true;

      liveToggle.checked =
        isLive;

      liveDashboardStatus.textContent =
        isLive
          ? "LIVE"
          : "OFFLINE";

    }
  );


  /* ================= REGISTRATIONS ================= */

  const registrationsRef =
    ref(db, "registrations");

  onValue(
    registrationsRef,
    snapshot => {

      const data =
        snapshot.val() || {};

      registrationCount.textContent =
        Object.keys(data).length;

    }
  );


  /* ================= HELP ================= */

  const helpRef =
    ref(db, "helpRequests");

  onValue(
    helpRef,
    snapshot => {

      const data =
        snapshot.val() || {};

      helpCount.textContent =
        Object.keys(data).length;

    }
  );


  /* ================= ANNOUNCEMENTS ================= */

  const announcementsRef =
    query(
      ref(db, "announcements"),
      orderByChild("createdAt")
    );

  onValue(
    announcementsRef,
    snapshot => {

      announcementList.innerHTML = "";

      const data =
        snapshot.val() || {};

      const announcements =
        Object.values(data)
          .reverse();

      announcements.forEach(
        announcement => {

          const element =
            document.createElement("article");

          element.className =
            "announcement";

          element.innerHTML = `
            <strong>
              ${escapeHTML(
                announcement.title ||
                "[Announcement]"
              )}
            </strong>

            <p>
              ${escapeHTML(
                announcement.message ||
                ""
              )}
            </p>
          `;

          announcementList.appendChild(
            element
          );

        }
      );

    }
  );

}


/* =========================================================
   LIVE TOGGLE
========================================================= */

liveToggle.addEventListener(
  "change",
  async () => {

    const isLive =
      liveToggle.checked;

    try {

      await set(
        ref(db, "live"),
        {
          isLive,
          updatedAt: Date.now()
        }
      );

      liveDashboardStatus.textContent =
        isLive
          ? "LIVE"
          : "OFFLINE";

    } catch (error) {

      console.error(
        "Unable to update live status:",
        error
      );

      liveToggle.checked =
        !isLive;

    }

  }
);


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

announcementForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const title =
      document.getElementById(
        "announcementTitle"
      ).value.trim();

    const message =
      document.getElementById(
        "announcementMessage"
      ).value.trim();

    if (!title || !message) {
      return;
    }

    try {

      await push(
        ref(db, "announcements"),
        {
          title,
          message,
          createdAt: Date.now()
        }
      );

      announcementForm.reset();

    } catch (error) {

      console.error(
        "Announcement error:",
        error
      );

      alert(
        "Unable to publish announcement."
      );

    }

  }
);


/* =========================================================
   SECURITY HELPERS
========================================================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   FIREBASE AUTH ERRORS
========================================================= */

function getFriendlyAuthError(error) {

  switch (error.code) {

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/invalid-credential":
      return "Incorrect email or password.";

    case "auth/user-not-found":
      return "No admin account exists for this email.";

    case "auth/wrong-password":
      return "Incorrect password.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    default:
      return "Login failed. Please check your Firebase configuration.";

  }

}
