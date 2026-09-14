/* =========================================================
   GANPATI PANDAL — ADMIN.JS
   COMPLETE ADMIN JAVASCRIPT
   Firebase Auth + Realtime Database + WebRTC
========================================================= */


/* =========================================================
   0. FORCE REMOVE PRELOADER
   This happens BEFORE Firebase initialization.
========================================================= */

(function removePreloaderImmediately() {

    function remove() {

        const preloader =
            document.getElementById("preloader");

        if (preloader) {
            preloader.remove();
        }

        document.documentElement.classList.remove("loading");

        if (document.body) {
            document.body.classList.remove("loading");
        }
    }

    remove();

    setTimeout(remove, 50);
    setTimeout(remove, 250);
    setTimeout(remove, 1000);
    setTimeout(remove, 3000);

})();


/* =========================================================
   1. FIREBASE IMPORTS
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
    push,
    remove,
    onValue,
    onChildAdded,
    onChildRemoved,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* =========================================================
   2. FIREBASE CONFIG
========================================================= */

const firebaseConfig = {

    apiKey:
        "AIzaSyACsEZt2RsdAtGq17KOPNYZRD3m9pPuwBM",

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
   3. FIREBASE INITIALIZATION
========================================================= */

let app = null;
let auth = null;
let database = null;

try {

    app = initializeApp(firebaseConfig);

    auth = getAuth(app);

    database = getDatabase(app);

    console.log(
        "Firebase initialized successfully."
    );

} catch (error) {

    console.error(
        "Firebase initialization failed:",
        error
    );

}


/* =========================================================
   4. HELPER
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


/* =========================================================
   5. ELEMENTS
========================================================= */

const loginPanel =
    getElement("loginPanel");

const loginForm =
    getElement("loginForm");

const emailInput =
    getElement("email");

const passwordInput =
    getElement("password");

const loginStatus =
    getElement("loginStatus");

const dashboard =
    getElement("dashboard");

const logoutBtn =
    getElement("logoutBtn");

const connectionState =
    getElement("connectionState");


/* =========================================================
   6. LOGIN
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (!auth) {

                if (loginStatus) {
                    loginStatus.textContent =
                        "Firebase is unavailable.";
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
                        "Please enter email and password.";
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


                let message =
                    "Login failed.";


                switch (error.code) {

                    case "auth/invalid-credential":
                        message =
                            "Invalid email or password.";
                        break;

                    case "auth/user-not-found":
                        message =
                            "User account not found.";
                        break;

                    case "auth/wrong-password":
                        message =
                            "Incorrect password.";
                        break;

                    case "auth/too-many-requests":
                        message =
                            "Too many attempts. Try again later.";
                        break;

                    case "auth/network-request-failed":
                        message =
                            "Network error. Check your internet.";
                        break;

                    default:
                        message =
                            error.message || "Login failed.";

                }


                if (loginStatus) {
                    loginStatus.textContent =
                        message;
                }

            }

        }
    );

}


/* =========================================================
   7. LOGOUT
========================================================= */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async function () {

            if (!auth) return;

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

}


/* =========================================================
   8. AUTH STATE
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


                startAdminDashboard();

            } else {

                console.log(
                    "No authenticated admin."
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
   9. FIREBASE CONNECTION
========================================================= */

function monitorFirebaseConnection() {

    if (!database) return;


    const connectionRef =
        ref(
            database,
            ".info/connected"
        );


    onValue(
        connectionRef,
        function (snapshot) {

            const connected =
                snapshot.val() === true;


            if (!connectionState) {
                return;
            }


            if (connected) {

                connectionState.textContent =
                    "Firebase Connected";

                connectionState.classList.add(
                    "online"
                );

                connectionState.classList.remove(
                    "offline"
                );

            } else {

                connectionState.textContent =
                    "Firebase Offline";

                connectionState.classList.add(
                    "offline"
                );

                connectionState.classList.remove(
                    "online"
                );

            }

        },
        function (error) {

            console.error(
                "Firebase connection error:",
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
   10. PRAYER WALL
========================================================= */

const adminPrayers =
    getElement("adminPrayers");


const prayerElements =
    new Map();


function createPrayerCard(
    id,
    prayer
) {

    const card =
        document.createElement("div");

    card.className =
        "admin-prayer-item";

    card.dataset.id =
        id;


    const prayerText =
        document.createElement("div");

    prayerText.className =
        "admin-prayer-text";

    prayerText.textContent =
        prayer.text || "";


    const prayerDate =
        document.createElement("div");

    prayerDate.className =
        "admin-prayer-meta";


    if (prayer.createdAt) {

        try {

            prayerDate.textContent =
                new Date(
                    prayer.createdAt
                ).toLocaleString(
                    "en-IN"
                );

        } catch {

            prayerDate.textContent =
                "";

        }

    }


    const deleteButton =
        document.createElement("button");

    deleteButton.type =
        "button";

    deleteButton.className =
        "delete-prayer";

    deleteButton.textContent =
        "Delete";


    deleteButton.addEventListener(
        "click",
        async function () {

            const confirmed =
                window.confirm(
                    "Delete this Sankalp?"
                );


            if (!confirmed) {
                return;
            }


            try {

                await remove(
                    ref(
                        database,
                        "pandal/prayers_wall/" +
                        id
                    )
                );


            } catch (error) {

                console.error(
                    "Delete prayer error:",
                    error
                );


                window.alert(
                    "Could not delete the Sankalp."
                );

            }

        }
    );


    card.appendChild(
        prayerText
    );

    card.appendChild(
        prayerDate
    );

    card.appendChild(
        deleteButton
    );


    return card;
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


            if (!id || !prayer) {
                return;
            }


            const card =
                createPrayerCard(
                    id,
                    prayer
                );


            prayerElements.set(
                id,
                card
            );


            adminPrayers.prepend(
                card
            );

        },
        function (error) {

            console.error(
                "Prayer listener error:",
                error
            );


            adminPrayers.textContent =
                "Unable to load Sankalps.";

        }
    );


    onChildRemoved(
        prayersRef,
        function (snapshot) {

            const id =
                snapshot.key;


            const card =
                prayerElements.get(
                    id
                );


            if (card) {
                card.remove();
            }


            prayerElements.delete(
                id
            );

        }
    );

}


/* =========================================================
   11. ANNOUNCEMENTS
========================================================= */

const announcementForm =
    getElement("announcementForm");

const announcementTitle =
    getElement("announcementTitle");

const announcementText =
    getElement("announcementText");

const announcementStatus =
    getElement("announcementStatus");


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


            if (!auth || !auth.currentUser) {

                if (announcementStatus) {
                    announcementStatus.textContent =
                        "Please login again.";
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
                        "Enter a title and message.";
                }

                return;
            }


            if (announcementStatus) {
                announcementStatus.textContent =
                    "Publishing...";
            }


            try {

                const newAnnouncement =
                    push(
                        ref(
                            database,
                            "pandal/announcements"
                        )
                    );


                await set(
                    newAnnouncement,
                    {

                        title:
                            title,

                        message:
                            message,

                        createdAt:
                            Date.now(),

                        author:
                            auth.currentUser.email ||
                            "Admin"

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
                        "Announcement published.";
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
   12. BROADCAST ELEMENTS
========================================================= */

const broadcastStatus =
    getElement("broadcastStatus");

const preview =
    getElement("preview");

const startBroadcastButton =
    getElement("startBroadcast");

const stopBroadcastButton =
    getElement("stopBroadcast");

const broadcastMessage =
    getElement("broadcastMessage");


/* =========================================================
   13. WEBRTC
========================================================= */

let localStream =
    null;

let broadcasting =
    false;

let viewerListenerStarted =
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
   14. BROADCAST MESSAGE
========================================================= */

function broadcastMessageShow(
    message
) {

    if (broadcastMessage) {

        broadcastMessage.textContent =
            message;

    }

}


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


            if (startBroadcastButton) {

                startBroadcastButton.disabled =
                    active;

            }


            if (stopBroadcastButton) {

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
   16. CREATE BROADCASTER PEER
========================================================= */

async function createBroadcasterPeer(
    viewerId
) {

    if (!broadcasting) {
        return null;
    }


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


    /* Add camera + microphone */

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


    /* ICE candidates */

    pc.onicecandidate =
        async function (event) {

            if (!event.candidate) {
                return;
            }


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
                "connection:",
                pc.connectionState
            );


            if (
                pc.connectionState ===
                    "failed" ||
                pc.connectionState ===
                    "closed"
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


    /* Wait for viewer answer */

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


            if (!answer) {
                return;
            }


            if (
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
                    "Set remote answer error:",
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


            if (!candidate) {
                return;
            }


            try {

                await pc.addIceCandidate(
                    new RTCIceCandidate(
                        candidate
                    )
                );

            } catch (error) {

                console.error(
                    "Add viewer ICE error:",
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


    if (!database) {
        return;
    }


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
            "Close viewer signal error:",
            error
        );

    }

}


/* =========================================================
   18. LISTEN FOR VIEWERS
========================================================= */

function listenForViewers() {

    if (!database) {
        return;
    }


    if (viewerListenerStarted) {
        return;
    }


    viewerListenerStarted =
        true;


    const viewersRef =
        ref(
            database,
            "pandal/viewers"
        );


    onChildAdded(
        viewersRef,
        async function (snapshot) {

            if (!broadcasting) {
                return;
            }


            const viewerId =
                snapshot.key;


            if (!viewerId) {
                return;
            }


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
                    "Viewer connection error:",
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


            if (viewerId) {

                closeViewer(
                    viewerId
                );

            }

        }
    );

}


/* =========================================================
   19. START BROADCAST
========================================================= */

async function startBroadcast() {

    if (broadcasting) {
        return;
    }


    if (!database) {

        broadcastMessageShow(
            "Firebase is unavailable."
        );

        return;
    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        broadcastMessageShow(
            "Camera is not supported."
        );

        return;
    }


    broadcastMessageShow(
        "Requesting camera permission..."
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


        viewerListenerStarted =
            false;


        listenForViewers();


        broadcastMessageShow(
            "Live Darshan is LIVE."
        );


        console.log(
            "Broadcast started."
        );


    } catch (error) {

        console.error(
            "Start broadcast error:",
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


        if (
            error.name ===
            "NotAllowedError"
        ) {

            broadcastMessageShow(
                "Camera or microphone permission denied."
            );

        }

        else if (
            error.name ===
            "NotFoundError"
        ) {

            broadcastMessageShow(
                "Camera or microphone not found."
            );

        }

        else {

            broadcastMessageShow(
                "Could not start broadcast."
            );

        }

    }

}


/* =========================================================
   20. STOP BROADCAST
========================================================= */

async function stopBroadcast() {

    broadcasting =
        false;


    /* Stop local camera */

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


    /* Close all viewer connections */

    for (
        const [
            viewerId,
            pc
        ] of peerConnections
    ) {

        try {
            pc.close();
        } catch {}


        if (database) {

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

    }


    peerConnections.clear();


    if (!database) {
        return;
    }


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


        broadcastMessageShow(
            "Live Darshan stopped."
        );


    } catch (error) {

        console.error(
            "Stop broadcast error:",
            error
        );


        broadcastMessageShow(
            "Broadcast stopped locally."
        );

    }

}


/* =========================================================
   21. BROADCAST BUTTONS
========================================================= */

if (startBroadcastButton) {

    startBroadcastButton.addEventListener(
        "click",
        function () {

            startBroadcast();

        }
    );

}


if (stopBroadcastButton) {

    stopBroadcastButton.addEventListener(
        "click",
        function () {

            stopBroadcast();

        }
    );

}


/* =========================================================
   22. ADMIN DASHBOARD START
========================================================= */

let dashboardStarted =
    false;


function startAdminDashboard() {

    if (dashboardStarted) {
        return;
    }


    dashboardStarted =
        true;


    console.log(
        "Admin dashboard starting..."
    );


    monitorFirebaseConnection();

    loadPrayers();

    loadBroadcastStatus();


    console.log(
        "Admin dashboard ready."
    );

}


/* =========================================================
   23. GLOBAL ERROR LOGGING
========================================================= */

window.addEventListener(
    "error",
    function (event) {

        console.error(
            "ADMIN JS ERROR:",
            event.error ||
            event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    function (event) {

        console.error(
            "ADMIN PROMISE ERROR:",
            event.reason
        );

    }
);


/* =========================================================
   24. FINAL PRELOADER SAFETY
========================================================= */

function finalPreloaderRemoval() {

    const p =
        document.getElementById(
            "preloader"
        );

    if (p) {
        p.remove();
    }

}


setTimeout(
    finalPreloaderRemoval,
    100
);

setTimeout(
    finalPreloaderRemoval,
    1000
);

setTimeout(
    finalPreloaderRemoval,
    5000
);


console.log(
    "GANPATI ADMIN.JS LOADED SUCCESSFULLY"
);
