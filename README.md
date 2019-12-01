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

# Manipulating elements

Existing elements can be found with `$('#sidebar > h1 + p')`
and then manipulated all at once as though they were single
elements, using the standard DOM functions and properties:

    $('form > input.important').style.background = '#fcc'
    $('input.important').remove()
    $('img + caption').parentNode.addEventListener('click', f)
    $('input[type=text]').value = ''
Calling functions, retrieving property values, and setting new
values are all supported, and can be nested many steps deep.

Selected nodes or properties can also be iterated over:

    for (let e of $('li')) { e.textContent = e.dataset.label; }
    for (let v of $('input.names').value) console.log(v)
    Array.from($('input.names').value)

A few additional methods augment those available on the
nodes themselves. `forEach`, `map`, and `filter` have the usual
collection behaviour:

    $('li').forEach(x => alert(x.textContent))
    $('img').map(x => {url: x.src, width: x.width })
    $('input[type=number]').filter(x => x.value * 10 < 100)

The `update` method allows computed updates of properties:

    $('input[type=number]').value.update(x => x / 2)
    $('input.q').value.update((cur, el) => cur + el.dataset.p)
    $('div').style.width.update(x=>Number.parseInt(x)*2 + 'px')

`on` and `off` allow attaching event listeners to the elements,
and have multiple ways of interacting:

    $('li').on('click', () => alert('clicked'))
    $('li').on.click(() => alert('clicked'))
    $('li').on.click = () => alert('clicked')
    $('li').off('click', handler)