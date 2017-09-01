import { inject, WidgetBase } from './WidgetBase';
import { Constructor, DNode, GetChildren, GetProperties, RegistryLabel } from './interfaces';
import { w } from './d';
import { isWidgetBaseConstructor } from './WidgetRegistry';

export type Container<T extends WidgetBase> = Constructor<WidgetBase<Partial<T['properties']>>>;

export function Container<W extends WidgetBase> (
	component: Constructor<W> | RegistryLabel,
	name: RegistryLabel,
	{ getProperties, getChildren }: { getProperties?: GetProperties, getChildren?: GetChildren }
): Container<W> {

	if (!isWidgetBaseConstructor(component)) {
		@inject({ name, getProperties, getChildren })
		class RegistryItemContainer extends WidgetBase<Partial<W['properties']>> {
			protected render(): DNode {
				return w(component, this.properties, this.children);
			}
		}
		return RegistryItemContainer;
	}

	const Component: Constructor<WidgetBase<Partial<W['properties']>>> = component as any;
	@inject({ name, getProperties, getChildren })
	class WidgetContainer extends Component { }
	return WidgetContainer;
}

export default Container;
