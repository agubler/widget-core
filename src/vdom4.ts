import global from '@dojo/shim/global';
import { WeakMap } from '@dojo/shim/WeakMap';
import {
	WNode,
	VNode,
	DNode,
	VNodeProperties,
	SupportedClassName,
	WidgetBaseConstructor,
	DefaultWidgetBaseInterface,
	Constructor
} from './interfaces';
import { isVNode, isWNode, WNODE, v } from './d';
import { Registry, isWidgetBaseConstructor } from './Registry';
import { WidgetBase } from './WidgetBase';
import NodeHandler from './NodeHandler';

export interface WidgetData {
	onDetach: () => void;
	onAttach: () => void;
	dirty: boolean;
	nodeHandler: NodeHandler;
	invalidate?: Function;
	rendering: boolean;
	inputProperties: any;
}

export interface BaseNodeWrapper {
	node: WNode | VNode;
	domNode?: Node;
	childrenWrappers?: DNodeWrapper[];
	depth: number;
	findInsertBefore?: boolean;
	hasPreviousSiblings?: boolean;
	hasParentWNode?: boolean;
	nextWrapper?: DNodeWrapper;
}

export interface WNodeWrapper extends BaseNodeWrapper {
	node: WNode;
	instance?: WidgetBase;
}

export interface VNodeWrapper extends BaseNodeWrapper {
	node: VNode;
	domNode?: Node;
}

export type DNodeWrapper = VNodeWrapper | WNodeWrapper;

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
	parentDomNode?: Node;
	parentWNodeWrapper?: WNodeWrapper;
}

interface TraversalMaps {
	parent: WeakMap<any, DNodeWrapper>;
	sibling: WeakMap<DNodeWrapper, DNodeWrapper>;
}

export interface CreateDomApplication {
	type: 'create';
	current?: VNodeWrapper;
	next: VNodeWrapper;
	insertBefore: Node | null;
	parentWNodeWrapper?: WNodeWrapper;
	parentDomNode: Node;
}

export interface DeleteDomApplication {
	type: 'delete';
	current: VNodeWrapper;
}

export type DomApplicatorInstruction = CreateDomApplication | DeleteDomApplication;

export const widgetInstanceMap = new WeakMap<any, WidgetData>();
const nodeOperations = ['focus', 'blur', 'scrollIntoView', 'click'];

function isWNodeWrapper(child: DNodeWrapper): child is WNodeWrapper {
	return child && isWNode(child.node);
}

function isVNodeWrapper(child?: DNodeWrapper | null): child is VNodeWrapper {
	return !!child && isVNode(child.node);
}

function isDomApplicatorInstruction(value: any): value is DomApplicatorInstruction {
	return (value && value.type === 'create') || value.type === 'update' || value.type === 'delete';
}

function nodeOperation(
	propName: string,
	propValue: (() => boolean) | boolean,
	previousValue: boolean,
	domNode: HTMLElement & { [index: string]: any }
): void {
	let result;
	if (typeof propValue === 'function') {
		result = propValue();
	} else {
		result = propValue && !previousValue;
	}
	if (result === true) {
		domNode[propName]();
	}
}

function updateEvent(
	domNode: Node,
	eventName: string,
	currentValue: Function,
	eventMap: WeakMap<Function, EventListener>,
	bind: any,
	previousValue?: Function
) {
	if (previousValue) {
		const previousEvent = eventMap.get(previousValue);
		domNode.removeEventListener(eventName, previousEvent);
	}

	let callback = currentValue.bind(bind);

	if (eventName === 'input') {
		callback = function(this: any, evt: Event) {
			currentValue.call(this, evt);
			(evt.target as any)['oninput-value'] = (evt.target as HTMLInputElement).value;
		}.bind(bind);
	}

	domNode.addEventListener(eventName, callback);
	eventMap.set(currentValue, callback);
}

function removeOrphanedEvents(
	domNode: Element,
	previousProperties: VNodeProperties,
	properties: VNodeProperties,
	eventMap: WeakMap<Function, EventListener>,
	onlyEvents: boolean = false
) {
	Object.keys(previousProperties).forEach((propName) => {
		const isEvent = propName.substr(0, 2) === 'on' || onlyEvents;
		const eventName = onlyEvents ? propName : propName.substr(2);
		if (isEvent && !properties[propName]) {
			const eventCallback = eventMap.get(previousProperties[propName]);
			if (eventCallback) {
				domNode.removeEventListener(eventName, eventCallback);
			}
		}
	});
}

