

function getNextLine(starting_line) {
    var current_line = starting_line
    while (isDefined(line = window.stats.scene.lines[current_line])) {
        if (line.trim() != '' && !line.trim().startsWith('*comment')) {
            return current_line
        }
        current_line += 1
    }
    return starting_line
}

function isObject(obj) {
    return obj != null && typeof obj === 'object';
}

function objIsEqual(obj1, obj2, skip=[]) {
    if (!(isObject(obj1) && isObject(obj2))) {
        return obj1 === obj2
    }
    var props1 = Object.getOwnPropertyNames(obj1)
    var props2 = Object.getOwnPropertyNames(obj2)

    if (props1.length != props2.length) {
        return false;
    }

    for (var i = 0; i < props1.length; i++) {
        if (skip.includes(props1[i])) continue
        let val1 = obj1[props1[i]]
        let val2 = obj2[props1[i]]

        if (!objIsEqual(val1, val2)) return false
    }
    return true
}

goBack = function () {
    if (ddHistory.length() > 0) {
        ddHistory.blockNext = 1
        window.stats.scene.resetPage()
        ddHistory.pop()
        let history_data = ddHistory.peek()
        if (history_data.stats['sceneName'] != self.stats.sceneName) {
            if (typeof window.cachedResults !== "undefined") delete window.cachedResults[history_data.stats['sceneName']]
            ddHistory.blockNext = 2
            window.stats.scene.goto_scene(history_data.stats['sceneName'])
            window.stats.scene.execute()
        }
        for (const key in history_data.stats) {
            if (key !== 'sceneName') {
                if (typeof history_data.stats[key] === "object") {
                    window.stats[key] = new Object()
                    for (const obj_key in history_data.stats[key]) {
                        window.stats[key][obj_key] = history_data.stats[key][obj_key]
                    }
                } else {
                    if (window.stats[key] !== history_data.stats[key] && !key.startsWith('_')) {
                        modalHeader = "Restored variables:"
                        changes_to_display[key] = {
                            type: 'absolute',
                            value: history_data.stats[key]
                        }
                    }
                    window.stats[key] = history_data.stats[key]
                }
            }
        }
        for (const key in history_data.temps) {
            if (typeof history_data.temps[key] === "object") {
                window.stats.scene.temps[key] = new Object()
                for (const obj_key in history_data.temps[key]) {
                    window.stats.scene.temps[key][obj_key] = history_data.temps[key][obj_key]
                }
            } else {
                if (window.stats.scene.temps[key] !== history_data.temps[key] && !key.startsWith('_')) {
                    modalHeader = "Restored variables:"
                    changes_to_display[key] = {
                        type: 'absolute',
                        value: history_data.temps[key]
                    }
                }
                window.stats.scene.temps[key] = history_data.temps[key]
            }
        }

        var prev_icf = window.stats.implicit_control_flow
        window.stats.implicit_control_flow = true
        window.stats.testEntryPoint = getNextLine(history_data.line)

        window.stats.scene.reexecute()
        window.stats.implicit_control_flow = prev_icf
    } else {
        alert("No history data available to restore!")
    }
}

saveInformation = function (self){
    function pack_object(obj, skip=[]){
        switch(typeof obj) {
            case 'string':
                return new String(obj).toString()
            case 'number':
            case 'boolean':
                return obj
            case 'object':
                var result = null
                if (Array.isArray(obj)) {
                    result = new Array()
                    for (const key in obj) {
                        result.push(pack_object(obj[key], skip))
                    }
                } else {
                    result = new Object()
                    for (const key in obj) {
                        if (skip.includes(key)) continue
                        result[key] = pack_object(obj[key], skip)
                    }
                }
                return result
        }
        throw new TypeError("Invalid type '" + typeof obj + "' in pack_object")
    }
    var history_data = ddHistory.peek()
    var save_stats = pack_object(self.stats, ['scene', 'testEntryPoint'])
    var save_temps = pack_object(self.temps, ['_choiceEnds'])
    var line_to_save = getNextLine(self.lineNum)

    if (stats.scene.secondaryMode != "stats") {
        if (forceSave || history_data.line != line_to_save || history_data.stats['sceneName'] != self.stats['sceneName']) {
            ddHistory.push(line_to_save, save_stats, save_temps)
            forceSave = false
        }
    }
}

show_modal = function (text = null) {
    var type = null
    var modal_contents = ""
    if (text == null) {
        for (variable in changes_to_display) {
            var change = changes_to_display[variable]
            modal_contents += "<br>"
            modal_contents += variable + ": "
            switch (change.type) {
                case "relative":
                    if (change.value > 0) {
                        modal_contents += "+" + String(change.value)
                        if (type == null) {
                            type = "increase"
                        } else if (type != "increase") {
                            type = "multiple"
                        }
                    } else {
                        modal_contents += String(change.value)
                        if (type == null) {
                            type = "decrease"
                        } else if (type != "decrease") {
                            type = "multiple"
                        }
                    }
                    break
                case "absolute":
                    modal_contents += change.value
                    if (type != null) {
                        type = "multiple"
                    }
                    break
            }
        }
        if (modal_contents == "") {
            return
        } else if (modalHeader) {
            modal_contents = modalHeader + modal_contents
            modalHeader = null
        } else {
            modal_contents = "Variables changed:" + modal_contents
        }
        changes_to_display = {}
    } else {
        modal_contents = text
    }
    var snooper_modal = document.getElementById('snooper-modal')
    snooper_modal.classList = {}
    if (type != null) {
        snooper_modal.classList.add(type)
    }
    snooper_modal.innerHTML = modal_contents
    document.getElementById("snooper-modal").animate(
        [
            {transform: "translateX(120%)", offset: 0, easing: 'ease-out'},
            {transform: "translateX(-20%)", offset: 0.07, easing: 'ease-in-out'},
            {transform: "translateX(0%)", offset: 0.08},
            {transform: "translateX(0%)", offset: 0.92, easing: 'ease-in-out'},
            {transform: "translateX(-20%)", offset: 0.93, easing: 'ease-in'},
            {transform: "translateX(120%)", offset: 1}
        ], {duration: 5000, iterations: 1, fill: 'both'}
    );
}

function statIsNumber(stat) {
    return String(Number(stat)) == stat
}

wrapSet = function (setter_name, variable_getter){
    if (typeof Scene.prototype["_" + setter_name] === "undefined") {
        Scene.prototype["_" + setter_name] = Scene.prototype[setter_name]
        Scene.prototype[setter_name] = function(line) {
            change_tracked = true
            var stack = this.tokenizeExpr(line);
            var self = this;
            var variable = variable_getter(self, stack);
            if (typeof this.stats[variable] !== "undefined") {
                var previous_value = this.stats[variable];
                if (typeof changes_to_display[variable] !== "undefined") {
                    if (changes_to_display[variable].type === "relative") {
                        previous_value -= changes_to_display[variable].value
                    }
                }
                this["_" + setter_name](line);
                var new_value = this.stats[variable];
                if (previous_value != new_value) {
                    if (statIsNumber(previous_value) && statIsNumber(new_value)) {
                        changes_to_display[variable] = {
                            type: "relative",
                            value: new_value - previous_value
                        }
                    } else {
                        changes_to_display[variable] = {
                            type: "absolute",
                            value: new_value
                        }
                    }
                }
            } else {
                this["_" + setter_name](line);
            }
        }
    }
}
