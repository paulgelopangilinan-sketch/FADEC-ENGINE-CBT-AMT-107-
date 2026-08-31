/* =========================================================
   FADEC CBT SIMULATOR
   COMPLETE JAVASCRIPT
   ENGINE START AUDIO = EXACTLY 8 SECONDS
   ENGINE STOP AUDIO  = EXACTLY 4 SECONDS
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let engineRunning = false;
let engineStarting = false;
let engineStopping = false;

let soundEnabled = true;
let flashingEnabled = true;

let currentAlert = "normal";

let engineProgressTimer = null;
let engineSimulationTimer = null;

let diagnosticRunning = false;

let faults = [];

let assessmentActive = false;
let assessmentScore = 0;

let audioUnlocked = false;

/* =========================================================
   LIVE EVENT FEED STATE
   ========================================================= */

let liveEventHistory = [];
let liveEventTimer = null;
let lastLiveSnapshot = null;


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   AUDIO ELEMENTS
   ========================================================= */

const inputSound =
    $("inputSound");

const cautionSound =
    $("cautionSound");

const warningSound =
    $("warningSound");

const startEngineSound =
    $("startEngineSound");

const stopEngineSound =
    $("stopEngineSound");

const welcomeSound =
    $("welcomeSound");


/* =========================================================
   AUDIO FLAGS
   ========================================================= */

let cautionPlaying = false;
let warningPlaying = false;


/* =========================================================
   AUDIO TIMERS
   ========================================================= */

let startAudioTimer = null;
let stopAudioTimer = null;


/* =========================================================
   AUDIO CONFIGURATION
   ========================================================= */

if (inputSound) {
    inputSound.loop = false;
}

if (cautionSound) {
    cautionSound.loop = false;
}

if (warningSound) {
    warningSound.loop = false;
}

if (startEngineSound) {
    startEngineSound.loop = false;
}

if (stopEngineSound) {
    stopEngineSound.loop = false;
}


/* =========================================================
   AUDIO UNLOCK
   ========================================================= */

function unlockAudio() {

    if (audioUnlocked) {
        return;
    }

    const sounds = [
        inputSound,
        cautionSound,
        warningSound,
        startEngineSound,
        stopEngineSound,
        welcomeSound
    ];

    sounds.forEach(
        function(sound) {

            if (!sound) {
                return;
            }

            try {
                sound.load();
            } catch (error) {
                console.warn(
                    "Audio loading error:",
                    error
                );
            }

        }
    );

    audioUnlocked = true;

}


/* =========================================================
   FIRST USER INTERACTION
   ========================================================= */

document.addEventListener(
    "pointerdown",
    unlockAudio,
    {
        once: true
    }
);

document.addEventListener(
    "keydown",
    unlockAudio,
    {
        once: true
    }
);


/* =========================================================
   WELCOME VOICE-OVER — PLAY ONCE PER BROWSER SESSION
   ========================================================= */

const WELCOME_SESSION_KEY = "fadec_welcome_played_v1";
let welcomePlayedThisEntrance = false;
let welcomePlaybackStarted = false;
let welcomeFallbackArmed = false;

function welcomeAlreadyPlayed() {
    // The welcome announcement plays once each time the simulator is entered.
    // The session marker is still written by markWelcomePlayed(), but it must
    // not suppress the welcome audio after returning to the simulator.
    return welcomePlayedThisEntrance;
}

function markWelcomePlayed() {
    welcomePlayedThisEntrance = true;
    try {
        sessionStorage.setItem(WELCOME_SESSION_KEY, "1");
    } catch (error) {}
    disarmWelcomeFallback();
}

function playWelcomeVoice() {
    if (welcomeAlreadyPlayed() || welcomePlayedThisEntrance || welcomePlaybackStarted || !soundEnabled || !welcomeSound) {
        return Promise.resolve(false);
    }

    welcomePlaybackStarted = true;
    unlockAudio();

    try {
        welcomeSound.pause();
        welcomeSound.currentTime = 0;
        welcomeSound.volume = 1;
        welcomeSound.muted = false;

        const promise = welcomeSound.play();

        if (promise && typeof promise.then === "function") {
            return promise.then(function () {
                markWelcomePlayed();
                return true;
            }).catch(function (error) {
                // Autoplay may be blocked. Keep the fallback armed, but never
                // create more than one active fallback listener.
                welcomePlaybackStarted = false;
                return false;
            });
        }

        markWelcomePlayed();
        return Promise.resolve(true);

    } catch (error) {
        welcomePlaybackStarted = false;
        return Promise.resolve(false);
    }
}

function handleWelcomeFallback() {
    if (welcomeAlreadyPlayed() || welcomePlayedThisEntrance || welcomePlaybackStarted) {
        disarmWelcomeFallback();
        return;
    }

    playWelcomeVoice().then(function (played) {
        if (!played && !welcomeAlreadyPlayed()) {
            // Do not re-arm on every click. The current interaction is the only
            // fallback attempt for this page load.
            disarmWelcomeFallback();
        }
    });
}

function disarmWelcomeFallback() {
    if (!welcomeFallbackArmed) {
        return;
    }

    welcomeFallbackArmed = false;
    document.removeEventListener("pointerdown", handleWelcomeFallback);
    document.removeEventListener("keydown", handleWelcomeFallback);
}

function armWelcomeFallback() {
    if (welcomeFallbackArmed || welcomeAlreadyPlayed() || welcomePlayedThisEntrance) {
        return;
    }

    welcomeFallbackArmed = true;
    document.addEventListener("pointerdown", handleWelcomeFallback, { once: true });
    document.addEventListener("keydown", handleWelcomeFallback, { once: true });
}

/* =========================================================
   GENERIC SOUND
   ========================================================= */

function playSound(sound) {

    if (!soundEnabled) {
        return;
    }

    if (!sound) {
        return;
    }

    unlockAudio();

    try {

        sound.pause();
        sound.currentTime = 0;
        sound.volume = 1;
        sound.muted = false;

        const promise =
            sound.play();

        if (
            promise &&
            typeof promise.catch === "function"
        ) {

            promise.catch(
                function(error) {

                    console.warn(
                        "Audio playback failed:",
                        error
                    );

                }
            );

        }

    } catch (error) {

        console.warn(
            "Audio playback error:",
            error
        );

    }

}


/* =========================================================
   ENGINE START SOUND
   EXACTLY 8 SECONDS
   ========================================================= */

function playEngineStartSound() {

    if (!soundEnabled) {
        return;
    }

    if (!startEngineSound) {

        console.error(
            "ERROR: startEngineSound not found."
        );

        return;
    }

    unlockAudio();


    /* Clear any previous start audio timer */

    if (startAudioTimer) {

        clearTimeout(
            startAudioTimer
        );

        startAudioTimer = null;

    }


    try {

        startEngineSound.pause();

        startEngineSound.currentTime = 0;

        startEngineSound.loop = false;

        startEngineSound.volume = 1;

        startEngineSound.muted = false;


        const promise =
            startEngineSound.play();


        if (
            promise &&
            typeof promise.catch === "function"
        ) {

            promise.catch(
                function(error) {

                    console.error(
                        "ENGINE START MP3 FAILED:",
                        error
                    );

                }
            );

        }


        /*
            FORCE ENGINE START AUDIO
            TO STOP AFTER EXACTLY 8 SECONDS.
        */

        startAudioTimer =
            setTimeout(
                function() {

                    stopEngineStartSound();

                },
                8000
            );

    } catch (error) {

        console.error(
            "ENGINE START AUDIO ERROR:",
            error
        );

    }

}


