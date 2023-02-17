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
        if (event.data.list) {
            csgtCopyOtherMenu(event.data.list)
            return;
        }
        if (event.data.otherSave) {
            csgtCopyOtherData(event.data.otherSave)
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

function csgtRequestSyncedSaveList() {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "list"
        },
        "*"
    )
}

function csgtRequestOtherSaveData(otherSaveName) {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "other",
            name: otherSaveName
        },
        "*"
    )
}

function csgtCopyOtherData(otherSave) {
    new Promise(r => setTimeout(r, 3000));
    const internal = ["choice_subscene_stack", "choice_title", "sceneName", "_csgtOptions"]
    let state = JSON.parse(LZString.decompressFromBase64(
        otherSave.value
    ));
    if (window.pseudosave) {
        var ps_state = JSON.parse(window.pseudosave[""])
        for (var stat in ps_state['stats']) {
            if (!internal.includes(stat) && typeof state['stats'][stat] !== 'undefined') {
                ps_state['stats'][stat] = state['stats'][stat]
            }
        }
        window.pseudosave[""] = JSON.stringify(ps_state)
    }
    window.store.get("state", (ok, s_state) => {
        if (ok) {
            var s_state_obj = JSON.parse(s_state)
            for (var stat in s_state_obj['stats']) {
                if (!internal.includes(stat) && typeof state['stats'][stat] !== 'undefined') {
                    s_state_obj['stats'][stat] = state['stats'][stat]
                }
            }
            window.store.set("state", JSON.stringify(s_state_obj))
            clearScreen(() => {
                Scene.prototype.tmp_printLoop = Scene.prototype.printLoop
                Scene.prototype.printLoop = function (...args) {
                    this.tmp_printLoop(...args)
                    for (var stat in window.stats) {
                        if (!internal.includes(stat) && typeof state['stats'][stat] !== 'undefined') {
                            window.stats[stat] = state['stats'][stat]
                        }
                    }
                    Scene.prototype.printLoop = Scene.prototype.tmp_printLoop
                }
                loadAndRestoreGame()
            });
            if (typeof window.stats._csgtOptions !== 'undefined') {
                window.csgtOptions = window.stats._csgtOptions
            }
        }
    })

}

getRemoteSave = setInterval(snooperRequestSyncSave, 1000);
