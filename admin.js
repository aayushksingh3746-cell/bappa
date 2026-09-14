/* =========================================================
   GANPATI PANDAL — ADMIN.JS
   LIVE BROADCAST + FIREBASE
========================================================= */


/* =========================================================
   PRELOADER
========================================================= */

(function () {

    function removePreloader() {

        const preloader =
            document.getElementById("preloader");

        if (!preloader) return;

        preloader.style.display = "none";
        preloader.style.opacity = "0";
        preloader.style.visibility = "hidden";
        preloader.style.pointerEvents = "none";

        if (preloader.parentNode) {
            preloader.remove();
        }
    }

    removePreloader();

    setTimeout(removePreloader, 100);
    setTimeout(removePreloader, 500);
    setTimeout(removePreloader, 1500);
    setTimeout(removePreloader, 3000);

})();


/* =========================================================
   FIREBASE
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
   CONFIG
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


const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const database =
    getDatabase(app);


/* =========================================================
   HELPERS
========================================================= */

function el(id) {
    return document.getElementById(id);
}


/* =========================================================
   ELEMENTS
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

const adminPrayers =
    el("adminPrayers");

const announcementForm =
    el("announcementForm");

const announcementTitle =
    el("announcementTitle");

const announcementText =
    el("announcementText");

const announcementStatus =
    el("announcementStatus");

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
   LOGIN
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            if (!email || !password) {

                loginStatus.textContent =
                    "Enter your email and password.";

                return;
            }

            loginStatus.textContent =
                "Signing in...";

            try {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                loginStatus.textContent =
                    "Login successful.";

            } catch (error) {

                console.error(error);

                if (
                    error.code ===
                    "auth/invalid-credential"
                ) {

                    loginStatus.textContent =
                        "Invalid email or password.";

                } else {

                    loginStatus.textContent =
                        error.message ||
                        "Login failed.";

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
        async () => {

            await stopBroadcast();

            await signOut(auth);

        }
    );

}


/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
    auth,
    (user) => {

        if (user) {

            loginPanel.classList.add(
                "hidden"
            );

            dashboard.classList.remove(
                "hidden"
            );

            logoutBtn.classList.remove(
                "hidden"
            );

            initializeDashboard();

        } else {

            loginPanel.classList.remove(
                "hidden"
            );

            dashboard.classList.add(
                "hidden"
            );

            logoutBtn.classList.add(
                "hidden"
            );

        }

    }
);


/* =========================================================
   CONNECTION
========================================================= */

function monitorConnection() {

    const connectedRef =
        ref(
            database,
            ".info/connected"
        );

    onValue(
        connectedRef,
        (snapshot) => {

            const connected =
                snapshot.val() === true;

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

        }
    );

}


/* =========================================================
   PRAYERS
========================================================= */

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
            ).toLocaleString("en-IN");

    }

    const deleteButton =
        document.createElement("button");

    deleteButton.type =
        "button";

    deleteButton.className =
        "delete-prayer";

    deleteButton.textContent =
        "Delete";

    deleteButton.onclick =
        async () => {

            if (
                !confirm(
                    "Delete this Sankalp?"
                )
            ) return;

            try {

                await remove(
                    ref(
                        database,
                        `pandal/prayers_wall/${id}`
                    )
                );

            } catch (error) {

                console.error(error);

            }

        };

    card.appendChild(text);
    card.appendChild(date);
    card.appendChild(deleteButton);

    return card;
}


function loadPrayers() {

    if (!adminPrayers) return;

    const prayersRef =
        ref(
            database,
            "pandal/prayers_wall"
        );

    onChildAdded(
        prayersRef,
        (snapshot) => {

            const id =
                snapshot.key;

            const prayer =
                snapshot.val();

            if (!id || !prayer) return;

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

        }
    );

    onChildRemoved(
        prayersRef,
        (snapshot) => {

            const card =
                prayerCards.get(
                    snapshot.key
                );

            if (card) {
                card.remove();
            }

            prayerCards.delete(
                snapshot.key
            );

        }
    );

}


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

if (announcementForm) {

    announcementForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const title =
                announcementTitle.value.trim();

            const message =
                announcementText.value.trim();

            if (!title || !message) {

                announcementStatus.textContent =
                    "Enter title and message.";

                return;
            }

            announcementStatus.textContent =
                "Publishing...";

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

                        title,

                        message,

                        createdAt:
                            Date.now(),

                        author:
                            auth.currentUser?.email ||
                            "Admin"

                    }
                );

                announcementTitle.value =
                    "";

                announcementText.value =
                    "";

                announcementStatus.textContent =
                    "Announcement published.";

            } catch (error) {

                console.error(error);

                announcementStatus.textContent =
                    "Could not publish announcement.";

            }

        }
    );

}