/* =========================================================
   FORCE STOP ENGINE START AUDIO
   ========================================================= */

function stopEngineStartSound() {

    if (startAudioTimer) {

        clearTimeout(
            startAudioTimer
        );

        startAudioTimer = null;

    }

    if (!startEngineSound) {
        return;
    }

    try {

        startEngineSound.pause();

        startEngineSound.currentTime = 0;

    } catch (error) {

        console.warn(
            "Could not stop engine start audio:",
            error
        );

    }

}


/* =========================================================
   ENGINE STOP SOUND
   EXACTLY 4 SECONDS
   ========================================================= */

function playEngineStopSound() {

    if (!soundEnabled) {
        return;
    }

    if (!stopEngineSound) {

        console.error(
            "ERROR: stopEngineSound not found."
        );

        return;
    }

    unlockAudio();


    /* Clear any previous stop audio timer */

    if (stopAudioTimer) {

        clearTimeout(
            stopAudioTimer
        );

        stopAudioTimer = null;

    }


    try {

        stopEngineSound.pause();

        stopEngineSound.currentTime = 0;

        stopEngineSound.loop = false;

        stopEngineSound.volume = 1;

        stopEngineSound.muted = false;


        const promise =
            stopEngineSound.play();


        if (
            promise &&
            typeof promise.catch === "function"
        ) {

            promise.catch(
                function(error) {

                    console.error(
                        "ENGINE STOP MP3 FAILED:",
                        error
                    );

                }
            );

        }


        /*
            FORCE ENGINE STOP AUDIO
            TO STOP AFTER EXACTLY 4 SECONDS.
        */

        stopAudioTimer =
            setTimeout(
                function() {

                    stopEngineStopSound();

                },
                4000
            );

    } catch (error) {

        console.error(
            "ENGINE STOP AUDIO ERROR:",
            error
        );

    }

}


/* =========================================================
   FORCE STOP ENGINE STOP AUDIO
   ========================================================= */

function stopEngineStopSound() {

    if (stopAudioTimer) {

        clearTimeout(
            stopAudioTimer
        );

        stopAudioTimer = null;

    }

    if (!stopEngineSound) {
        return;
    }

    try {

        stopEngineSound.pause();

        stopEngineSound.currentTime = 0;

    } catch (error) {

        console.warn(
            "Could not stop engine stop audio:",
            error
        );

    }

}


/* =========================================================
   STOP SOUND
   ========================================================= */

function stopSound(sound) {

    if (!sound) {
        return;
    }

    try {

        sound.pause();

        sound.currentTime = 0;

    } catch (error) {

        console.warn(
            "Could not stop audio:",
            error
        );

    }

}


/* =========================================================
   STOP ALERT SOUNDS
   ========================================================= */

function stopAlertSounds() {

    if (cautionSound) {

        cautionSound.pause();

        cautionSound.currentTime = 0;

    }


    if (warningSound) {

        warningSound.pause();

        warningSound.currentTime = 0;

    }


    cautionPlaying = false;

    warningPlaying = false;

}


/* =========================================================
   CAUTION AUDIO
   ========================================================= */

function playCautionLoop() {

    if (!soundEnabled) {
        return;
    }

    if (!cautionSound) {
        return;
    }


    if (cautionPlaying) {
        return;
    }


    cautionPlaying = true;

    cautionSound.loop = false;

    cautionSound.pause();

    cautionSound.currentTime = 0;

    cautionSound.volume = 1;

    cautionSound.muted = false;


    const promise =
        cautionSound.play();


    if (
        promise &&
        typeof promise.catch === "function"
    ) {

        promise.catch(
            function(error) {

                console.warn(
                    "Caution audio failed:",
                    error
                );

                cautionPlaying = false;

            }
        );

    }

}


/* =========================================================
   WARNING AUDIO
   ========================================================= */

function playWarningLoop() {

    if (!soundEnabled) {
        return;
    }

    if (!warningSound) {
        return;
    }


    if (warningPlaying) {
        return;
    }


    warningPlaying = true;

    warningSound.loop = false;

    warningSound.pause();

    warningSound.currentTime = 0;

    warningSound.volume = 1;

    warningSound.muted = false;


    const promise =
        warningSound.play();


    if (
        promise &&
        typeof promise.catch === "function"
    ) {

        promise.catch(
            function(error) {

                console.warn(
                    "Warning audio failed:",
                    error
                );

                warningPlaying = false;

            }
        );

    }

}


/* =========================================================
   CAUTION AUDIO FINISHED
   ========================================================= */

if (cautionSound) {

    cautionSound.addEventListener(
        "ended",
        function() {

            cautionPlaying = false;


            if (
                currentAlert === "caution" &&
                soundEnabled
            ) {

                playCautionLoop();

            }

        }
    );

}


/* =========================================================
   WARNING AUDIO FINISHED
   ========================================================= */

if (warningSound) {

    warningSound.addEventListener(
        "ended",
        function() {

            warningPlaying = false;


            if (
                currentAlert === "warning" &&
                soundEnabled
            ) {

                playWarningLoop();

            }

        }
    );

}


/* =========================================================
   SOUND TOGGLE
   ========================================================= */

function toggleSound() {

    unlockAudio();

    soundEnabled =
        !soundEnabled;

    updateSoundUI();


    if (!soundEnabled) {

        stopAlertSounds();

        stopSound(inputSound);

        stopEngineStartSound();

        stopEngineStopSound();

    } else {

        if (
            currentAlert ===
            "caution"
        ) {

            playCautionLoop();

        }


        if (
            currentAlert ===
            "warning"
        ) {

            playWarningLoop();

        }

    }

}


/* =========================================================
   SOUND UI
   ========================================================= */

function updateSoundUI() {

    const status =
        $("soundStatus");

    const button =
        $("soundBtn");


    if (status) {

        status.textContent =
            soundEnabled
                ? "ENABLED"
                : "DISABLED";

    }


    if (button) {

        button.classList.toggle(
            "flash-enabled",
            soundEnabled
        );

        button.classList.toggle(
            "flash-disabled",
            !soundEnabled
        );

    }

}


/* =========================================================
   FLASH TOGGLE
   ========================================================= */

function toggleFlashing() {

    flashingEnabled =
        !flashingEnabled;

    updateFlashUI();

    applyFlashState();

}


/* =========================================================
   FLASH UI
   ========================================================= */

function updateFlashUI() {

    const status =
        $("flashStatus");

    const button =
        $("flashBtn");


    if (status) {

        status.textContent =
            flashingEnabled
                ? "ENABLED"
                : "DISABLED";

    }


    if (button) {

        button.classList.toggle(
            "flash-enabled",
            flashingEnabled
        );

        button.classList.toggle(
            "flash-disabled",
            !flashingEnabled
        );

    }

}


/* =========================================================
   FULL SCREEN FLASH
   ========================================================= */

