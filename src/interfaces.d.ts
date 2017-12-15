import { Destroyable } from '@dojo/core/Destroyable';
import { Evented } from '@dojo/core/Evented';
import { EventObject, EventType } from '@dojo/core/interfaces';
import Map from '@dojo/shim/Map';
import WeakMap from '@dojo/shim/WeakMap';

/**
 * Generic constructor type
 */
export type Constructor<T> = new (...args: any[]) => T;

/**
 * Typed target event
 */
export interface TypedTargetEvent<T extends EventTarget, Y extends EventType = EventType> extends EventObject<Y> {
	target: T;
}

/*
 These are the event handlers.
 */
export type EventHandlerResult = boolean | void;

export interface EventHandler {
	(event?: Event): EventHandlerResult;
}

export interface FocusEventHandler {
	(event?: FocusEvent): EventHandlerResult;
}

export interface KeyboardEventHandler {
	(event?: KeyboardEvent): EventHandlerResult;
}

export interface MouseEventHandler {
	(event?: MouseEvent): EventHandlerResult;
}

export type BlurEventHandler = FocusEventHandler;
export type ChangeEventHandler = EventHandler;
export type ClickEventHandler = MouseEventHandler;
export type DoubleClickEventHandler = MouseEventHandler;
export type InputEventHandler = EventHandler;
export type KeyDownEventHandler = KeyboardEventHandler;
export type KeyPressEventHandler = KeyboardEventHandler;
export type KeyUpEventHandler = KeyboardEventHandler;
export type LoadEventHandler = EventHandler;
export type MouseDownEventHandler = MouseEventHandler;
export type MouseEnterEventHandler = MouseEventHandler;
export type MouseLeaveEventHandler = MouseEventHandler;
export type MouseMoveEventHandler = MouseEventHandler;
export type MouseOutEventHandler = MouseEventHandler;
export type MouseOverEventHandler = MouseEventHandler;
export type MouseUpEventHandler = MouseEventHandler;
export type MouseWheelEventHandler = (event?: MouseWheelEvent | WheelEvent) => EventHandlerResult;
export type ScrollEventHandler = (event?: UIEvent) => EventHandlerResult;
export type SubmitEventHandler = EventHandler;

export interface TransitionStrategy {
	enter(element: Element, properties: VNodeProperties, enterAnimation: string): void;
	exit(element: Element, properties: VNodeProperties, exitAnimation: string, removeElement: () => void): void;
}

export interface ProjectorOptions {
	readonly transitions?: TransitionStrategy;
	styleApplyer?(domNode: HTMLElement, styleName: string, value: string): void;
}

export interface ProjectionOptions extends ProjectorOptions {
	namespace?: string;
	deferredRenderCallbacks: Function [];
	afterRenderCallbacks: Function[];
	merge: boolean;
	sync: boolean;
	mergeElement?: Element;
	nodeMap: WeakMap<Node, WeakMap<Function, EventListener>>;
	rootNode: Element;
}

export interface Projection {
	readonly domNode: Element;
	update(updatedDNode: DNode | DNode[]): void;
}

export type SupportedClassName = string | null | undefined;

export type DeferredVirtualProperties = (inserted: boolean) => VNodeProperties;

interface VNodePropertyExtras {
	apply(
		domNode: Element,
		previousProperties: VNodeProperties,
		properties: VNodeProperties
	): void;
	type: Symbol;
}

export type VNodeProperties = VirtualDomEventProperties & WithApplicator<VirtualDomPropertyProperties>;

