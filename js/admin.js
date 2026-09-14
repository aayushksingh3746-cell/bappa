// ============================================================
// GANPATI PANDAL — ADMIN DASHBOARD
// Simple Code-Based Admin Login
// ============================================================

// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",
  authDomain: "ganpati-5f24e.firebaseapp.com",
  databaseURL: "https://ganpati-5f24e-default-rtdb.firebaseio.com",
  projectId: "ganpati-5f24e",
  storageBucket: "ganpati-5f24e.firebasestorage.app",
  messagingSenderId: "512949354669",
  appId: "1:512949354669:web:f561488c630203a9ae4624",
  measurementId: "G-1J5J8CBVRD"
};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ============================================================
// ADMIN LOGIN
// ============================================================

// CHANGE THESE IF YOU WANT
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Ganpati@2026";


// ============================================================
// GET HTML ELEMENTS
// ============================================================

const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#dashboard");
const errorBox = document.querySelector("#loginError");

const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");

const logoutBtn = document.querySelector("#logoutBtn");


// ============================================================
// CHECK LOGIN STATUS
// ============================================================

function checkLogin() {

  const loggedIn = sessionStorage.getItem("ganpatiAdminLoggedIn");

  if (loggedIn === "true") {

    loginPanel.hidden = true;
    dashboard.hidden = false;

    loadDashboard();

  } else {

    loginPanel.hidden = false;
    dashboard.hidden = true;

  }
}


// ============================================================
// LOGIN
// ============================================================

if (loginForm) {

  loginForm.onsubmit = (e) => {

    e.preventDefault();

    errorBox.textContent = "";

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (
      username === ADMIN_USERNAME &&
      password === ADMIN_PASSWORD
    ) {

      sessionStorage.setItem(
        "ganpatiAdminLoggedIn",
        "true"
      );

      loginPanel.hidden = true;
      dashboard.hidden = false;

      usernameInput.value = "";
      passwordInput.value = "";

      loadDashboard();

    } else {

      errorBox.textContent =
        "Invalid username or password.";

      passwordInput.value = "";

    }

  };

}


// ============================================================
// LOGOUT
// ============================================================

if (logoutBtn) {

  logoutBtn.onclick = () => {

    sessionStorage.removeItem(
      "ganpatiAdminLoggedIn"
    );

    dashboard.hidden = true;
    loginPanel.hidden = false;

    if (errorBox) {
      errorBox.textContent = "";
    }

  };

}


// ============================================================
// LOAD DASHBOARD
// ============================================================

function loadDashboard() {

  loadLiveDarshan();
  loadEvents();

}


// ============================================================
// LIVE DARSHAN
// ============================================================

function loadLiveDarshan() {

  const liveRef = ref(db, "liveDarshan");

  onValue(liveRef, (snap) => {

    const data = snap.val() || {};

    const online = Boolean(data.online);

    const liveToggle =
      document.querySelector("#liveToggle");

    const liveStatusText =
      document.querySelector("#liveStatusText");

    if (liveToggle) {
      liveToggle.checked = online;
    }

    if (liveStatusText) {

      liveStatusText.textContent =
        online ? "Online" : "Offline";

    }

  });

}


// ============================================================
// CHANGE LIVE STATUS
// ============================================================

const liveToggle =
  document.querySelector("#liveToggle");

if (liveToggle) {

  liveToggle.onchange = async (e) => {

    try {

      await set(
        ref(db, "liveDarshan"),
        {
          online: e.target.checked,
          updatedAt: Date.now()
        }
      );

    } catch (error) {

      console.error(
        "Unable to update Live Darshan:",
        error
      );

      e.target.checked = !e.target.checked;

    }

  };

}


// ============================================================
// EVENT FORM
// ============================================================

const form =
  document.querySelector("#eventForm");