function applyFlashState() {

    const body =
        document.body;


    if (!body) {
        return;
    }


    body.classList.remove(
        "caution-flash",
        "warning-flash",
        "flashing-disabled"
    );


    if (!flashingEnabled) {

        body.classList.add(
            "flashing-disabled"
        );

        return;

    }


    if (
        currentAlert ===
        "warning"
    ) {

        body.classList.add(
            "warning-flash"
        );

        return;

    }


    if (
        currentAlert ===
        "caution"
    ) {

        body.classList.add(
            "caution-flash"
        );

        return;

    }

}


/* =========================================================
   SET ALERT
   ========================================================= */

function setAlert(
    type,
    title,
    message
) {

    if (
        type !== "normal" &&
        type !== "caution" &&
        type !== "warning"
    ) {

        type = "normal";

    }


    const previousAlert =
        currentAlert;

    currentAlert =
        type;


    const statusBox =
        $("statusBox");

    const warningSign =
        $("warningSign");

    const warningTitle =
        $("warningTitle");

    const warningMessage =
        $("warningMessage");

    const mcduAlertDetail = $("mcduAlertDetail");
    const mcduAlertType = $("mcduAlertType");
    const mcduAlertTitle = $("mcduAlertTitle");
    const mcduAlertMessage = $("mcduAlertMessage");


    if (statusBox) {

        statusBox.className =
            "status-display " +
            type;

    }


    if (warningSign) {

        warningSign.className =
            "warning-display " +
            type;

    }


    if (warningTitle) {

        warningTitle.textContent =
            title;

    }


    if (warningMessage) {

        warningMessage.textContent =
            message;

    }

    if (mcduAlertDetail) {
        mcduAlertDetail.className = "mcdu-alert-detail " + type;
    }

    if (mcduAlertType) {
        mcduAlertType.textContent =
            type === "warning" ? "WARNING" :
            type === "caution" ? "CAUTION" :
            "STATUS";
    }

    if (mcduAlertTitle) {
        mcduAlertTitle.textContent = title;
    }

    if (mcduAlertMessage) {
        mcduAlertMessage.textContent = message;
    }


    if (
        type !==
        previousAlert
    ) {

        stopAlertSounds();


        if (
            type === "caution"
        ) {

            playCautionLoop();

        }


        if (
            type === "warning"
        ) {

            playWarningLoop();

        }

    } else {

        if (
            type === "caution" &&
            !cautionPlaying
        ) {

            playCautionLoop();

        }


        if (
            type === "warning" &&
            !warningPlaying
        ) {

            playWarningLoop();

        }

    }


    applyFlashState();


    updateSystemMessage(
        type,
        message
    );


    updateAirworthiness(
        type
    );

}


/* =========================================================
   NORMAL
   ========================================================= */

function setNormal() {

    setAlert(
        "normal",
        "SYSTEM WITHIN LIMITS",
        "ENGINE AT REST — READY FOR COMMAND"
    );

}


/* =========================================================
   CAUTION
   ========================================================= */

function setCaution(
    title =
        "CAUTION",
    message =
        "ENGINE INDICATION OUTSIDE REFERENCE RANGE"
) {

    setAlert(
        "caution",
        title,
        message
    );

}


/* =========================================================
   WARNING
   ========================================================= */

function setWarning(
    title =
        "WARNING",
    message =
        "CRITICAL ENGINE CONDITION DETECTED"
) {

    setAlert(
        "warning",
        title,
        message
    );

}


/* =========================================================
   ACKNOWLEDGE
   ========================================================= */

function acknowledgeWarning() {

    stopAlertSounds();


    currentAlert =
        "normal";


    document.body.classList.remove(
        "caution-flash",
        "warning-flash"
    );


    setNormal();

}


/* =========================================================
   SYSTEM MESSAGE
   ========================================================= */

function updateSystemMessage(
    type,
    message
) {

    const systemMessage =
        $("systemMessage");


    if (!systemMessage) {
        return;
    }


    const light =
        systemMessage.querySelector(
            ".message-light"
        );


    if (
        type === "warning"
    ) {

        systemMessage.style.color =
            "#ff4040";

        systemMessage.style.borderColor =
            "#8e2525";


        if (light) {

            light.style.background =
                "#ff3030";

            light.style.boxShadow =
                "0 0 8px #ff3030";

        }


        setSystemMessageText(
            " WARNING — " +
            message
        );

    }


    else if (
        type === "caution"
    ) {

        systemMessage.style.color =
            "#ffd000";

        systemMessage.style.borderColor =
            "#8e7400";


        if (light) {

            light.style.background =
                "#ffd000";

            light.style.boxShadow =
                "0 0 8px #ffd000";

        }


        setSystemMessageText(
            " CAUTION — " +
            message
        );

    }


    else {

        systemMessage.style.color =
            "var(--green)";

        systemMessage.style.borderColor =
            "#1e5936";


        if (light) {

            light.style.background =
                "var(--green)";

            light.style.boxShadow =
                "0 0 8px var(--green)";

        }


        setSystemMessageText(
            " SYSTEM READY - CBT AVAILABLE"
        );

    }

}


/* =========================================================
   SYSTEM MESSAGE TEXT
   ========================================================= */

function setSystemMessageText(
    text
) {

    const systemMessage =
        $("systemMessage");


    if (!systemMessage) {
        return;
    }


    const light =
        systemMessage.querySelector(
            ".message-light"
        );


    if (!light) {

        systemMessage.textContent =
            text;

        return;

    }


    let node =
        light.nextSibling;


    if (
        node &&
        node.nodeType ===
        Node.TEXT_NODE
    ) {

        node.textContent =
            text;

    } else {

        systemMessage.appendChild(
            document.createTextNode(text)
        );

    }

}


/* =========================================================
   AIRWORTHINESS
   ========================================================= */

function updateAirworthiness(
    type
) {

    const airworthiness =
        $("airworthiness");


    if (!airworthiness) {
        return;
    }


    airworthiness.className = "";


    if (
        type === "warning"
    ) {

        airworthiness.classList.add(
            "warning"
        );

        airworthiness.textContent =
            "OUTSIDE AIRWORTHINESS LIMITS";

        return;

    }


    if (
        type === "caution"
    ) {

        airworthiness.classList.add(
            "maintenance"
        );

        airworthiness.textContent =
            "MAINTENANCE REVIEW REQUIRED";

        return;

    }


    airworthiness.textContent =
        "WITHIN AIRWORTHINESS LIMITS";

}


/* =========================================================
   ENGINE START
   ========================================================= */

