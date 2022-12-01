
ddHistory = {
    lineHistory: [0],
    statsHistory: [{sceneName: 'startup'}],
    tempsHistory: [{}],
    blockNext: 0,
    _length: 1,
    push(line, stats, temps) {
        if (this.blockNext == 0) {
            this.lineHistory.push(line);
            this.statsHistory.push(stats);
            this.tempsHistory.push(temps);
            this._length += 1
        } else {
            this.blockNext -= 1
        }
    },

    pop() {
        if (this._length > 0) {
            this._length -= 1
            return { line: this.lineHistory.pop(), stats: this.statsHistory.pop(), temps: this.tempsHistory.pop() };
        }
    },
    peek(idx = -1) {
        if (idx >= 0) {
            return {
                line: this.lineHistory[idx],
                stats: this.statsHistory[idx],
                temps: this.tempsHistory[idx]
            }
        } else {
            return {
                line: this.lineHistory[this._length + idx],
                stats: this.statsHistory[this._length + idx],
                temps: this.tempsHistory[this._length + idx]
            }
        }
    },
    length() {
        return this._length
    }
}

changes_to_display = {}
change_tracked = false
forceSave = false
injectQueue = []
