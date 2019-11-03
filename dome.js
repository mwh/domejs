// domejs - minimal DOM helpers
// Copyright © 2019 Michael Homer
// Distributed under the terms of the MIT License
$ = new Proxy(function() {}, {
    construct(target, argumentsList, newTarget) {
        let expr = argumentsList[0]
        let hashM = expr.match(/#([^.]+)/)
        let id
        if (hashM)
            id = hashM[1]
        let elName = expr.match(/^[^.#]+/)
        let el = document.createElement(elName)
        for (let c of expr.matchAll(/\.([^.#]+)/g))
            el.classList.add(c[1]);
        for (let i = 1; i < argumentsList.length; i++) {
            let a = argumentsList[i]
            if (typeof a == 'string')
                el.appendChild(document.createTextNode(a))
            else
                el.appendChild(a)
        }
        if (id) el.id = id
        return el
    },
    apply(target, thisArg, argumentsList) {
        return $.wrap(document.querySelectorAll(argumentsList[0]))
    }
})
$.wrap = function(r) {
    return {
        on(e, f) {
            r.forEach(x => x.addEventListener(e, f))
            this.func = f
            return this
        },
        now() {
            r.forEach(x => this.func.call(x))
            return this
        },
        forEach(f) {
            r.forEach(x => f(x))
            return this
        },
                set value(v) {
                    r.forEach(x => x.value = v);
                },
        get style() {
            return new Proxy({}, {
                set(target, prop, value) {
                    r.forEach(x => x.style[prop] = value)
                }
            })
        },
        get classList() {
            return {
                add(c) {
                    r.forEach(x => x.classList.add(c))
                },
                remove(c) {
                    r.forEach(x => x.classList.remove(c))
                },
                replace(o, n) {
                    r.forEach(x=>x.classList.replace(o, n))
                },
                toggle(c, f) {
                    if (typeof f != 'function') {
                        r.forEach(x =>
                            x.classList.toggle(c, f)
                        )
                    } else {
                        r.forEach(x =>
                            x.classList.toggle(c,
                                f.call(x, x))
                        )
                    }
                },
            }
        },
        closest(s) {
            return $.wrap(this.map(x => x.closest(s)))
        },
        filter(f) {
            return $.wrap(Array.prototype.filter.call(r, f))
        },
        map(f) {
            return Array.prototype.map.call(r, f)
        },
        [Symbol.iterator]: function() {
            return r[Symbol.iterator]()
        }
    }
}

// vim: set ts=4 sw=4 tw=0 expandtab :
