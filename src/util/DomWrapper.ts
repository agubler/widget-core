import { WidgetBase } from './../WidgetBase';
import { Constructor, DNode, VirtualDomProperties, VNode, WidgetProperties } from './../interfaces';
import { v } from './../d';

export interface DomWrapperOptions {
	onAttached?(): void;
}

export type DomWrapperProperties = VirtualDomProperties & WidgetProperties;

export type DomWrapper = Constructor<WidgetBase<DomWrapperProperties>>;

export function DomWrapper(domNode: Element, options: DomWrapperOptions = {}): DomWrapper {
	return class extends WidgetBase<DomWrapperProperties> {

		public __render__(): VNode {
			const vNode = super.__render__() as VNode;
			vNode.elm = domNode;
			return vNode;
		}

		protected onElementCreated(element: Element, key: string) {
			options.onAttached && options.onAttached();
		}

		protected render(): DNode {
			const properties = { ...this.properties, key: 'root' };
			return v(domNode.tagName, properties);
		}
	};
}

export default DomWrapper;
