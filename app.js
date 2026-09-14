/* =========================================================
   GANPATI PANDAL — APP.JS
   PUBLIC WEBSITE
   NATIVE WEBRTC LIVE DARSHAN
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

const database =
    getDatabase(app);


/* =========================================================
   ELEMENTS
========================================================= */

const activeStreamUI =
    document.getElementById(
        "active-stream-ui"
    );

const offlineStreamUI =
    document.getElementById(
        "offline-stream-ui"
    );

const liveVideo =
    document.getElementById(
        "liveVideo"
    );


/* =========================================================
   PRELOADER
========================================================= */

function removePreloader() {

    const preloader =
        document.getElementById(
            "preloader"
        );

    if (!preloader) return;

    preloader.classList.add(
        "done"
    );

    setTimeout(
        () => {

            if (
                preloader &&
                preloader.parentNode
            ) {

                preloader.remove();

            }

        },
        800
    );

}


window.addEventListener(
    "load",
    () => {

        setTimeout(
            removePreloader,
            400
        );

    }
);


setTimeout(
    removePreloader,
    2200
);


/* =========================================================
   LIVE DARSHAN
========================================================= */

let viewerId =
    null;

let viewerPC =
    null;

let activeBroadcastId =
    null;

let offerListener =
    null;

let candidateListener =
    null;

let closedListener =
    null;

let remoteCandidateQueue =
    [];

let remoteDescriptionReady =
    false;

let connectedOnce =
    false;


