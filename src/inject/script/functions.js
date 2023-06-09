goBack = function () {
    if (autosave_history.length == 0) {
        show_modal("Error:", "error", "No history data available to restore!");
    } else {
        window.pseudoSave[""] = autosave_history.pop();
        window.store.set("state", window.pseudoSave[""]);
        window.store.set("lastSaved", Date.now());
        window.expectedSyncChange = true;
        snooperSyncFromLocal();
        clearScreen(loadAndRestoreGame);
    }
};

show_modal = function (
    title = "Variables changed:",
    type = null,
    text = null,
    duration = 5000
) {
    var modal_contents = "";
    var types = [];
    if (typeof title === "object") {
        duration =
            typeof title.duration !== "undefined" ? title.duration : duration;
        type = typeof title.type !== "undefined" ? title.type : type;
        text = typeof title.text !== "undefined" ? title.text : text;
        title =
            typeof title.title !== "undefined"
                ? title.title
                : "Variables changed:";
    }
    if (text === null) {
        if (window.csgtOptions.csgtModalDisabledByAuthor && !window.csgtOptions.csgtForceDisplay) {
            if (!window.modalDisableWarned) {
                show_modal("Notifications disabled", "warning", "The author has disabled notifications on this work. To override this, go to the CSGT options menu. On leaving that menu you will be prompted to override the author's disabling.", 20_000)
                window.modalDisableWarned = true
            }
            return;
        }
        for (variable in changes_to_display) {
            var change = changes_to_display[variable];
            if (change.value == 0 && change.type != "absolute") continue;
            if (modal_contents != "") modal_contents += "\n";
            if (typeof window.stats[variable] !== "undefined") {
                modal_contents += variable + ": ";
            } else {
                modal_contents += "[i]" + variable + "[/i]: "
            }
            switch (change.type) {
                case "relative":
                case "percent":
                    if (change.value > 0) {
                        modal_contents += "+" + String(change.value);
                        if (!types.includes("increase")) types.push("increase");
                    } else {
                        modal_contents += String(change.value);
                        if (!types.includes("decrease")) types.push("decrease");
                    }
                    if (change.type == "percent")
                        modal_contents += " (" + change.rep + ")";
                    if (window.csgtOptions.csgtShowTotal) {
                        if (typeof window.stats[variable] !== "undefined") {
                            modal_contents +=
                                " [" + String(window.stats[variable]) + "]";
                        } else {
                            modal_contents +=
                                " [" +
                                String(window.stats.scene.temps[variable]) +
                                "]";
                        }
                    }
                    break;
                case "absolute":
                    modal_contents += change.value;
                    if (!types.includes("absolute")) types.push("absolute");
                    break;
            }
        }
        if (modal_contents == "") {
            return;
        }
        changes_to_display = {};
    } else {
        modal_contents = text;
    }
    var modal = document.createElement("div");
    if (type === null) {
        modal.classList.add("snooper-modal", ...types);
    } else {
        modal.classList.add("snooper-modal", type);
    }
    function sanitize(s) {
        return s
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\n", "<br>")
            .replaceAll("[i]", "<i>")
            .replaceAll("[/i]", "</i>");
    }
    title = sanitize(title);
    if (modal_contents != "") {
        modal_contents = sanitize(modal_contents);
        modal.innerHTML = title + "<br>" + modal_contents;
    } else {
        modal.innerHTML = title;
    }
    var progressBar = document.createElement("div");
    progressBar.classList.add("modal-progress");
    modal.append(progressBar);

    modal.setAttribute("data-swipe-threshold", "30")
    modal.setAttribute("data-swipe-timeout", "2000")
    var container = $("#snooper-modal-container");
    container.append(modal);

    var immediate = false;
    if (duration <= 0) {
        immediate = true;
        duration = 5000;
        modal.classList.add("paused");
    }
    const slideDuration = 500;
    const scaleDuration = 200;
    var totalDuration = duration + 2 * (slideDuration + scaleDuration);

    var scaleOffset = scaleDuration / totalDuration;
    var bounceOffset = scaleOffset + ((7 / 8) * slideDuration) / totalDuration;
    var slideOffset = scaleOffset + slideDuration / totalDuration;
    var modalHeight = $(modal).height();

    function keyFrame(height, position, offset, easing) {
        var leftOffset
        switch (position) {
            case "normal":
                leftOffset = 0
                break;
            case "bounce":
                leftOffset = "-30px"
                break;
            case "offscreen":
                leftOffset = "calc(100% + 30px)"
                break;
            default:
                leftOffset = position
                break;
        }
        var result = {
            height: modalHeight * height + "px",
            paddingTop: 1 * height + "em",
            paddingBottom: 1 * height + "em",
            borderWidth: 2 * height + "px",
            marginBottom: 15 * height + "px",
            left: leftOffset
        }
        if (offset) {
            result['offset'] = offset
        }
        if (easing) {
            result['easing'] = easing
        }
        return result
    }

    var fadeInOut = modal.animate(
        [
            keyFrame(0, "offscreen"),
            keyFrame(1, "offscreen", scaleOffset, "ease-out"),
            keyFrame(1, "bounce", bounceOffset, "ease-in-out"),
            keyFrame(1, "normal", slideOffset, "ease-in"),
            keyFrame(1, "normal", 1 - slideOffset, "ease-out"),
            keyFrame(1, "bounce", 1 - bounceOffset, "ease-in-out"),
            keyFrame(1, "offscreen", 1 - scaleOffset, "ease-in"),
            keyFrame(0, "offscreen")
        ],
        { duration: totalDuration, iterations: 1, fill: "both" }
    );
    fadeInOut.pause();

    var makeProgress = progressBar.animate(
        [
            { width: "calc(100% + 2em - 23px)", offset: 0 },
            { width: "calc(100% + 2em - 23px)", offset: slideOffset },
            { width: "0", offset: 1 - slideOffset },
            { width: "0", offset: 1 },
        ],
        { duration: totalDuration, iterations: 1, fill: "both" }
    );
    makeProgress.pause();

    function modalPause(force = false) {
        progress =
            (fadeInOut.currentTime -
                fadeInOut.effect.getComputedTiming().delay) /
            fadeInOut.effect.getComputedTiming().activeDuration;
        if (
            (progress >= slideOffset && progress <= (1-slideOffset)) ||
            force === true
        ) {
            fadeInOut.pause();
            makeProgress.pause();
            var newTime =
                fadeInOut.effect.getComputedTiming().delay +
                fadeInOut.effect.getComputedTiming().activeDuration *
                    (1 - slideOffset);
            fadeInOut.currentTime = newTime;
            makeProgress.currentTime = newTime;
        }
    }
    modal.addEventListener("mouseenter", modalPause);
    modal.addEventListener("mouseleave", () => {
        if (!modal.classList.contains("paused")) {
            fadeInOut.play();
        }
    });
    modal.addEventListener("click", () => {
        if (!modal.classList.contains("paused")) {
            modal.classList.add("paused");
        } else {
            modal.classList.remove("paused");
        }
    });

    function handleSwipe(e) {
        modalPause(true);
        fadeInOut.play();
        makeProgress.play();
    }
    modal.addEventListener('swiped-right', handleSwipe)

    if (!immediate) {
        fadeInOut.play();
        makeProgress.play();
    } else {
        modalPause(true);
    }

    fadeInOut.finished.then(() => {
        modal.remove();
    });
};

