import Promise from 'dojo-shim/Promise';
import Map from 'dojo-shim/Map';
import { WidgetBaseConstructor, WidgetState, WidgetProperties } from './WidgetBase';

export type WidgetFactoryFunction<S extends WidgetState, P extends WidgetProperties> = () => Promise<WidgetBaseConstructor<S, P>>

export type FactoryRegistryItem<S extends WidgetState, P extends WidgetProperties> = WidgetBaseConstructor<S, P> | Promise<WidgetBaseConstructor<S, P>> | WidgetFactoryFunction<S, P>

export interface FactoryRegistryInterface<S, P> {

	define(factoryLabel: string, registryItem: FactoryRegistryItem<S, P>): void;

	get(factoryLabel: string): WidgetBaseConstructor<WidgetState, WidgetProperties> | Promise<WidgetBaseConstructor<WidgetState, WidgetProperties>> | null;

	has(factoryLabel: string): boolean;
}

export default class FactoryRegistry<S extends WidgetState, P extends WidgetProperties> implements FactoryRegistryInterface<S, P> {
	protected registry: Map<string, FactoryRegistryItem<S, P>>;

	constructor() {
		this.registry = new Map<string, FactoryRegistryItem<S, P>>();
	}

	has(factoryLabel: string): boolean {
		return this.registry.has(factoryLabel);
	}

	define(factoryLabel: string, registryItem: FactoryRegistryItem<S, P>): void {
		if (this.registry.has(factoryLabel)) {
			throw new Error(`factory has already been registered for '${factoryLabel}'`);
		}
		this.registry.set(factoryLabel, registryItem);
	}

	get(factoryLabel: string): WidgetBaseConstructor<S, P> | Promise<WidgetBaseConstructor<S, P>> | null {
		if (!this.has(factoryLabel)) {
			return null;
		}

		const item = this.registry.get(factoryLabel);

		if (item instanceof Promise) { // TODO and actually constructor
			return item;
		}

		const promise = (<WidgetFactoryFunction<S, P>> item)();
		this.registry.set(factoryLabel, promise);

		return promise.then((factory) => {
			this.registry.set(factoryLabel, factory);
			return factory;
		}, (error) => {
			throw error;
		});
	}
}