const rtcConfiguration = {

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
   UI
========================================================= */

function showOffline() {

    if (activeStreamUI) {

        activeStreamUI.classList.add(
            "hidden"
        );

    }


    if (offlineStreamUI) {

        offlineStreamUI.classList.remove(
            "hidden"
        );

    }


    if (liveVideo) {

        try {
            liveVideo.pause();
        } catch {}

        liveVideo.srcObject =
            null;

    }

}


function showLive() {

    if (offlineStreamUI) {

        offlineStreamUI.classList.add(
            "hidden"
        );

    }


    if (activeStreamUI) {

        activeStreamUI.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   CLEANUP
========================================================= */

function cleanupViewer() {

    console.log(
        "Cleaning viewer..."
    );


    if (offerListener) {

        offerListener();

        offerListener =
            null;

    }


    if (candidateListener) {

        candidateListener();

        candidateListener =
            null;

    }


    if (closedListener) {

        closedListener();

        closedListener =
            null;

    }


    if (viewerPC) {

        try {

            viewerPC.ontrack =
                null;

            viewerPC.onicecandidate =
                null;

            viewerPC.onconnectionstatechange =
                null;

            viewerPC.close();

        } catch {}

        viewerPC =
            null;

    }


    if (liveVideo) {

        liveVideo.srcObject =
            null;

    }


    viewerId =
        null;

    activeBroadcastId =
        null;

    remoteCandidateQueue =
        [];

    remoteDescriptionReady =
        false;

    connectedOnce =
        false;

}


/* =========================================================
   ADD QUEUED ICE
========================================================= */

async function addQueuedCandidates() {

    if (!viewerPC) return;

    if (!remoteDescriptionReady) {
        return;
    }


    while (
        remoteCandidateQueue.length
    ) {

        const candidate =
            remoteCandidateQueue.shift();


        try {

            await viewerPC.addIceCandidate(
                new RTCIceCandidate(
                    candidate
                )
            );

            console.log(
                "Queued ICE added"
            );

        } catch (error) {

            console.warn(
                "Queued ICE failed:",
                error
            );

        }

    }

}


/* =========================================================
   CREATE VIEWER
========================================================= */

async function createViewer(
    broadcastId
) {

    cleanupViewer();


    activeBroadcastId =
        String(
            broadcastId
        );


    viewerId =
        "viewer-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 10);


    console.log(
        "Creating viewer:",
        viewerId
    );


    viewerPC =
        new RTCPeerConnection(
            rtcConfiguration
        );


    /* -----------------------------------------------------
       RECEIVE CAMERA STREAM
    ----------------------------------------------------- */

    viewerPC.ontrack =
        (event) => {

            console.log(
                "================================"
            );

            console.log(
                "CAMERA STREAM RECEIVED"
            );

            console.log(
                "================================"
            );


            if (
                event.streams &&
                event.streams[0]
            ) {

                const stream =
                    event.streams[0];


                liveVideo.srcObject =
                    stream;


                liveVideo.autoplay =
                    true;

                liveVideo.playsInline =
                    true;

                liveVideo.muted =
                    true;


                showLive();


                const play =
                    liveVideo.play();


                if (play) {

                    play.catch(
                        () => {

                            /*
                             * Browser blocked
                             * autoplay.
                             */

                            console.log(
                                "Video autoplay blocked."
                            );

                        }
                    );

                }

            }

        };


    /* -----------------------------------------------------
       ICE
    ----------------------------------------------------- */

    viewerPC.onicecandidate =
        async (event) => {

            if (
                !event.candidate ||
                !viewerId
            ) {

                return;

            }


            try {

                const candidateRef =
                    push(
                        ref(
                            database,
                            `pandal/signals/${viewerId}/viewerCandidates`
                        )
                    );


                await set(
                    candidateRef,
                    event.candidate.toJSON()
                );


                console.log(
                    "Viewer ICE sent"
                );

            } catch (error) {

                console.error(
                    "Viewer ICE error:",
                    error
                );

            }

        };


    /* -----------------------------------------------------
       CONNECTION
    ----------------------------------------------------- */

    viewerPC.onconnectionstatechange =
        () => {

            const state =
                viewerPC.connectionState;


            console.log(
                "VIEWER CONNECTION:",
                state
            );


            if (
                state ===
                "connected"
            ) {

                connectedOnce =
                    true;

                showLive();

            }


            if (
                state ===
                    "failed" ||
                state ===
                    "closed"
            ) {

                console.warn(
                    "WebRTC connection failed."
                );

            }

        };


    /* -----------------------------------------------------
       REGISTER VIEWER
    ----------------------------------------------------- */

    await set(
        ref(
            database,
            `pandal/viewers/${viewerId}`
        ),
        {

            active:
                true,

            broadcastId:
                activeBroadcastId,

            createdAt:
                serverTimestamp()

        }
    );


    /* -----------------------------------------------------
       OFFER
    ----------------------------------------------------- */

    offerListener =
        onValue(
            ref(
                database,
                `pandal/signals/${viewerId}/offer`
            ),
            async (snapshot) => {

                const offer =
                    snapshot.val();


                if (!offer) {
                    return;
                }


                if (
                    viewerPC.remoteDescription
                ) {

                    return;

                }


                console.log(
                    "OFFER RECEIVED"
                );


                try {

                    await viewerPC.setRemoteDescription(
                        new RTCSessionDescription(
                            offer
                        )
                    );


                    remoteDescriptionReady =
                        true;


                    await addQueuedCandidates();


                    const answer =
                        await viewerPC.createAnswer();


                    await viewerPC.setLocalDescription(
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


                    console.log(
                        "ANSWER SENT"
                    );


                } catch (error) {

                    console.error(
                        "Offer error:",
                        error
                    );

                }

            }
        );


    /* -----------------------------------------------------
       BROADCASTER ICE
    ----------------------------------------------------- */

    candidateListener =
        onChildAdded(
            ref(
                database,
                `pandal/signals/${viewerId}/broadcasterCandidates`
            ),
            async (snapshot) => {

                const candidate =
                    snapshot.val();


                if (!candidate) {
                    return;
                }


                /*
                 * If the offer has not arrived yet,
                 * queue the candidate.
                 */

                if (
                    !remoteDescriptionReady
                ) {

                    remoteCandidateQueue.push(
                        candidate
                    );

                    console.log(
                        "ICE queued"
                    );

                    return;

                }


                try {

                    await viewerPC.addIceCandidate(
                        new RTCIceCandidate(
                            candidate
                        )
                    );


                    console.log(
                        "Broadcaster ICE added"
                    );

                } catch (error) {

                    console.warn(
                        "Broadcaster ICE error:",
                        error
                    );

                }

            }
        );


    /* -----------------------------------------------------
       CLOSED
    ----------------------------------------------------- */

    closedListener =
        onValue(
            ref(
                database,
                `pandal/signals/${viewerId}/closed`
            ),
            (snapshot) => {

                if (
                    snapshot.val() ===
                    true
                ) {

                    console.log(
                        "Broadcast ended."
                    );

                    cleanupViewer();

                    showOffline();

                }

            }
        );


    console.log(
        "VIEWER READY"
    );

}


/* =========================================================
   WATCH BROADCAST
========================================================= */

onValue(
    ref(
        database,
        "pandal/broadcast"
    ),
    async (snapshot) => {

        const broadcast =
            snapshot.val();


        console.log(
            "BROADCAST:",
            broadcast
        );


        /*
         * No stream.
         */

        if (
            !broadcast ||
            broadcast.active !== true
        ) {

            if (
                viewerPC ||
                viewerId
            ) {

                cleanupViewer();

            }

            showOffline();

            return;

        }


        /*
         * Stream is active.
         */

        const id =
            broadcast.id ||
            broadcast.startedAt;


        if (!id) {

            console.warn(
                "Broadcast active but no ID."
            );

            return;

        }


        /*
         * Don't recreate the connection
         * every time Firebase updates.
         */

        if (
            activeBroadcastId ===
            String(id)
        ) {

            return;

        }


        console.log(
            "ACTIVE BROADCAST FOUND:",
            id
        );


        await createViewer(
            id
        );

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
   TAP TO PLAY
========================================================= */

if (liveVideo) {

    liveVideo.addEventListener(
        "click",
        () => {

            if (
                liveVideo.srcObject
            ) {

                liveVideo.play()
                    .catch(() => {});

            }

        }
    );

}


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
   SANKALP
========================================================= */

const prayerForm =
    document.getElementById(
        "prayerForm"
    );

const prayerInput =
    document.getElementById(
        "prayerInput"
    );

const prayerStatus =
    document.getElementById(
        "prayerStatus"
    );

const prayerWall =
    document.getElementById(
        "prayerWall"
    );

const heroSankalp =
    document.getElementById(
        "heroSankalp"
    );


if (prayerForm) {

    prayerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const text =
                prayerInput.value.trim();

            if (!text) return;

            prayerStatus.textContent =
                "Offering your prayer...";

            try {

                const prayerRef =
                    push(
                        ref(
                            database,
                            "pandal/prayers_wall"
                        )
                    );


                await set(
                    prayerRef,
                    {

                        text,

                        createdAt:
                            serverTimestamp()

                    }
                );


                prayerInput.value =
                    "";

                prayerStatus.textContent =
                    "Your Sankalp has been offered. Ganpati Bappa Morya!";


                setTimeout(
                    () => {

                        prayerStatus.textContent =
                            "";

                    },
                    4000
                );


            } catch (error) {

                console.error(
                    error
                );

                prayerStatus.textContent =
                    "Unable to offer prayer.";

            }

        }
    );

}


if (heroSankalp) {

    heroSankalp.addEventListener(
        "click",
        () => {

            document
                .getElementById("sankalp")
                ?.scrollIntoView({
                    behavior:
                        "smooth"
                });

            setTimeout(
                () => {

                    prayerInput?.focus();

                },
                700
            );

        }
    );

}


/* =========================================================
   LOAD PRAYERS
========================================================= */

if (prayerWall) {

    onValue(
        ref(
            database,
            "pandal/prayers_wall"
        ),
        (snapshot) => {

            prayerWall.innerHTML =
                "";

            const data =
                snapshot.val();


            if (!data) {

                prayerWall.innerHTML =
                    `<div class="empty-state">
                        Be the first to offer a Sankalp.
                     </div>`;

                return;

            }


            Object.values(data)
                .reverse()
                .forEach(
                    (prayer) => {

                        const card =
                            document.createElement(
                                "article"
                            );

                        card.className =
                            "prayer-card";

                        card.textContent =
                            prayer.text ||
                            "";

                        prayerWall.appendChild(
                            card
                        );

                    }
                );

        }
    );

}


/* =========================================================
   INITIAL STATE
========================================================= */

showOffline();

console.log(
    "GANPATI PUBLIC APP READY"
);