export interface VirtualDomEventProperties {
	onpointermove?(ev?: PointerEvent): boolean | void;
	onpointerdown?(ev?: PointerEvent): boolean | void;
	onpointerup?(ev?: PointerEvent): boolean | void;
	onpointerover?(ev?: PointerEvent): boolean | void;
	onpointerout?(ev?: PointerEvent): boolean | void;
	onpointerenter?(ev?: PointerEvent): boolean | void;
	onpointerleave?(ev?: PointerEvent): boolean | void;
	onpointercancel?(ev?: PointerEvent): boolean | void;
	ontouchcancel?(ev?: TouchEvent): boolean | void;
	ontouchend?(ev?: TouchEvent): boolean | void;
	ontouchmove?(ev?: TouchEvent): boolean | void;
	ontouchstart?(ev?: TouchEvent): boolean | void;
	onblur?(ev?: FocusEvent): boolean | void;
	onchange?(ev?: Event): boolean | void;
	onclick?(ev?: MouseEvent): boolean | void;
	ondblclick?(ev?: MouseEvent): boolean | void;
	onfocus?(ev?: FocusEvent): boolean | void;
	oninput?(ev?: Event): boolean | void;
	onkeydown?(ev?: KeyboardEvent): boolean | void;
	onkeypress?(ev?: KeyboardEvent): boolean | void;
	onkeyup?(ev?: KeyboardEvent): boolean | void;
	onload?(ev?: Event): boolean | void;
	onmousedown?(ev?: MouseEvent): boolean | void;
	onmouseenter?(ev?: MouseEvent): boolean | void;
	onmouseleave?(ev?: MouseEvent): boolean | void;
	onmousemove?(ev?: MouseEvent): boolean | void;
	onmouseout?(ev?: MouseEvent): boolean | void;
	onmouseover?(ev?: MouseEvent): boolean | void;
	onmouseup?(ev?: MouseEvent): boolean | void;
	onmousewheel?(ev?: WheelEvent | MouseWheelEvent): boolean | void;
	onscroll?(ev?: UIEvent): boolean | void;
	onsubmit?(ev?: Event): boolean | void;
}

export interface VirtualDomPropertyProperties {
	readonly bind?: void;
	readonly key?: string | number;
	readonly classes?: SupportedClassName | SupportedClassName[];
	readonly styles?: { [index: string]: string | null | undefined };
	readonly action?: string;
	readonly encoding?: string;
	readonly enctype?: string;
	readonly method?: string;
	readonly name?: string;
	readonly target?: string;
	readonly 'touch-action'?: string;
	readonly spellcheck?: boolean;
	readonly tabIndex?: number;
	readonly disabled?: boolean;
	readonly title?: string;
	readonly accessKey?: string;
	readonly id?: string;
	readonly type?: string;
	readonly autocomplete?: string;
	readonly checked?: boolean;
	readonly placeholder?: string;
	readonly readOnly?: boolean;
	readonly src?: string;
	readonly value?: string;
	readonly alt?: string;
	readonly srcset?: string;
	readonly innerHTML?: string;
	readonly [index: string]: any;
}

type WithApplicator<T> = {
	[P in keyof T]: T[P] | VNodePropertyExtras;
};

/**
 * Type of the `WidgetRegistry` label
 */
export type RegistryLabel = string | symbol;

/**
 * Base widget properties
 */
export interface WidgetProperties {

	/**
	 * The key for a widget. Used to differentiate uniquely identify child widgets for
	 * rendering and instance management
	 */
	key?: string | number;
}

/**
 * Widget properties that require a key
 */
export interface KeyedWidgetProperties extends WidgetProperties {

	/**
	 * The key for a widget. Used to differentiate uniquely identify child widgets for
	 * rendering and instance management
	 */
	key: string | number;
}

/**
 *
 */
interface CoreProperties {

	/**
	 * The default registry for the projection
	 */
	baseRegistry: any;

	/**
	 * The scope used to bind functions
	 */
	bind: any;
}

/**
 * Wrapper for v
 */
export interface VNode {
	/**
	 * Specified children
	 */
	children?: DNode[];

	/**
	 * VNode properties
	 */
	properties: VNodeProperties;

	/**
	 * Deferred callback for VNode properties
	 */
	deferredPropertiesCallback?: DeferredVirtualProperties;