/* =========================================================
   WEBRTC
========================================================= */

let localStream = null;

let broadcasting = false;

let broadcastId = null;

let viewersListener = null;

const peerConnections =
    new Map();

const pendingViewerCandidates =
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
        },

        {
            urls:
                "stun:stun2.l.google.com:19302"
        }

    ]

};


/* =========================================================
   MESSAGE
========================================================= */

function broadcastMessage(
    text
) {

    if (broadcastMessageElement()) {

        broadcastMessageElement()
            .textContent = text;

    }

}

function broadcastMessageElement() {
    return broadcastMessage;
}


/* =========================================================
   START BROADCAST
========================================================= */

async function startBroadcast() {

    if (broadcasting) return;

    try {

        broadcastMessage(
            "Requesting camera permission..."
        );


        localStream =
            await navigator
                .mediaDevices
                .getUserMedia({

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


        preview.srcObject =
            localStream;

        preview.muted =
            true;

        preview.playsInline =
            true;

        await preview.play()
            .catch(() => {});


        broadcasting =
            true;


        broadcastId =
            "broadcast-" +
            Date.now();


        /*
         * THIS IS IMPORTANT.
         * Public index.html listens to this node.
         */

        await set(
            ref(
                database,
                "pandal/broadcast"
            ),
            {

                active:
                    true,

                id:
                    broadcastId,

                startedAt:
                    Date.now()

            }
        );


        broadcastStatus.textContent =
            "LIVE";

        broadcastStatus.classList.add(
            "live"
        );


        startBroadcastButton.disabled =
            true;

        stopBroadcastButton.disabled =
            false;


        broadcastMessage(
            "Live Darshan is now LIVE."
        );


        listenForViewers();


        console.log(
            "BROADCAST STARTED:",
            broadcastId
        );


    } catch (error) {

        console.error(
            "Camera error:",
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

        if (
            error.name ===
            "NotAllowedError"
        ) {

            broadcastMessage(
                "Camera permission was denied."
            );

        } else {

            broadcastMessage(
                error.message ||
                "Could not start camera."
            );

        }

    }

}


/* =========================================================
   LISTEN FOR VIEWERS
========================================================= */

function listenForViewers() {

    if (viewersListener) {
        return;
    }


    const viewersRef =
        ref(
            database,
            "pandal/viewers"
        );


    viewersListener =
        onChildAdded(
            viewersRef,
            async (snapshot) => {

                if (!broadcasting) {
                    return;
                }


                const viewerId =
                    snapshot.key;


                if (!viewerId) {
                    return;
                }


                console.log(
                    "VIEWER JOINED:",
                    viewerId
                );


                try {

                    await createPeerConnection(
                        viewerId
                    );

                } catch (error) {

                    console.error(
                        "Viewer connection error:",
                        error
                    );

                }

            }
        );

}


/* =========================================================
   CREATE PEER CONNECTION
========================================================= */

async function createPeerConnection(
    viewerId
) {

    if (
        peerConnections.has(
            viewerId
        )
    ) {

        return;

    }


    const pc =
        new RTCPeerConnection(
            rtcConfig
        );


    peerConnections.set(
        viewerId,
        pc
    );


    /*
     * Send camera + microphone.
     */

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                (track) => {

                    pc.addTrack(
                        track,
                        localStream
                    );

                }
            );

    }


    /*
     * ICE candidates.
     */

    pc.onicecandidate =
        async (event) => {

            if (!event.candidate) {
                return;
            }

            try {

                const candidateRef =
                    push(
                        ref(
                            database,
                            `pandal/signals/${viewerId}/broadcasterCandidates`
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


    /*
     * Connection state.
     */

    pc.onconnectionstatechange =
        () => {

            console.log(
                "Viewer",
                viewerId,
                "=>",
                pc.connectionState
            );

            if (
                pc.connectionState ===
                "failed"
            ) {

                console.warn(
                    "Connection failed:",
                    viewerId
                );

            }

            if (
                pc.connectionState ===
                "closed"
            ) {

                peerConnections.delete(
                    viewerId
                );

            }

        };


    /*
     * CREATE OFFER
     */

    const offer =
        await pc.createOffer({

            offerToReceiveAudio:
                false,

            offerToReceiveVideo:
                false

        });


    await pc.setLocalDescription(
        offer
    );


    /*
     * Publish offer.
     */

    await set(
        ref(
            database,
            `pandal/signals/${viewerId}/offer`
        ),
        {

            type:
                offer.type,

            sdp:
                offer.sdp

        }
    );


    console.log(
        "OFFER SENT:",
        viewerId
    );


    /*
     * ANSWER
     */

    onValue(
        ref(
            database,
            `pandal/signals/${viewerId}/answer`
        ),
        async (snapshot) => {

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


                console.log(
                    "ANSWER RECEIVED:",
                    viewerId
                );


                /*
                 * Add candidates that arrived
                 * before the answer.
                 */

                const queued =
                    pendingViewerCandidates.get(
                        viewerId
                    ) || [];


                for (
                    const candidate
                    of queued
                ) {

                    try {

                        await pc.addIceCandidate(
                            new RTCIceCandidate(
                                candidate
                            )
                        );

                    } catch (error) {

                        console.warn(
                            "Queued ICE error:",
                            error
                        );

                    }

                }


                pendingViewerCandidates.delete(
                    viewerId
                );


            } catch (error) {

                console.error(
                    "Answer handling error:",
                    error
                );

            }

        }
    );


    /*
     * VIEWER ICE
     */

    onChildAdded(
        ref(
            database,
            `pandal/signals/${viewerId}/viewerCandidates`
        ),
        async (snapshot) => {

            const candidate =
                snapshot.val();

            if (!candidate) {
                return;
            }


            /*
             * IMPORTANT:
             * Don't lose ICE candidates that arrive
             * before the viewer answer.
             */

            if (
                !pc.remoteDescription
            ) {

                if (
                    !pendingViewerCandidates.has(
                        viewerId
                    )
                ) {

                    pendingViewerCandidates.set(
                        viewerId,
                        []
                    );

                }


                pendingViewerCandidates
                    .get(viewerId)
                    .push(candidate);

                return;
            }


            try {

                await pc.addIceCandidate(
                    new RTCIceCandidate(
                        candidate
                    )
                );

            } catch (error) {

                console.warn(
                    "Viewer ICE error:",
                    error
                );

            }

        }
    );

}


/* =========================================================
   STOP BROADCAST
========================================================= */

async function stopBroadcast() {

    broadcasting =
        false;


    /*
     * Close all peer connections.
     */

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
                    `pandal/signals/${viewerId}/closed`
                ),
                true
            );

        } catch {}

    }


    peerConnections.clear();


    pendingViewerCandidates.clear();


    /*
     * Stop camera.
     */

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


    /*
     * Tell public website that stream
     * is OFFLINE.
     */

    try {

        await set(
            ref(
                database,
                "pandal/broadcast"
            ),
            {

                active:
                    false,

                id:
                    broadcastId,

                stoppedAt:
                    Date.now()

            }
        );

    } catch (error) {

        console.error(
            "Stop broadcast Firebase error:",
            error
        );

    }


    broadcastId =
        null;


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


    broadcastMessage(
        "Live Darshan stopped."
    );


    console.log(
        "BROADCAST STOPPED"
    );

}


