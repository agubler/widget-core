import { WeakMap } from '@dojo/shim/WeakMap';
import {
	WNode,
	VNode,
	DNode,
	WidgetBaseInterface,
	VNodeProperties,
	SupportedClassName,
	WidgetBaseConstructor
} from './interfaces';
import { isVNode, isWNode, VNODE, WNODE } from './d';
import { WidgetData } from './vdom';

interface WNodeWrapper {
	node: WNode;
	domNode?: Node;
	instance?: WidgetBaseInterface;
	rendered?: DNodeWrapper[];
	nextWrapper?: DNodeWrapper;
}

interface VNodeWrapper {
	node: VNode;
	domNode?: Node;
	childrenWrappers?: DNodeWrapper[];
	nextWrapper?: DNodeWrapper;
}

type DNodeWrapper = VNodeWrapper | WNodeWrapper;

interface RenderQueueItem {
	current: (WNodeWrapper | VNodeWrapper)[];
	next: (WNodeWrapper | VNodeWrapper)[];
}

interface InvalidationQueueItem {
	current: WNodeWrapper;
	next: WNodeWrapper;
}

interface Instruction {
	current: undefined | DNodeWrapper;
	next: undefined | DNodeWrapper;
}

interface CreateWidgetInstruction {
	next: WNodeWrapper;
}

interface UpdateWidgetInstruction {
	current: WNodeWrapper;
	next: WNodeWrapper;
}

interface RemoveWidgetInstruction {
	current: WNodeWrapper;
}

interface CreateDomInstruction {
	next: VNodeWrapper;
}

interface UpdateDomInstruction {
	current: VNodeWrapper;
	next: VNodeWrapper;
}

interface RemoveDomInstruction {
	current: VNodeWrapper;
}

interface ParentNodes {
	parentDomNode: Node;
	parentWNodeWrapper?: WNodeWrapper;
}

interface TraversalMaps {
	parent: WeakMap<any, DNodeWrapper>;
	sibling: WeakMap<DNodeWrapper, DNodeWrapper>;
}

interface DomApply {
	(): void;
}

function isWNodeWrapper(child: DNodeWrapper): child is WNodeWrapper {
	return isWNode(child.node);
}

function isVNodeWrapper(child: DNodeWrapper): child is VNodeWrapper {
	return isVNode(child.node);
}

export const widgetInstanceMap = new WeakMap<any, WidgetData>();

function same(dnode1: DNode, dnode2: DNode): boolean {
	if (isVNode(dnode1) && isVNode(dnode2)) {
		if (dnode1.tag !== dnode2.tag) {
			return false;
		}
		if (dnode1.properties.key !== dnode2.properties.key) {
			return false;
		}
		return true;
	} else if (isWNode(dnode1) && isWNode(dnode2)) {
		if (typeof dnode2.widgetConstructor === 'string') {
			return false;
		}
		if (dnode1.widgetConstructor !== dnode2.widgetConstructor) {
			return false;
		}
		if (dnode1.properties.key !== dnode2.properties.key) {
			return false;
		}
		return true;
	}
	return false;
}

function findIndexOfChild(children: DNodeWrapper[], sameAs: DNode, start: number) {
	for (let i = start; i < children.length; i++) {
		if (same(children[i].node, sameAs)) {
			return i;
		}
	}
	return -1;
}

function toTextVNode(data: any): VNode {
	return {
		tag: '',
		properties: {},
		children: undefined,
		text: `${data}`,
		type: VNODE
	};
}

function addClasses(domNode: Element, classes: SupportedClassName) {
	if (classes) {
		const classNames = classes.split(' ');
		for (let i = 0; i < classNames.length; i++) {
			domNode.classList.add(classNames[i]);
		}
	}
}

function removeClasses(domNode: Element, classes: SupportedClassName) {
	if (classes) {
		const classNames = classes.split(' ');
		for (let i = 0; i < classNames.length; i++) {
			domNode.classList.remove(classNames[i]);
		}
	}
}