function startEngine() {

    unlockAudio();


    if (
        engineRunning ||
        engineStarting
    ) {

        return;

    }


    clearInterval(
        engineProgressTimer
    );

    clearInterval(
        engineSimulationTimer
    );


    /*
        If STOP was previously active,
        cancel its audio timer.
    */

    stopEngineStopSound();


    engineStarting = true;

    engineStopping = false;


    /*
        PLAY START AUDIO
        EXACTLY 8 SECONDS
    */

    playEngineStartSound();


    updateEngineStatus(
        "START SEQUENCE"
    );


    const progressBox =
        $("engineProgress");

    const progressFill =
        $("progressFill");

    const progressPercent =
        $("progressPercent");

    const progressTime =
        $("progressTime");

    const progressAction =
        $("progressAction");


    if (progressBox) {

        progressBox.classList.remove(
            "hidden"
        );

    }


    let elapsed = 0;

    const duration = 8;


    if (progressFill) {

        progressFill.style.width =
            "0%";

    }


    if (progressPercent) {

        progressPercent.textContent =
            "0%";

    }


    if (progressTime) {

        progressTime.textContent =
            "0 / " +
            duration +
            " seconds";

    }


    if (progressAction) {

        progressAction.textContent =
            "START SEQUENCE ACTIVE";

    }


    engineProgressTimer =
        setInterval(
            function() {

                elapsed++;


                const percent =
                    Math.min(
                        100,
                        Math.round(
                            elapsed /
                            duration *
                            100
                        )
                    );


                if (progressFill) {

                    progressFill.style.width =
                        percent +
                        "%";

                }


                if (progressPercent) {

                    progressPercent.textContent =
                        percent +
                        "%";

                }


                if (progressTime) {

                    progressTime.textContent =
                        elapsed +
                        " / " +
                        duration +
                        " seconds";

                }


                updateStartingParameters(
                    elapsed /
                    duration
                );


                if (
                    elapsed >=
                    duration
                ) {

                    clearInterval(
                        engineProgressTimer
                    );


                    /*
                        TIMER REACHED 8 SECONDS.
                        STOP START AUDIO NOW.
                    */

                    stopEngineStartSound();


                    finishEngineStart();

                }

            },
            1000
        );

}


/* =========================================================
   FINISH ENGINE START
   ========================================================= */

function finishEngineStart() {

    engineStarting = false;

    engineRunning = true;

    engineStopping = false;


    updateEngineStatus(
        "STABILIZED"
    );


    const progressBox =
        $("engineProgress");


    if (progressBox) {

        progressBox.classList.add(
            "hidden"
        );

    }


    startEngineSimulation();

    evaluateEngineCondition();

}


/* =========================================================
   ENGINE SIMULATION
   ========================================================= */

function startEngineSimulation() {

    clearInterval(
        engineSimulationTimer
    );


    engineSimulationTimer =
        setInterval(
            function() {

                if (!engineRunning) {
                    return;
                }


                updateEngineParameters();

                evaluateEngineCondition();

            },
            500
        );

}


/* =========================================================
   STARTING PARAMETERS
   ========================================================= */

function updateStartingParameters(
    progress
) {

    const air =
        Number(
            $("airVolume")?.value ||
            50
        );


    const n1 =
        progress *
        (
            35 +
            air *
            0.25
        );


    const n2 =
        progress *
        (
            45 +
            air *
            0.20
        );


    const egt =
        progress *
        (
            300 +
            air *
            2
        );


    const pressure =
        progress *
        (
            20 +
            air *
            0.20
        );


    const fuel =
        progress *
        (
            300 +
            air *
            4
        );


    const airflow =
        progress *
        (
            0.8 +
            air *
            0.015
        );


    updateParameters(
        n1,
        n2,
        egt,
        pressure,
        fuel,
        airflow
    );

}


/* =========================================================
   ENGINE PARAMETERS
   ========================================================= */

function updateEngineParameters() {

    const air =
        Number(
            $("airVolume")?.value ||
            50
        );


    let n1 =
        20 +
        air *
        0.65 +
        randomVariation(2);


    let n2 =
        25 +
        air *
        0.60 +
        randomVariation(2);


    let egt =
        300 +
        air *
        7 +
        randomVariation(8);


    let pressure =
        20 +
        air *
        0.35 +
        randomVariation(1);


    let fuel =
        200 +
        air *
        8 +
        randomVariation(10);


    let airflow =
        0.4 +
        air *
        0.018 +
        randomVariation(0.03);


    n1 =
        Math.max(
            0,
            n1
        );


    n2 =
        Math.max(
            0,
            n2
        );


    egt =
        Math.max(
            0,
            egt
        );


    pressure =
        Math.max(
            0,
            pressure
        );


    fuel =
        Math.max(
            0,
            fuel
        );


    airflow =
        Math.max(
            0,
            airflow
        );


    updateParameters(
        n1,
        n2,
        egt,
        pressure,
        fuel,
        airflow
    );

}


/* =========================================================
   RANDOM VARIATION
   ========================================================= */

function randomVariation(
    amount
) {

    return (
        Math.random() *
        amount *
        2
    ) - amount;

}


function updateGaugeNeedles(n1, n2, egt, pressure, fuel, airflow) {

    const defs = {
        gaugeN1: { value: n1, max: 100 },
        gaugeN2: { value: n2, max: 100 },
        gaugeEGT: { value: egt, max: 900 },
        gaugePressure: { value: pressure, max: 60 },
        gaugeFuel: { value: fuel, max: 1000 },
        gaugeAirflow: { value: airflow, max: 2.2 }
    };

    Object.entries(defs).forEach(([id, cfg]) => {
        const needle = $(id + "Needle");
        if (!needle) return;
        const ratio = Math.max(0, Math.min(1, Number(cfg.value) / cfg.max));
        const angle = -135 + ratio * 270;
        needle.style.transform = `translate(-50%,-90%) rotate(${angle}deg)`;
        needle.setAttribute("aria-valuenow", String(cfg.value));
    });
}

function updateGaugeFaceState() {
    document.querySelectorAll(".gauge").forEach(g => {
        const status = g.parentElement?.querySelector("small");
        if (!status) return;
        g.classList.remove("gauge-caution", "gauge-warning", "gauge-normal");
        if (status.textContent.includes("WARNING")) g.classList.add("gauge-warning");
        else if (status.textContent.includes("CAUTION")) g.classList.add("gauge-caution");
        else if (status.textContent.includes("NORMAL")) g.classList.add("gauge-normal");
    });
}

/* =========================================================
   UPDATE PARAMETERS
   ========================================================= */

function updateParameters(
    n1,
    n2,
    egt,
    pressure,
    fuel,
    airflow
) {

    setText(
        "n1",
        n1.toFixed(1) +
        " %"
    );


    setText(
        "n2",
        n2.toFixed(1) +
        " %"
    );


    setText(
        "egt",
        Math.round(egt) +
        " °C"
    );


    setText(
        "pressure",
        pressure.toFixed(1) +
        " PSI"
    );


    setText(
        "fuelFlow",
        Math.round(fuel) +
        " KG/H"
    );


    setText(
        "airflow",
        airflow.toFixed(2) +
        " KG/S"
    );


    setText(
        "gaugeN1",
        n1.toFixed(1)
    );


    setText(
        "gaugeN2",
        n2.toFixed(1)
    );


    setText(
        "gaugeEGT",
        Math.round(egt)
    );


    setText(
        "gaugePressure",
        pressure.toFixed(1)
    );


    setText(
        "gaugeFuel",
        Math.round(fuel)
    );


    setText(
        "gaugeAirflow",
        airflow.toFixed(2)
    );


    setGaugeStatus(
        "gaugeN1Status",
        "N1",
        n1
    );


    setGaugeStatus(
        "gaugeN2Status",
        "N2",
        n2
    );


    setGaugeStatus(
        "gaugeEGTStatus",
        "EGT",
        egt
    );


    setGaugeStatus(
        "gaugePressureStatus",
        "PRESSURE",
        pressure
    );


    setGaugeStatus(
        "gaugeFuelStatus",
        "FUEL",
        fuel
    );


    setGaugeStatus(
        "gaugeAirflowStatus",
        "AIRFLOW",
        airflow
    );

    updateGaugeNeedles(
        n1, n2, egt, pressure, fuel, airflow
    );

    updateGaugeFaceState();

}


