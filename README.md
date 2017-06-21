# @dojo/widget-core

[![Build Status](https://travis-ci.org/dojo/widget-core.svg?branch=master)](https://travis-ci.org/dojo/widget-core)
[![codecov](https://codecov.io/gh/dojo/widget-core/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widget-core)
[![npm version](https://badge.fury.io/js/%40dojo%2Fwidget-core.svg)](https://badge.fury.io/js/%40dojo%2Fwidget-core)

widget-core is library to create powerful, composable user interface widgets.

* **Reactive & unidirectional:** Widget-core follows core reactive principles to ensure predictable consistent behavior.
* **Encapsulated Widgets:** Create independent encapsulated widgets that can be wired together to create complex and beautiful user interfaces.
* **DOM Abstractions:** Widget-core provides API abstractions to avoid needing to access or manipulate the DOM outside of the reactive render life-cycle.
* **I18n & Themes:** Widget-core provides core mixins to enable internationalization and theming support for your components.

-----

 - [Installation](#installation)
 - [Features](#features)
 	- [Basic Widgets](#basic-widgets)
		- [Rendering a Widget in the DOM](#rendering-a-widget-in-the-dom)
		- [Widgets and Properties](#widgets-and-properties)
		- [Composing Widgets](#composing-widgets)
		- [Extracting Widgets](#extracting-widgets)
	- [Classes & Theming](#classes--theming)
	- [Internationalization](#internationalization)
- [Key Principles](key-principles)
- [Advanced Concepts](#advanced-concepts)
	- [Advanced Properties](advanced-properties)
	- [Widget Registry](#widget-registry)
	- [DOM Wrapper](#dom-wrapper)
	- [Meta Configuration](meta-configuration)
	- [Web Components](web-components)
- [API](#api)
- [How Do I Contribute?](#how-do-i-contribute)
    - [Setup Installation](#setup-installation)
    - [Testing](#testing)
- [Licensing Information](#licensing-information)

## Installation

To use @dojo/widget-core, install the package along with its required peer dependencies:

```shell
npm install @dojo/widget-core

# peer dependencies
npm install @dojo/has
npm install @dojo/shim
npm install @dojo/core
npm install @dojo/i18n
npm install maquette
```

You can also use the [dojo cli](https://github.com/dojo/cli) to create a complete Dojo 2 skeleton application.

## Features

### Basic Widgets

Dojo 2 applications use a concept called Virtual DOM (vdom) to represent what should be shown on the screen. These vdom nodes are plain javascript objects that are not expensive to create, unlike browser DOM elements. Dojo 2 uses these vdom elements to synchronize and update the browser DOM so that application shows the expected view.

There are two types of vdom within Dojo 2, the first are pure representations of DOM elements and are the fundamental building blocks of all Dojo 2 applications. These are called `HNode`s and are created using the `v()` function available from the `@dojo/widget-core/d` module.

The following will create a `HNode` that represents a simple `div` DOM element, with a text node child: `Hello, Dojo 2!`:

```ts
v('div', [ 'Hello, Dojo 2!' ])
```

The second vdom type, `WNode`s represent widgets. A widget is a class that extends `WidgetBase` from `@dojo/widget-core/WidgetBase` and implements a `render` function that returns one of the Dojo 2 vdom types (known as a `DNode`). Widgets are used to represent reusable, independent sections of a Dojo 2 application.

The following returns the `HNode` example from above from the `render` function:

```ts
class HelloDojo extends WidgetBase {
	protected render(): DNode {
		return v('div', [ 'Hello, Dojo 2!' ]);
	}
}
```

#### Rendering a Widget in the DOM

To display your new component in the browser you will need to decorate it with some functionality needed to "project" the widget into the browser. This is done using the `ProjectorMixin` from `@dojo/widget-core/mixins/Projector`.

```ts
const Projector = ProjectorMixin(HelloDojo);
const projector = new Projector();

projector.append();
```

By default the projector will attach the widget to the `document.body` in the DOM, but this can be overridden by passing a reference to the Element to attach to.

Consider the following in your HTML file:

```html
<div id="my-app"></div>
```

You can target this Element like so:

```ts
const root = document.getElementById('my-app');
const Projector = ProjectorMixin(HelloDojo);
const projector = new Projector();

projector.append(root);
```

#### Widgets and Properties

We have created a widget used to project our `HNode`s into the DOM, however widgets can be composed of other widgets and `properties` are used to determine if a widget needs to be re-rendered.

Properties are available on the the widget instance, defined by an interface and passed as a generic to the `WidgetBase` class when creating your custom component. The properties interface should extend the base `WidgetProperties` provided from `@dojo/widget-core/interfaces`:

```ts
interface MyProperties extends WidgetProperties {
	name: string;
}

class Hello extends WidgetBase<MyProperties> {
	protected render(): DNode {
		const { name } = this.properties;

		return v('div', [ `Hello, ${name}` ]);
	}
}
```

#### Composing Widgets

As mentioned, often widgets are composed of other widgets in their `render` output. This promotes widget reuse across an application (or multiple applications) and helps enables widget best practices.

To compose widgets, we need to create `WNode`s and we can do this using the `w()` function from `@dojo/widget-core/d`.

Consider the previous `Hello` widget that we created:

```ts
class App extends WidgetBase {
	protected render(): DNode {
		return v('div', [
			w(Hello, { name: 'Bill' }),
			w(Hello, { name: 'Bob' }),
			w(Hello, { name: 'Flower pot men' })
		]);
	}
}
```

We can now use `App` with the `ProjectorMixin` to render the `Hello` widgets.

```ts
const Projector = ProjectorMixin(App);
const projector = new Projector();

projector.append();
```

**Note:** Widgets must return a single top level `DNode` from the `render` method, which is why the `Hello` widgets were wrapped in `div`.

#### Extracting Widgets

Splitting widgets into multiple smaller widgets is easy and helps to add extended functionality and promotes reuse.

Consider the following `List` widget, which has a simple property interface of an array of items consisting of `content: string` and `highlighted: boolean`.

```ts
interface ListProperties extends WidgetProperties {
	items: {
		id: string;
		content: string;
		highlighted: boolean;
	};
}

class List extends WidgetBase<ListProperties> {
	protected render() {
		const { items } = this.properties;

		return v('ul', { classes: { list: true } }, items.map((item) => {
			const { id, highlighted, content } = item;
			const classes = highlighted ? { highlighted: true } : { highlighted: false };

			return v('li', { key: id, classes }, [ content ]);
		});
	}
}
```
The `List` widget does works as expected and displays the list in the browser but is hard to change, add functionality and reuse parts.

**Note:** When working with children arrays with the same type of widget or Element it is important to add a unique `key` property or attribute so that Dojo 2 can identify the correct node when updates are made.

To extend the `List` API with an event that needs to be called when an item is clicked with the item's `id`, we first update the properties interface:

```ts
interface ListProperties extends WidgetProperties {
	items: {
		id: string;
		content: string;
		highlighted: boolean;
	};
	onItemClick: (id: string) => void;
}
```

If we try to use the `onItemClick` function in the current `List` widget, we would need to wrap it in another function in order to pass the item's `id`.

This would mean a new function would be created every render but Dojo 2 does not support changing listener functions after the first render and this would **error**.

To resolve this, the list item can be extracted:

```ts
interface ListItemProperties extends WidgetProperties {
	id: string;
	content: string;
	highlighted: boolean;
	onItemClick: (id: string) => void;
}

class ListItem extends WidgetBase<ListItemProperties> {

	protected onClick(event: MouseEvent) {
		const { id } = this.properties;

		this.properties.onItemClick(id);
	}

	protected render(): DNode {
		const { id, content, highlighted } = this.properties;
		const classes = highlighted ? { highlighted: true } : { highlighted: false };

		return v('li', { key: id, classes, onclick: this.onClick }, [ content ]);
	}
}
```

Using the `ListItem` we can simplify the `List` slightly and also add the on click functionality that we required:

```ts
interface ListProperties extends WidgetProperties {
	items: {
		id: string;
		content: string;
		highlighted: boolean;
	};
	onItemClick: (id: string) => void;
}

class List extends WidgetBase<ListProperties> {
	protected render() {
		const { onItemClick, items } = this.properties;

		return v('ul', { classes: { list: true } }, items.map(({ id, content, highlighted }) => {
			return w(ListItem, { key:id, content, highlighted, onItemClick });
		});
	}
}
```

Additionally the `ListItem` is now reusable in other areas of our application(s).

### Classes & Theming

### Internationalization

## Key Principles

These are some of the **important** principles to keep in mind when creating and using widgets:

1. The widget's *`__render__`*, *`__setProperties__`*, *`__setChildren__`* functions should **never** be called or overridden
2. Except for projectors, you should **never** need to deal directly with widget instances
3. **Never** update `properties` within a widget instance, they should be considered pure.
4. Hyperscript should **always** be written using the `@dojo/widget-core/d#v()` function.

## Advanced Concepts

### Advanced Properties

### Widget Registry

### DOM Wrapper

### Meta Configuration

### Web Components

## API

[API Documentation](http://dojo.io/api/widget-core/v2.0.0-alpha.28/)

## How Do I Contribute?

We appreciate your interest!  Please see the [Dojo Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

### Setup Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project, run `grunt dev` or `grunt dist`.

### Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by Istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

To test against browsers with a local selenium server run:

`grunt test:local`

To test against BrowserStack or Sauce Labs run:

`grunt test:browserstack`

or

`grunt test:saucelabs`

## Licensing Information

© 2017 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
