import { Evented, BaseEventedEvents } from '@dojo/core/Evented';
import { assign } from '@dojo/core/lang';
import { EventedListenerOrArray } from '@dojo/interfaces/bases';
import { VNode } from '@dojo/interfaces/vdom';
import Map from '@dojo/shim/Map';
import Promise from '@dojo/shim/Promise';
import WeakMap from '@dojo/shim/WeakMap';
import { v, registry, isWNode } from './d';
import FactoryRegistry, { WIDGET_BASE_TYPE } from './FactoryRegistry';
import {
	DNode,
	WidgetConstructor,
	WidgetProperties,
	WidgetBaseInterface,
	PropertyChangeRecord,
	PropertiesChangeRecord,
	PropertiesChangeEvent
} from './interfaces';
import { Handle } from '@dojo/interfaces/core';

/**
 * Widget cache wrapper for instance management
 */
interface WidgetCacheWrapper {
	child: WidgetBaseInterface<WidgetProperties>;
	factory: WidgetConstructor;
	used: boolean;
}

/**
 * Diff property configuration
 */
interface DiffPropertyConfig {
	propertyName: string;
	diffFunction: Function;
}

interface BoundFunctionWrapper {
	boundFunc: (...args: any[]) => any;
	scope: any;
};

type CachedChildrenMapKey = string | Promise<WidgetConstructor> | WidgetConstructor;

export interface WidgetBaseEvents<P extends WidgetProperties> extends BaseEventedEvents {
	(type: 'properties:changed', handler: EventedListenerOrArray<WidgetBase<P>, PropertiesChangeEvent<WidgetBase<P>, P>>): Handle;
}

/**
 * Decorator that can be used to register a function to run as an aspect to `render`
 */
export function afterRender(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	target.addDecorator('afterRender', target[propertyKey]);
}

/**
 * Decorator that can be used to register a function as a specific property diff
 *
 * @param propertyName The name of the property of which the diff function is applied
 */
export function diffProperty(propertyName: string) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		target.addDecorator('diffProperty', { propertyName, diffFunction: target[propertyKey] });
	};
}

/**
 * Decorator used to register listeners to the `properties:changed` event.
 */
export function onPropertiesChanged(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	target.addDecorator('onPropertiesChanged', target[propertyKey]);
}

/**
 * Main widget base for all widgets to extend
 */
export class WidgetBase<P extends WidgetProperties> extends Evented implements WidgetBaseInterface<P> {

	/**
	 * static identifier
	 */
	static _type: symbol = WIDGET_BASE_TYPE;

	/**
	 * children array
	 */
	private _children: DNode[] = [];

	/**
	 * marker indicating if the widget requires a render
	 */
	private _dirty: boolean = false;

	/**
	 * cachedVNode from previous render
	 */
	private _cachedVNode?: VNode | string;

	/**
	 * internal widget properties
	 */
	private  _properties: P = <P> {};

	/**
	 * properties from the previous render
	 */
	private _previousProperties: P & { [index: string]: any } = <P> {};

	/**
	 * Map of factory promises
	 */
	private _initializedFactoryMap: Map<string, Promise<WidgetConstructor>> = new Map<string, Promise<WidgetConstructor>>();

	/**
	 * cached chldren map for instance management
	 */
	private _cachedChildrenMap: Map<CachedChildrenMapKey, WidgetCacheWrapper[]> = new Map<CachedChildrenMapKey, WidgetCacheWrapper[]>();

	/**
	 * Map of functions properties for the bound function
	 */
	private _bindFunctionPropertyMap: WeakMap<(...args: any[]) => any, BoundFunctionWrapper > =  new WeakMap<(...args: any[]) => any, BoundFunctionWrapper>();

	/**
	 * A generic property bag for decorators
	 */
	private _decorators: Map<string, any[]>;

	/**
	 * Internal factory registry
	 */
	protected registry: FactoryRegistry | undefined;

	/**
	 * Define the support widget base events
	 */
	public on: WidgetBaseEvents<P>;