export class Renderer {
	private _renderer: () => WNode;
	private _rootNode: HTMLElement = document.body;
	private _invalidationQueue: InvalidationQueueItem[] = [];
	private _renderQueue: RenderQueueItem[] = [];
	private _applicationQueue: DomApply[] = [];
	private _dnodeToParentWrapperMap = new WeakMap<any, DNodeWrapper>();
	private _instanceToWrapperMap = new WeakMap<WidgetBaseInterface, WNodeWrapper>();
	private _domNodeToWrapperMap = new WeakMap<Node, VNodeWrapper>();
	private _wrapperSiblingMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	private _renderScheduled = false;

	constructor(renderer: () => WNode) {
		this._renderer = renderer;
	}

	public append(node?: HTMLElement): void {
		if (node) {
			this._rootNode = node;
		}
		const renderResult = this._renderer();
		this._queueInRender([], [{ node: renderResult }]);
		this._runRenderQueue();
	}

	private _schedule(): void {
		if (!this._renderScheduled) {
			this._runInvalidationQueue();
		}
	}

	private _runInvalidationQueue(): void {
		const invalidationQueue = [...this._invalidationQueue];
		this._invalidationQueue = [];
		while (invalidationQueue.length) {
			const item = invalidationQueue.pop()!;
			this._updateWidget(item, this._getTraversalMaps());
			this._runRenderQueue();
		}
	}

	private _runRenderQueue(): void {
		while (this._renderQueue.length) {
			const { current, next } = this._renderQueue.pop()!;
			this._process(current, next);
		}
		this._applicationQueue.reverse();
		while (this._applicationQueue.length) {
			const apply = this._applicationQueue.pop()!;
			apply();
		}
	}

	private _queueInRender(current: DNodeWrapper[], next: DNodeWrapper[]): void {
		this._renderQueue.push({ current, next });
	}

	private _queueApplication(apply: DomApply): void {
		this._applicationQueue.push(apply);
	}

	private _queue(instance: WidgetBaseInterface): void {
		const next = {
			node: {
				type: WNODE,
				widgetConstructor: instance.constructor as WidgetBaseConstructor,
				properties: instance.properties,
				children: instance.children
			},
			instance
		};
		const current = this._instanceToWrapperMap.get(instance)!;
		this._invalidationQueue.push({ current, next });
	}

	private _renderedToWrapper(rendered: DNode[], parent: DNodeWrapper, traversalMaps: TraversalMaps): DNodeWrapper[] {
		const wrappedRendered: DNodeWrapper[] = [];
		let previousItem: DNodeWrapper | undefined;
		for (let i = 0; i < rendered.length; i++) {
			let renderedItem = rendered[i];
			if (renderedItem === null || renderedItem === undefined) {
				continue;
			}
			if (typeof renderedItem === 'string') {
				renderedItem = toTextVNode(renderedItem);
			}
			traversalMaps.parent.set(renderedItem, parent);
			const wrapper = { node: renderedItem } as DNodeWrapper;
			if (previousItem) {
				traversalMaps.sibling.set(previousItem, wrapper);
			}
			wrappedRendered.push(wrapper);
			previousItem = wrapper;
		}
		return wrappedRendered;
	}

	private _process(current: DNodeWrapper[], next: DNodeWrapper[]): void {
		const instructions: Instruction[] = [];
		const foundIndexes: number[] = [];
		for (let i = 0; i < next.length; i++) {
			const nextWrapper = next[i];
			const oldIndex = findIndexOfChild(current, nextWrapper.node, i);
			if (oldIndex === -1) {
				instructions.push({ current: undefined, next: nextWrapper });
			} else if (oldIndex === i) {
				foundIndexes.push(oldIndex);
				instructions.push({ current: current[oldIndex], next: nextWrapper });
			} else {
				foundIndexes.push(oldIndex);
				instructions.push({ current: current[oldIndex], next: undefined });
				instructions.push({ current: undefined, next: nextWrapper });
			}
		}

		for (let i = 0; i < current.length; i++) {
			if (foundIndexes.indexOf(i) === -1) {
				instructions.push({ current: current[i], next: undefined });
			}
		}

		for (let i = 0; i < instructions.length; i++) {
			this._processOne(instructions[i]);
		}
	}

