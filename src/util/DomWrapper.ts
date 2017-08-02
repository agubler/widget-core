import { WidgetBase } from './../WidgetBase';
import { Constructor, DNode, VirtualDomProperties, WidgetProperties } from './../interfaces';
import { v } from './../d';

export interface DomWrapperOptions {
	onAttached?(): void;
}

export type DomWrapperProperties = VirtualDomProperties & WidgetProperties;

export type DomWrapper = Constructor<WidgetBase<DomWrapperProperties>>;

export function DomWrapper(domNode: Element, options: DomWrapperOptions = {}): DomWrapper {
	return class extends WidgetBase<DomWrapperProperties> {

		protected onElementCreated(element: Element, key: string) {
			element.appendChild(domNode);
			if (key === 'root') {
				options.onAttached && options.onAttached();
			}
		}

		protected render(): DNode {
			const properties = { ...this.properties, key: 'root' };
			return v('div', properties);
		}
	};
}

export default DomWrapper;