/* =========================================================
   BUTTONS
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
   EXISTING BROADCAST STATUS
========================================================= */

function monitorBroadcastStatus() {

    const broadcastRef =
        ref(
            database,
            "pandal/broadcast"
        );


    onValue(
        broadcastRef,
        (snapshot) => {

            const data =
                snapshot.val();


            if (
                data &&
                data.active === true
            ) {

                broadcastStatus.textContent =
                    "LIVE";

                broadcastStatus.classList.add(
                    "live"
                );

                startBroadcastButton.disabled =
                    true;

                stopBroadcastButton.disabled =
                    false;

            } else {

                broadcastStatus.textContent =
                    "Offline";

                broadcastStatus.classList.remove(
                    "live"
                );

                startBroadcastButton.disabled =
                    false;

                stopBroadcastButton.disabled =
                    true;

            }

        }
    );

}


/* =========================================================
   DASHBOARD
========================================================= */

let dashboardStarted =
    false;


function initializeDashboard() {

    if (dashboardStarted) {
        return;
    }

    dashboardStarted =
        true;

    monitorConnection();

    loadPrayers();

    monitorBroadcastStatus();

}


/* =========================================================
   ERROR LOGGING
========================================================= */

window.addEventListener(
    "error",
    (event) => {

        console.error(
            "ADMIN ERROR:",
            event.error ||
            event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    (event) => {

        console.error(
            "ADMIN PROMISE ERROR:",
            event.reason
        );

    }
);


console.log(
    "GANPATI ADMIN.JS READY"
);
