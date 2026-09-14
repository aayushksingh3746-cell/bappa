/* =========================================================
   GANPATI PANDAL — ADMIN.JS
========================================================= */


/* =========================================================
   PRELOADER
   IMPORTANT:
   This is deliberately placed BEFORE Firebase code.
========================================================= */

(function () {

    function removePreloader() {

        const preloader =
            document.getElementById("preloader");

        if (preloader) {

            preloader.style.display = "none";
            preloader.style.opacity = "0";
            preloader.style.visibility = "hidden";
            preloader.style.pointerEvents = "none";

            preloader.remove();
        }

    }


    // Remove immediately if DOM is already available
    removePreloader();


    // Extra safety
    setTimeout(removePreloader, 100);
    setTimeout(removePreloader, 500);
    setTimeout(removePreloader, 1500);
    setTimeout(removePreloader, 3000);


})();


/* =========================================================
   FIREBASE IMPORTS
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
   FIREBASE CONFIG
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
   FIREBASE INITIALIZATION
========================================================= */

let app = null;
let auth = null;
let database = null;

try {

    app = initializeApp(firebaseConfig);

    auth = getAuth(app);

    database = getDatabase(app);

    console.log(
        "Firebase initialized."
    );

} catch (error) {

    console.error(
        "Firebase initialization error:",
        error
    );

}


/* =========================================================
   ELEMENT HELPER
========================================================= */

function el(id) {
    return document.getElementById(id);
}


/* =========================================================
   LOGIN ELEMENTS
========================================================= */

const loginPanel =
    el("loginPanel");

const loginForm =
    el("loginForm");

const emailInput =
    el("email");

const passwordInput =
    el("password");

const loginStatus =
    el("loginStatus");

const dashboard =
    el("dashboard");

const logoutBtn =
    el("logoutBtn");

const connectionState =
    el("connectionState");


/* =========================================================
   LOGIN
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
                        "User not found.";

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
                    "auth/network-request-failed"
                ) {

                    message =
                        "Network error.";

                }

                else {

                    message =
                        error.message ||
                        "Login failed.";

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
   LOGOUT
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
   AUTH STATE
========================================================= */

if (auth) {

    onAuthStateChanged(
        auth,
        function (user) {

            if (user) {

                console.log(
                    "Logged in:",
                    user.email
                );


                if (loginPanel) {

                    loginPanel.classList.add(
                        "hidden"
                    );

                }


                if (dashboard) {

                    dashboard.classList.remove(
                        "hidden"
                    );

                }


                if (logoutBtn) {

                    logoutBtn.classList.remove(
                        "hidden"
                    );

                }


                initializeDashboard();

            }

            else {

                if (loginPanel) {

                    loginPanel.classList.remove(
                        "hidden"
                    );

                }


                if (dashboard) {

                    dashboard.classList.add(
                        "hidden"
                    );

                }


                if (logoutBtn) {

                    logoutBtn.classList.add(
                        "hidden"
                    );

                }

            }

        }
    );

}


/* =========================================================
   FIREBASE CONNECTION STATUS
========================================================= */

function monitorConnection() {

    if (!database) return;


    const connectedRef =
        ref(
            database,
            ".info/connected"
        );


    onValue(
        connectedRef,

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

            }

            else {

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
                "Connection error:",
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
   PRAYER WALL
========================================================= */

const adminPrayers =
    el("adminPrayers");


const prayerCards =
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


    const text =
        document.createElement("div");

    text.className =
        "admin-prayer-text";

    text.textContent =
        prayer.text || "";


    const date =
        document.createElement("div");

    date.className =
        "admin-prayer-meta";


    if (prayer.createdAt) {

        date.textContent =
            new Date(
                prayer.createdAt
            ).toLocaleString(
                "en-IN"
            );

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

            if (
                !window.confirm(
                    "Delete this Sankalp?"
                )
            ) {
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
                    "Prayer deletion error:",
                    error
                );


                window.alert(
                    "Unable to delete prayer."
                );

            }

        }
    );


    card.appendChild(text);
    card.appendChild(date);
    card.appendChild(deleteButton);


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


            prayerCards.set(
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
                "Unable to load prayers.";

        }
    );


    onChildRemoved(
        prayersRef,

        function (snapshot) {

            const id =
                snapshot.key;


            const card =
                prayerCards.get(
                    id
                );


            if (card) {
                card.remove();
            }


            prayerCards.delete(
                id
            );

        }
    );

}


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

