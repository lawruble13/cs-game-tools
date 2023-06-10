import { get as _get, set as _set, del } from "idb-keyval";
const idb_kv = { get: _get, set: _set, del };
const esc = function(str) {
    return 'PS' + str.replace(/_/g, '__').replace(/ /g, '_s');
}

Persist.add({
    id: "idb",
    size: -1,
    test: function() {
        return !!(idb_kv);
    },
    methods: {
        key: function(key) {
            return esc(this.name) + esc(key);
        },
        init: function() {
            this.store = idb_kv;
        },
        get: async function(key, fn, scope) {
            key = this.key(key);

            const val = await _get(key);
            if (typeof val === "undefined") {
                try {
                    val = localStorage.getItem(key);
                    localStorage.removeItem(key);
                    _set(key, val);
                } catch (e) { }
            }
            if (fn)
                return fn.call(scope || this, true, val);
        },
        set: async function(key, val, fn, scope) {
            key = this.key(key);
            await _set(key, val);
            if (fn)
                return fn.call(scope || this, true, val);
        },
        remove: async function(key, fn, scope) {
            key = this.key(key)
            let val = await _get(key);
            del(key);
            if (fn)
                return fn.call(scope || this, (val !== null), val);
        }
    }
})
