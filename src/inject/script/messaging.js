import { wrapFunction } from "./functions";
import { csgtCopyOtherMenu, csgtManageSavesMenu } from "./functions";
import { csgtCompressSave, csgtDecompressSave } from "./saveCompression";

window.addEventListener("message", async (event) => {
    if (event.data && event.data.direction == "to-page-script") {
        console.log("Got message:", event);
        if (window.expectedSyncChange) {
            window.expectedSyncChange = false;
            return;
        }
        switch(event.data.mode) {
            case "trigger":
                snooperRequestSyncSave();
                break;
            case "list":
                csgtSavesMenu(event.data.list);
                break;
            case "copy":
                const otherSave = await csgtDecompressSave(event.data.otherSave.value, true)
                const compatibility = csgtCompareSave(otherSave)
                if (compatibility >= 0.95) {
                    const asSave = confirm(
                        "The save you selected looks like it may be a save of this game. Would you like to load this as a save?\n\nPress OK to try to load this as a save (including the position in the story) or Cancel to import only the stats."
                    );
                    if (asSave) {
                        snooperRequestSyncSave(true, event.data.name);
                        return;
                    }
                } else if (compatibility <= 0.7) {
                    const importAnyway = confirm(
                        "The save you selected looks pretty different from this game. Would you like to import stats from it anyway?"
                    );
                    if (!importAnyway) {
                        show_modal("Import cancelled.", "warning", "");
                        csgtOptionsMenu(true);
                        return;
                    }
                }
                csgtCopyOtherData(otherSave)
                break;

            case "settings":
                clearInterval(window.getSettings)
                if (event.data.settingsData) {
                    window.csgtOptions = event.data.settingsData;
                    setZoomFactor(window.csgtOptions.zoom);
                    changeBackgroundColor(window.csgtOptions.backgroundColor);
                }
                break;
            case "load":
                window.store.get("lastSaved", async (ok, value) => {
                    if (ok && value < event.data.save.time || (event.data.save.time > 0 && event.data.forced)) {
                        window.store.set("lastSaved", event.data.save.time);
                        let state = await csgtDecompressSave(
                            event.data.save.value
                        );
                        if (window.pseudosave) {
                            window.pseudosave[""] = state;
                        }
                        window.store.set("state", state);
                        clearScreen(loadAndRestoreGame);
                    } else if (event.data.requested && event.data.forced) {
                        clearScreen(loadAndRestoreGame);
                    }
                });
                if (window.getRemoteSave) {
                    clearInterval(window.getRemoteSave);
                }
                break;
            case "callback":
                window[event.data.callbackName](...event.data.args);
                break;
            default:
                //error
                break;
        }
    }
});

export async function snooperLocalLastSave(storeField="state") {
    let localLastSave = { time: 0, value: "" };
    window.store.get("lastSaved", (ok, value) => {
        if (ok) localLastSave.time = value;
    });
    let a = window.store.get(storeField, async (ok, value) => {
        if (ok) localLastSave.value = await csgtCompressSave(value);
        return localLastSave.value
    });
    await a;
    return localLastSave;
}

export function snooperSyncFromLocal(customName = null, storeField="state") {
    snooperLocalLastSave(storeField).then((saveData) => {
        window.postMessage(
            {
                direction: "from-page-script",
                save: saveData,
                mode: "save",
                storeName: customName || window.storeName,
            },
            "*"
        );
        saveData.value = null;
    });
}

export function snooperRequestSyncSave(forced=false, customName = null) {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "request",
            storeName: customName || window.storeName,
            forced: forced
        },
        "*"
    );
}

export function csgtRequestSyncedSaveList() {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "list"
        },
        "*"
    )
}

export function csgtRequestOtherSaveData(otherSaveName) {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "other",
            name: otherSaveName
        },
        "*"
    )
}

export function csgtRequestDeleteSaveData(deleteSaveName) {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "delete",
            name: deleteSaveName
        },
        "*"
    )
}

export function csgtRequestSingleSaveData(saveName, callbackName) {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "single",
            saveName,
            callbackName
        },
        "*"
    )
}

export function csgtCompareSave(otherSave) {
    let max = 1.0;
    if (otherSave["stats"]["choice_title"]){
        if (otherSave["stats"]["choice_title"] === window.stats["choice_title"]) {
            return 1.0;
        }
        max = 0.95; // Everything else needs to be spot on
    }
    function getPrevious(num) {
        return num - 2 ** (Math.log2(num) - 52);
    }
    if (!window.nav._sceneList.includes(otherSave["stats"]["sceneName"])){
        max = getPrevious(0.95);
    }
    let otherUnique = 0.;
    let currentUnique = 0.;
    let common = 0.;
    for (var stat in window.stats) {
        if (otherSave.stats.hasOwnProperty(stat)) {
            common += 1.;
        } else {
            currentUnique += 1.;
        }
    }
    for (var stat in otherSave.stats) {
        if (!window.stats.hasOwnProperty(stat)) {
            otherUnique += 1.;
        }
    }
    const res = Math.sqrt((1. - otherUnique / (otherUnique + common)) * (1. - currentUnique / (currentUnique + common)))
    if (res > max) return max;
    return res;
}

export function csgtCopyOtherData(copyData) {
    new Promise(r => setTimeout(r, 3000));
    let copyStats = copyData['stats']
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

export function csgtRequestSettings() {
    window.postMessage(
        {
            direction: "from-page-script",
            mode: "settings"
        }
    )
}

export function csgtSaveSettings() {
    window.postMessage(
        {
            direction: 'from-page-script',
            mode: 'settings',
            settingsData: window.csgtOptions
        }
    )
}

window.getRemoteSave = setInterval(() => { snooperRequestSyncSave(true) }, 1000);
window.getSettings = setInterval(csgtRequestSettings, 1000);

wrapFunction(window, 'printOptions', (printOptions, ...args) => {
    printOptions(...args)
    csgtSaveSettings()
})