	private _getTraversalMaps(): TraversalMaps {
		return {
			parent: this._dnodeToParentWrapperMap,
			sibling: this._wrapperSiblingMap
		};
	}

	private _processOne(instruction: Instruction): void {
		let { current, next } = instruction;
		if (!current && next) {
			if (isVNodeWrapper(next)) {
				next = this._createDom({ next }, this._getTraversalMaps());
				this._domNodeToWrapperMap.set(next.domNode!, next);
				const { parentDomNode, parentWNodeWrapper } = this._findParentNodes(
					next.node,
					this._getTraversalMaps()
				);
				if (parentWNodeWrapper) {
					if (parentWNodeWrapper && !parentWNodeWrapper.domNode) {
						parentWNodeWrapper.domNode = next.domNode;
					}
				}
				if (next.childrenWrappers) {
					this._queueInRender([], next.childrenWrappers);
				}
				this._queueApplication(() => {
					this._setProperties(next!.domNode as HTMLElement, {}, next!.node.properties);
					parentDomNode.insertBefore(
						next!.domNode as Node,
						this._findInsertBefore(next!, this._getTraversalMaps())
					);
				});
			} else {
				next = this._createWidget({ next }, this._getTraversalMaps());
				this._instanceToWrapperMap.set(next.instance!, next);
			}
		} else if (current && next) {
			if (isVNodeWrapper(current) && isVNodeWrapper(next)) {
				current = this._domNodeToWrapperMap.get(current.domNode!)!;
				this._updateDom({ current, next }, this._getTraversalMaps());
				this._domNodeToWrapperMap.set(next.domNode!, next);
				if (next.childrenWrappers) {
					this._queueInRender(current.childrenWrappers || [], next.childrenWrappers);
				}
			} else if (isWNodeWrapper(current) && isWNodeWrapper(next)) {
				current = this._instanceToWrapperMap.get(current.instance!)!;
				next = this._updateWidget({ current, next }, this._getTraversalMaps());
				this._instanceToWrapperMap.set(next.instance!, next);
			}
		} else if (current && !next) {
			if (isVNodeWrapper(current)) {
				this._removeDom({ current }, this._getTraversalMaps());
			} else if (isWNodeWrapper(current)) {
				this._removeWidget({ current }, this._getTraversalMaps());
			}
		}
	}

	private _findParentNodes(currentNode: VNode | WNode, { parent }: TraversalMaps): ParentNodes {
		let parentDomNode: Node | undefined;
		let parentWNodeWrapper: WNodeWrapper | undefined;
		while (!parentDomNode || !parentWNodeWrapper) {
			const parentWrapper: DNodeWrapper = parent.get(currentNode)!;
			if (!parentDomNode && !parentWrapper) {
				parentDomNode = this._rootNode;
				break;
			}
			if (!parentDomNode && isVNodeWrapper(parentWrapper) && parentWrapper.domNode) {
				parentDomNode = parentWrapper.domNode;
			} else if (!parentWNodeWrapper && isWNodeWrapper(parentWrapper)) {
				parentWNodeWrapper = parentWrapper;
			}
			currentNode = parentWrapper.node;
		}
		return { parentDomNode, parentWNodeWrapper };
	}

