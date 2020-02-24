domejs is a minimal proxying shortcut DOM library

The single function export `dome` or `$` can be used to create
new elements and to find or manipulate existing elements on the
page. It uses proxies to let the programmer write code against
the standard DOM methods and properties, without needing to
handle multiple or missing elements explicitly. It also
enables one-line creation of new elements with classes,
attributes, and children already set.

Use

    import $ from './dome.js';
to load the library.

# Creating elements

To create new elements, use `new`:

    new $('li.important')
    new $('input[type=text]#search')
These create a new element matching the given CSS selector.
Class, ID, and attribute selectors are supported, in any order.
The element name is mandatory.

Children can be provided as extra arguments:

    new $('div', new $('input[type=text]'))
    new $('span', 'Your name', existingElement)
    new $('li', new $('label[for=s]', 'See'), new $('input#s'))
Multiple children are appended left to right. String arguments
are inserted as text nodes.

# Manipulating elements and accessing properties

Existing elements can be found with `$('#sidebar > h1 + p')`
and then manipulated all at once as though they were single
elements, using the standard DOM functions and properties:

    $('form > input.important').style.background = '#fcc'
    $('input.important').remove()
    $('img + caption').parentNode.addEventListener('click', f)
    $('input[type=text]').value = ''
    $('a:nth-of-type(2n)').firstChild.classList.toggle('quiet')
Calling functions, retrieving property values, and assigning
new values are all supported. Assigning a value sets the
property on all matched elements to the new value at once.

Method return values and fetched property values are collected
together and proxied in the same way, so methods and property
accesses can be chained many layers deep. Methods are called
immediately, while properties are not read until used (by
iteration or method call).

Undefined values are silently removed and not dereferenced, so
no error is produced by accessing a property that only exists
on some items even if other properties are accessed through it.

## Computed property updates

The special `update` method allows computing new values of a
property using the current state:

    $('input[type=number]').value.update(x => x / 2)
    $('input.q').value.update((cur, el) => cur + el.dataset.p)
    $('div').style.width.update(x=>Number.parseInt(x)*2 + 'px')
Any property can be accessed on the left, and then `.update(f)`
will use `f` to compute a new value for that property on each
item separately.

The provided function is given two arguments: the current value
of the property, and the nearest element parent. For example,
in `$('li').style.color.update((cur, el)=>'')` the value of
`cur` will be the current `color`, while `el` will hold the
corresponding `li` element.

# Iteration

Selected nodes or properties can also be iterated over:

    for (let e of $('li')) { e.textContent = e.dataset.label; }
    for (let v of $('input.names').value) console.log(v)
    Array.from($('input.names').value)
The iterated values are not proxied and can be used as their
true underlying selves. To get a real array of the selected
items to use elsewhere, use `Array.from`.

# Other methods

A few additional methods augment those available on the
nodes themselves. `forEach`, `map`, `filter`, and `flat` have
the usual collection behaviour over the collection of matched
nodes or property values:

    $('li').forEach(x => alert(x.textContent))
    $('img').map(x => {url: x.src, width: x.width })
    $('input[type=number]').filter(x => x.value * 10 < 100)
    $('.boxes').childNodes.flat().remove()

`on` and `off` allow attaching event listeners to the elements,
and have multiple ways of interacting:

    $('li').on('click', () => alert('clicked'))
    $('li').on.click(() => alert('clicked'))
    $('li').on.click = () => alert('clicked')
    $('li').off('click', handler)

Node objects and collections of node objects can be wrapped by
passing them to $ directly:

    $(document.body)
    $(document.body.childNodes)
    $(node1, node2, node3)

These can then be used in all the same ways as above.