function statIsNumber(stat) {
    return String(Number(stat)) === stat || Number(String(stat)) === stat;
}

function wrapFunction(parent, name, newFunction) {
    var oldFunction = parent[name]
    parent[name] = (...args) => {
        return newFunction(oldFunction, ...args)
    }
    return parent[name]
}

// Override the Choicescript zoom function
wrapFunction(window, 'setZoomFactor', function(setZoomFactor, zoomFactor) {
    if (zoomFactor === null || typeof zoomFactor === "undefined") return;

    if (!/(moody\.ink|localhost|choiceofgames\.com)/.test(window.location.href)){
        var sn_cs_container = $("#snooper-container");
        if (sn_cs_container.length == 0) {
            sn_cs_container = document.createElement("div");
            sn_cs_container.id = "snooper-container";
            document.body.append(sn_cs_container);
        } else {
            sn_cs_container = sn_cs_container[0];
        }
        $("#snooper-container").append($("#container1").detach());

        if (sn_cs_container.style.zoom === undefined) {
            var initialMaxWidth = 680;
            document.body.style.maxWidth = initialMaxWidth / zoomFactor + "px";
            sn_cs_container.style.transformOrigin = "center top";
            sn_cs_container.style.transform = "scale(" + zoomFactor + ")";
            sn_cs_container.style.webkitTransformOrigin = "center top";
            sn_cs_container.style.webkitTransform = "scale(" + zoomFactor + ")";
            window.zoomFactor = zoomFactor;
            var csgt_modal_container = $("#snooper-modal-container")[0]
            csgt_modal_container.style.transformOrigin = "right top";
            csgt_modal_container.style.transform = "scale(" + zoomFactor + ")";
            csgt_modal_container.style.webkitTransformOrigin = "right top";
            csgt_modal_container.style.webkitTransform = "scale(" + zoomFactor + ")";
        } else {
            sn_cs_container.body.style.zoom = zoomFactor;
        }
        window.csgtOptions.zoom = zoomFactor;
    } else {
        setZoomFactor(zoomFactor);
        window.csgtOptions.zoom = zoomFactor;
    }
})
setZoomFactor(1.0);