	private _createWidget({ next }: CreateWidgetInstruction, traversalMaps: TraversalMaps): WNodeWrapper {
		if (typeof next.node.widgetConstructor === 'string' || typeof next.node.widgetConstructor === 'symbol') {
			throw new Error('Do not support registry items');
		}
		const instance = new next.node.widgetConstructor();
		const instanceData = widgetInstanceMap.get(instance)!;
		instance.__setInvalidate__(() => {
			instanceData.dirty = true;
			if (!instanceData.rendering) {
				this._queue(instance);
				this._schedule();
			}
		});
		instanceData.rendering = true;
		instance.__setProperties__(next.node.properties);
		instance.__setChildren__(next.node.children);
		next.instance = instance;
		let rendered = instance.__render__();
		instanceData.rendering = false;
		rendered = Array.isArray(rendered) ? rendered : [rendered];

		if (rendered) {
			next.rendered = this._renderedToWrapper(rendered, next, traversalMaps);
			this._queueInRender([], next.rendered);
		}

		return next;
	}

	private _updateWidget({ current, next }: UpdateWidgetInstruction, traversalMaps: TraversalMaps): WNodeWrapper {
		next.instance = current.instance;
		const instanceData = widgetInstanceMap.get(next.instance!)!;
		instanceData.rendering = true;
		next.instance!.__setProperties__(next.node.properties);
		next.instance!.__setChildren__(next.node.children);
		next.domNode = current.domNode;

		if (instanceData.dirty) {
			let rendered = next.instance!.__render__();
			instanceData.rendering = false;
			rendered = Array.isArray(rendered) ? rendered : [rendered];

			if (rendered) {
				next.rendered = this._renderedToWrapper(rendered, next, traversalMaps);
				this._queueInRender(current.rendered || [], next.rendered);
			} else {
				next.rendered = current.rendered;
			}
		} else {
			next.rendered = current.rendered;
			instanceData.rendering = false;
		}
		return next;
	}

	private _removeWidget({ current }: RemoveWidgetInstruction, traversalMaps: TraversalMaps): WNodeWrapper {
		// this._instanceToWrapperMap.delete(current.instance!);
		// this._wrapperSiblingMap.delete(current);
		// this._dnodeToParentWrapperMap.delete(current.node);
		this._queueInRender(current.rendered || [], []);
		return current;
	}

	private _findInsertBefore(next: DNodeWrapper, { sibling, parent }: TraversalMaps): Node | null {
		let insertBefore: Node | null = null;
		while (!insertBefore) {
			const nextSibling = sibling.get(next);
			if (nextSibling) {
				if (isVNodeWrapper(nextSibling)) {
					if (nextSibling.domNode && nextSibling.domNode.parentNode) {
						insertBefore = nextSibling.domNode;
					} else {
						break;
					}
				} else if (isWNodeWrapper(nextSibling)) {
					if (nextSibling.domNode && nextSibling.domNode.parentNode) {
						insertBefore = nextSibling.domNode;
					}
					break;
				}
			} else {
				next = parent.get(next.node)!;
				if (!next || isVNodeWrapper(next)) {
					break;
				}
			}
		}
		return insertBefore;
	}

	private _createDom({ next }: CreateDomInstruction, traversalMaps: TraversalMaps): VNodeWrapper {
		let domNode: Node | undefined;
		if (next.node.tag) {
			domNode = document.createElement(next.node.tag);
		} else if (next.node.text) {
			domNode = document.createTextNode(next.node.text);
		}
		if (domNode) {
			next.domNode = domNode;
			if (next.node.children) {
				const children = this._renderedToWrapper(next.node.children, next, traversalMaps);
				next.childrenWrappers = children;
			}
		}
		return next;
	}

	private _updateDom({ current, next }: UpdateDomInstruction, traversalMaps: TraversalMaps): VNodeWrapper {
		const { parentDomNode } = this._findParentNodes(current.node, traversalMaps);
		let domNode = current.domNode!;
		next.domNode = domNode;
		if (next.node.text && next.node.text !== current.node.text) {
			const newDomNode = parentDomNode.ownerDocument.createTextNode(next.node.text!);
			parentDomNode.replaceChild(newDomNode, domNode);
			next.domNode = newDomNode;
		} else {
			if (next.node.children) {
				const children = this._renderedToWrapper(next.node.children, next, traversalMaps);
				next.childrenWrappers = children;
			}
			this._setProperties(domNode as HTMLElement, current.node.properties, next.node.properties);
		}
		return next;
	}