function renderedToWrapper(
	rendered: DNode[],
	parent: DNodeWrapper,
	currentParent: DNodeWrapper | null,
	traversalMaps: TraversalMaps
): DNodeWrapper[] {
	const wrappedRendered: DNodeWrapper[] = [];
	let previousItem: DNodeWrapper | undefined;
	for (let i = 0; i < rendered.length; i++) {
		let renderedItem = rendered[i];
		const hasParentWNode = isWNodeWrapper(parent);
		// URGH
		let findInsertBefore = false;
		const currentParentLength = isVNodeWrapper(currentParent) && (currentParent.childrenWrappers || []).length > 1;
		if ((parent.hasPreviousSiblings !== false && hasParentWNode) || currentParentLength) {
			findInsertBefore = true;
		}

		traversalMaps.parent.set(renderedItem, parent);
		const wrapper = {
			node: renderedItem,
			depth: parent.depth + 1,
			findInsertBefore,
			hasParentWNode
		} as DNodeWrapper;
		if (previousItem) {
			traversalMaps.sibling.set(previousItem, wrapper);
		}
		wrappedRendered.push(wrapper);
		previousItem = wrapper;
	}
	return wrappedRendered;
}

function findParentNodes(currentNode: VNode | WNode, { parent }: TraversalMaps): ParentNodes {
	let parentDomNode: Node | undefined;
	let parentWNodeWrapper: WNodeWrapper | undefined;
	while (!parentDomNode || !parentWNodeWrapper) {
		const parentWrapper: DNodeWrapper = parent.get(currentNode)!;
		if (!parentDomNode && isVNodeWrapper(parentWrapper) && parentWrapper.domNode) {
			parentDomNode = parentWrapper.domNode;
		} else if (!parentWNodeWrapper && isWNodeWrapper(parentWrapper)) {
			parentWNodeWrapper = parentWrapper;
		}
		if (!parentWrapper) {
			break;
		}
		currentNode = parentWrapper.node;
	}
	return { parentDomNode, parentWNodeWrapper };
}

// function findInsertBefore(next: DNodeWrapper, { sibling, parent }: TraversalMaps): Node | null {
// 	let insertBefore: Node | null = null;
// 	while (!insertBefore) {
// 		const nextSibling = sibling.get(next);
// 		if (nextSibling) {
// 			if (isVNodeWrapper(nextSibling)) {
// 				if (nextSibling.domNode && nextSibling.domNode.parentNode) {
// 					insertBefore = nextSibling.domNode;
// 				}
// 				break;
// 			} else if (isWNodeWrapper(nextSibling)) {
// 				if (nextSibling.domNode && nextSibling.domNode.parentNode) {
// 					insertBefore = nextSibling.domNode;
// 				}
// 				next = nextSibling;
// 			}
// 		} else {
// 			next = parent.get(next.node)!;
// 			if (!next || isVNodeWrapper(next)) {
// 				break;
// 			}
// 		}
// 	}
// 	return insertBefore;
// }

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

