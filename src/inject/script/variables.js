
changes_to_display = {}
restored_vars = []
checks_to_display = {}
change_tracked = false
forceSave = false
injectQueue = []
scale_warning_given = false
snooper_loaded = false
expectedSyncChange = false
modalDisableWarned = false

window.csgtOptions = {
    csgtShowTotal: false,
    csgtShowTemps: false,
    csgtShowVars: true,
    csgtModalDisabledByAuthor: false,
    csgtForceDisplay: false,
    backgroundColor: "sepia",
    zoom: 1.0
}

autosave_history = []
if (typeof saveMod !== 'undefined') {
    var gameName
    if (saveMod.game_id) {
        gameName = saveMod.game_id
    } else {
        gameName = document.title.replaceAll(" ", "_")
    }
    storeName = ("SnooperHack_" + gameName).replace(/[^a-z0-9_ -]/ig, function(c){return "-x"+c.charCodeAt(0).toString(16)+"-"})
    initStore()
}

