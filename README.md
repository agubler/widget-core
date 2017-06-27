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
		- [Decomposing Widgets](#decomposing-widgets)
	- [Mixins](#mixins)
	- [Styling & Theming](#styling--theming)
	- [Internationalization](#internationalization)
- [Key Principles](#key-principles)
- [Advanced Concepts](#advanced-concepts)
	- [Advanced Properties](#advanced-properties)
	- [Widget Registry](#widget-registry)
	- [Render Lifecycle Hooks](#render-lifecycle-hooks)
	- [DOM Wrapper](#dom-wrapper)
	- [Meta Configuration](#meta-configuration)
	- [JSX Support](#jsx-support)
	- [Web Components](#web-components)
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

New properties are compared with the previous properties to determine if a widget requires re-rendering, by default Dojo 2 uses the `auto` diffing strategy, that performs a shallow comparison for objects and arrays, ignores functions (except classes that extend WidgetBase) and a reference comparison for all other values.

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

#### Decomposing Widgets

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

### Mixins

Dojo 2 makes use of mixins to decorate additional functionality and properties to existing widgets. Mixins provide a mechanism that allows loosely coupled design and composition of behaviors into existing widgets without having to change the base widget.

TypeScript supports mixins using a constructor type of `new (...args: any[]) => any;` that enables a class to be passed as a function argument and extended to add new functionality.

Example mixin that adds method `setState` and `readonly` `state` property:

```ts
// interface for the extended API
interface StateMixin {
	readonly state: Readonly<any>;
	setState(state: any): void;
}

// function that accepts a class that extends WidgetBase and returns the extended class with the StateMixin
// behavior
function StateMixin<T extends new(...args: any[]) => WidgetBase>(Base: T): T & (new(...args: any[]) => StateMixin) {
	return class extends Base {
		private _state: any;

		public setState(state: any): void {
			// shallow copy of the state
			this._state = { ...this._state, ...state };
			// invalidate the widget
			this.invalidate();
		}

		public get state(): any {
			return this._state;
		}
	};
}
```

Examples of Dojo 2 mixins can be seen with `ThemeableMixin` and `I18nMixin` that are described in [Classes & theming](#classes--theming) and [Internationalization](#internationalization) sections.

### Styling & Theming

Section coming soon!

### Internationalization

Widgets can be internationalized by adding the `I18nMixin` mixin from `@dojo/widget-core/mixins/I18n`. [Message bundles](https://github.com/dojo/i18n) are localized by passing them to `localizeBundle`.

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then the default messages are returned.
The widget will be invalidated once the locale-specific messages have been loaded.

Each widget can have its own locale by passing a property - `properties.locale`.
If no locale is set, then the default locale, as set by [`@dojo/i18n`](https://github.com/dojo/i18n), is assumed.

```ts
const MyWidgetBase = I18nMixin(WidgetBase);

class I18nWidget extends MyWidgetBase<I18nWidgetProperties> {
	render: function () {
		// Load the "greetings" messages for the current locale. If the locale-specific
		// messages have not been loaded yet, then the default messages are returned,
		// and the widget will be invalidated once the locale-specific messages have
		// loaded.
		const messages = this.localizeBundle(greetingsBundle);

		return v('div', { title: messages.hello }, [
			w(Label, {
				// Passing a message string to a child widget.
				label: messages.purchaseItems
			}),
			w(Button, {
				// Passing a formatted message string to a child widget.
				label: messages.format('itemCount', { count: 2 })
			})
		]);
	}
}
```

## Key Principles

These are some of the **important** principles to keep in mind when creating and using widgets:

1. The widget's *`__render__`*, *`__setProperties__`*, *`__setChildren__`* functions should **never** be called or overridden.
   - These are the internal methods of the widget APIs and their behavior can change in the future, causing regressions in your application.
2. Except for projectors, you should **never** need to deal directly with widget instances
   - The Dojo 2 widget system manages all instances required including caching and destruction, trying to create and manage other widgets will cause issues and will not work as expected.
3. **Never** update `properties` within a widget instance, they should be considered pure.
   - Properties are considered read-only and should not be updated within a widget instance, updating properties could cause unexpected behavior and introduce bugs in your application.
4. Hyperscript should **always** be written using the `@dojo/widget-core/d#v()` function.
   - The widget-core abstraction for Hyperscript is the only type of vdom that widget-core can process for standard DOM elements, any other mechanism will not work properly or at all.

## Advanced Concepts

This section provides some details on more advanced Dojo 2 functionality and configuration that may be required to build more complex widgets and applications.

### Advanced Properties

Controlling the diffing strategy can be done at an individual property level using the `diffProperty` decorator on a widget class.

`widget-core` provides a set of diffing strategy functions from `@dojo/widget-core/diff.ts` that can be used. When these functions do not provide the required functionality a custom diffing function can be provided. Properties that have been configured with a specific diffing type will be excluded from the automatic diffing.

| Diff Function                 | Description                                                                       |
| -------------------- | ----------------------------------------------------------------------------------|
| `always`    | Always report a property as changed.                                              |
| `auto`      | Ignore functions (except classes that extend `WidgetBase`), shallow compare objects, and reference compare all other values.|                                 |
| `ignore`    | Never report a property as changed.                                               |
| `reference` | Compare values by reference (`old === new`)                                       |
| `shallow`   | Treat the values as objects and compare their immediate values by reference.      |

**Important:** All diffing functions should be pure functions and are called *WITHOUT* any scope.

```ts
// using a diff function provided by widget-core#diff
@diffProperty('title', reference)
class MyWidget extends WidgetBase<MyProperties> { }

//custom diff function; A pure function with no side effects.
function customDiff(previousProperty: string, newProperty: string): PropertyChangeRecord {
	return {
		changed: previousProperty !== newProperty,
		value: newProperty
	};
}

// using a custom diff function
@diffProperty('title', customDiff)
class MyWidget extends WidgetBase<MyProperties> { }
```

##### Property Diffing Reactions

It can be necessary to perform some internal logic when one or more properties change, this can be done by registering a reaction callback.

A reaction function is registered using the `diffProperty` decorator on a widget class method. This method will be called when the specified property has been detected as changed and receives both the old and new property values.

```ts
class MyWidget extends WidgetBase<MyProperties> {

	@diffProperty('title', auto)
	protected onTitleChange(previousProperties: any, newProperties: any): void {
		this._previousTitle = previousProperties.title;
	}
}
```

`diffProperty` decorators can be stacked on a single class method and will be called if any of the specified properties are considered changed.

```ts
class MyWidget extends WidgetBase<MyProperties> {

	@diffProperty('title', auto)
	@diffProperty('subtitle', auto)
	protected onTitleOrSubtitleChange(previousProperties: any, newProperties: any): void {
		this._titlesUpdated = true;
	}
}
```

For non-decorator environments (Either JavaScript/ES6 or a TypeScript project that does not have the experimental decorators configuration set to true in the `tsconfig`), the functions need to be registered in the constructor using the `addDecorator` API with `diffProperty` as the key.

```ts
class MyWidget extends WidgetBase<WidgetProperties> {

	constructor() {
		super();
		diffProperty('foo', auto, this.diffFooReaction)(this);
	}

	diffFooReaction(previousProperty: any, newProperty: any) {
		// do something to reaction to a diff of foo
	}
}
```

### Widget Registry

Section Coming Soon!

### Render Lifecycle Hooks

Occasionally, in a mixin or base widget class, it my be required to provide logic that needs to be executed before or after a widget's `render` call. These lifecycle hooks are supported in `WidgetBase` and operate as before and after aspects.

The functionality is provided by the `beforeRender` and `afterRender` decorators.

***Note:*** Both the `beforeRender` and `afterRender` functions are executed in the order that they are specified from the super class up to the final class.

##### BeforeRender

The `beforeRender` call receives the widget's `render` function, `properties` and `children` and is expected to return a function that satisfies the `render` API. The `properties` and `children` are passed to enable them to be manipulated or decorated prior to the `render` being called.

This is the only time in the widget lifecycle that exposes either of these attributes to be manipulated outside of the property system.

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	@beforeRender()
	myBeforeRender(renderFunc: () => DNode, properties: any, children: DNode[]): () => DNode {
		// decorate/manipulate properties or children.
		properties.extraAttribute = 'foo';
		// Return or replace the `render` function
		return () => {
			return v('my-replaced-attribute');
		};
	}
}
```

And using the `beforeRender` function for non decorator environments:

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	constructor() {
		super();
		beforeRender(this.myOtherBeforeRender)(this);
	}

	myOtherBeforeRender(renderFunc: () => DNode, properties: any, children: DNode[]): () => DNode {
		// do something with the result
		return renderFunc;
	}
}
```

##### AfterRender

The `afterRender` call receives the returned `DNode`s from a widget's `render` call, so that the nodes can decorated, manipulated or even swapped.

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	@afterRender()
	myAfterRender(result: DNode): DNode {
		// do something with the result
		return result;
	}
}
```

And using the `afterRender` function for non decorator environments:

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	constructor() {
		super();
		afterRender(this.myOtherAfterRender)(this);
	}

	myOtherAfterRender(result: DNode): DNode {
		// do something with the result
		return result;
	}
}
```

### DOM Wrapper

`DomWrapper` is used to wrap DOM that is created _outside_ of the virtual DOM system.  This is the main mechanism to integrate _foreign_ components or widgets into the virtual DOM system.

The `DomWrapper` generates a class/constructor function that is then used as a widget class in the virtual DOM.  `DomWrapper` takes up to two arguments.  The first argument is the DOM node that it is wrapping.  The second is an optional set of options.

The currently supported options:

|Name|Description|
|-|-|
|`onAttached`|A callback that is called when the wrapped DOM is flowed into the virtual DOM|

As an example, we want to integrate a 3rd party library where we need to pass the component factory a _root_ element and then flow that into our virtual DOM.  In this situation we don't want to create the component until the widget is being flowed into the DOM, so `onAttached` is used to perform the creation of the component:

```ts
import { w } from '@dojo/widget-core/d';
import DomWrapper from '@dojo/widget-core/util/DomWrapper';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import createComponent from 'third/party/library/createComponent';

export default class WrappedComponent extends WidgetBase {
    private _component: any;
    private _onAttach = () => {
        this._component = createComponent(this._root);
    }
    private _root: HTMLDivElement;
    private _WrappedDom: DomWrapper;

    constructor() {
        super();
        const root = this._root = document.createElement('div');
        this._WrappedDom = DomWrapper(root, { onAttached: this._onAttached });
    }

    public render() {
        return w(this._WrappedDom, { key: 'wrapped' });
    }
}
```

The properties which can be set on `DomWrapper` are the combination of the `WidgetBaseProperties` and the `VirtualDomProperties`, which means effectively you can use any of the properties passed to a `v()` node and they will be applied to the wrapped DOM node.  For example the following would set the classes on the wrapped DOM node:

```ts
const div = document.createElement('div');
const WrappedDiv = DomWrapper(div);
const wNode = w(WrappedDiv, {
    classes: {
        'foo': true
    }
});
```

### Meta Configuration

Widget meta is used to access additional information about the widget, usually information only available through the rendered DOM element - for example, the dimensions of an HTML node. You can access and respond to meta data during a widget's render operation.

```typescript
class TestWidget extends WidgetBase<WidgetProperties> {
    render() {
        const dimensions = this.meta(Dimensions).get('root');

        return v('div', {
            key: 'root',
            innerHTML: `Width: ${dimensions.width}`
        });
    }
}
```

If an HTML node is required to calculate the meta information, a sensible default will be returned and your widget will be automatically re-rendered to provide more accurate information.

#### Dimensions

The `Dimensions` meta provides size/position information about a node.

```
const dimensions = this.meta(Dimensions).get('root');
```

In this simple snippet, `dimensions` would be an object containing `offset`, `position`, `scroll`, and `size` objects.

The following fields are provided:

| Property         | Source                                |
| -----------------| ------------------------------------- |
| `position.bottom`| `node.getBoundingClientRect().bottom` |
| `position.left`  | `node.getBoundingClientRect().left`   |
| `position.right` | `node.getBoundingClientRect().right`  |
| `position.top`   | `node.getBoundingClientRect().top`    |
| `size.width`     | `node.getBoundingClientRect().width`  |
| `size.height`    | `node.getBoundingClientRect().height` |
| `scroll.left`    | `node.scrollLeft`                     |
| `scroll.top`     | `node.scrollTop`                      |
| `scroll.height`  | `node.scrollHeight`                   |
| `scroll.width`   | `node.scrollWidth`                    |
| `offset.left`    | `node.offsetLeft`                     |
| `offset.top`     | `node.offsetTop`                      |
| `offset.width`   | `node.offsetWidth`                    |
| `offset.height`  | `node.offsetHeight`                   |

If the node has not yet been rendered, all values will contain `0`. If you need more information about whether or not the node has been rendered you can use the `has` method:

```
const hasRootBeenRendered = this.meta(Dimensions).has('root');
```

##### Implementing Custom Meta

You can create your own meta if you need access to DOM nodes.

```typescript
import MetaBase from "@dojo/widget-core/meta/Base";

class HtmlMeta extends MetaBase {
    get(key: string): string {
        this.requireNode(key);
        const node = this.nodes.get(key);
        return node ? node.innerHTML : '';
    }
}
```

And you can use it like:

```typescript
class MyWidget extends WidgetBase<WidgetProperties> {
    // ...
    render() {
        // run your meta
        const html = this.meta(HtmlMeta).get('comment');

        return v('div', { key: 'root', innerHTML: html });
    }
    // ...
}
```

Meta classes are provided with a few hooks into the widget, passed to the constructor:

* `nodes` - A map of `key` strings to DOM elements. Only `v` nodes rendered with `key` properties are stored.
* `requireNode` - A method that accept a `key` string to inform the widget it needs a rendered DOM element corresponding to that key. If one is available, it will be returned immediately. If not, the widget will be re-rendered and if the node does not exist on the next render, an error will be thrown.
* `invalidate` - A method that will invalidate the widget.

Extending the base class found in `meta/Base` will automatically add these hooks to the class instance as well as providing a `has` method:

* `has(key: string)` - A method that returns `true` if the DOM element with the passed key exists in the rendered DOM.

Meta classes that require extra options should accept them in their methods.

```typescript
import MetaBase from "@dojo/widget-core/meta/Base";

interface IsTallMetaOptions {
    minHeight: number;
}

class IsTallMeta extends MetaBase {
    isTall(key: string, { minHeight }: IsTallMetaOptions = { minHeight: 300 }): boolean {
        this.requireNode(key);
        const node = this.nodes.get(key);
        if (node) {
            return node.offsetHeight >= minHeight;
        }
        return false;
    }
}
```

### JSX Support

In addition to creating widgets functionally using the `v()` and `w()` functions from `@dojo/widget-core/d`, Dojo 2 optionally supports the use of the `jsx` syntax known as [`tsx`](https://www.typescriptlang.org/docs/handbook/jsx.html) in TypeScript.

To start to use `jsx` in your project the widgets need to be named with a `.tsx` extension and some configuration is required in the project's `tsconfig.json`:

Add the configuration options for `jsx`:

```js
"jsx": "react",
"jsxFactory": "tsx",
```

Include `.tsx` files in the project:

```js
 "include": [
 	"./src/**/*.ts",
 	"./src/**/*.tsx"
 ]
```

Once the project is configured, `tsx` can be used in a widget's `render` function simply by importing the `tsx` function as:

```ts
import { tsx } from '@dojo/widget-core/tsx';
```

```tsx
class MyWidgetWithTsx extends WidgetBase<MyProperties> {
	protected render(): DNode {
		const { clear, properties: { completed, count, activeCount, activeFilter } } = this;

		return (
			<footer classes={this.classes(css.footer)}>
				<span classes={this.classes(css.count)}>
					<strong>{`${activeCount}`}</strong>
					<span>{`${count}`}</span>
				</span>
				<TodoFilter activeFilter={activeFilter} />
				{ completed ? ( <button onclick={clear} /> ) : ( null ) }
			</footer>
		);
	}
}
```

**Note:** Unfortunately `tsx` is not directly used within the module so will report as an unused import so would be needed to be ignored by linters.

### Web Components

Widgets can be turned into [Custom Elements](https://www.w3.org/TR/2016/WD-custom-elements-20161013/) with
minimal extra effort.

Just create a `CustomElementDescriptor` factory and use the `@dojo/cli` build tooling to do the rest of the work,

```ts
import { CustomElementDescriptor } from '@dojo/widget-core/customElements';
import MyWidget from './path/to/MyWidget';

export default function createCustomElement(): CustomElementDescriptor {
	return {
		tagName: 'my-widget',
		widgetConstructor: MyWidget,
	   	attributes: [
		   	{
			   	attributeName: 'label'
		   	}
	   	],
	   	events: [
		   	{
			   	propertyName: 'onChange',
			   	name: 'change'
		   	}
	   	]
   };
};
```

By convention, this file should be named `createMyWidgetElement.ts`.

To build your custom element, use [@dojo/cli](https://github.com/dojo/cli),

```bash
$ dojo build --element=/path/to/createMyWidget.ts
```

This will generate the following files:

* `dist/my-widget/my-widget.html` - HTML import file that includes all widget dependencies. This is the only file you need to import into your HTML page to use your widget.
* `dist/my-widget/my-widget.js` - A compiled version of your widget.
* `dist/my-widget/my-widget.css` - The CSS for your widget
* `dist/my-widget/widget-core.js` - A shared base widget library. Keeping this separate means that you can include HTML imports for multiple Dojo widgets and the applicartion environment will not re-request this shared file for each widget.

Using your widget would be a simple matter of importing the HTML import:

```html
<!DOCTYPE html>
<html>
	<head>
		<!-- this will include all JS and CSS used by your widget -->
		<link rel="import" href="/path/to/my-widget.html" />
	</head>
	<body>
		<!-- this will actually create your widget -->
		<my-widget></my-widget>
	</body>
</html>
```

##### Tag Name

Your widget will be registered with the browser using the provided tag name. The tag name **must** have a `-` in it.

##### Widget Constructor

A widget class that you want wrapped as a custom element.

##### Attributes

You can explicitly map widget properties to DOM node attributes with the `attributes` array.

```ts
{
    attributes: [
        {
            attributeName: 'label'
        },
        {
            attributeName: 'placeholder',
            propertyName: 'placeHolder'
        },
        {
            attributeName: 'delete-on-focus',
            propertyName: 'deleteOnFocus',
            value: value => Boolean(value || 0)
        }
    ]
}
```

* `attributeName` - the attribute that will set on the DOM element, e.g. `<text-widget label="test" />`.
* `propertyName` - the property on the widget to set; if not set, it defaults to the `attributeName`.
* `value` - specify a transformation function on the attribute value. This function should return the value that
will be set on the widget's property.

Adding an attribute to the element will also automatically add a corresponding property to the element.

```ts
// as an attribute
textWidget.setAttribute('label', 'First Name');

// as a property
textWidget.label = 'First Name';
```

##### Properties

You can map DOM element properties to widget properties,

```ts
{
    properties: [
        {
            propertyName: 'placeholder',
            widgetPropertyName: 'placeHolder'
        }
    ]
}

// ...

textWidget.placeholder = 'Enter first name';
```

* `propertyName` - name of the property on the DOM element
* `widgetPropertyName` - name of the property on the widget; if unspecified, `propertyName` is used instead
* `getValue` - if specified, will be called with the widget's property value as an argument. The returned value is returned as the DOM element property value.
* `setValue` - if specified, is called with the DOM elements property value. The returned value is used for the widget property's value.

##### Events

Some widgets have function properties, like events, that need to be exposed to your element. You can use the
`events` array to map widget properties to DOM events.

```ts
{
    events: [
        {
            propertyName: 'onChange',
            eventName: 'change'
        }
    ]
}
```

This will add a property to `onChange` that will emit the `change` custom event. You can listen like any other
DOM event,

```ts
textWidget.addEventListener('change', function (event) {
    // do something
});
```

##### Initialization

Custom logic can be performed after properties/attributes have been defined but before the projector is created. This
allows you full control over your widget, allowing you to add custom properties, event handlers, work with child nodes, etc.
The initialization function is run from the context of the HTML element.

```ts
{
    initialization(properties) {
        const footer = this.getElementsByTagName('footer');
        if (footer) {
            properties.footer = footer;
        }

        const header = this.getElementsByTagName('header');
        if (header) {
            properties.header = header;
        }
    }
}
```

It should be noted that children nodes are removed from the DOM when widget instantiation occurs, and added as children to the widget instance.

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
