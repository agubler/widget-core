import { WidgetBase, beforeRender } from './../WidgetBase';
import { w } from './../d';
import { Constructor, DNode, WidgetProperties } from './../interfaces';
import { GetProperties, GetChildren, InjectorProperties } from './../Injector';

/**
 * The binding mappers for properties and children
 */
export interface Mappers {
	getProperties: GetProperties;
	getChildren: GetChildren;
}

/**
 * Default noop Mappers for the container.
 */
const defautMappers: Mappers = {
	getProperties<C, P>(inject: C, properties: P): P {
		return <P> {};
	},
	getChildren<C>(inject: C, children: DNode[]): DNode[] {
		return [];
	}
};

/**
 * Given the registered name of an Injector entry with property and child binding mappers, the
 * container proxies the provided Widget and modifying the properties and children with the
 * instructions provided by the mappers using the context provideded by the registered Injector.
 */
export function Container<P extends WidgetProperties, T extends Constructor<WidgetBase<P>>>(
	Base: T,
	name: string,
	{ getProperties = defautMappers.getProperties, getChildren = defautMappers.getChildren }: any = defautMappers
): T {

	class Container extends Base {
		@beforeRender()
		protected beforeRender(renderFunc: Function, properties: P, children: DNode[]) {
			return () => {
				return w<InjectorProperties>(name, {
					render: super.render,
					getProperties,
					properties,
					getChildren,
					children
				});
			};
		}
	}
	return Container;
}

export default Container;
