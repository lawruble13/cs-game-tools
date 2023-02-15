window.addEventListener("message", (event) => {
    if (event.data && event.data.direction == "to-page-script") {
        console.log("Got message:", event);
        if (window.expectedSyncChange) {
            window.expectedSyncChange = false;
            return;
        }
        if (event.data.triggerRequest) {
            snooperRequestSyncSave();
            return;
        }
        window.store.get("lastSaved", (ok, value) => {
            if (ok && value < event.data.save.time) {
                window.store.set("lastSaved", event.data.save.time);
                let state = LZString.decompressFromBase64(
                    event.data.save.value
                );
                if (window.pseudosave) {
                    window.pseudosave[""] = state;
                }
                window.store.set("state", state);
                clearScreen(loadAndRestoreGame);
                if (typeof window.stats._csgtOptions !== 'undefined') {
                    window.csgtOptions = window.stats._csgtOptions
                }
            } else if (event.data.requested) {
                clearScreen(loadAndRestoreGame);
            }
        });
        if (window.getRemoteSave) {
            clearInterval(window.getRemoteSave);
        }
    }
});

function snooperLocalLastSave() {
    let localLastSave = { time: 0, value: "" };
    window.store.get("lastSaved", (ok, value) => {
        if (ok) localLastSave.time = value;
    });
    window.store.get("state", (ok, value) => {
        if (ok) localLastSave.value = LZString.compressToBase64(value);
    });
    return localLastSave;
}

function snooperSyncFromLocal() {
    window.postMessage(
        {
            direction: "from-page-script",
            save: snooperLocalLastSave(),
            mode: "save",
            storeName: window.storeName,
        },
        "*"
    );
}

function snooperRequestSyncSave() {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "request",
            storeName: window.storeName,
        },
        "*"
    );
}

getRemoteSave = setInterval(snooperRequestSyncSave, 1000);