if (form) {

  form.onsubmit = async (e) => {

    e.preventDefault();

    try {

      const id =
        document.querySelector("#eventId").value;

      const data = {

        title:
          document
            .querySelector("#eventTitle")
            .value
            .trim(),

        time:
          document
            .querySelector("#eventTime")
            .value
            .trim(),

        description:
          document
            .querySelector("#eventDescription")
            .value
            .trim(),

        active:
          document
            .querySelector("#eventActive")
            .checked,

        order: Date.now()

      };


      const target = id
        ? ref(db, `events/${id}`)
        : push(ref(db, "events"));


      await set(target, data);

      resetForm();

    } catch (error) {

      console.error(
        "Unable to save event:",
        error
      );

      alert(
        "Could not save the event. Check Firebase Database rules."
      );

    }

  };

}


// ============================================================
// CANCEL EDIT
// ============================================================

const cancelEdit =
  document.querySelector("#cancelEdit");

if (cancelEdit) {

  cancelEdit.onclick = resetForm;

}


// ============================================================
// RESET EVENT FORM
// ============================================================

function resetForm() {

  if (form) {
    form.reset();
  }

  const eventId =
    document.querySelector("#eventId");

  if (eventId) {
    eventId.value = "";
  }

}


// ============================================================
// LOAD EVENTS
// ============================================================

function loadEvents() {

  onValue(
    ref(db, "events"),
    (snap) => {

      renderAdminEvents(
        snap.val() || {}
      );

    }
  );

}


// ============================================================
// RENDER EVENTS
// ============================================================

function renderAdminEvents(data) {

  const entries =
    Object.entries(data)
      .sort(
        ([, a], [, b]) =>
          (a.order ?? 0) -
          (b.order ?? 0)
      );


  const eventCount =
    document.querySelector("#eventCount");

  const eventList =
    document.querySelector("#eventList");


  if (eventCount) {

    eventCount.textContent =
      entries.length;

  }


  if (!eventList) {
    return;
  }


  if (!entries.length) {

    eventList.innerHTML =
      "<p>No timeline nodes yet.</p>";

    return;

  }


  eventList.innerHTML =
    entries
      .map(
        ([id, x]) => `

          <div class="admin-event">

            <div>

              <strong>
                ${esc(x.title)}
              </strong>

              <small>
                ${esc(x.time)}
                ${x.active
                  ? " • ACTIVE/NEXT"
                  : ""}
              </small>

              <small>
                ${esc(x.description || "")}
              </small>

            </div>

            <div class="event-actions">

              <button
                type="button"
                data-edit="${id}">
                Edit
              </button>

              <button
                type="button"
                data-delete="${id}">
                Delete
              </button>

            </div>

          </div>

        `
      )
      .join("");


  // EDIT BUTTONS

  document
    .querySelectorAll("[data-edit]")
    .forEach((button) => {

      button.onclick = () => {

        const id =
          button.dataset.edit;

        editEvent(
          id,
          data[id]
        );

      };

    });


  // DELETE BUTTONS

  document
    .querySelectorAll("[data-delete]")
    .forEach((button) => {

      button.onclick = async () => {

        const id =
          button.dataset.delete;

        if (
          confirm(
            "Delete this timeline event?"
          )
        ) {

          try {

            await remove(
              ref(db, `events/${id}`)
            );

          } catch (error) {

            console.error(
              "Delete failed:",
              error
            );

            alert(
              "Could not delete event. Check Firebase Database rules."
            );

          }

        }

      };

    });

}


// ============================================================
// EDIT EVENT
// ============================================================

function editEvent(id, x) {

  document.querySelector("#eventId").value =
    id;

  document.querySelector("#eventTitle").value =
    x.title || "";

  document.querySelector("#eventTime").value =
    x.time || "";

  document.querySelector("#eventDescription").value =
    x.description || "";

  document.querySelector("#eventActive").checked =
    !!x.active;


  const eventForm =
    document.querySelector("#eventForm");

  if (eventForm) {

    window.scrollTo({

      top:
        eventForm.offsetTop - 100,

      behavior: "smooth"

    });

  }

}


// ============================================================
// HTML ESCAPE
// ============================================================

function esc(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      (character) => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"

      }[character])
    );

}


// ============================================================
// START
// ============================================================

checkLogin();