	/**
	 * The tag of the VNode
	 */
	tag: string;

	/**
	 * The type of node
	 */
	type: symbol;

	/**
	 * Text node string
	 */
	text?: string;
}

/**
 * Wrapper for `w`
 */
export interface WNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface> {
	/**
	 * Constructor to create a widget or string constructor label
	 */
	widgetConstructor: Constructor<W> | RegistryLabel;

	/**
	 * Properties to set against a widget instance
	 */
	properties: W['properties'];

	/**
	 * DNode children
	 */
	children: DNode[];

	/**
	 * The type of node
	 */
	type: symbol;
}

/**
 * union type for all possible return types from render
 */
export type DNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface> = VNode | WNode<W> | undefined | null | string;

/**
 * Property Change record for specific property diff functions
 */
export interface PropertyChangeRecord {
	changed: boolean;
	value: any;
}

export interface DiffPropertyFunction {
	(previousProperty: any, newProperty: any): PropertyChangeRecord;
}

export interface DiffPropertyReaction {
	(previousProperties: any, newProperties: any): void;
}

/**
 * WidgetBase constructor type
 */
export type WidgetBaseConstructor<
	P extends WidgetProperties = WidgetProperties,
	C extends DNode = DNode> = Constructor<WidgetBaseInterface<P, C>>;

export interface DefaultWidgetBaseInterface extends WidgetBaseInterface<WidgetProperties, DNode> {}

/**
 * The interface for WidgetBase
 */
export interface WidgetBaseInterface<
	P = WidgetProperties,
	C extends DNode = DNode> {

	/**
	 * Widget properties
	 */
	readonly properties: P & WidgetProperties;

	/**
	 * Returns the widget's children
	 */
	readonly children: (C | null)[];

	/**
	 * Sets the properties for the widget. Responsible for calling the diffing functions for the properties against the
	 * previous properties. Runs though any registered specific property diff functions collecting the results and then
	 * runs the remainder through the catch all diff function. The aggregate of the two sets of the results is then
	 * set as the widget's properties
	 *
	 * @param properties The new widget properties
	 */
	__setProperties__(properties: P & { [index: string]: any }): void;

	/**
	 * Sets core properties on the widget.
	 *
	 * @param coreProperties The core properties
	 */
	__setCoreProperties__(coreProperties?: CoreProperties): any;

	/**
	 * Sets the widget's children
	 */
	__setChildren__(children: (C | null)[]): void;

	/**
	 * Main internal function for dealing with widget rendering
	 */
	__render__(): DNode | DNode[];
}

/**
 * Meta Base type
 */
export interface WidgetMetaBase extends Destroyable {
	has(key: string | number): boolean;
	afterRender(): void;
}

/**
 * Meta Base constructor type
 */
export interface WidgetMetaConstructor<T extends WidgetMetaBase> {
	new (properties: WidgetMetaProperties): T;
}

export interface NodeHandlerInterface extends Evented {
	get(key: string | number): Element | undefined;
	has(key: string | number): boolean;
	add(element: Element, key: string): void;
	addRoot(element: Element, key: string): void;
	addProjector(element: Element, properties: VNodeProperties): void;
	clear(): void;
}

/**
 * Properties passed to meta Base constructors
 */
export interface WidgetMetaProperties {
	invalidate: () => void;
	nodeHandler: NodeHandlerInterface;
	bind: WidgetBaseInterface;
}

export interface Render {
	(): DNode | DNode[];
}

/**
 * Interface for beforeRender function
 */
export interface BeforeRender {
	(renderFunc: Render, properties: WidgetProperties, children: DNode[]): Render | undefined;
}

/**
 * Interface for afterRender function
 */
export interface AfterRender {
	(dNode: DNode | DNode []): DNode | DNode[];
}

/**
 * Interface for beforeProperties function
 */
export interface BeforeProperties<P = any> {
	(properties: P): P;
}
