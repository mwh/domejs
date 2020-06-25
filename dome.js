// domejs - minimal DOM helpers
// Copyright © 2019 Michael Homer
// Distributed under the terms of the MIT License

// This proxy can be used in two ways:
//   new $('input.required[type=text]')
// to create a new <input type="text" class="required" />
//   $('li > input')
// to find all elements matching a selector in the page. These
// can be manipulated like a single element:
//   $('li > input').style.color = 'red'
//   $('li > input').remove()
//   $('li > input').classList.toggle('important')
// and are also iterable with for-of or Array.from().
const dome = new Proxy(function() {}, {
    construct(target, argumentsList, newTarget) {
        let expr = argumentsList[0]
        let hashM = expr.match(/#([^[.]+)/)
        let id
        if (hashM)
            id = hashM[1]
        let elName = expr.match(/^[^.#[]+/)
        let el = document.createElement(elName)
        for (let c of expr.matchAll(/\.([^.#[]+)/g))
            el.classList.add(c[1]);
        for (let c of expr.matchAll(/\[([^\]=]+)(=([^\]]+))?\]/g)) {
            if (c[3] && c[3][0] != '"')
                el[c[1]] = c[3]
            else if (c[3])
                el[c[1]] = c[3].substring(1, c[3].length - 1)
            else
                el[c[1]] = c[1]
        }
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
        if (argumentsList[0] instanceof Node)
            return wrap(argumentsList);
        if (typeof argumentsList[0] == 'string')
            return wrap(document.querySelectorAll(argumentsList[0]))
        if (argumentsList[0][Symbol.iterator])
            return wrap(argumentsList[0]);
        return wrap(document.querySelectorAll(argumentsList[0]))
    }
})

// Proxies all the items in iterable indexed by path
//   iterable: any iterable
//   path: an array of string or numeric keys, applied recursively
// Example:
//    wrap(querySelectorAll('li'), ['childNodes', 2, 'style', 'color'])
// represents li.childNodes[2].style.color for each li on the page.
function wrap(iterable, path) {
    if (typeof path == 'undefined')
        path = [];
    let ff = function() {};
    ff.iterable = iterable;
    ff.path = path;
    return new Proxy(ff, proxyHandler)
}

const proxyHandler = {
    apply(target, thisArg, argumentsList) {
        // When applied, find the second-to-last values from
        // path as the receiver, and the last value as the
        // function name, and apply the corresponding function
        // on each receiver.
        const path = target.path
        let receivers = navigate(target.iterable, path.slice(0, path.length - 1))
        let ret = []
        for (let o of receivers)
            ret.push(o[path[path.length-1]].apply(o, argumentsList))
        return wrap(ret)
    },
    get: function(target, property, receiver) {
        // Try special getters (.on), then base methods (.update()),
        // and fall back on a proxy for the property from the
        // underlying objects in the iterable in the usual case.
        if (property in specialGetters)
            return specialGetters[property](target.iterable, target.path)
        if (property in baseMethods) {
            return function() {
                let args = [target.iterable, target.path].concat(Array.from(arguments))
                return baseMethods[property].apply(this, args)
            }
        } else {
            return wrap(target.iterable, target.path.concat([property]))
        }
    },
    set: function(obj, prop, value) {
        if (prop in specialSetters)
            return specialSetters[prop](obj, prop, value)
        for (let o of obj.iterable) {
            for (let p of obj.path)
                o = o[p];
            o[prop] = value;
        }
        return true;
    },
}

// Find the actual values at path in iterable, returning them
// with the nearest element ancestor as {value, elementAncestor}
function navigateWithElement(iterable, path) {
    let ret = []
    main: for (let o of iterable) {
        let el = o
        for (let p of path) {
            o = o[p]
            if (o instanceof Element)
                el = o
            if (typeof o === 'undefined')
                continue main;
        }
        ret.push({value: o, elementAncestor: el})
    }
    return ret
}

// Find just the values at path in iterable.
function navigate(iterable, path) {
    return navigateWithElement(iterable, path).map(x => x.value)
}

// These are extra methods available on $(''), above those
// provided by the actual elements.
const baseMethods = {
    update(iterable, path, func) {
        // $('input[type=number]').value.update(x => +x + 3)
        // $('').style.color.update((x, el) => el.dataset.tone)
        let receivers = navigateWithElement(iterable, path.slice(0, path.length - 1))
        let key = path[path.length - 1]
        for (let oe of receivers)
            oe.value[key] = func(oe.value[key], oe.elementAncestor)
        return wrap(receivers.map(x => x.value))
    },
    forEach(iterable, path, func) {
        let obs = navigate(iterable, path)
        obs.forEach(func)
    },
    map(iterable, path, func) {
        let obs = navigate(iterable, path)
        return wrap(obs.map(func))
    },
    filter(iterable, path, func) {
        let vals = navigateWithElement(iterable, path.slice(0, path.length - 1))
        let ret = []
        for (let v of vals)
            if (func(v.value, v.elementAncestor))
                ret.push(v.value)
        return wrap(ret)
    },
    flat(iterable, path) {
        return this.$f
    },
    [Symbol.iterator]: function(iterable, path) {
        let obs = navigate(iterable, path)
        return obs[Symbol.iterator]()
    },
    $(iterable, path, arg) {
        return this.querySelectorAll(arg).$f
    }

}

// These are extra getter properties available on $('').
const specialGetters = {
    on(iterable, path) {
        return OnProxy(iterable, path)
    },
    off(iterable, path) {
        return OnProxy(iterable, path, true)
    },
    $f(iterable, path) {
        let its = navigate(iterable, path)
        return wrap(flattened(its))
    }
}

// These are extra setter properties available on $('').
const specialSetters = {
    on(obj, prop, value) {
        for (let p of Object.keys(value))
            bindEvent(obj.iterable, obj.path, p, value[p], false);
        return true;
    }
}

function* flattened(its) {
    for (let it of its)
        yield* it
}

function bindEvent(iterable, path, ev, handler, remove) {
    if (!remove)
        navigate(iterable, path).forEach(
            x => x.addEventListener(ev, handler))
    else
        navigate(iterable, path).forEach(
            x => x.removeEventListener(ev, handler))
}

// Special proxy for .on/.off, supporting four uses:
//   $('').on('click', () => {})
//   $('').on.click(() => {})
//   $('').on.click = () => {}
//   $('').on({click: ()=>{}, wheel: ()=>()})
// A special shorthand
//   $('').on.click((ev) => {})(arg)
// immediately applies the event handler as well.
function OnProxy(iterable, path, remove) {
    let funcs = []
    let p = new Proxy(function on() {}, {
        apply(target, thisArg, argumentsList) {
            if (argumentsList.length < 2) {
                if (funcs.length)
                    navigate(iterable, path).forEach(o => {
                        funcs.forEach(f => f.apply(o, argumentsList))
                    })
                else {
                    let value = argumentsList[0]
                    for (let a of Object.keys(value))
                        bindEvent(iterable, path, a, value[a], false);
                    return p
                }
                return;
            }
            funcs.push(argumentsList[1])
            bindEvent(iterable, path, argumentsList[0], argumentsList[1], remove)
            return p;
        },
        get(target, property, receiver) {
            return function(handler) {
                funcs.push(handler)
                bindEvent(iterable, path, property, handler, remove)
                return p;
            }
        },
        set(obj, prop, value) {
            bindEvent(iterable, path, prop, value, remove)
            return true;
        },
    })
    return p
}

export const $ = dome;
export { dome };
export default dome;

// vim: set ts=4 sw=4 tw=0 expandtab :
