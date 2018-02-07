import Symbol from '@dojo/shim/Symbol';
import {
	Constructor,
	DefaultWidgetBaseInterface,
	DeferredVirtualProperties,
	DNode,
	VNode,
	RegistryLabel,
	VNodeProperties,
	WidgetBaseInterface,
	WNode
} from './interfaces';
import { RenderResult } from './vdom';

/**
 * The symbol identifier for a WNode type
 */
export const WNODE = Symbol('Identifier for a WNode.');

/**
 * The symbol identifier for a VNode type
 */
export const VNODE = Symbol('Identifier for a VNode.');

/**
 * Helper function that returns true if the `DNode` is a `WNode` using the `type` property
 */
export function isWNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface>(
	child: DNode<W>
): child is WNode<W> {
	return Boolean(child && typeof child !== 'string' && child.type === WNODE);
}

/**
 * Helper function that returns true if the `DNode` is a `VNode` using the `type` property
 */
export function isVNode(child: DNode): child is VNode {
	return Boolean(child && typeof child !== 'string' && child.type === VNODE);
}

export interface DecorateBreak {
	(): void;
}

export interface Modifier<T extends DNode> {
	(dNode: T, breaker: DecorateBreak): void;
}

export interface Predicate<T extends DNode> {
	(dNode: DNode): dNode is T;
}

export interface DecorateOptions<T extends DNode> {
	modifier: Modifier<T>;
	predicate?: Predicate<T>;
	shallow?: boolean;
}

/**
 * Generic decorate function for DNodes. The nodes are modified in place based on the provided predicate
 * and modifier functions.
 *
 * The children of each node are flattened and added to the array for decoration.
 *
 * If no predicate is supplied then the modifier will be executed on all nodes. A `breaker` function is passed to the
 * modifier which will drain the nodes array and exit the decoration.
 *
 * When `shallow` is set to `true` the only the top node or nodes will be decorated.
 *
 * @param dNodes A DNode or array of DNodes for decoration.
 * @param options Options that provide the modifier and an optional predicate and shallow flag
 */
export function decorate<T extends DNode>(dNodes: DNode, options: DecorateOptions<T>): DNode;
export function decorate<T extends DNode>(dNodes: DNode[], options: DecorateOptions<T>): DNode[];
export function decorate<T extends DNode>(dNodes: DNode | DNode[], options: DecorateOptions<T>): DNode | DNode[];
export function decorate<T extends DNode>(dNodes: DNode, modifier: Modifier<T>, predicate: Predicate<T>): DNode;
export function decorate<T extends DNode>(dNodes: DNode[], modifier: Modifier<T>, predicate: Predicate<T>): DNode[];
export function decorate<T extends DNode>(
	dNodes: RenderResult,
	modifier: Modifier<T>,
	predicate: Predicate<T>
): RenderResult;
export function decorate(dNodes: DNode, modifier: Modifier<DNode>): DNode;
export function decorate(dNodes: DNode[], modifier: Modifier<DNode>): DNode[];
export function decorate(dNodes: RenderResult, modifier: Modifier<DNode>): RenderResult;
export function decorate(
	dNodes: DNode | DNode[],
	optionsOrModifier: Modifier<DNode> | DecorateOptions<DNode>,
	predicate?: Predicate<DNode>
): DNode | DNode[] {
	let shallow = false;
	let modifier;
	if (typeof optionsOrModifier === 'function') {
		modifier = optionsOrModifier;
	} else {
		modifier = optionsOrModifier.modifier;
		predicate = optionsOrModifier.predicate;
		shallow = optionsOrModifier.shallow || false;
	}

	let nodes = Array.isArray(dNodes) ? [...dNodes] : [dNodes];
	function breaker() {
		nodes = [];
	}
	while (nodes.length) {
		const node = nodes.shift();
		if (node) {
			if (!shallow && (isWNode(node) || isVNode(node)) && node.children) {
				nodes = [...nodes, ...node.children];
			}
			if (!predicate || predicate(node)) {
				modifier(node, breaker);
			}
		}
	}
	return dNodes;
}

/**
 * Wrapper function for calls to create a widget.
 */
export function w<W extends WidgetBaseInterface>(
	widgetConstructor: Constructor<W> | RegistryLabel,
	properties: W['properties'],
	children: W['children'] = []
): WNode<W> {
	return {
		children,
		widgetConstructor,
		properties,
		type: WNODE
	};
}

/**
 * Wrapper function for calls to create VNodes.
 */
export function v(tag: string, properties: VNodeProperties | DeferredVirtualProperties, children?: DNode[]): VNode;
export function v(tag: string, children: undefined | DNode[]): VNode;
export function v(tag: string): VNode;
export function v(
	tag: string,
	propertiesOrChildren: VNodeProperties | DeferredVirtualProperties | DNode[] = {},
	children: undefined | DNode[] = undefined
): VNode {
	let properties: VNodeProperties | DeferredVirtualProperties = propertiesOrChildren;
	let deferredPropertiesCallback;

	if (Array.isArray(propertiesOrChildren)) {
		children = propertiesOrChildren;
		properties = {};
	}

	if (typeof properties === 'function') {
		deferredPropertiesCallback = properties;
		properties = {};
	}

	return {
		tag,
		deferredPropertiesCallback,
		children,
		properties,
		type: VNODE
	};
}
