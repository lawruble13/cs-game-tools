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
    var zoomFactor = getZoomFactor();
    modal.style.transformOrigin = "right top";
    modal.style.transform = "scale(" + zoomFactor + ")";
    modal.style.webkitTransformOrigin = "right top";
    modal.style.webkitTransform = "scale(" + zoomFactor + ")";
    var progressBar = document.createElement("div");
    progressBar.classList.add("modal-progress");
    modal.append(progressBar);
    var container = $("#snooper-modal-container");
    container.append(modal);

    var immediate = false;
    if (duration <= 0) {
        immediate = true;
        duration = 5000;
        modal.classList.add("paused");
    } else if (duration < 0.16 * 5000) {
        duration = 0.17 * 5000;
    }
    function offset(offset) {
        return (offset * 5000) / duration;
    }

    var fadeInOut = modal.animate(
        [
            { transform: "translateX(120%)", offset: 0, easing: "ease-out" },
            {
                transform: "translateX(-20%)",
                offset: offset(0.07),
                easing: "ease-in-out",
            },
            { transform: "translateX(0%)", offset: offset(0.08) },
            {
                transform: "translateX(0%)",
                offset: 1 - offset(0.08),
                easing: "ease-in-out",
            },
            {
                transform: "translateX(-20%)",
                offset: 1 - offset(0.07),
                easing: "ease-in",
            },
            { transform: "translateX(120%)", offset: 1 },
        ],
        { duration: duration, iterations: 1, fill: "both" }
    );
    fadeInOut.pause();

    var makeProgress = progressBar.animate(
        [
            { width: "calc(100% + 2em - 23px)", offset: 0 },
            { width: "calc(100% + 2em - 23px)", offset: offset(0.08) },
            { width: "0", offset: 1 - offset(0.08) },
            { width: "0", offset: 1 },
        ],
        { duration: duration, iterations: 1, fill: "both" }
    );
    makeProgress.pause();
    function modalPause(force = false) {
        progress =
            (fadeInOut.currentTime -
                fadeInOut.effect.getComputedTiming().delay) /
            fadeInOut.effect.getComputedTiming().activeDuration;
        if (
            (progress >= offset(0.08) && progress <= (1-offset(0.08))) ||
            force === true
        ) {
            fadeInOut.pause();
            makeProgress.pause();
            var newTime =
                fadeInOut.effect.getComputedTiming().delay +
                fadeInOut.effect.getComputedTiming().activeDuration *
                    (1 - offset(0.08));
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

// Override the Choicescript zoom function
setZoomFactor = function (zoomFactor) {
    var sn_cs_container = $("#snooper-container");
    if (sn_cs_container.length == 0) {
        sn_cs_container = document.createElement("div");
        sn_cs_container.id = "snooper-container";
        document.body.append(sn_cs_container);
        $("#snooper-container").append($("#container1").detach());
    } else {
        sn_cs_container = sn_cs_container[0];
    }

    if (sn_cs_container.style.zoom === undefined) {
        var initialMaxWidth = 680;
        document.body.style.maxWidth = initialMaxWidth / zoomFactor + "px";
        sn_cs_container.style.transformOrigin = "center top";
        sn_cs_container.style.transform = "scale(" + zoomFactor + ")";
        sn_cs_container.style.webkitTransformOrigin = "center top";
        sn_cs_container.style.webkitTransform = "scale(" + zoomFactor + ")";
        window.zoomFactor = zoomFactor;
    } else {
        sn_cs_container.body.style.zoom = zoomFactor;
    }
};

getZoomFactor = function () {
    var sn_cs_container = document.getElementById("snooper-container");
    if (!sn_cs_container) return 1;
    if (sn_cs_container.style.zoom === undefined) {
        return window.zoomFactor || 1;
    } else {
        var zoomFactor = parseFloat(document.body.style.zoom);
        if (isNaN(zoomFactor)) zoomFactor = 1;
        return zoomFactor;
    }
};

function wrapFunction(parent, name, newFunction) {
    var oldFunction = parent[name]
    parent[name] = (...args) => {
        newFunction(oldFunction, ...args)
    }
}

wrapFunction(window, 'clearScreen', function (clearScreen, code) {
    wrapFunction(document.body.__proto__, 'insertBefore', function (insertBefore, newNode, referenceNode) {
        document.body.__proto__.insertBefore = insertBefore
        referenceNode.parentNode.insertBefore(newNode, referenceNode);
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
    var startLine = 0;
    window.store.get("state", (ok, value) => {
        if (ok) {
            startLine = jsonParse(value).lineNum;
        }
    });

    var codeHTML = stats.scene.lines
        .map((element, index) => {
            var ln = "<mark class='linenum'>" + index + "</mark>";
            var mark_classes = [];
            if (index == startLine) {
                mark_classes.push("start");
            }
            if (index == stats.scene.lineNum - 1) {
                mark_classes.push("next-line");
            }
            if (highlighted.includes(index)) {
                mark_classes.push("highlighted");
            }
            if (mark_classes.length > 0) {
                return (
                    ln +
                    "<mark class='" +
                    mark_classes.join(" ") +
                    "'><p>" +
                    element.replaceAll("\t", "    ") +
                    "</p></mark>"
                );
            } else {
                return ln + "<p>" + element.replaceAll("\t", "    ") + "</p>";
            }
        })
        .join("\n");
    $("div.code").html(codeHTML);
    $("div.code-container")[0].scrollTop = 0;
    $("div.popover").slideDown(1000, () => {
        $("div.code-container").animate(
            {
                scrollTop:
                    $("mark.start")[0].offsetTop -
                    $("div.code-container").height() / 2,
            },
            1500
        );
    });
    document
        .querySelector(":root")
        .style.setProperty(
            "--linenum-width",
            $("mark.linenum:last-of-type").width()
        );
}

function closeCode() {
    $("div.code-container").animate({ scrollTop: 0 }, 900);
    $("div.popover").slideUp(1000);
}

function csgtOptionsMenu(continue_options) {
    if (!continue_options) {
        if (document.getElementById("loading")) return;
        var button = document.getElementById("csgtOptionsButton");
        if (!button) return;
        if (button.innerHTML == "Return to the Game") {
            return clearScreen(function () {
                var button = document.getElementById("csgtOptionsButton");
                button.innerHTML = "CSGT Options"
                loadAndRestoreGame();
            });
        }
    }
    function menu() {
        setButtonTitles();
        var button = document.getElementById("csgtOptionsButton");
        button.innerHTML = "Return to the Game";
        options = [
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
        printOptions([""], options, function (option) {
            if (option.resume) {
                return clearScreen(function () {
                    var button = document.getElementById("csgtOptionsButton");
                    button.innerHTML = "CSGT Options"
                    loadAndRestoreGame();
                    if (typeof window.stats._csgtOptions === 'undefined') {
                        window.stats._csgtOptions = window.csgtOptions
                    }
                });
            } else if (option.notify_var) {
                window.csgtOptions.csgtShowVars = !window.csgtOptions.csgtShowVars
            } else if (option.notify_temp) {
                window.csgtOptions.csgtShowTemps = !window.csgtOptions.csgtShowTemps
            } else if (option.notify_total) {
                window.csgtOptions.csgtShowTotal = !window.csgtOptions.csgtShowTotal
            }
            csgtOptionsMenu(true);
        });
        curl();
    }
    clearScreen(menu);
}