/* =========================================================
   GAUGE STATUS
   ========================================================= */

function setGaugeStatus(
    id,
    type,
    value
) {

    const element =
        $(id);


    if (!element) {
        return;
    }


    let status =
        "NORMAL";


    if (
        type === "N1"
    ) {

        if (
            value > 95
        ) {

            status =
                "WARNING";

        } else if (
            value > 85
        ) {

            status =
                "CAUTION";

        }

    }


    if (
        type === "N2"
    ) {

        if (
            value > 95
        ) {

            status =
                "WARNING";

        } else if (
            value > 85
        ) {

            status =
                "CAUTION";

        }

    }


    if (
        type === "EGT"
    ) {

        if (
            value > 850
        ) {

            status =
                "WARNING";

        } else if (
            value > 750
        ) {

            status =
                "CAUTION";

        }

    }


    if (
        type === "PRESSURE"
    ) {

        if (
            value < 10
        ) {

            status =
                "WARNING";

        } else if (
            value < 20
        ) {

            status =
                "CAUTION";

        }

    }


    if (
        type === "FUEL"
    ) {

        if (
            value > 1000
        ) {

            status =
                "WARNING";

        } else if (
            value > 800
        ) {

            status =
                "CAUTION";

        }

    }


    if (
        type === "AIRFLOW"
    ) {

        if (
            value > 2.0
        ) {

            status =
                "WARNING";

        } else if (
            value > 1.6
        ) {

            status =
                "CAUTION";

        }

    }


    element.textContent =
        status;

}


/* =========================================================
   ENGINE CONDITION
   ========================================================= */

function evaluateEngineCondition() {

    if (!engineRunning) {

        setNormal();

        return;

    }


    const air =
        Number(
            $("airVolume")?.value ||
            50
        );


    if (
        air >= 90
    ) {

        setWarning(
            "HIGH ENGINE DEMAND",
            "ENGINE DEMAND OUTSIDE TRAINING BAND"
        );


        addFault(
            "HIGH ENGINE DEMAND",
            "Command exceeds the simulated operating band."
        );


        return;

    }


    if (
        air >= 75
    ) {

        setCaution(
            "ELEVATED ENGINE DEMAND",
            "ENGINE DEMAND ABOVE REFERENCE"
        );


        return;

    }


    setNormal();

}


/* =========================================================
   ENGINE STOP
   ========================================================= */

function stopEngine() {

    unlockAudio();


    if (
        !engineRunning &&
        !engineStarting
    ) {

        return;

    }


    clearInterval(
        engineProgressTimer
    );

    clearInterval(
        engineSimulationTimer
    );


    /*
        If START was active,
        stop its audio immediately.
    */

    stopEngineStartSound();


    engineStarting = false;

    engineStopping = true;


    /*
        PLAY STOP AUDIO
        EXACTLY 4 SECONDS
    */

    playEngineStopSound();


    updateEngineStatus(
        "SHUTDOWN SEQUENCE"
    );


    const progressBox =
        $("engineProgress");

    const progressFill =
        $("progressFill");

    const progressPercent =
        $("progressPercent");

    const progressTime =
        $("progressTime");

    const progressAction =
        $("progressAction");


    if (progressBox) {

        progressBox.classList.remove(
            "hidden"
        );

    }


    if (progressFill) {

        progressFill.style.width =
            "100%";

    }


    if (progressAction) {

        progressAction.textContent =
            "SHUTDOWN SEQUENCE ACTIVE";

    }


    let elapsed = 0;

    const duration = 4;


    engineProgressTimer =
        setInterval(
            function() {

                elapsed++;


                const remaining =
                    Math.max(
                        0,
                        100 -
                        (
                            elapsed /
                            duration *
                            100
                        )
                    );


                if (progressFill) {

                    progressFill.style.width =
                        remaining +
                        "%";

                }


                if (progressPercent) {

                    progressPercent.textContent =
                        Math.round(
                            remaining
                        ) +
                        "%";

                }


                if (progressTime) {

                    progressTime.textContent =
                        elapsed +
                        " / " +
                        duration +
                        " seconds";

                }


                updateParameters(
                    Math.max(
                        0,
                        30 -
                        elapsed * 8
                    ),

                    Math.max(
                        0,
                        35 -
                        elapsed * 9
                    ),

                    Math.max(
                        0,
                        200 -
                        elapsed * 40
                    ),

                    Math.max(
                        0,
                        10 -
                        elapsed * 2
                    ),

                    Math.max(
                        0,
                        100 -
                        elapsed * 25
                    ),

                    Math.max(
                        0,
                        0.3 -
                        elapsed * 0.07
                    )
                );


                if (
                    elapsed >=
                    duration
                ) {

                    clearInterval(
                        engineProgressTimer
                    );


                    /*
                        TIMER REACHED 4 SECONDS.
                        STOP STOP AUDIO NOW.
                    */

                    stopEngineStopSound();


                    finishEngineStop();

                }

            },
            1000
        );

}


/* =========================================================
   FINISH ENGINE STOP
   ========================================================= */

function finishEngineStop() {

    engineRunning = false;

    engineStopping = false;

    engineStarting = false;


    clearInterval(
        engineSimulationTimer
    );


    updateEngineStatus(
        "AT REST"
    );


    updateParameters(
        0,
        0,
        0,
        0,
        0,
        0
    );


    const progressBox =
        $("engineProgress");


    if (progressBox) {

        progressBox.classList.add(
            "hidden"
        );

    }


    setNormal();

}


/* =========================================================
   ENGINE STATUS UI
   ========================================================= */

function updateEngineStatus(
    status
) {

    const running =
        status === "STABILIZED";


    const starting =
        status === "START SEQUENCE";


    const fadec =
        running ||
        starting;


    setText(
        "engineStatus",
        status
    );


    setText(
        "fadecStatus",
        fadec
            ? "ON"
            : "OFF"
    );


    setText(
        "topEngineStatus",
        "ENGINE STATUS: " +
        status
    );


    setText(
        "topFadecStatus",
        fadec
            ? "ON"
            : "OFF"
    );


    setText(
        "screenEngine",
        status
    );


    setText(
        "screenFadec",
        fadec
            ? "ON"
            : "OFF"
    );


    setText(
        "fadecPageStatus",
        fadec
            ? "ON"
            : "OFF"
    );


    setText(
        "sensorStatus",
        fadec
            ? "LINKED"
            : "UNAVAILABLE"
    );

}


/* =========================================================
   AIR VOLUME
   ========================================================= */

const airVolume =
    $("airVolume");