function setProperties(
	domNode: HTMLElement,
	currentProperties: VNodeProperties = {},
	{ properties: nextProperties, bind }: VNode,
	eventMap: WeakMap<Function, EventListener>
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

	removeOrphanedEvents(domNode, currentProperties, nextProperties, eventMap);

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
		} else if (nodeOperations.indexOf(propName) !== -1) {
			nodeOperation(propName, propValue, previousValue, domNode);
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
				(domNode.style as any)[styleName] = newStyleValue || '';
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
				if (type === 'function' && propName.lastIndexOf('on', 0) === 0) {
					updateEvent(domNode, propName.substr(2), propValue, eventMap, bind, previousValue);
				} else if (type === 'string' && propName !== 'innerHTML') {
					if ((propName === 'role' && propValue === '') || propValue === undefined) {
						domNode.removeAttribute(propName);
					} else {
						domNode.setAttribute(propName, propValue);
					}
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

export class Renderer {
	private _renderer: () => WNode;
	private _registry: Registry | undefined;
	private _sync = false;
	private _rootNode: HTMLElement = global.document.body;
	private _invalidationQueue: InvalidationQueueItem[] = [];
	private _renderQueue: (RenderQueueItem | DomApplicatorInstruction)[] = [];
	private _domInstructionQueue: DomApplicatorInstruction[] = [];
	private _eventMap = new WeakMap<Function, EventListener>();
	private _dnodeToParentWrapperMap = new WeakMap<any, DNodeWrapper>();
	private _instanceToWrapperMap = new WeakMap<WidgetBase, WNodeWrapper>();
	private _domNodeToWrapperMap = new WeakMap<Node, VNodeWrapper>();
	private _wrapperSiblingMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	private _renderScheduled: number | undefined;

	constructor(renderer: () => WNode) {
		this._renderer = renderer;
	}

	public set sync(sync: boolean) {
		this._sync = sync;
	}

	public set registry(registry: Registry) {
		this._registry = registry;
	}

	public append(node?: HTMLElement): void {
		if (node) {
			this._rootNode = node;
		}
		const renderResult = this._renderer();
		this._dnodeToParentWrapperMap.set(renderResult, { depth: 0, domNode: this._rootNode, node: v('fake') });
		this._queueInRender([{ current: [], next: [{ node: renderResult, depth: 1 }] }]);
		this._runRenderQueue();
	}

	private _schedule(): void {
		if (this._sync) {
			this._runInvalidationQueue();
		} else if (!this._renderScheduled) {
			this._renderScheduled = global.requestAnimationFrame(() => {
				this._runInvalidationQueue();
			});
		}
	}

	/**
	 * This is messy now
	 */
	private _runInvalidationQueue() {
		this._renderScheduled = undefined;
		while (this._invalidationQueue.length) {
			const item = this._invalidationQueue.pop()!;
			const sibling = this._wrapperSiblingMap.get(item.current);
			sibling && this._wrapperSiblingMap.set(item.next, sibling);
			const next = this._updateWidget(item, this._getTraversalMaps());
			this._queueInRender([{ current: item.current.childrenWrappers || [], next: next.childrenWrappers || [] }]);
			next.instance && this._instanceToWrapperMap.set(next.instance, next);
			this._runRenderQueue();
		}
	}

	private _runRenderQueue() {
		while (this._renderQueue.length) {
			const item = this._renderQueue.pop()!;
			if (isDomApplicatorInstruction(item)) {
				this._process(item);
			} else {
				this._process(item.current, item.next);
			}
		}
		this._runDomInstructionQueue();
	}

	private _runDomInstructionQueue(): void {
		while (this._domInstructionQueue.length) {
			const item = this._domInstructionQueue.pop()!;
			if (item.type === 'create') {
				setProperties(item.next!.domNode as HTMLElement, undefined, item.next.node, this._eventMap);
				if (item.insertBefore) {
					item.parentDomNode.insertBefore(item.next.domNode!, item.insertBefore);
				} else {
					item.parentDomNode.appendChild(item.next.domNode!);
				}
				const instanceData = widgetInstanceMap.get(item.parentWNodeWrapper!.instance)!;
				if (item.next.node.properties.key != null) {
					instanceData.nodeHandler.add(item.next.domNode as HTMLElement, `${item.next.node.properties.key}`);
				}
			} else if (item.type === 'delete') {
				item.current.domNode!.parentNode!.removeChild(item.current.domNode!);
			}
		}
	}

	private _getTraversalMaps(): TraversalMaps {
		return {
			parent: this._dnodeToParentWrapperMap,
			sibling: this._wrapperSiblingMap
		};
	}

	private _queueInvalidation(instance: WidgetBase): void {
		const current = this._instanceToWrapperMap.get(instance)!;
		const next = {
			node: {
				type: WNODE,
				widgetConstructor: instance.constructor as WidgetBaseConstructor,
				properties: instance.properties,
				children: instance.children
			},
			instance,
			depth: current.depth
		};

		const parent = this._dnodeToParentWrapperMap.get(current.node)!;
		this._dnodeToParentWrapperMap.set(next.node, parent);
		this._invalidationQueue.push({ current, next });
	}

	private _queueInRender(item: (DomApplicatorInstruction | RenderQueueItem)[]) {
		this._renderQueue.push(...item);
	}

	private _queueDomInstruction(instruction: DomApplicatorInstruction) {
		this._domInstructionQueue.push(instruction);
	}

	private _process(current: DomApplicatorInstruction): void;
	private _process(current: DNodeWrapper[], next: DNodeWrapper[]): void;
	private _process(current: DomApplicatorInstruction | DNodeWrapper[], next: DNodeWrapper[] = []): void {
		if (isDomApplicatorInstruction(current)) {
			this._queueDomInstruction(current);
		} else {
			const hasPreviousSiblings = current.length > 1;
			const instructions: Instruction[] = [];
			const foundIndexes: number[] = [];
			for (let i = 0; i < next.length; i++) {
				const nextWrapper = next[i];
				nextWrapper.hasPreviousSiblings = hasPreviousSiblings;
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

			let applicationInstructions: (DomApplicatorInstruction | RenderQueueItem)[] = [];
			for (let i = 0; i < instructions.length; i++) {
				const result = this._processOne(instructions[i]);
				if (result && result.length) {
					applicationInstructions.push(...result);
				}
			}
			if (applicationInstructions.length) {
				this._queueInRender(applicationInstructions);
			}
		}
	}

	private _processOne({ current, next }: Instruction): undefined | (RenderQueueItem | DomApplicatorInstruction)[] {
		if (current !== next) {
			if (!current && next) {
				if (isVNodeWrapper(next)) {
					next = this._createDom({ next }, this._getTraversalMaps());
					this._domNodeToWrapperMap.set(next.domNode!, next);
					const { parentDomNode, parentWNodeWrapper } = findParentNodes(next.node, this._getTraversalMaps());
					if (parentWNodeWrapper) {
						if (parentWNodeWrapper && !parentWNodeWrapper.domNode) {
							parentWNodeWrapper.domNode = next.domNode;
						}
					}
					// console.log(next.node.tag, 'insert before', next.findInsertBefore, 'has parent wnode', next.hasParentWNode, 'has previous siblings', next.hasPreviousSiblings);
					let insertBefore: Node | null = null;
					if (next.findInsertBefore) {
						let searchNode: DNodeWrapper = next;
						while (!insertBefore) {
							const nextSibling = this._wrapperSiblingMap.get(searchNode);
							if (nextSibling) {
								if (isVNodeWrapper(nextSibling)) {
									if (nextSibling.domNode && nextSibling.domNode.parentNode) {
										insertBefore = nextSibling.domNode;
									}
									break;
								} else if (isWNodeWrapper(nextSibling)) {
									if (nextSibling.domNode && nextSibling.domNode.parentNode) {
										insertBefore = nextSibling.domNode;
									}
									searchNode = nextSibling;
								}
							} else {
								searchNode = this._dnodeToParentWrapperMap.get(searchNode.node)!;
								if (!searchNode || isVNodeWrapper(searchNode)) {
									break;
								}
							}
						}
					}

					const domInstruction: DomApplicatorInstruction = {
						next: next!,
						parentDomNode: parentDomNode!,
						parentWNodeWrapper,
						insertBefore,
						type: 'create'
					};
					if (next.childrenWrappers) {
						return [{ current: [], next: next.childrenWrappers }, domInstruction];
					}
					return [domInstruction];
				} else {
					next = this._createWidget({ next }, this._getTraversalMaps(), this._registry);
					next.instance && this._instanceToWrapperMap.set(next.instance, next);
					return [{ current: [] as any, next: next.childrenWrappers || [] }];
				}
			} else if (current && next) {
				if (isVNodeWrapper(current) && isVNodeWrapper(next)) {
					current = this._domNodeToWrapperMap.get(current.domNode!)!;
					this._updateDom({ current, next }, this._getTraversalMaps());
					this._domNodeToWrapperMap.delete(current.domNode!);
					this._domNodeToWrapperMap.set(next.domNode!, next);
					current.childrenWrappers;
					if (next.childrenWrappers) {
						return [{ current: current.childrenWrappers || [], next: next.childrenWrappers }];
					}
					const { parentWNodeWrapper } = findParentNodes(next.node, this._getTraversalMaps());
					const instanceData = widgetInstanceMap.get(parentWNodeWrapper!.instance)!;
					if (next.node.properties.key != null) {
						instanceData.nodeHandler.add(next.domNode as HTMLElement, `${next.node.properties.key}`);
					}
				} else if (isWNodeWrapper(current) && isWNodeWrapper(next)) {
					current = this._instanceToWrapperMap.get(current.instance!)!;
					next = this._updateWidget({ current, next }, this._getTraversalMaps());
					this._instanceToWrapperMap.set(next.instance!, next);
					return [{ current: current.childrenWrappers || [], next: next.childrenWrappers || [] }];
				}
			} else if (current && !next) {
				if (isVNodeWrapper(current)) {
					current = this._removeDom({ current }, this._getTraversalMaps());
					if (current.domNode!.parentNode) {
						return [
							{
								type: 'delete',
								current
							}
						];
					}
				} else if (isWNodeWrapper(current)) {
					current = current.instance ? this._instanceToWrapperMap.get(current.instance)! : current;
					this._removeWidget({ current }, this._getTraversalMaps());
					return [{ current: current.childrenWrappers || [], next: [] as any }];
				}
			}
		}
	}

	private _createWidget(
		{ next }: CreateWidgetInstruction,
		traversalMaps: TraversalMaps,
		registry: Registry | null = null
	): WNodeWrapper {
		let { node: { widgetConstructor } } = next;
		const { parentWNodeWrapper } = findParentNodes(next.node, traversalMaps);
		if (!isWidgetBaseConstructor<DefaultWidgetBaseInterface>(widgetConstructor)) {
			let item: Constructor<WidgetBase> | null = null;
			if (!parentWNodeWrapper) {
				item = registry && registry.get<WidgetBase>(widgetConstructor);
			} else {
				item = parentWNodeWrapper!.instance!.registry.get<WidgetBase>(widgetConstructor);
			}
			if (item) {
				widgetConstructor = item;
			} else {
				return next;
			}
		}
		const instance = new widgetConstructor() as WidgetBase;
		if (registry) {
			instance.registry.base = registry;
		}
		const instanceData = widgetInstanceMap.get(instance)!;
		instance.__setInvalidate__(() => {
			instanceData.dirty = true;
			if (!instanceData.rendering && this._instanceToWrapperMap.has(instance)) {
				this._queueInvalidation(instance);
				this._schedule();
			}
		});
		instanceData.rendering = true;
		instance.__setProperties__(next.node.properties);
		instance.__setChildren__(next.node.children);
		next.instance = instance;
		let rendered = instance.__render__();
		instanceData.rendering = false;
		if (rendered) {
			next.childrenWrappers = renderedToWrapper(rendered, next, null, traversalMaps);
		}

		return next;
	}

	private _updateWidget({ current, next }: UpdateWidgetInstruction, traversalMaps: TraversalMaps): WNodeWrapper {
		next.instance = current.instance;
		const instanceData = widgetInstanceMap.get(next.instance!)!;
		instanceData.rendering = true;
		next.instance!.__setProperties__(next.node.properties, next.node.bind);
		next.instance!.__setChildren__(next.node.children);
		next.domNode = current.domNode;
		next.childrenWrappers = current.childrenWrappers;

		if (instanceData.dirty) {
			let rendered = next.instance!.__render__();
			instanceData.rendering = false;
			if (rendered) {
				next.childrenWrappers = renderedToWrapper(rendered, next, current, traversalMaps);
			}
		}
		instanceData.rendering = false;
		return next;
	}

	private _removeWidget({ current }: RemoveWidgetInstruction, { sibling, parent }: TraversalMaps): WNodeWrapper {
		sibling.delete(current);
		parent.delete(current.node);
		this._instanceToWrapperMap.delete(current.instance!);
		return current;
	}

	private _createDom({ next }: CreateDomInstruction, traversalMaps: TraversalMaps): VNodeWrapper {
		let domNode: Node | undefined;
		if (next.node.tag) {
			domNode = global.document.createElement(next.node.tag);
		} else if (next.node.text != null) {
			domNode = global.document.createTextNode(next.node.text);
		}
		if (domNode) {
			next.domNode = domNode;
			if (next.node.children) {
				const children = renderedToWrapper(next.node.children, next, null, traversalMaps);
				next.childrenWrappers = children;
			}
		}
		return next;
	}

	private _updateDom({ current, next }: UpdateDomInstruction, traversalMaps: TraversalMaps): VNodeWrapper {
		const parentDomNode = findParentNodes(current.node, traversalMaps).parentDomNode;
		let domNode = current.domNode!;
		next.domNode = domNode;
		if (next.node.text && next.node.text !== current.node.text) {
			const newDomNode = parentDomNode!.ownerDocument.createTextNode(next.node.text!);
			parentDomNode!.replaceChild(newDomNode, domNode);
			next.domNode = newDomNode;
		} else {
			if (next.node.children) {
				const children = renderedToWrapper(next.node.children, next, current, traversalMaps);
				next.childrenWrappers = children;
			}
			setProperties(domNode as HTMLElement, current.node.properties, next.node, this._eventMap);
		}
		return next;
	}

	private _removeDom({ current }: RemoveDomInstruction, { sibling, parent }: TraversalMaps): VNodeWrapper {
		sibling.delete(current);
		parent.delete(current.node);
		current.domNode && this._domNodeToWrapperMap.delete(current.domNode);
		return current;
	}
}

export function renderer(render: () => WNode): Renderer {
	const r = new Renderer(render);
	return r;
}
