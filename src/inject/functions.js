function getNextLine(starting_line) {
    var current_line = starting_line;
    var line;
    while (isDefined((line = window.stats.scene.lines[current_line]))) {
        if (line.trim() != "" && !line.trim().startsWith("*comment")) {
            return current_line;
        }
        current_line += 1;
    }
    return -1;
}

function isObject(obj) {
    return obj != null && typeof obj === "object";
}

function objIsEqual(obj1, obj2, skip = []) {
    if (!(isObject(obj1) && isObject(obj2))) {
        return obj1 === obj2;
    }
    var props1 = Object.getOwnPropertyNames(obj1);
    var props2 = Object.getOwnPropertyNames(obj2);

    if (props1.length != props2.length) {
        return false;
    }

    for (var i = 0; i < props1.length; i++) {
        if (skip.includes(props1[i])) continue;
        let val1 = obj1[props1[i]];
        let val2 = obj2[props1[i]];

        if (!objIsEqual(val1, val2)) return false;
    }
    return true;
}

goBack = function () {
    if (typeof window.store === "undefined") {
        if (ddHistory.length() > 0) {
            let scene = window.stats.scene;
            ddHistory.blockNext = 1;
            if (
                ddHistory.peek(-2).line == 0 &&
                ddHistory.peek(-2).stats["sceneName"] == "startup"
            ) {
                restartGame(false);
                return;
            }
            scene.resetPage();
            function restoreVar(
                toRestore,
                restoreFrom,
                display_changes = false,
                skip = null
            ) {
                if (skip === null) skip = new Set();
                if (!(skip instanceof Set)) skip = new Set(skip);
                for (const key in restoreFrom) {
                    if (!skip.has(key)) {
                        value = restoreFrom[key];
                        if (typeof value === "object") {
                            if (Array.isArray(value)) {
                                toRestore[key] = new Array();
                                for (const val in value.values()) {
                                    toRestore[key].push(val);
                                }
                            } else {
                                toRestore[key] = new Object();
                                for (const o_key in value) {
                                    toRestore[key][o_key] = value[o_key];
                                }
                            }
                        } else {
                            if (
                                toRestore[key] !== value &&
                                !key.startsWith("_") &&
                                display_changes
                            ) {
                                changes_to_display[key] = {
                                    type: "absolute",
                                    value: value,
                                };
                            }
                            toRestore[key] = value;
                        }
                    }
                }
            }

            ddHistory.pop();
            let history_data = ddHistory.peek();
            restoreVar(window.stats, history_data.stats, true, ["sceneName"]);
            restoreVar(scene.temps, history_data.temps, true);
            restoreVar(window.nav, history_data.nav);

            show_modal("Restored variables:", "warning");

            var prev_icf = window.stats.implicit_control_flow;
            window.stats.implicit_control_flow = true;

            if (history_data.stats["sceneName"] != scene.name) {
                scene = new Scene(
                    history_data.stats["sceneName"],
                    window.stats,
                    window.nav
                );
                ddHistory.blockNext = 1;
                scene.lineNum = history_data.line;
                clearScreen(function () {
                    scene.execute();
                });
            } else {
                window.stats.testEntryPoint = getNextLine(history_data.line);
                scene.reexecute();
            }

            if (typeof prev_icf !== "undefined") {
                window.stats.implicit_control_flow = prev_icf;
            } else {
                delete window.stats.implicit_control_flow;
            }
        } else {
            show_modal(
                "Error:",
                "error",
                "No history data available to restore!"
            );
        }
    } else {
        if (autosave_history.length == 0) {
            show_modal(
                "Error:",
                "error",
                "No history data available to restore!"
            );
        } else {
            window.pseudoSave[""] = autosave_history.pop();
            window.store.set("state", window.pseudoSave[""]);
            clearScreen(loadAndRestoreGame);
        }
    }
};

