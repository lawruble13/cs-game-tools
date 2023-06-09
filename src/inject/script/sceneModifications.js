if (typeof Scene.prototype._execute == "undefined") {
    Scene.prototype._execute = Scene.prototype.execute;
    Scene.prototype.execute = function () {
        let self = this;
        this._execute();
        show_modal();
    };
}
if (typeof Scene.prototype._setVar === "undefined") {
    Scene.prototype._setVar = Scene.prototype.setVar;
    Scene.prototype.setVar = function (variable, value) {
        if (!change_tracked && typeof this.stats[variable] !== "undefined") {
            changes_to_display[variable] = {
                type: "absolute",
                value: value,
            };
        }
        if (this.secondaryMode == "stats") forceSave = true;
        this._setVar(variable, value);
        change_tracked = false;
    };
}

wrapSet = function (setter_name, variable_getter) {
    if (typeof Scene.prototype["_" + setter_name] === "undefined") {
        Scene.prototype["_" + setter_name] = Scene.prototype[setter_name];
        Scene.prototype[setter_name] = function (line) {
            change_tracked = true;
            var stack = this.tokenizeExpr(line);
            var self = this;
            var variable = variable_getter(self, stack);
            var variable_container;
            if (typeof this.stats[variable] !== "undefined" && csgtOptionsShow("vars")) {
                variable_container = this.stats;
            } else if (
                typeof this.temps[variable] !== "undefined" &&
                csgtOptionsShow("temps")
            ) {
                variable_container = this.temps;
            }
            if (typeof variable_container !== "undefined") {
                var previous_value = variable_container[variable];
                if (typeof changes_to_display[variable] !== "undefined") {
                    if (changes_to_display[variable].type === "relative") {
                        previous_value -= changes_to_display[variable].value;
                    } else {
                        previous_value = "";
                    }
                }
                this["_" + setter_name](line);
                var new_value = variable_container[variable];
                if (previous_value != new_value) {
                    if (
                        statIsNumber(previous_value) &&
                        statIsNumber(new_value)
                    ) {
                        changes_to_display[variable] = {
                            type: "relative",
                            value: new_value - previous_value,
                        };
                    } else {
                        changes_to_display[variable] = {
                            type: "absolute",
                            value: new_value,
                        };
                    }
                }
            } else {
                this["_" + setter_name](line);
            }
        };
    }
};

wrapSet("set", (self, stack) => {
    return self.evaluateReference(stack);
});
wrapSet("setref", (self, stack) => {
    return String(self.evaluateValueToken(stack.shift(), stack)).toLowerCase();
});

if (typeof Scene.prototype._resetPage === "undefined") {
    Scene.prototype._resetPage = Scene.prototype.resetPage;
    Scene.prototype.resetPage = function resetPage() {
        closeCode();
        if (/dashingdon/i.test(window.location)) {
            var scene = window.stats.scene;

            var password = computeCookie(
                scene.stats,
                scene.temps,
                scene.lineNum,
                scene.indent
            );
            password = scene.obfuscate(password);
            password =
                "----- BEGIN PASSWORD -----\n" +
                password +
                "\n----- END PASSWORD -----";
            saveMod.c_password = password; //Stores password but doesn't "save it".
        }
        var self = this;
        this.resetCheckedPurchases();
        clearScreen(function () {
            // save in the background, eventually
            window.store.get("state", function (ok, value) {
                if (ok) {
                    autosave_history.push(value);
                }
            });
            self.save("");
            window.store.set("lastSaved", Date.now());
            self.prevLine = "empty";
            self.screenEmpty = true;
            self.execute();
            window.expectedSyncChange = true;
            snooperSyncFromLocal();
        });
    };
}

if (typeof window._replaceBbCode === "undefined") {
    window._replaceBbCode = window.replaceBbCode;
    window.replaceBbCode = function (msg) {
        return _replaceBbCode(msg)
            .replace(/\[line=([0-9]+)\]/g, '<span line="$1">')
            .replace(/\[\/line\]/g, "</span>");
    };
}

