import Stateful, { StatefulOptions, State } from './bases/Stateful';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { deepAssign, assign } from 'dojo-core/lang';
import Promise from 'dojo-shim/Promise';
import Map from 'dojo-shim/Map';
import { v, registry } from './d';
import FactoryRegistry from './WidgetRegistry';
import { entries } from 'dojo-shim/object';

function isWNode<S extends WidgetState, P extends WidgetProperties>(child: DNode<S, P>): child is WNode<S, P> {
	return Boolean(child && (<WNode<S, P>> child).factory !== undefined);
}

function formatTagNameAndClasses(tagName: string, classes: string[]) {
	if (classes.length) {
		return `${tagName}.${classes.join('.')}`;
	}
	return tagName;
}

function isObject(value: any) {
	return Object.prototype.toString.call(value) === '[object Object]';
}

function shallowCompare(from: any, to: any) {
	return Object.keys(from).every((key) => from[key] === to[key]);
}

function generateProperties<S, P extends WidgetProperties>(instance: WidgetBase<S, P>, previousProperties: P): any {
	const changedPropertyKeys = instance.diffProperties(previousProperties);
	const changedProperties: { currentProperties: any, previousProperties: any } = {
		currentProperties: {},
		previousProperties: {}
	};

	changedPropertyKeys.forEach((key) => {
		changedProperties.currentProperties[key] = instance.properties[key];
		if (previousProperties[key]) {
			changedProperties.previousProperties[key] = previousProperties[key];
		}
	});

	return changedProperties;
}

export interface WidgetState extends State {
	id?: string;

	classes?: string[];

	styles?: any;

	enterAnimation?: string;

	exitAnimation?: string;
}

export interface WidgetProperties {
	[key: string]: any;
}

export interface WidgetOptions<S extends WidgetState, P extends WidgetProperties> extends StatefulOptions<S> {
	properties?: P;

	tagName?: string;
}

export interface HNode<S extends WidgetState, P extends WidgetProperties> {

	children: (DNode<S, P> | (VNode | string))[];

	render<T>(options?: { bind: T }): VNode;
}

export interface WNode<S extends WidgetState, P extends WidgetProperties> {

	factory: WidgetBaseConstructor<S, P> | string;

	options: WidgetOptions<S, P>;

	children: DNode<S, P>[];
}

export type DNode<S extends WidgetState, P extends WidgetProperties> = HNode<S, P> | WNode<S, P> | string | null;

export interface WidgetBaseConstructor<S extends WidgetState, P extends WidgetProperties> {
	new (options: WidgetOptions<S, P>): WidgetBase<S, P>;
}

export class WidgetBase<S extends WidgetState, P extends WidgetProperties> extends Stateful<S> {

	private dirty: boolean = true;
	private cachedVNode: VNode | string;
	private _children: DNode<S, P>[];
	private factoryRegistry: FactoryRegistry<S, P> = new FactoryRegistry<S, P>();
	private initializedFactoryMap: Map<string, Promise<WidgetBaseConstructor<S, P>>> = new Map<string, Promise<WidgetBaseConstructor<S, P>>>();
	private previousProperties: WidgetProperties;
	private widgetClasses: string[] = [];
	private historicChildrenMap: Map<string | Promise<WidgetBaseConstructor<S, P>> | WidgetBaseConstructor<S, P>, WidgetBase<S, P>>;
	private currentChildrenMap: Map<string | Promise<WidgetBaseConstructor<S, P>> | WidgetBaseConstructor<S, P>, WidgetBase<S, P>>;
	protected nodeAttributes: any[] = [];

	public tagName: string = 'div';
	public classes: string[] = [];

	public properties: P;

	constructor(options: WidgetOptions<S, P>) {
		super(options);
		const { properties = <P> {}, tagName } = options;

		this.properties = properties;
		this.tagName = tagName || this.tagName;

		this.previousProperties = deepAssign({}, properties);
		this.historicChildrenMap = new Map<string | Promise<WidgetBaseConstructor<S, P>> | WidgetBaseConstructor<S, P>, WidgetBase<S, P>>();
		this.currentChildrenMap = new Map<string | Promise<WidgetBaseConstructor<S, P>> | WidgetBaseConstructor<S, P>, WidgetBase<S, P>>();

		this.nodeAttributes.push(this.attachBaseAttributes);

		this.applyChangedProperties(<P> {}, properties);
		this.own(this.on('state:changed', () => {
			this.invalidate();
		}));
	}

	private attachBaseAttributes (this: WidgetBase<S, P>): VNodeProperties {
		const baseIdProp = this.state && this.state.id ? { 'data-widget-id': this.state.id } : {};
		const { styles = {}, enterAnimation = '', exitAnimation = '' } = this.state || {};
		const classes: { [index: string]: boolean; } = {};

		this.widgetClasses.forEach((c) => classes[c] = false);

		if (this.state && this.state.classes) {
			this.state.classes.forEach((c) => classes[c] = true);
			this.widgetClasses =  this.state.classes;
		}

		const listeners: { [key: string]: any } = {};

		this.listenersMap.forEach((value, key) => {
			listeners[key] = value;
		});

		return assign(baseIdProp, listeners, { key: this, classes, styles, enterAnimation, exitAnimation });
	}

