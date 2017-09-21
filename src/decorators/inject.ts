import { handleDecorator, WidgetBase } from './../WidgetBase';
import { beforeProperties } from './beforeProperties';
import { onInitialized } from './onInitialized';
import { RegistryLabel } from './../interfaces';

/**
 * Defines the contract requires for the get properties function
 * used to map the injected properties.
 */
export interface GetProperties<T = any> {
	(payload: any, properties: T): T;
}

/**
 * Defines the inject configuration required for use of the `inject` decorator
 */
export interface InjectConfig {

	/**
	 * The label of the registry injector
	 */
	name: RegistryLabel;

	/**
	 * Function that returns propertues to inject using the passed properties
	 * and the injected payload.
	 */
	getProperties: GetProperties;
}

/**
 * Decorator retrieves an injector from an available registry using the name and
 * calls the `getProperties` function with the payload from the injector
 * and current properties with the the injected properties returned.
 *
 * @param InjectConfig the inject configuration
 */
export function inject({ name, getProperties }: InjectConfig) {
	return handleDecorator((target, propertyKey) => {
		onInitialized(function(this: WidgetBase) {
			const injector = this.registry.getInjector(name);
			if (injector) {
				injector.on('invalidate', () => {
					this.emit({ type: 'invalidated', target: this });
				});
			}
		})(target);
		beforeProperties(function(this: WidgetBase, properties: any) {
			const injector = this.registry.getInjector(name);
			if (injector) {
				return getProperties(injector.get(), properties);
			}
		})(target);
	});
}
