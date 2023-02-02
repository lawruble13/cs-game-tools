
changes_to_display = {}
checks_to_display = {}
change_tracked = false
forceSave = false
injectQueue = []
scale_warning_given = false
snooper_loaded = false
expectedSyncChange = false
if (typeof stats !== 'undefined') {
    stats.snooperShowTotal = false
    stats.snooperShowTemps = false
}
autosave_history = []
if (typeof saveMod !== 'undefined') {
    var gameName
    if (saveMod.game_id) {
        gameName = saveMod.game_id
    } else {
        gameName = document.title.replaceAll(" ", "_")
    }
    storeName = "SnooperHack_" + gameName
    initStore()
}

