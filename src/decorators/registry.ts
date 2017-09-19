import WeakMap from '@dojo/shim/WeakMap';
import { RegistryLabel, Render } from './../interfaces';
import { RegistryItem } from './../Registry';
import { handleDecorator, beforeRender, WidgetBase } from './../WidgetBase';

const instanceMap: WeakMap<WidgetBase, RegistryLabel[]> = new WeakMap();

/**
 * The shape of the decorator configuration.
 */
export interface DefineDecoratorConfig {
	label: RegistryLabel;
	item: RegistryItem;
}

/**
 * Decorator function to registry items that will be defined against
 * the default registry of a widget.
 *
 * @param label The label of the registry item
 * @param item The registry item to define
 */
export function define(label: RegistryLabel, item: RegistryItem) {
	return handleDecorator((target, propertyKey) => {
		beforeRender(function(this: WidgetBase, render: Render) {
			const registeredItems = instanceMap.get(this) || [];
			if (registeredItems.indexOf(label) === -1) {
				this.registry.define(label, item);
				instanceMap.set(this, [ ...registeredItems, label ]);
			}
			return render;
		})(target);
	});

}

export default define;
