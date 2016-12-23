import { assign } from 'dojo-core/lang';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { h } from 'maquette';
import WidgetBase, {
	DNode,
	HNode,
	WNode,
	WidgetBaseConstructor,
	WidgetOptions,
	WidgetState,
	WidgetProperties
} from './WidgetBase';
import FactoryRegistry from './WidgetRegistry';

export const registry = new FactoryRegistry<any, any>();

export function w<P extends WidgetProperties, S extends WidgetState, W extends WidgetBase<S, P>, O extends WidgetOptions<S, P>>(
	factory: WidgetBaseConstructor<S, P> | string,
	options: O
): WNode<any, any>;
export function w<P extends WidgetProperties, S extends WidgetState, W extends WidgetBase<S, P>, O extends WidgetOptions<S, P>>(
	factory: WidgetBaseConstructor<S, P> | string,
	options: O,
	children?: DNode<any, any>[]
): WNode<any, any>;
export function w<P extends WidgetProperties, S extends WidgetState, W extends WidgetBase<S, P>, O extends WidgetOptions<S, P>>(
	factory: WidgetBaseConstructor<S, P> | string,
	options: O,
	children: DNode<any, any>[] = []
): WNode<any, any> {

	return {
		children,
		factory,
		options
	};
}

export function v(tag: string, properties: VNodeProperties, children?: DNode<any, any>[]): HNode<any, any>;
export function v(tag: string, children: DNode<any, any>[]): HNode<any, any>;
export function v(tag: string): HNode<any, any>;
export function v(tag: string, propertiesOrChildren: VNodeProperties = {}, children: DNode<any, any>[] = []): HNode<any, any> {

		if (Array.isArray(propertiesOrChildren)) {
			children = propertiesOrChildren;
			propertiesOrChildren = {};
		}

		return {
			children,
			render<T>(this: { children: VNode[] }, options: { bind?: T } = { }) {
				return h(tag, assign(options, propertiesOrChildren), this.children);
			}
		};
}