function updateThrottleUI(value) {

    const numeric = Math.max(0, Math.min(100, Number(value) || 0));
    const handle = $("throttleHandle");
    const mode = $("throttleMode");

    if (handle) {
        // Keep the custom handle completely inside the throttle slot so 100%
        // is reachable and visibly shown instead of being clipped.
        const slot = $("throttleSlot");
        const slotHeight = slot ? slot.clientHeight : 214;
        const usableTravel = Math.max(0, slotHeight - 50);
        const top = ((100 - numeric) / 100) * usableTravel;
        handle.style.top = `${top}px`;
        handle.style.bottom = "auto";
    }

    if (mode) {
        let label = "IDLE RANGE";
        if (numeric >= 80) label = "MAX DEMAND";
        else if (numeric >= 60) label = "CLIMB RANGE";
        else if (numeric >= 35) label = "CRUISE RANGE";
        mode.textContent = label;
    }

    setText("airVolumeValue", Math.round(numeric));
}

if (airVolume) {

    airVolume.addEventListener(
        "input",
        function() {

            updateThrottleUI(this.value);

            if (engineRunning) {
                evaluateEngineCondition();
            }

        }
    );

    updateThrottleUI(airVolume.value);

}


/* =========================================================
   MCDU PAGE
   ========================================================= */

function showPage(
    page
) {

    const pages = [
        "engine",
        "fadec",
        "fault",
        "diagnostic"
    ];


    pages.forEach(
        function(name) {

            const element =
                $(name + "Page");


            if (element) {

                element.classList.toggle(
                    "hidden",
                    name !== page
                );

            }

        }
    );

    const diagnosticBtn = document.getElementById("diagnosticBtn");
    if (diagnosticBtn) {
        diagnosticBtn.classList.toggle("diagnostic-active", page === "diagnostic");
    }


    playSound(
        inputSound
    );

}


/* =========================================================
   FAULT LOG
   ========================================================= */

function addFault(
    title,
    description
) {

    const exists =
        faults.some(
            function(fault) {

                return (
                    fault.title ===
                    title
                );

            }
        );


    if (exists) {
        return;
    }


    faults.push({

        title:
            title,

        description:
            description,

        time:
            new Date()
                .toLocaleTimeString()

    });


    updateFaultLog();

}


/* =========================================================
   LIVE EVENT FEED
   ========================================================= */

function escapeLogText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function pushLiveEvent(message, kind = "system") {
    const log = $("liveEventLog");
    if (!log) return;

    const entry = {
        time: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", second: "2-digit"}),
        message,
        kind
    };

    const wasNearBottom =
        (log.scrollHeight - log.scrollTop - log.clientHeight) < 24;

    liveEventHistory.push(entry);
    liveEventHistory = liveEventHistory.slice(-42);

    log.innerHTML = liveEventHistory.map(item =>
        `<div class="live-event-row ${escapeLogText(item.kind)}"><span class="live-event-time">[${escapeLogText(item.time)}]</span><span class="live-event-kind">${escapeLogText(item.kind.toUpperCase())}</span><span class="live-event-message">${escapeLogText(item.message)}</span></div>`
    ).join("");

    // Keep the user's current position. Only follow the feed when they were
    // already viewing the newest entries at the bottom.
    if (wasNearBottom) {
        log.scrollTop = log.scrollHeight;
    }
}

function readLiveMetric(id) {
    const el = $(id);
    return el ? el.textContent.trim() : "--";
}

function collectLiveSnapshot() {
    const engine = readLiveMetric("engineStatus");
    const fadec = readLiveMetric("fadecStatus");
    const air = readLiveMetric("airVolumeValue");
    const n1 = readLiveMetric("gaugeN1");
    const n2 = readLiveMetric("gaugeN2");
    const egt = readLiveMetric("gaugeEGT");
    const pressure = readLiveMetric("gaugePressure");
    const fuel = readLiveMetric("gaugeFuel");
    const airflow = readLiveMetric("gaugeAirflow");
    const alert = currentAlert || "normal";
    return {engine, fadec, air, n1, n2, egt, pressure, fuel, airflow, alert};
}

function startLiveEventFeed() {
    clearInterval(liveEventTimer);

    pushLiveEvent("Live event monitor connected.", "system");

    const tick = () => {
        const snapshot = collectLiveSnapshot();
        const key = JSON.stringify(snapshot);

        if (key === lastLiveSnapshot) {
            pushLiveEvent(`System heartbeat — engine ${snapshot.engine}; FADEC ${snapshot.fadec}; demand ${snapshot.air}; N1 ${snapshot.n1}; N2 ${snapshot.n2}; EGT ${snapshot.egt}.`, "heartbeat");
            return;
        }

        const previous = lastLiveSnapshot ? JSON.parse(lastLiveSnapshot) : null;
        let kind = "telemetry";
        let message = `Engine ${snapshot.engine}; demand ${snapshot.air}; N1 ${snapshot.n1}; N2 ${snapshot.n2}; EGT ${snapshot.egt}.`;

        if (!previous || previous.engine !== snapshot.engine) {
            kind = "engine";
            message = `Engine state changed: ${snapshot.engine}.`;
        } else if (!previous.alert || previous.alert !== snapshot.alert) {
            kind = snapshot.alert === "warning" ? "warning" : snapshot.alert === "caution" ? "caution" : "status";
            message = `Condition state changed: ${snapshot.alert.toUpperCase()}; pressure ${snapshot.pressure}; fuel ${snapshot.fuel}.`;
        } else if (previous.air !== snapshot.air) {
            kind = "input";
            message = `Engine demand adjusted to ${snapshot.air}; N1 ${snapshot.n1}; airflow ${snapshot.airflow}.`;
        } else if (previous.fadec !== snapshot.fadec) {
            kind = "fadec";
            message = `FADEC state changed to ${snapshot.fadec}.`;
        }

        pushLiveEvent(message, kind);
        lastLiveSnapshot = key;
    };

    tick();
    liveEventTimer = setInterval(tick, 1000);
}

function stopLiveEventFeed() {
    clearInterval(liveEventTimer);
    liveEventTimer = null;
}


/* =========================================================
   UPDATE FAULT LOG
   ========================================================= */

function updateFaultLog() {

    renderDiagnosticFaults();

    const faultLog =
        $("faultLog");

    const rightFaultLog =
        $("rightFaultLog");


    if (
        faults.length ===
        0
    ) {

        if (faultLog) {

            faultLog.textContent =
                "NO FAULTS RECORDED";

        }


        if (rightFaultLog) {

            rightFaultLog.textContent =
                "NO ACTIVE FAULTS";

        }


        setText(
            "faultStatus",
            "NONE"
        );


        setText(
            "faultCount",
            "0 / LOG"
        );


        return;

    }


    const lines =
        faults.map(
            function(fault) {

                return (
                    "[" +
                    fault.time +
                    "] " +
                    fault.title +
                    " — " +
                    fault.description
                );

            }
        );


    if (faultLog) {

        faultLog.innerHTML =
            lines.join(
                "<br>"
            );

    }


    if (rightFaultLog) {

        rightFaultLog.innerHTML =
            lines.join(
                "<br>"
            );

    }


    setText(
        "faultStatus",
        "CURRENT"
    );


    setText(
        "faultCount",
        faults.length +
        " / LOG"
    );

}


/* =========================================================
   RESET
   ========================================================= */

