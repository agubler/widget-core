import { isThenable } from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Symbol from '@dojo/shim/Symbol';
import { Handle } from '@dojo/interfaces/core';
import { BaseEventedEvents, Evented, EventObject } from '@dojo/core/Evented';
import { Constructor, ContextInterface, RegistryLabel, WidgetBaseConstructor, WidgetBaseInterface } from './interfaces';

export type RegistryItemFunction = () => RegistryItemPromise;

export type RegistryItemPromise = Promise<WidgetBaseConstructor | ContextInterface>;

export type WidgetRegistryItem = WidgetBaseConstructor | ContextInterface | RegistryItemPromise | RegistryItemFunction;

/**
 * Widget base symbol type
 */
export const WIDGET_BASE_TYPE = Symbol('Widget Base');

export const REGISTRY_CONTEXT_TYPE = Symbol('Registry Context');

export interface WidgetRegistryEventObject extends EventObject {
	action: string;
}

export interface WidgetRegistryListener {
	(event: WidgetRegistryEventObject): void;
}

export interface WidgetRegistryEvents extends BaseEventedEvents {
	(type: RegistryLabel, listener: WidgetRegistryListener | WidgetRegistryListener[]): Handle;
}

/**
 * Widget Registry Interface
 */
export interface WidgetRegistry {

	/**
	 * define a WidgetRegistryItem for a specified label
	 *
	 * @param widgetLabel The label of the widget to register
	 * @param registryItem The registry item to define
	 */
	define(widgetLabel: RegistryLabel, registryItem: WidgetRegistryItem): void;

	/**
	 * Return a WidgetRegistryItem for the given label, null if an entry doesn't exist
	 *
	 * @param widgetLabel The label of the widget to return
	 * @returns The WidgetRegistryItem for the widgetLabel, `null` if no entry exists
	 */
	get<T extends WidgetBaseInterface = WidgetBaseInterface>(widgetLabel: RegistryLabel): Constructor<T> | null;

	/**
	 * Returns a boolean if an entry for the label exists
	 *
	 * @param widgetLabel The label to search for
	 * @returns boolean indicating if a widget registry item exists
	 */
	has(widgetLabel: RegistryLabel): boolean;
}

/**
 * Class that extends Evented and returns the set context using `.get()`
 */
export class Context<T = any> extends Evented implements ContextInterface<T> {

	static _type: symbol = REGISTRY_CONTEXT_TYPE;
	private _context: T;

	constructor(context: T) {
		super();
		this._context = context;
	}

	public get(): T {
		return this._context;
	}

	public set(context: T): void {
		this._context = context;
		this.emit({ type: 'invalidate' });
	}
}

/**
 * Checks is the item is a subclass of WidgetBase (or a WidgetBase)
 *
 * @param item the item to check
 * @returns true/false indicating if the item is a WidgetBaseConstructor
 */
export function isWidgetBaseConstructor<T>(item: any): item is Constructor<T> {
	return Boolean(item && item._type === WIDGET_BASE_TYPE);
}

export function isRegistryContext(item: any): item is ContextInterface {
	return Boolean(item && item.constructor._type === REGISTRY_CONTEXT_TYPE);
}

/**
 * The WidgetRegistry implementation
 */
export class WidgetRegistry extends Evented implements WidgetRegistry {

	public on: WidgetRegistryEvents;

	/**
	 * internal map of labels and WidgetRegistryItem
	 */
	private _registry: Map<RegistryLabel, WidgetRegistryItem> = new Map<RegistryLabel, WidgetRegistryItem>();

	/**
	 * Emit loaded event for registry label
	 */
	private emitLoadedEvent(widgetLabel: RegistryLabel): void {
		this.emit({
			type: widgetLabel,
			action: 'loaded'
		});
	}

	public has(widgetLabel: RegistryLabel): boolean {
		return this._registry.has(widgetLabel);
	}

	public define(widgetLabel: RegistryLabel, item: WidgetRegistryItem): void {
		if (this._registry.has(widgetLabel)) {
			throw new Error(`widget has already been registered for '${widgetLabel.toString()}'`);
		}

		this._registry.set(widgetLabel, item);

		if (isThenable(item)) {
			item.then((widgetCtor) => {
				this._registry.set(widgetLabel, widgetCtor);
				this.emitLoadedEvent(widgetLabel);
				return widgetCtor;
			}, (error) => {
				throw error;
			});
		}
		else {
			this.emitLoadedEvent(widgetLabel);
		}
	}

	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(widgetLabel: RegistryLabel): Constructor<T> | null;
	public get(widgetLabel: RegistryLabel): ContextInterface | Constructor<WidgetBaseInterface> | null;
	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(widgetLabel: RegistryLabel): ContextInterface | Constructor<T> | null {
		if (!this.has(widgetLabel)) {
			return null;
		}

		const item = this._registry.get(widgetLabel);

		if (isWidgetBaseConstructor<T>(item) || isRegistryContext(item)) {
			return item;
		}

		if (isThenable(item)) {
			return null;
		}

		const promise = (<RegistryItemFunction> item)();
		this._registry.set(widgetLabel, promise);

		promise.then((widgetCtor) => {
			this._registry.set(widgetLabel, widgetCtor);
			this.emitLoadedEvent(widgetLabel);
			return widgetCtor;
		}, (error) => {
			throw error;
		});

		return null;
	}
}

export default WidgetRegistry;