	/**
	 * @constructor
	 */
	constructor() {
		super({});

		this.own(this.on('properties:changed', (evt) => {
			this.invalidate();

			const propertiesChangedListeners = this.getDecorator('onPropertiesChanged') || [];
			propertiesChangedListeners.forEach((propertiesChangedFunction) => {
				propertiesChangedFunction.call(this, evt);
			});
		}));
	}

	public get properties(): Readonly<P> {
		return this._properties;
	}

	public setProperties(properties: P): void {
		const diffPropertyResults: { [index: string]: PropertyChangeRecord } = {};
		const diffPropertyChangedKeys: string[] = [];

		this.bindFunctionProperties(properties);

		const registeredDiffPropertyConfigs: DiffPropertyConfig[] = this.getDecorator('diffProperty') || [];

		registeredDiffPropertyConfigs.forEach(({ propertyName, diffFunction }) => {
			const previousProperty = this._previousProperties[propertyName];
			const newProperty = (<any> properties)[propertyName];
			const result: PropertyChangeRecord = diffFunction(previousProperty, newProperty);

			if (!result) {
				return;
			}

			if (result.changed) {
				diffPropertyChangedKeys.push(propertyName);
			}
			delete (<any> properties)[propertyName];
			delete this._previousProperties[propertyName];
			diffPropertyResults[propertyName] = result.value;
		});

		const diffPropertiesResult = this.diffProperties(this._previousProperties, properties);
		this._properties = assign(diffPropertiesResult.properties, diffPropertyResults);

		const changedPropertyKeys = [...diffPropertiesResult.changedKeys, ...diffPropertyChangedKeys];

		if (changedPropertyKeys.length) {
			this.emit({
				type: 'properties:changed',
				target: this,
				properties: this.properties,
				changedPropertyKeys
			});
		}
		this._previousProperties = this.properties;
	}

	public get children(): DNode[] {
		return this._children;
	}

	public setChildren(children: DNode[]): void {
		this._children = children;
		this.emit({
			type: 'widget:children',
			target: this
		});
	}

	public diffProperties(previousProperties: P & { [index: string]: any }, newProperties: P & { [index: string]: any }): PropertiesChangeRecord<P> {
		const changedKeys = Object.keys(newProperties).reduce((changedPropertyKeys: string[], propertyKey: string): string[] => {
			if (previousProperties[propertyKey] !== newProperties[propertyKey]) {
				changedPropertyKeys.push(propertyKey);
			}
			return changedPropertyKeys;
		}, []);

		return { changedKeys, properties: assign({}, newProperties) };
	}

	public render(): DNode {
		return v('div', {}, this.children);
	}

	public __render__(): VNode | string | null {
		if (this._dirty || !this._cachedVNode) {
			let dNode = this.render();
			const afterRenders = this.getDecorator('afterRender') || [];
			afterRenders.forEach((afterRenderFunction: Function) => {
				dNode = afterRenderFunction.call(this, dNode);
			});
			const widget = this.dNodeToVNode(dNode);
			this.manageDetachedChildren();
			if (widget) {
				this._cachedVNode = widget;
			}
			this._dirty = false;
			return widget;
		}
		return this._cachedVNode;
	}

	public invalidate(): void {
		this._dirty = true;
		this.emit({
			type: 'invalidated',
			target: this
		});
	}

	/**
	 * Binds unbound property functions to the specified `bind` property
	 *
	 * @param properties properties to check for functions
	 */
	private bindFunctionProperties(properties: P & { [index: string]: any }): void {
		Object.keys(properties).forEach((propertyKey) => {
			const property = properties[propertyKey];
			const bind = properties.bind;

			if (typeof property === 'function') {
				const bindInfo = this._bindFunctionPropertyMap.get(property) || {};
				let { boundFunc, scope } = bindInfo;

				if (!boundFunc || scope !== bind) {
					boundFunc = property.bind(bind);
					this._bindFunctionPropertyMap.set(property, { boundFunc, scope: bind });
				}
				properties[propertyKey] = boundFunc;
			}
		});
	}

