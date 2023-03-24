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
        if (event.data.mode && event.data.mode == "settings") {
            clearInterval(window.getSettings)
            if (event.data.settingsData) {
                window.csgtOptions = event.data.settingsData
                setZoomFactor(window.csgtOptions.zoom)
                changeBackgroundColor(window.csgtOptions.backgroundColor)
            }
            return;
        }
        window.store.get("lastSaved", (ok, value) => {
            if (ok && value < event.data.save.time) {
                window.store.set("lastSaved", event.data.save.time);
                let state = csgtDecompressSave(event.data.save.value);
                if (window.pseudosave) {
                    window.pseudosave[""] = state;
                }
                window.store.set("state", state);
                clearScreen(loadAndRestoreGame);
            } else if (event.data.requested && event.data.first) {
                clearScreen(loadAndRestoreGame);
            }
        });
        if (window.getRemoteSave) {
            clearInterval(window.getRemoteSave);
        }
    }
});

async function snooperLocalLastSave() {
    let localLastSave = { time: 0, value: "" };
    window.store.get("lastSaved", (ok, value) => {
        if (ok) localLastSave.time = value;
    });
    window.store.get("state", async (ok, value) => {
        if (ok) localLastSave.value = csgtCompressSave(value);
    });
    localLastSave.value = await localLastSave.value;
    return localLastSave;
}

function snooperSyncFromLocal() {
    snooperLocalLastSave().then((saveData) => {
        window.postMessage(
            {
                direction: "from-page-script",
                save: saveData,
                mode: "save",
                storeName: window.storeName,
            },
            "*"
        );
    });
}

function snooperRequestSyncSave(first=false) {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "request",
            storeName: window.storeName,
            first: first
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
    let copyStats = csgtDecompressSave(otherSave.value)['stats'];
    const internal = ["choice_subscene_stack", "choice_title", "sceneName"]
    function copyStatsAndRestore(restore=true) {
        for (var stat in window.stats) {
            if (!internal.includes(stat) && typeof copyStats[stat] !== 'undefined') {
                if (window.stats[stat] != copyStats[stat]) {
                    restored_vars[stat] = {
                        type: "absolute",
                        value: copyStats[stat]
                    }
                }
                window.stats[stat] = copyStats[stat]
            }
        }
        if (restore) {
            Scene.prototype.choice = Scene.prototype.tmp_choice
            Scene.prototype.finish = Scene.prototype.tmp_finish
            Scene.prototype.page_break = Scene.prototype.tmp_page_break
            var changes_tmp = changes_to_display
            changes_to_display = restored_vars
            show_modal("Copied variables:", "info")
            changes_to_display = changes_tmp
        }
    }
    function wrapPageEnder(pageEnder) {
        Scene.prototype["tmp_" + pageEnder] = Scene.prototype[pageEnder]
        Scene.prototype[pageEnder] = function (...args) {
            if (pageEnder == "choice" || !this.screenEmpty) {
                this["tmp_" + pageEnder](...args)
                copyStatsAndRestore()
            } else {
                this["tmp_" + pageEnder](...args)
                copyStatsAndRestore(false)
            }
        }
    }
    wrapPageEnder("choice")
    wrapPageEnder("finish")
    wrapPageEnder("page_break")
    if (window.pseudosave) {
        var ps_state = JSON.parse(window.pseudosave[""])
        for (var stat in ps_state['stats']) {
            if (!internal.includes(stat) && typeof copyStats[stat] !== 'undefined') {
                ps_state['stats'][stat] = copyStats[stat]
            }
        }
        window.pseudosave[""] = JSON.stringify(ps_state)
    }
    window.store.get("state", (ok, s_state) => {
        if (ok) {
            var s_state_obj = JSON.parse(s_state)
            for (var stat in s_state_obj['stats']) {
                if (!internal.includes(stat) && typeof copyStats[stat] !== 'undefined') {
                    s_state_obj['stats'][stat] = copyStats[stat]
                }
            }
            window.store.set("state", JSON.stringify(s_state_obj))
            clearScreen(loadAndRestoreGame);
        }
    })
}

function csgtRequestSettings() {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "settings"
        }
    )
}

function csgtSaveSettings() {
    window.postMessage(
        {
            direction: 'from-page-script',
            mode: 'settings',
            settingsData: window.csgtOptions
        }
    )
}

getRemoteSave = setInterval(() => { snooperRequestSyncSave(true) }, 1000);
getSettings = setInterval(csgtRequestSettings, 1000);

wrapFunction(window, 'printOptions', (printOptions, ...args) => {
    printOptions(...args)
    csgtSaveSettings()
})