saveInformation = function (self) {
    function pack_object(obj, skip = [], obj_history = []) {
        switch (typeof obj) {
            case "string":
                return new String(obj).toString();
            case "object":
                var result = null;
                if (Array.isArray(obj)) {
                    result = new Array();
                    for (const key in obj) {
                        if (typeof obj[key] !== "undefined") {
                            try {
                                result.push(
                                    pack_object(obj[key], skip, [
                                        ...obj_history,
                                        obj,
                                    ])
                                );
                            } catch (e) {
                                if (e.name !== "TypeError") {
                                    throw e;
                                }
                            }
                        }
                    }
                } else {
                    if (obj === null) {
                        return null;
                    }
                    result = new Object();
                    for (const key in obj) {
                        if (skip.includes(key)) continue;
                        if (typeof obj[key] !== "undefined") {
                            try {
                                result[key] = pack_object(obj[key], skip, [
                                    ...obj_history,
                                    obj,
                                ]);
                            } catch (e) {
                                if (e.name !== "TypeError") {
                                    throw e;
                                }
                            }
                        }
                    }
                }
                return result;
            case "function":
                break;
            default:
                // "number", "boolean"
                return obj;
        }
        throw new TypeError("Invalid type '" + typeof obj + "' in pack_object");
    }
    var history_data = ddHistory.peek();
    var save_stats = pack_object(self.stats, ["scene", "testEntryPoint"]);
    var save_temps = pack_object(self.temps, ["_choiceEnds"]);
    var save_nav = pack_object(self.nav);
    var line_to_save = getNextLine(self.lineNum);

    if (line_to_save < 0) return;

    if (stats.scene.secondaryMode != "stats") {
        if (
            forceSave ||
            history_data.line != line_to_save ||
            history_data.stats["sceneName"] != self.stats["sceneName"]
        ) {
            ddHistory.push(line_to_save, save_stats, save_temps);
            forceSave = false;
        }
    }
};

show_modal = function (title = "Variables changed:", type = null, text = null) {
    var modal_contents = "";
    var types = [];
    if (text === null) {
        for (variable in changes_to_display) {
            var change = changes_to_display[variable];
            if (change.value == 0 && change.type != "absolute") continue;
            if (modal_contents != "") modal_contents += "\n";
            modal_contents += variable + ": ";
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
                    if (window.stats.snooperShowTotal) {
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
            .replaceAll("\n", "<br>");
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
    var container = $("#snooper-modal-container");
    container.append(modal);

    var fadeInOut = modal.animate(
        [
            { transform: "translateX(120%)", offset: 0, easing: "ease-out" },
            {
                transform: "translateX(-20%)",
                offset: 0.07,
                easing: "ease-in-out",
            },
            { transform: "translateX(0%)", offset: 0.08 },
            {
                transform: "translateX(0%)",
                offset: 0.92,
                easing: "ease-in-out",
            },
            { transform: "translateX(-20%)", offset: 0.93, easing: "ease-in" },
            { transform: "translateX(120%)", offset: 1 },
        ],
        { duration: 5000, iterations: 1, fill: "both" }
    );
    fadeInOut.pause();
    modal.addEventListener("mouseenter", () => {
        progress =
            (fadeInOut.currentTime -
                fadeInOut.effect.getComputedTiming().delay) /
            fadeInOut.effect.getComputedTiming().activeDuration;
        if (progress >= 0.08 && progress <= 0.92) {
            fadeInOut.pause();
            fadeInOut.currentTime =
                fadeInOut.effect.getComputedTiming().delay +
                fadeInOut.effect.getComputedTiming().activeDuration * 0.92;
        }
    });
    modal.addEventListener("mouseleave", () => {
        fadeInOut.play();
    });
    fadeInOut.play();

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

_clearScreen = clearScreen;
clearScreen = function (code) {
    document.body.__proto__._insertBefore =
        document.body.__proto__.insertBefore;
    document.body.__proto__.insertBefore = function (newNode, referenceNode) {
        document.body.__proto__.insertBefore =
            document.body.__proto__._insertBefore;
        referenceNode.parentNode.insertBefore(newNode, referenceNode);
    };
    _clearScreen(code);
};

function openCode() {
    var selection = window.getSelection();
    var highlighted = [];
    if (selection.rangeCount) {
        var range = selection.getRangeAt(0);

        var highlighted = [];
        range
            .cloneContents()
            .querySelectorAll("span")
            .forEach((e) => { if(e.hasAttribute("line")) highlighted.push(Number(e.getAttribute("line"))) });

        var commonParent = range.commonAncestorContainer;
        while (commonParent != document.body) {
            if (commonParent.tagName == "SPAN" && commonParent.hasAttribute("line")) {
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
    })

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
                    ($("mark.start"))[0].offsetTop -
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