	/**
	 * Function to add decorators to WidgetBase
	 *
	 * @param decoratorKey The key of the decorator
	 * @param value The value of the decorator
	 */
	protected addDecorator(decoratorKey: string, value: any): void {
		value = Array.isArray(value) ? value : [ value ];
		if (!this._decorators) {
			this._decorators = new Map<string, any[]>();
		}

		const currentValue = this._decorators.get(decoratorKey) || [];
		this._decorators.set(decoratorKey, [ ...currentValue, ...value ]);
	}

	/**
	 * Function to retrieve decorator values
	 *
	 * @param decoratorKey The key of the decorator
	 * @returns An array of decorator values or undefined
	 */
	protected getDecorator(decoratorKey: string): any[] | undefined {
		if (this._decorators) {
			return this._decorators.get(decoratorKey);
		}
		return undefined;
	}

	/**
	 * Returns the factory from the registry for the specified label. First checks a local registry passed via
	 * properties, if no local registry or the factory is not found fallback to the global registry
	 *
	 * @param factoryLabel the label to look up in the registry
	 */
	private getFromRegistry(factoryLabel: string): Promise<WidgetConstructor> | WidgetConstructor | null {
		if (this.registry && this.registry.has(factoryLabel)) {
			return this.registry.get(factoryLabel);
		}
		return registry.get(factoryLabel);
	}

	/**
	 * Process a structure of DNodes into VNodes, string or null. `null` results are filtered.
	 *
	 * @param dNode the dnode to process
	 * @returns a VNode, string or null
	 */
	private dNodeToVNode(dNode: DNode): VNode | string | null {

		if (typeof dNode === 'string' || dNode === null) {
			return dNode;
		}

		if (isWNode(dNode)) {
			const { children, properties = {} } = dNode;
			const { key } = properties;

			let { factory } = dNode;
			let child: WidgetBaseInterface<WidgetProperties>;

			if (typeof factory === 'string') {
				const item = this.getFromRegistry(factory);

				if (item instanceof Promise) {
					if (item && !this._initializedFactoryMap.has(factory)) {
						const promise = item.then((factory) => {
							this.invalidate();
							return factory;
						});
						this._initializedFactoryMap.set(factory, promise);
					}
					return null;
				}
				else if (item === null) {
					console.warn(`Unable to render unknown widget factory ${factory}`);
					return null;
				}
				factory = item;
			}

			const childrenMapKey = key || factory;
			let cachedChildren = this._cachedChildrenMap.get(childrenMapKey) || [];
			let cachedChild: WidgetCacheWrapper | undefined;
			cachedChildren.some((cachedChildWrapper) => {
				if (cachedChildWrapper.factory === factory && !cachedChildWrapper.used) {
					cachedChild = cachedChildWrapper;
					return true;
				}
				return false;
			});

			if (!properties.hasOwnProperty('bind')) {
				properties.bind = this;
			}

			if (cachedChild) {
				child = cachedChild.child;
				child.setProperties(properties);
				cachedChild.used = true;
			}
			else {
				child = new factory();
				child.setProperties(properties);
				child.own(child.on('invalidated', () => {
					this.invalidate();
				}));
				cachedChildren = [...cachedChildren, { child, factory, used: true }];
				this._cachedChildrenMap.set(childrenMapKey, cachedChildren);
				this.own(child);
			}
			if (!key && cachedChildren.length > 1) {
				const errorMsg = 'It is recommended to provide a unique `key` property when using the same widget factory multiple times';
				console.warn(errorMsg);
				this.emit({ type: 'error', target: this, error: new Error(errorMsg) });
			}

			child.setChildren(children);
			return child.__render__();
		}

		dNode.vNodes = dNode.children
		.filter((child) => child !== null)
		.map((child: DNode) => {
			return this.dNodeToVNode(child);
		});

		return dNode.render({ bind: this });
	}

	/**
	 * Manage widget instances after render processing
	 */
	private manageDetachedChildren(): void {
		this._cachedChildrenMap.forEach((cachedChildren, key) => {
			const filterCachedChildren = cachedChildren.filter((cachedChild) => {
				if (cachedChild.used) {
					cachedChild.used = false;
					return true;
				}
				cachedChild.child.destroy();
				return false;
			});
			this._cachedChildrenMap.set(key, filterCachedChildren);
		});
	}
}

export default WidgetBase;