wrapFunction(window, 'getZoomFactor', function(getZoomFactor) {
    if (!/(moody\.ink|localhost|choiceofgames\.com)/.test(window.location.href)){
        var sn_cs_container = document.getElementById("snooper-container");
        if (!sn_cs_container) return 1;
        if (sn_cs_container.style.zoom === undefined) {
            return window.zoomFactor || 1;
        } else {
            var zoomFactor = parseFloat(document.body.style.zoom);
            if (isNaN(zoomFactor)) zoomFactor = 1;
            return zoomFactor;
        }
    } else {
        return getZoomFactor()
    }
});

wrapFunction(window, 'clearScreen', function (clearScreen, code) {
    var wrapper = wrapFunction(document.body.__proto__, 'insertBefore', function (insertBefore, newNode, referenceNode) {
        document.body.__proto__.insertBefore = insertBefore
        referenceNode.parentNode.insertBefore(newNode, referenceNode);
        document.body.__proto__.insertBefore = wrapper
    })
    clearScreen(code);
});

function openCode() {
    var selection = window.getSelection();
    var highlighted = [];
    if (selection.rangeCount) {
        var range = selection.getRangeAt(0);

        var highlighted = [];
        range
            .cloneContents()
            .querySelectorAll("span")
            .forEach((e) => {
                if (e.hasAttribute("line"))
                    highlighted.push(Number(e.getAttribute("line")));
            });

        var commonParent = range.commonAncestorContainer;
        while (commonParent != document.body) {
            if (
                commonParent.tagName == "SPAN" &&
                commonParent.hasAttribute("line")
            ) {
                highlighted.push(Number(commonParent.getAttribute("line")));
            }
            commonParent = commonParent.parentElement;
        }
    }
    window.store.get("state", (ok, value) => {
        if (ok && value) {
            let jv = jsonParse(value)
            return [jv.lineNum, jv.stats.sceneName]
        } else {
            return [0, 'startup']
        }
    }).then(([startLine, startScene]) => {

    $("div.code mark[line-number=" + startLine + "]").each((_, e) => {
        $(e).addClass("start")
    })
    $("div.code mark[line-number=" + (stats.scene.lineNum - 1) + "]").each((_, e) => {
        $(e).addClass("next-line")
    })
    $(highlighted.map(lineNum =>
        "div.code mark[line-number=" + lineNum + "]"
    ).join(",")).each((_, e) => {
        $(e).addClass("highlighted")
    })

    $("div.code-container")[0].scrollTop = 0;
    $("div.popover").slideDown(1000, () => {
        var scrollTo = null
        for (var markClass of ["highlighted", "start", "next-line"]) {
            var marks = $("mark." + markClass)
            if (marks.length > 0) {
                scrollTo = marks[0];
                break;
            }
        }
        if (scrollTo !== null) {
            $("div.code-container").animate(
                {
                    scrollTop:
                        scrollTo.offsetTop -
                        $("div.code-container").height() / 2,
                },
                1500
            );
        }
    });
    document
        .querySelector(":root")
        .style.setProperty(
            "--linenum-width",
            $("mark.linenum:last-of-type").width()
        );
    })
}

function closeCode() {
    $("div.code-container").animate({ scrollTop: 0 }, 900);
    $("div.popover").slideUp(1000);
    $("div.code mark.highlighted, div.code mark.next-line, div.code mark.start").removeClass("highlighted next-line start")
}

function csgtOptionsShow(kind) {
    if (kind == "vars") {
        return window.csgtOptions.csgtShowVars && (!window.csgtOptions.csgtModalDisabledByAuthor || window.csgtOptions.csgtForceDisplay);
    }
    else if (kind == "temps") {
        return window.csgtOptions.csgtShowTemps && (!window.csgtOptions.csgtModalDisabledByAuthor || window.csgtOptions.csgtForceDisplay);
    }
    else {
        return window.csgtOptions.csgtShowTotal;
    }
}