	private _removeDom({ current }: RemoveDomInstruction, { parent, sibling }: TraversalMaps): void {
		sibling.delete(current);
		parent.delete(current.node);
		this._queueApplication(() => {
			current.domNode!.parentNode!.removeChild(current.domNode!);
		});
	}

	private _setProperties(
		domNode: HTMLElement,
		currentProperties: VNodeProperties,
		nextProperties: VNodeProperties
	): void {
		const propNames = Object.keys(nextProperties);
		const propCount = propNames.length;
		if (propNames.indexOf('classes') === -1 && currentProperties.classes) {
			if (Array.isArray(currentProperties.classes)) {
				for (let i = 0; i < currentProperties.classes.length; i++) {
					removeClasses(domNode, currentProperties.classes[i]);
				}
			} else {
				removeClasses(domNode, currentProperties.classes);
			}
		}

		for (let i = 0; i < propCount; i++) {
			const propName = propNames[i];
			let propValue = nextProperties[propName];
			const previousValue = currentProperties[propName];
			if (propName === 'classes') {
				const previousClasses = Array.isArray(previousValue) ? previousValue : [previousValue];
				const currentClasses = Array.isArray(propValue) ? propValue : [propValue];
				if (previousClasses && previousClasses.length > 0) {
					if (!propValue || propValue.length === 0) {
						for (let i = 0; i < previousClasses.length; i++) {
							removeClasses(domNode, previousClasses[i]);
						}
					} else {
						const newClasses: (null | undefined | string)[] = [...currentClasses];
						for (let i = 0; i < previousClasses.length; i++) {
							const previousClassName = previousClasses[i];
							if (previousClassName) {
								const classIndex = newClasses.indexOf(previousClassName);
								if (classIndex === -1) {
									removeClasses(domNode, previousClassName);
								} else {
									newClasses.splice(classIndex, 1);
								}
							}
						}
						for (let i = 0; i < newClasses.length; i++) {
							addClasses(domNode, newClasses[i]);
						}
					}
				} else {
					for (let i = 0; i < currentClasses.length; i++) {
						addClasses(domNode, currentClasses[i]);
					}
				}
			} else if (propName === 'styles') {
				const styleNames = Object.keys(propValue);
				const styleCount = styleNames.length;
				for (let j = 0; j < styleCount; j++) {
					const styleName = styleNames[j];
					const newStyleValue = propValue[styleName];
					const oldStyleValue = previousValue && previousValue[styleName];
					if (newStyleValue === oldStyleValue) {
						continue;
					}
					if (newStyleValue) {
						(domNode.style as any)[styleName] = newStyleValue || '';
					}
				}
			} else {
				if (!propValue && typeof previousValue === 'string') {
					propValue = '';
				}
				if (propName === 'value') {
					const domValue = (domNode as any)[propName];
					if (
						domValue !== propValue &&
						((domNode as any)['oninput-value']
							? domValue === (domNode as any)['oninput-value']
							: propValue !== previousValue)
					) {
						(domNode as any)[propName] = propValue;
						(domNode as any)['oninput-value'] = undefined;
					}
				} else if (propName !== 'key' && propValue !== previousValue) {
					const type = typeof propValue;
					if (type === 'string' && propName !== 'innerHTML') {
						domNode.setAttribute(propName, propValue);
					} else if (propName === 'scrollLeft' || propName === 'scrollTop') {
						if ((domNode as any)[propName] !== propValue) {
							(domNode as any)[propName] = propValue;
						}
					} else {
						(domNode as any)[propName] = propValue;
					}
				}
			}
		}
	}
}

export function renderer(render: () => WNode): Renderer {
	const r = new Renderer(render);
	return r;
}
