import { assign } from '@dojo/core/lang';
import Symbol from '@dojo/shim/Symbol';
import { h } from 'snabbdom/h';
import { VNode, VNodeData } from 'snabbdom/VNode';
import {
	Constructor,
	DefaultWidgetBaseInterface,
	DNode,
	HNode,
	LegacyVirtualDomProperties,
	RegistryLabel,
	VDomProperties,
	VirtualDomProperties,
	WidgetBaseInterface,
	WNode
} from './interfaces';
import { WidgetRegistry } from './WidgetRegistry';

/**
 * The symbol identifier for a WNode type
 */
export const WNODE = Symbol('Identifier for a WNode.');

/**
 * The symbol identifier for a HNode type
 */
export const HNODE = Symbol('Identifier for a HNode.');

/**
 * Helper function that returns true if the `DNode` is a `WNode` using the `type` property
 */
export function isWNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface>(child: DNode<W>): child is WNode<W> {
	return Boolean(child && (typeof child !== 'string') && child.type === WNODE);
}

/**
 * Helper function that returns true if the `DNode` is a `HNode` using the `type` property
 */
export function isHNode(child: DNode): child is HNode {
	return Boolean(child && (typeof child !== 'string') && child.type === HNODE);
}

export function isVirtualDomProperties(node: any): node is VDomProperties {
	return Boolean(node.props || node.class || node.hooks || node.style || node.on);
}

/**
 * Generic decorate function for DNodes. The nodes are modified in place based on the provided predicate
 * and modifier functions.
 *
 * The children of each node are flattened and added to the array for decoration.
 *
 * If no predicate is supplied then the modifier will be executed on all nodes.
 */
export function decorate(dNodes: DNode, modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode;
export function decorate(dNodes: DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode[];
export function decorate(dNodes: DNode | DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode | DNode[];
export function decorate(dNodes: DNode | DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode | DNode[] {
	let nodes = Array.isArray(dNodes) ? [ ...dNodes ] : [ dNodes ];
	while (nodes.length) {
		const node = nodes.pop();
		if (node) {
			if (!predicate || predicate(node)) {
				modifier(node);
			}
			if ((isWNode(node) || isHNode(node)) && node.children) {
				nodes = [ ...nodes, ...node.children ];
			}
		}
	}
	return dNodes;
}

/**
 * Global widget registry instance
 */
export const registry = new WidgetRegistry();

/**
 * Wrapper function for calls to create a widget.
 */
export function w<W extends WidgetBaseInterface>(widgetConstructor: Constructor<W> | RegistryLabel, properties: W['properties'], children: W['children'] = []): WNode<W> {

	return {
		children,
		widgetConstructor,
		properties,
		type: WNODE
	};
}

function mapLegacyProperties(properties: LegacyVirtualDomProperties): VDomProperties {
	let { classes, styles, key, ...props } = properties;
	const mappedProperties: VDomProperties = { };
	if (classes) {
		if (typeof classes === 'function') {
			classes = classes();
		}
		mappedProperties.class = classes;
	}
	if (styles) {
		mappedProperties.style = styles;
	}
	if (key) {
		mappedProperties.key = key;
	}

	return Object.keys(props).reduce((mappedProperties, propertyName) => {
		if (propertyName.substr(0, 2) === 'on') {
			const eventName = propertyName.substr(2);
			if (!mappedProperties.on) {
				mappedProperties.on = {};
			}
			mappedProperties.on[eventName] = props[propertyName];
		}
		else if ('afterCreate' === propertyName || 'afterUpdate' === propertyName) {
			console.warn(`Unable to map ${propertyName} property to the current hooks, please manually upgrade.`);
		}
		else {
			if (!mappedProperties.props) {
				mappedProperties.props = {};
			}
			mappedProperties.props[propertyName] = props[propertyName];
		}
		return mappedProperties;
	}, mappedProperties);
}

/**
 * Wrapper function for calls to create hyperscript, lazily executes the hyperscript creation
 */
export function v(tag: string, properties: VirtualDomProperties, children?: DNode[]): HNode;
export function v(tag: string, children: DNode[]): HNode;
export function v(tag: string): HNode;
export function v(tag: string, propertiesOrChildren: VirtualDomProperties | DNode[] = {}, children: DNode[] = []): HNode {
	let properties: VirtualDomProperties;
	let finalProperties: VDomProperties;

	if (Array.isArray(propertiesOrChildren)) {
		children = propertiesOrChildren;
		properties = {};
	}
	else {
		properties = propertiesOrChildren;
	}

	if (isVirtualDomProperties(properties)) {
		let { class: classes } = properties;
		if (typeof classes === 'function') {
			classes = classes();
			finalProperties = assign(properties, { class: classes });
		}
		else {
			finalProperties = properties;
		}
	}
	else {
		finalProperties = mapLegacyProperties(properties);
	}

	return {
		tag,
		children,
		properties: finalProperties,
		render(this: { vNodes: Array<VNode | null | undefined>, properties: VNodeData }) {
			return h(tag, this.properties, this.vNodes);
		},
		type: HNODE
	};
}