function resetSimulator() {

    clearInterval(
        engineProgressTimer
    );

    clearInterval(
        engineSimulationTimer
    );


    /*
        Cancel both engine audio timers.
    */

    stopEngineStartSound();

    stopEngineStopSound();


    engineRunning = false;

    engineStarting = false;

    engineStopping = false;


    faults = [];


    stopAlertSounds();


    currentAlert =
        "normal";


    updateParameters(
        0,
        0,
        0,
        0,
        0,
        0
    );


    updateEngineStatus(
        "AT REST"
    );


    if (airVolume) {

        airVolume.value =
            50;

    }


    updateThrottleUI(50);


    const progressBox =
        $("engineProgress");


    if (progressBox) {

        progressBox.classList.add(
            "hidden"
        );

    }


    const progressFill =
        $("progressFill");


    if (progressFill) {

        progressFill.style.width =
            "0%";

    }


    setText(
        "progressPercent",
        "0%"
    );


    setText(
        "progressTime",
        "0 / 8 seconds"
    );


    updateFaultLog();


    setNormal();


    setText(
        "rightDiagnostic",
        "STANDBY"
    );


    setText(
        "diagnosticResult",
        "STANDBY"
    );


    setText(
        "assessmentResult",
        ""
    );


    showPage(
        "engine"
    );

}


/* =========================================================
   DIAGNOSTIC FAULT DETAILS
   ========================================================= */

function renderDiagnosticFaults() {
    const box = $("diagnosticFaults");
    if (!box) return;

    if (!faults || faults.length === 0) {
        box.className = "diagnostic-fault-list clear";
        box.innerHTML = `<div class="diagnostic-clear"><span>✓</span><strong>NO ACTIVE FAULTS</strong><small>All monitored conditions are currently within the training envelope.</small></div>`;
        return;
    }

    box.className = "diagnostic-fault-list has-faults";
    box.innerHTML = faults.map((fault, index) => `
        <div class="diagnostic-fault-item">
            <div class="diagnostic-fault-code">FAULT ${String(index + 1).padStart(2, "0")}</div>
            <div class="diagnostic-fault-main">
                <strong>${escapeLogText(fault.title)}</strong>
                <span>${escapeLogText(fault.description)}</span>
                <small>${escapeLogText(fault.time)}</small>
            </div>
        </div>
    `).join("");
}

/* =========================================================
   DIAGNOSTIC
   ========================================================= */

function runDiagnostic() {

    if (diagnosticRunning) {
        return;
    }


    diagnosticRunning = true;


    const result =
        $("diagnosticResult");

    const rightResult =
        $("rightDiagnostic");


    if (result) {

        result.textContent =
            "RUNNING SYSTEM DIAGNOSTIC...";

    }


    if (rightResult) {

        rightResult.textContent =
            "DIAGNOSTIC RUNNING";

    }


    playSound(
        inputSound
    );


    setTimeout(
        function() {

            diagnosticRunning =
                false;


            renderDiagnosticFaults();

            if (
                faults.length >
                0
            ) {

                if (result) {

                    result.textContent =
                        "FAULTS DETECTED: " +
                        faults.length;

                }


                if (rightResult) {

                    rightResult.textContent =
                        "FAULTS DETECTED";

                }

            } else {

                if (result) {

                    result.textContent =
                        "SYSTEM NORMAL — NO FAULTS";

                }


                if (rightResult) {

                    rightResult.textContent =
                        "SYSTEM WITHIN LIMITS";

                }

            }

        },
        1500
    );

}


/* =========================================================
   ASSESSMENT
   ========================================================= */

const assessmentQuestions = [
    {
        question: "Which instrument most directly represents the percentage speed of the engine's low-pressure spool?",
        options: ["N1", "N2", "EGT", "Fuel flow"],
        answer: 0
    },
    {
        question: "When engine demand is increased, what should the trainee primarily observe on the simulator?",
        options: ["Only the logo animation", "Changes in engine parameters and FADEC response", "The home screen layout", "The sound setting"],
        answer: 1
    },
    {
        question: "What is the main training role of FADEC in this simulator?",
        options: ["Provide entertainment audio", "Replace the MCDU keyboard", "Monitor inputs and manage simulated engine control", "Control the browser window"],
        answer: 2
    },
    {
        question: "If the simulator reports a warning condition, what is the most appropriate trainee action?",
        options: ["Ignore the indication", "Review the displayed parameters and condition message", "Close the simulator immediately", "Increase demand to maximum"],
        answer: 1
    }
];

let assessmentQuestionIndex = 0;
let assessmentSelection = null;
let assessmentAnswered = false;

function startAssessment() {
    assessmentActive = true;
    assessmentScore = 0;
    assessmentQuestionIndex = 0;
    assessmentSelection = null;
    assessmentAnswered = false;

    const modal = $("assessmentModal");
    if (modal) {
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
    }

    renderAssessmentQuestion();
    playSound(inputSound);
}

function renderAssessmentQuestion() {
    const q = assessmentQuestions[assessmentQuestionIndex];
    const question = $("assessmentQuestion");
    const progress = $("assessmentProgress");
    const options = $("assessmentOptions");
    const feedback = $("assessmentFeedback");
    const next = $("assessmentNext");

    assessmentSelection = null;
    assessmentAnswered = false;

    if (question) question.textContent = q.question;
    if (progress) progress.textContent = `Question ${assessmentQuestionIndex + 1} of ${assessmentQuestions.length}`;
    if (feedback) feedback.textContent = "Select the best answer.";
    if (next) {
        next.textContent = "CHECK ANSWER";
        next.disabled = true;
    }

    if (options) {
        options.innerHTML = "";
        q.options.forEach((text, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "assessment-option";
            button.innerHTML = `<span class="letter">${String.fromCharCode(65 + index)}</span><span>${text}</span>`;
            button.addEventListener("click", () => selectAssessmentOption(index));
            options.appendChild(button);
        });
    }
}

function selectAssessmentOption(index) {
    if (assessmentAnswered) return;
    assessmentSelection = index;
    document.querySelectorAll(".assessment-option").forEach((button, i) => {
        button.classList.toggle("selected", i === index);
    });
    const next = $("assessmentNext");
    if (next) next.disabled = false;
    const feedback = $("assessmentFeedback");
    if (feedback) feedback.textContent = "Answer selected. Check it when ready.";
}

function submitAssessmentAnswer() {
    const q = assessmentQuestions[assessmentQuestionIndex];
    if (assessmentSelection === null) return;

    if (!assessmentAnswered) {
        assessmentAnswered = true;
        const options = document.querySelectorAll(".assessment-option");
        options.forEach((button, i) => {
            button.disabled = true;
            if (i === q.answer) button.classList.add("correct");
            if (i === assessmentSelection && i !== q.answer) button.classList.add("wrong");
        });

        if (assessmentSelection === q.answer) {
            assessmentScore++;
            setText("assessmentFeedback", "Correct. Good system interpretation.");
        } else {
            setText("assessmentFeedback", `Not quite. The correct choice is ${String.fromCharCode(65 + q.answer)}.`);
        }

        const next = $("assessmentNext");
        if (next) {
            next.disabled = false;
            next.textContent = assessmentQuestionIndex === assessmentQuestions.length - 1 ? "FINISH ASSESSMENT" : "NEXT QUESTION";
        }
        return;
    }

    if (assessmentQuestionIndex < assessmentQuestions.length - 1) {
        assessmentQuestionIndex++;
        renderAssessmentQuestion();
        return;
    }

    finishAssessment();
}

