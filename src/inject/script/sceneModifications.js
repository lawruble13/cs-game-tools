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
            if (typeof this.stats[variable] !== "undefined" && window.csgtOptions.csgtShowVars) {
                variable_container = this.stats;
            } else if (
                typeof this.temps[variable] !== "undefined" &&
                window.csgtOptions.csgtShowTemps
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