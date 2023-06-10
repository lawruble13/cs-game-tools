
window.changes_to_display = {}
window.restored_vars = []
window.checks_to_display = {}
window.change_tracked = false
window.forceSave = false
window.injectQueue = []
window.scale_warning_given = false
window.snooper_loaded = false
window.expectedSyncChange = false
window.modalDisableWarned = false

window.csgtOptions = {
    csgtShowTotal: false,
    csgtShowTemps: false,
    csgtShowVars: true,
    csgtModalDisabledByAuthor: false,
    csgtForceDisplay: false,
    backgroundColor: "sepia",
    zoom: 1.0
}

window.autosave_history = []
if (typeof window.store === "undefined") {
    var gameName
    if (typeof saveMod !== 'undefined' && saveMod.game_id) {
        gameName = saveMod.game_id
    } else {
        gameName = document.title.replaceAll(" ", "_")
    }
    window.storeName = ("SnooperHack_" + gameName).replace(/[^a-z0-9_ -]/ig, function(c){return "-x"+c.charCodeAt(0).toString(16)+"-"})
    initStore()
}