const announcementForm =
    el("announcementForm");

const announcementTitle =
    el("announcementTitle");

const announcementText =
    el("announcementText");

const announcementStatus =
    el("announcementStatus");


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
                        "Enter title and message.";
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
   BROADCAST ELEMENTS
========================================================= */

const broadcastStatus =
    el("broadcastStatus");

const preview =
    el("preview");

const startBroadcastButton =
    el("startBroadcast");

const stopBroadcastButton =
    el("stopBroadcast");

const broadcastMessage =
    el("broadcastMessage");


/* =========================================================
   WEBRTC VARIABLES
========================================================= */

let localStream =
    null;

let broadcasting =
    false;

let viewerListenerStarted =
    false;


const peerConnections =
    new Map();


const rtcConfig = {

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
   BROADCAST STATUS
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
                        : "Offline";


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
   BROADCAST MESSAGE
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
   CREATE WEBRTC PEER
========================================================= */

async function createPeer(
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
            rtcConfig
        );


    peerConnections.set(
        viewerId,
        pc
    );


    /* Camera + microphone */

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


    /* ICE */

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
                    "ICE error:",
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
                pc.connectionState
            );


            if (
                pc.connectionState ===
                    "failed" ||
                pc.connectionState ===
                    "closed"
            ) {

                closePeer(
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
                    "Answer error:",
                    error
                );

            }

        }
    );


    /* Viewer ICE */

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
                    "Viewer candidate error:",
                    error
                );

            }

        }
    );


    return pc;
}


/* =========================================================
   CLOSE PEER
========================================================= */

async function closePeer(
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
            "Close peer error:",
            error
        );

    }

}


/* =========================================================
   LISTEN FOR VIEWERS
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
                "Viewer joined:",
                viewerId
            );


            try {

                await createPeer(
                    viewerId
                );

            } catch (error) {

                console.error(
                    "Peer creation error:",
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

                closePeer(
                    viewerId
                );

            }

        }
    );

}


/* =========================================================
   START CAMERA BROADCAST
========================================================= */

async function startBroadcast() {

    if (broadcasting) {
        return;
    }


    if (!database) {

        showBroadcastMessage(
            "Firebase is unavailable."
        );

        return;
    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        showBroadcastMessage(
            "Camera is not supported."
        );

        return;
    }


    showBroadcastMessage(
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


        if (startBroadcastButton) {

            startBroadcastButton.disabled =
                true;

        }


        if (stopBroadcastButton) {

            stopBroadcastButton.disabled =
                false;

        }


        if (broadcastStatus) {

            broadcastStatus.textContent =
                "LIVE";

            broadcastStatus.classList.add(
                "live"
            );

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


        showBroadcastMessage(
            "Live Darshan is now LIVE."
        );


    } catch (error) {

        console.error(
            "Broadcast error:",
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

            showBroadcastMessage(
                "Camera or microphone permission denied."
            );

        }

        else {

            showBroadcastMessage(
                "Could not start camera."
            );

        }

    }

}


/* =========================================================
   STOP BROADCAST
========================================================= */

async function stopBroadcast() {

    broadcasting =
        false;


    /* Stop camera */

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


    /* Close peers */

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


    if (database) {

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

        } catch (error) {

            console.error(
                "Broadcast stop Firebase error:",
                error
            );

        }

    }


    if (broadcastStatus) {

        broadcastStatus.textContent =
            "Offline";

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

}


/* =========================================================
   BUTTON EVENTS
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
   DASHBOARD INITIALIZATION
========================================================= */

let dashboardInitialized =
    false;


function initializeDashboard() {

    if (dashboardInitialized) {
        return;
    }


    dashboardInitialized =
        true;


    console.log(
        "Initializing dashboard..."
    );


    monitorConnection();

    loadPrayers();

    loadBroadcastStatus();


    console.log(
        "Dashboard initialized."
    );

}


/* =========================================================
   ERROR LOGGING
========================================================= */

window.addEventListener(
    "error",
    function (event) {

        console.error(
            "ADMIN ERROR:",
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


console.log(
    "ADMIN.JS LOADED"
);