function finishAssessment() {
    const modal = $("assessmentModal");
    const dialog = modal ? modal.querySelector(".assessment-dialog") : null;
    if (!dialog) return;

    const percentage = Math.round((assessmentScore / assessmentQuestions.length) * 100);
    const band = percentage >= 75 ? "READY FOR SIMULATION" : "REVIEW RECOMMENDED";

    dialog.innerHTML = `
        <div class="assessment-final">
            <span class="assessment-kicker">ASSESSMENT COMPLETE</span>
            <h3>${assessmentScore} / ${assessmentQuestions.length}</h3>
            <p><strong>${percentage}%</strong> — ${band}</p>
            <p>Use the engine indications, FADEC status, and alert messages as the basis for future operating decisions.</p>
            <div class="assessment-retry">
                <button type="button" class="assessment-next" onclick="startAssessment()">RETAKE ASSESSMENT</button>
                <button type="button" class="assessment-next" onclick="closeAssessment()">RETURN TO SIMULATOR</button>
            </div>
        </div>`;

    setText("assessmentResult", `${assessmentScore}/${assessmentQuestions.length} — ${percentage}%`);
}

function closeAssessment() {
    const modal = $("assessmentModal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    assessmentActive = false;
}


/* =========================================================
   HELP
   ========================================================= */

function showHelp() {

    alert(

        "FADEC CBT SIMULATOR\n\n" +

        "ENGINE CONTROL\n" +
        "START ENGINE — starts the simulated engine.\n" +
        "STOP ENGINE — stops the simulated engine.\n" +
        "RESET / RETEST — resets the simulation.\n\n" +

        "AIR VOLUME\n" +
        "Adjust the air volume input to simulate engine demand.\n\n" +

        "WARNING SYSTEM\n" +
        "Green = Normal\n" +
        "Yellow = Caution\n" +
        "Red = Warning\n\n" +

        "FLASH BUTTON\n" +
        "Turns full-screen visual alert flashing ON or OFF.\n\n" +

        "SOUND BUTTON\n" +
        "Turns alert and interface sounds ON or OFF.\n\n" +

        "ACKNOWLEDGE\n" +
        "Clears the current warning/caution indication."

    );

}


/* =========================================================
   HOME
   ========================================================= */

function goHome() {

    stopAlertSounds();


    /*
        Stop engine audio timers/audio
        before leaving the simulator.
    */

    stopEngineStartSound();

    stopEngineStopSound();

    if (welcomeSound) {
        try { welcomeSound.pause(); welcomeSound.currentTime = 0; } catch (e) {}
    }

    clearInterval(
        engineProgressTimer
    );


    clearInterval(
        engineSimulationTimer
    );


    window.location.href =
        "index.html";

}


/* =========================================================
   TEXT HELPER
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeSimulator() {

    updateSoundUI();

    // Play the welcome announcement once per browser session.
    // Re-entering the simulator in the same tab will not replay it.
    if (!welcomeAlreadyPlayed()) {
        setTimeout(function () {
            playWelcomeVoice().then(function (played) {
                if (!played && !welcomeAlreadyPlayed()) {
                    armWelcomeFallback();
                }
            });
        }, 250);
    }

    updateFlashUI();

    updateFaultLog();

    updateEngineStatus(
        "AT REST"
    );

    setNormal();

    showPage(
        "engine"
    );


    const startButton =
        $("startBtn");

    const stopButton =
        $("stopBtn");

    const resetButton =
        $("resetBtn");


    if (startButton) {

        startButton.addEventListener(
            "click",
            function() {

                unlockAudio();

                startEngine();

            }
        );

    }


    if (stopButton) {

        stopButton.addEventListener(
            "click",
            function() {

                unlockAudio();

                stopEngine();

            }
        );

    }


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            function() {

                unlockAudio();

                resetSimulator();

            }
        );

    }


    document.body.classList.remove(
        "caution-flash",
        "warning-flash",
        "flashing-disabled"
    );


    applyFlashState();

}


/* =========================================================
   START APPLICATION
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSimulator
    );

} else {

    initializeSimulator();

}

// Start the live event feed after the simulator UI is ready.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startLiveEventFeed, {once:true});
} else {
    startLiveEventFeed();
}

/* =========================================================
   CONTROLS DRAWER
   Keeps secondary panels off the main dashboard so the
   instrument bank and CBT assessment remain easy to read.
   ========================================================= */
function toggleControlsPanel(forceState) {
    const drawer = document.getElementById("controlsDrawer");
    const overlay = document.getElementById("controlsOverlay");
    const button = document.getElementById("controlsBtn");
    if (!drawer || !overlay) return;

    const isOpen = typeof forceState === "boolean"
        ? forceState
        : !drawer.classList.contains("open");

    drawer.classList.toggle("open", isOpen);
    overlay.classList.toggle("open", isOpen);
    drawer.setAttribute("aria-hidden", String(!isOpen));
    overlay.setAttribute("aria-hidden", String(!isOpen));
    document.body.classList.toggle("controls-open", isOpen);

    if (button) {
        button.classList.toggle("controls-active", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
    }
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        const drawer = document.getElementById("controlsDrawer");
        if (drawer && drawer.classList.contains("open")) {
            toggleControlsPanel(false);
        }
    }
});

/* =========================================================
   AMT 107 UI ADDITIONS — PHONE / FULLSCREEN / QR
   Added UI controls only. Existing simulator and sound logic stays intact.
   ========================================================= */
function togglePhoneUI() {
    document.body.classList.toggle("phone-ui");
    document.body.classList.remove("desktop-ui");
    const active = document.body.classList.contains("phone-ui");
    const btn = document.getElementById("phoneUiBtn");
    if (btn) { btn.classList.toggle("active", active); btn.setAttribute("aria-pressed", String(active)); }
}
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen;
        if (request) { const result = request.call(document.documentElement); if (result && result.catch) result.catch(function(){}); }
    } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (exit) { const result = exit.call(document); if (result && result.catch) result.catch(function(){}); }
    }
}
function updateFullscreenUI() {
    const btn = document.getElementById("fullscreenBtn"); if (!btn) return;
    const isFull = !!document.fullscreenElement; btn.classList.toggle("active", isFull);
    const label = btn.querySelector("small"); if (label) label.textContent = isFull ? "EXIT" : "FULL";
}
document.addEventListener("fullscreenchange", updateFullscreenUI);
document.addEventListener("webkitfullscreenchange", updateFullscreenUI);
function openQrPopup() { const popup = document.getElementById("qrPopup"); if (!popup) return; popup.classList.add("active"); popup.setAttribute("aria-hidden", "false"); }
function closeQrPopup() { const popup = document.getElementById("qrPopup"); if (!popup) return; popup.classList.remove("active"); popup.setAttribute("aria-hidden", "true"); }
function activatePhoneUIFromQr() { document.body.classList.add("phone-ui"); document.body.classList.remove("desktop-ui"); const btn = document.getElementById("phoneUiBtn"); if (btn) btn.classList.add("active"); closeQrPopup(); }
document.addEventListener("keydown", function(event) { if (event.key === "Escape") closeQrPopup(); });

