import WeakMap from '@dojo/shim/WeakMap';
import { handleDecorator, WidgetBase } from './../WidgetBase';
import { isRegistryContext } from './../WidgetRegistry';
import { InjectConfig } from './../interfaces';
import { afterSetProperties } from './afterSetProperties';
import { diffProperties } from './../diff';

const registeredInjectorsMap: WeakMap<WidgetBase, any[]> = new WeakMap();

export function inject({ name, getChildren, getProperties }: InjectConfig) {
	return handleDecorator((target, propertyKey) => {
		if (getProperties) {
			afterSetProperties(function(this: WidgetBase, previousProperties: any, newProperties: any, options?: any) {
				const context = this.getRegistries().get(name);
				if (isRegistryContext(context)) {
					const registeredInjectors = registeredInjectorsMap.get(this) || [];
					if (registeredInjectors.length === 0) {
						registeredInjectorsMap.set(this, []);
					}
					if (registeredInjectors.indexOf(context) === -1) {
						context.on('invalidate', () => {
							this.emit({ type: 'invalidated', target: this });
						});
						registeredInjectors.push(context);
					}
					return diffProperties(previousProperties, getProperties(context.get(), newProperties), options);
				}
				return { changedPropertyKeys: [] };
			})(target);
		}
	});
}