if (typeof Scene.prototype._printLine === "undefined") {
    Scene.prototype._printLine = Scene.prototype.printLine;
    Scene.prototype.printLine = function (line) {
        if (!line) return null;
        line = this.replaceVariables(line.replace(/^ */, ""));
        this.accumulatedParagraph.push(
            "[line=" + String(this.lineNum) + "]" + line
        );
        // insert extra space unless the line ends with hyphen or dash
        if (!/([-\u2011-\u2014]|\[c\/\])$/.test(line))
            this.accumulatedParagraph.push(" ");
        this.accumulatedParagraph.push("[/line]")
    };
}

if (typeof Scene.prototype._runCommand === "undefined") {
    Scene.prototype._runCommand = Scene.prototype.runCommand
    Scene.prototype.runCommand = function (line) {
        var result = /^\s*\*comment csgt:(\S*)(?:\s+(.*))?/.exec(line);
        if (result) {
            switch (result[1]) {
                case 'modal-disable':
                    window.csgtOptions.csgtModalDisabledByAuthor = true
                    break;
                case 'modal-enable':
                    window.csgtOptions.csgtModalDisabledByAuthor = false
                    break;
                case 'modal-show':
                    try {
                        var modal_args = {}
                        var options = result[2]
                        var sep_index = options.indexOf(":")
                        while (sep_index > 0) {
                            var option = options.substring(0, sep_index)
                            var startIndex
                            var endIndex
                            if (options.charAt(sep_index + 1) == '"') {
                                startIndex = sep_index + 2
                                endIndex = options.indexOf('"', sep_index + 2)
                            } else {
                                startIndex = sep_index + 1
                                endIndex = options.indexOf(" ", sep_index + 1)
                            }
                            var value
                            if (endIndex <= 0) {
                                value = options.substring(startIndex)
                                options = ""
                                sep_index = 0
                            } else {
                                value = options.substring(startIndex, endIndex)
                                options = options.substring(endIndex + 1).trimStart()
                                sep_index = options.indexOf(":")
                            }
                            switch (option) {
                                case 'color':
                                case 'colour':
                                    switch (value) {
                                        case 'green':
                                            modal_args["type"] = "increase"
                                            break;
                                        case 'red':
                                            modal_args["type"] = "error"
                                            break;
                                        case 'blue':
                                            modal_args["type"] = "info"
                                            break;
                                        case 'yellow':
                                            modal_args["type"] = "warning"
                                            break;
                                        default:
                                            throw new Error(this.lineMsg() + " bad color for CSGT modal: " + value);
                                    }
                                    break;
                                case 'text':
                                case 'title':
                                    modal_args[option] = value
                                    break;
                                case 'duration':
                                    if (/[0-9]+/.test(value)) {
                                        modal_args['duration'] = 1000 * value
                                    } else {
                                        throw new Error(this.lineMsg() + " bad duration for CSGT modal: " + value)
                                    }
                                    break;
                                default:
                                    throw new Error(this.lineMsg() + " bad option for CSGT modal: " + option)
                            }
                        }
                        show_modal(modal_args)
                    } catch (error) {
                        show_modal("Author Modal Error", "error", error.message)
                    }
                    break;
                default:
                    throw new Error(this.lineMsg() + "bad CSGT command: '" + result[1] + "'")
            }
        }
        return this._runCommand(line)
    }
}

function sceneGetterHook() {
    ;
}

function sceneSetterHook(newLines) {
    var codeHTML = newLines.map((element, index) => {
        var ln = "<mark class='linenum'>" + index + "</mark>";
        return ln + "<mark line-number='" + index + "'><p>" + element.replaceAll("\t", "    ") + "</p></mark>";
    }).join("\n");
    $("div.code").html(codeHTML);
}

stats.scene._lines = stats.scene.lines
Object.defineProperty(Scene.prototype, "lines", {
    get() {
        sceneGetterHook();
        return this._lines
    },
    set(newLines) {
        sceneSetterHook(newLines)
        this._lines = newLines;
    },
    configurable: true
})