function csgtOptionsCheck() {
    return (window.csgtOptions.csgtModalDisabledByAuthor && !window.csgtOptions.csgtForceDisplay && (window.csgtOptions.csgtShowVars || window.csgtOptions.csgtShowTemps))
}

function csgtOptionsMenu(continue_options) {
    function csgtCloseOptions() {
        if (csgtOptionsCheck()) {
            window.modalDisableWarned = true
            if (confirm("The author has disabled stat change notifications for this game.\n\nPress 'OK' to enable them anyway, or press 'Cancel' to leave them disabled.")) {
                window.csgtOptions.csgtForceDisplay = true
            }
        }
        var button = document.getElementById("csgtOptionsButton");
        button.innerHTML = "CSGT Options"
        loadAndRestoreGame();
    }
    if (!continue_options) {
        if (document.getElementById("loading")) return;
        var button = document.getElementById("csgtOptionsButton");
        if (!button) return;
        if (button.innerHTML == "Return to the Game") {
            return clearScreen(csgtCloseOptions);
        }
    }
    function menu() {
        setButtonTitles();
        var button = document.getElementById("csgtOptionsButton");
        button.innerHTML = "Return to the Game";
        var options = [
            { name: "Return to the game.", group: "choice", resume: true },
        ];
        function toggleOption(varName, optStr, retVar) {
            function capitalizeFirstLetter(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }
            var name = capitalizeFirstLetter(optStr)
            if (window.csgtOptions[varName]) {
                name = "Don't " + optStr
            }
            options.push({name: name, group: "choice", [retVar]: true})
        }
        toggleOption('csgtShowVars', 'notify about variable changes', 'notify_var')
        toggleOption('csgtShowTemps', 'notify about changes in temp variables', 'notify_temp')
        toggleOption('csgtShowTotal', 'include total in notifications', 'notify_total')
        options.push({name: "Load / import a CSGT save.", group: "choice", copy_other: true})
        options.push({name: "Manage / delete CSGT save data.", group: "choice", manage_saves: true})
        options.push({name: "Save the game to CSGT storage.", group: "choice", custom_save: true})
        // options.push({name: "Save/load a save to / from a file.", group: "choice", save_files: true})
        printOptions([""], options, function (option) {
            if (option.resume) {
                return clearScreen(csgtCloseOptions);
            } else if (option.notify_var) {
                window.csgtOptions.csgtShowVars = !window.csgtOptions.csgtShowVars
            } else if (option.notify_temp) {
                window.csgtOptions.csgtShowTemps = !window.csgtOptions.csgtShowTemps
            } else if (option.notify_total) {
                window.csgtOptions.csgtShowTotal = !window.csgtOptions.csgtShowTotal
            } else if (option.copy_other) {
                return csgtRequestSyncedSaveList("copy")
            } else if (option.manage_saves) {
                return csgtRequestSyncedSaveList("manage")
            } else if (option.custom_save) {
                return csgtCustomSaveMenu()
            }
            csgtOptionsMenu(true);
        });
        curl();
    }
    clearScreen(menu);
}

function csgtCopyOtherMenu(otherSavesList) {
    function csgtCloseCopyOther(copyStats) {
        var button = document.getElementById("csgtOptionsButton");
        button.innerHTML = "CSGT Options"
        if (!copyStats) {
            loadAndRestoreGame();
        }
    }
    var button = document.getElementById("csgtOptionsButton")

    if (!otherSavesList || !button || button.innerHTML != "Return to the Game" || document.getElementById("loading")) {
        return;
    }
    function menu() {
        var options = [];
        for (var otherSave of otherSavesList) {
            var name = otherSave
            if (otherSave.startsWith("SnooperHack_")) {
                name = otherSave.substring(12)
            }
            name = name.replace(/-x((?:[0-9a-f]{2})+)-/ig, function (_, cc) {return String.fromCharCode(Number("0x" + cc))})
            options.push({
                name: "Copy values from '" + name + "'",
                group: "choice",
                copyFrom: otherSave,
                backToGame: true
            })
        }
        options.push({
            name: "Back to CSGT options",
            group: "choice",
            backToOptions: true
        })
        options.push({
            name: "Back to the game",
            group: "choice",
            backToGame: true
        })
        printOptions([""], options, function (option) {
            if (option.backToOptions) {
                return clearScreen(() => { csgtOptionsMenu(true) })
            } else if (option.backToGame) {
                if (option.copyFrom) {
                    csgtRequestOtherSaveData(option.copyFrom)
                }
                return clearScreen(() => {
                    csgtCloseCopyOther(option.copyFrom)
                })
            }
            csgtCopyOtherMenu(otherSavesList)
        })
        curl();
    }
    clearScreen(menu);
}