	private dNodeToVNode(this: WidgetBase<S, P>, dNode: DNode<S, P>) {
		if (typeof dNode === 'string' || dNode === null) {
			return dNode;
		}

		if (isWNode(dNode)) {
			const { children, options: { id, properties } } = dNode;

			let { factory } = dNode;
			let child: WidgetBase<S, P>;

			if (typeof factory === 'string') {
				const item = this.getFromRegistry(factory);

				if (item instanceof Promise) {
					if (item && !this.initializedFactoryMap.has(factory)) {
						const promise = item.then((factory) => {
							this.invalidate();
							return factory;
						});
						this.initializedFactoryMap.set(factory, promise);
					}
					return null;
				}
				else if (item === null) {
					throw new Error();
				}
				factory = item;
			}

			const childrenMapKey = id || factory;
			const cachedChild = this.historicChildrenMap.get(childrenMapKey);

			if (cachedChild) {
				child = cachedChild;
				if (properties) {
					child.properties = properties;
				}
			}
			else {
				child = new factory(dNode.options);
				child.own(child.on('invalidated', () => {
					this.invalidate();
				}));
				this.historicChildrenMap.set(childrenMapKey, child);
				this.own(child);
			}
			if (!id && this.currentChildrenMap.has(factory)) {
				const errorMsg = 'must provide unique keys when using the same widget factory multiple times';
				console.error(errorMsg);
				this.emit({ type: 'error', target: this, error: new Error(errorMsg) });
			}

			child.children = children;
			this.currentChildrenMap.set(childrenMapKey, child);

			return child.__render__();
		}

		dNode.children = dNode.children
		.filter((child) => child !== null)
		.map((child: DNode<S, P>) => {
			return this.dNodeToVNode(child);
		});

		return dNode.render({ bind: this });
	}

	private manageDetachedChildren(this: WidgetBase<S, P>): void {
		this.historicChildrenMap.forEach((child, key) => {
			if (!this.currentChildrenMap.has(key)) {
				this.historicChildrenMap.delete(key);
				child.destroy();
			}
		});
		this.currentChildrenMap.clear();
	}

	private getFromRegistry(factoryLabel: string): Promise<WidgetBaseConstructor<S, P>> | WidgetBaseConstructor<S, P> | null {
		if (this.factoryRegistry.has(factoryLabel)) {
			return this.factoryRegistry.get(factoryLabel);
		}

		return registry.get(factoryLabel);
	}

	getNode(this: WidgetBase<S, P>): DNode<any, any> {
		const tag = formatTagNameAndClasses(this.tagName, this.classes);
		return v(tag, this.getNodeAttributes(), this.getChildrenNodes());
	}

	set children(this: WidgetBase<S, P>, children: DNode<S, P>[]) {
		this._children = children;
		this.emit({
			type: 'widget:children',
			target: this
		});
	}

	get children() {
		return this._children;
	}

	getChildrenNodes(this: WidgetBase<S, P>): DNode<S, P>[] {
		return this.children;
	}

	getNodeAttributes(this: WidgetBase<S, P>, overrides?: VNodeProperties): VNodeProperties {
		const props: VNodeProperties = {};

		this.nodeAttributes.forEach((fn) => {
			const newProps: VNodeProperties = fn.call(this);
			if (newProps) {
				assign(props, newProps);
			}
		});

		return props;
	}

	invalidate(this: WidgetBase<S, P>): void {
		this.dirty = true;
		this.emit({
			type: 'invalidated',
			target: this
		});
	}

	applyChangedProperties(this: WidgetBase<S, P>, previousProperties: P, currentProperties: P): void {
		if (Object.keys(currentProperties).length) {
			currentProperties['id'] = this.id;
			this.setState(<any> currentProperties);
		}
	}

	diffProperties(this: WidgetBase<S, P>, previousProperties: P): string[] {
		const changedPropertyKeys: string[] = [];

		entries(this.properties).forEach(([key, value]) => {
			let isEqual = true;
			if (previousProperties.hasOwnProperty(key)) {
				const previousValue = previousProperties[key];
				if (!(typeof value === 'function')) {
					if (Array.isArray(value) && Array.isArray(previousValue)) {
						if (value.length !== previousValue.length) {
							isEqual = false;
						}
						else {
							isEqual = value.every((item: any, index: number) => {
								if (isObject(item)) {
									return shallowCompare(item, previousValue[index]);
								}
								else {
									return item === previousValue[index];
								}
							});
						}
					}
					else if (isObject(value) && isObject(previousValue)) {
						isEqual = shallowCompare(value, previousValue);
					}
					else {
						isEqual = value === previousValue;
					}
				}
			}
			else {
				isEqual = false;
			}
			if (!isEqual) {
				changedPropertyKeys.push(key);
			}
		});
		return changedPropertyKeys;
	}

	__render__(this: WidgetBase<S, P>): VNode | string | null {
		const updatedProperties = generateProperties(this, this.previousProperties);
		this.applyChangedProperties(updatedProperties.previousProperties, updatedProperties.currentProperties);

		if (this.dirty || !this.cachedVNode) {
			const widget = this.dNodeToVNode(this.getNode());
			this.manageDetachedChildren();
			if (widget) {
				this.cachedVNode = widget;
			}
			this.dirty = false;
			this.previousProperties = deepAssign({}, this.properties);
			return widget;
		}
		return this.cachedVNode;
	}

	get registry(this: WidgetBase<S, P>): FactoryRegistry<S, P> {
		return this.registry;
	}
}

export default WidgetBase;
