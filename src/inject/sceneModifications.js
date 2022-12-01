
if (typeof Scene.prototype._execute == "undefined") {
    Scene.prototype._execute = Scene.prototype.execute
    Scene.prototype.execute = function() {
        let self = this;
        saveInformation(self)
        this._execute();
        show_modal();
    }
}
if (typeof Scene.prototype._setVar === "undefined") {
    Scene.prototype._setVar = Scene.prototype.setVar
    Scene.prototype.setVar = function(variable, value) {
        if (!change_tracked && typeof this.stats[variable] !== "undefined") {
            changes_to_display[variable] = {
                type: 'absolute',
                value: value
            }
        }
        if (this.secondaryMode == "stats") forceSave = true
        this._setVar(variable, value)
        change_tracked = false
    }
}

wrapSet("set", (self, stack) => { return self.evaluateReference(stack) })
wrapSet("setref", (self, stack) => { return String(self.evaluateValueToken(stack.shift(), stack)).toLowerCase() })

show_modal('Dashingdon snooper is ready!')