function csgtManageSavesMenu(otherSavesList) {
    function csgtCloseManageSaves() {
        var button = document.getElementById("csgtOptionsButton");
        button.innerHTML = "CSGT Options"
    }
    var button = document.getElementById("csgtOptionsButton")

    if (!otherSavesList || !button || button.innerHTML != "Return to the Game" || document.getElementById("loading")) {
        return;
    }
    function menu() {
        var options = [];
        for (var otherSave of otherSavesList) {
            var name = otherSave
            if (otherSave.startsWith("SnooperHack_")) {
                name = otherSave.substring(12)
            }
            name = name.replace(/-x((?:[0-9a-f]{2})+)-/ig, function (_, cc) {return String.fromCharCode(Number("0x" + cc))})
            options.push({
                name: "Delete save for game '" + name + "'",
                group: "choice",
                deleteSave: otherSave,
            })
        }
        options.push({
            name: "Back to CSGT options",
            group: "choice",
            backToOptions: true
        })
        options.push({
            name: "Back to the game",
            group: "choice",
            backToGame: true
        })
        printOptions([""], options, function (option) {
            if (option.backToOptions) {
                return clearScreen(() => { csgtOptionsMenu(true) })
            } else if (option.backToGame) {
                return clearScreen(() => {
                    csgtCloseManageSaves()
                })
            } else if (option.deleteSave) {
                if (confirm("Are you sure you want to delete the data for " + option.deleteSave + "?")){
                    csgtRequestDeleteSaveData(option.deleteSave)
                } else {
                    show_modal("Aborted", "warning", "Save not deleted.")
                }
            }
            csgtManageSavesMenu(otherSavesList)
        })
        curl();
    }
    clearScreen(menu);
}

function csgtCustomSaveMenu() {
    function csgtCloseCustomSave() {
        var button = document.getElementById("csgtOptionsButton");
        button.innerHTML = "CSGT Options"
    }
    var button = document.getElementById("csgtOptionsButton")

    if (!button || button.innerHTML != "Return to the Game" || document.getElementById("loading")) {
        return;
    }
    function menu() {
        var options = [];
        options.push({
            name: "Save the state at the beginning of this page (for use with this game)",
            group: "choice",
            save: "state",
            backToOptions: true
        })
        options.push({
            name: "Save the state at the end of the page (to import into another game)",
            group: "choice",
            save: "statetemp",
            backToOptions: true
        })
        options.push({
            name: "Back to CSGT options",
            group: "choice",
            backToOptions: true
        })
        options.push({
            name: "Back to the game",
            group: "choice",
            backToGame: true
        })
        printOptions([""], options, function (option) {
            if (option.backToOptions) {
                if (option.save) {
                    let saveName = prompt("Enter a custom name to save with:", window.storeName);
                    if (saveName) {
                        snooperSyncFromLocal(saveName, option.save);
                    } else {
                        show_modal("Save not created.", "warning", "");
                    }
                }
                return clearScreen(() => { csgtOptionsMenu(true) })
            } else if (option.backToGame) {
                return clearScreen(() => {
                    csgtCloseCustomSave()
                })
            } else if (option.saveBeginning) {

            }
            csgtCustomSaveMenu()
        })
        curl();
    }
    clearScreen(menu);
}

wrapFunction(window, 'changeBackgroundColor', (changeBackgroundColor, color, ...args) => {
    csgtOptions.backgroundColor = color
    changeBackgroundColor(color, ...args)
})

wrapFunction(window, 'setButtonTitles', (setButtonTitles) => {
    setButtonTitles()
    var button = document.getElementById("csgtOptionsButton");
    if (button) {
        button.textContent = "CSGT Options";
    }
});

wrapFunction(window, 'textOptionsMenu', (textOptionsMenu, ...args) => {
    var button = document.getElementById("csgtOptionsButton");
    if(button) {
        button.textContent = "CSGT Options";
    }
    textOptionsMenu(...args);
});
