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
): WNode<S, P>;
export function w<P extends WidgetProperties, S extends WidgetState, W extends WidgetBase<S, P>, O extends WidgetOptions<S, P>>(
	factory: WidgetBaseConstructor<S, P> | string,
	options: O,
	children?: DNode<S, P>[]
): WNode<S, P>;
export function w<P extends WidgetProperties, S extends WidgetState, W extends WidgetBase<S, P>, O extends WidgetOptions<S, P>>(
	factory: WidgetBaseConstructor<S, P> | string,
	options: O,
	children: DNode<S, P>[] = []
): WNode<S, P> {

	return {
		children,
		factory,
		options
	};
}

export function v<S extends WidgetState, P extends WidgetProperties>(tag: string, properties: VNodeProperties, children?: DNode<S, P>[]): HNode<S, P>;
export function v<S extends WidgetState, P extends WidgetProperties>(tag: string, children: DNode<S, P>[]): HNode<S, P>;
export function v<S extends WidgetState, P extends WidgetProperties>(tag: string): HNode<S, P>;
export function v<S extends WidgetState, P extends WidgetProperties>(tag: string, propertiesOrChildren: VNodeProperties = {}, children: DNode<S, P>[] = []): HNode<S, P> {

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
