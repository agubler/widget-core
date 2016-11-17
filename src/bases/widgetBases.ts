/**
 * These represent the base classes for widgets, which have base implementations.
 *
 * These bases though will likely have signficant cross cutting concerns and therefore are located here.
 *
 * Additional features and functionality are added to widgets by compositing mixins onto these
 * bases.
 *
 * The main interfaces that are defined in this module are:
 *   - Widget
 */

import IdentityRegistry from 'dojo-core/IdentityRegistry';
import { RenderableParent } from 'dojo-interfaces/abilities';
import { EventedListener, State, Stateful, StatefulOptions } from 'dojo-interfaces/bases';
import { EventTargettedObject, Factory, Handle, StylesMap } from 'dojo-interfaces/core';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';

/**
 * A function that is called when collecting the children nodes on render, accepting the current list of
 * children nodes and returning a list of children ndoes that should be appended onto the current list.
 *
 * TODO: Should this behave more like a reducer (like above)?
 */
export interface ChildNodeFunction {
	(this: Widget<WidgetState>,
	widgetRegistry: IdentityRegistry<Factory<Widget<WidgetState>,
	WidgetOptions<WidgetState>>>): DNode[] | VNode[];
}

/**
 * A function that is called when collecting the node attributes on render, accepting the current map of
 * attributes and returning a set of VNode properties that should mixed into the current attributes.
 *
 * TODO: Should this act more like an actualy reducer, where the previousValue is passed in and is mutated directly,
 *       along with the instance reference?  Something like (previousAttributes: VNodeProperties, instance: WidgetMixin): VNodeProperties
 */
export interface NodeAttributeFunction {
	/**
	 * A function which can return additional VNodeProperties which are
	 *
	 * @param attributes The current VNodeProperties that will be part of the render
	 */
	(this: Widget<WidgetState>, attributes: VNodeProperties): VNodeProperties;
}

export interface HNode {
	/**
	 * Specified children
	 */
	children: (VNode | DNode | null)[];

	/**
	 * render function that wraps returns VNode
	 */
	render(): VNode;
}

export interface WNode {
	/**
	 * Factory to create a widget
	 */
	factory: Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>;

	/**
	 * Options used to create factory a widget
	 */
	options: WidgetOptions<WidgetState>;
}

export type DNode = HNode | WNode;

export type Widget<S extends WidgetState> = Stateful<S> & WidgetMixin & WidgetOverloads;

export interface WidgetOverloads {
	/**
	 * Attach a listener to the invalidated event, which is emitted when the `.invalidate()` method is called
	 *
	 * @param type The event type to listen for
	 * @param listener The listener to call when the event is emitted
	 */
	on(type: 'invalidated', listener: EventedListener<Widget<WidgetState>, EventTargettedObject<Widget<WidgetState>>>): Handle;
}

export interface WidgetMixin {
	/**
	 * An array of child node render functions which are executed on a render to generate the children
	 * nodes.  These are intended to be "static" and bound to the class, making it easy for mixins to
	 * alter the behaviour of the render process without needing to override or aspect the `getChildrenNodes`
	 * method.
	 */
	childNodeRenderers: ChildNodeFunction[];

	/**
	 * Classes which are applied upon render.
	 *
	 * This property is intended for "static" classes.  Classes which are aligned to the instance should be
	 * stored in the instances state object.
	 */
	readonly classes: string[];

	/**
	 * Generate the children nodes when rendering the widget.
	 *
	 * Mixins should not override or aspect this method, but instead provide a function as part of the
	 * `childNodeRenders` property, which will automatically get called by this method upon render.
	 */
	getChildrenNodes(): (VNode | DNode)[];

	/**
	 * Generate the node attributes when rendering the widget.
	 *
	 * Mixins should not override or aspect this method, but instead provide a function as part of the
	 * `nodeAttributes` property, which will automatically get called by this method upon render.
	 */
	getNodeAttributes(): VNodeProperties;

	/**
	 * The ID of the widget, which gets automatically rendered in the VNode property `data-widget-id` when
	 * rendered.
	 */
	readonly id: string;

	/**
	 * Signal to the widget that it is in an invalid state and that it should not re-use its cache on the
	 * next render.
	 *
	 * Calls to invalidate, will also cause the widget to invalidate its parent, if assigned.
	 */
	invalidate(): void;

	/**
	 * An array of functions that return a map of VNodeProperties which should be mixed into the final
	 * properties used when rendering this widget.  These are intended to be "static" and bund to the class,
	 * making it easy for mixins to alter the behaviour of the render process without needing to override or aspect
	 * the `getNodeAttributes` method.
	 */
	nodeAttributes: NodeAttributeFunction[];

	/**
	 * Render the widget, returing the virtual DOM node that represents this widget.
	 *
	 * It is not intended that mixins will override or aspect this method, as the render process is decomposed to
	 * allow easier modification of behaviour of the render process.  The base implementatin intelligently caches
	 * its render and essentially provides the following return for the method:
	 *
	 * ```typescript
	 * return h(this.tagName, this.getNodeAttributes(), this.getChildrenNodes());
	 * ```
	 */
	render(): VNode;

	/**
	 * The tagName (selector) that should be used when rendering the node.
	 *
	 * If there is logic that is required to determine this value on render, a mixin should consider overriding
	 * this property with a getter.
	 */
	tagName: string;
}

export class WidgetRegistry<S extends WidgetState> extends IdentityRegistry<Factory<Widget<S>, WidgetOptions<S>>> {}

export interface WidgetOptions<S extends WidgetState> extends StatefulOptions<S> {
	/**
	 * Any child node render functions that should be added to this instance
	 */
	childNodeRenderers?: ChildNodeFunction | ChildNodeFunction[];

	/**
	 * Any classes that should be added to this instances
	 */
	classes?: string[];

	/**
	 * Any node attribute functions that should be added to this instance
	 */
	nodeAttributes?: NodeAttributeFunction| NodeAttributeFunction[];

	/**
	 * A parent to assign to this widget at creation time
	 */
	parent?: RenderableParent;

	/**
	 * Override the tag name for this widget instance
	 */
	tagName?: string;

	/**
	 * Optional widget registry
	 */
	widgetFactoryRegistry?: WidgetRegistry<S>;
}

export interface WidgetState extends State {
	/**
	 * Any classes that should be mixed into the widget's VNode upon render.
	 *
	 * Any classes expressed in state will be additive to those provided in the widget's `.classes` property
	 */
	classes?: string[];

	/**
	 * The ID of the widget
	 */
	id?: string;

	/**
	 * Any inline styles which should be mixed into the widget's VNode upon render.
	 */
	styles?: StylesMap;

	/**
	 * Children
	 */
	children?: any[];

	type?: string;
}

export interface ContainerWidgetState<T> extends WidgetState {
	/**
	 * Children
	 */
	children?: T[];
}
