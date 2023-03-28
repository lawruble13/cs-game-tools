const idb_kv = require("idb-keyval")
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
        get: function(key, fn, scope) {
            key = this.key(key);

            return idb_kv.get(key).then((val) => {
                if (typeof val === "undefined") {
                    try {
                        val = localStorage.getItem(key);
                        localStorage.removeItem(key);
                        idb_kv.set(key, val);
                    } catch (e) {}
                }
                if (fn)
                    return fn.call(scope || this, true, val)
            })
        },
        set: function(key, val, fn, scope) {
            key = this.key(key);
            return idb_kv.set(key, val).then(() => {
                if (fn)
                    return fn.call(scope || this, true, val);
            })
        },
        remove: async function(key, fn, scope) {
            key = this.key(key)
            return idb_kv.get(key).then((val) => {
                idb_kv.del(key);
                if (fn)
                    return fn.call(scope || this, (val !== null), val);
            })
        }
    }
})
