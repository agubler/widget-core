import { WeakMap } from '@dojo/shim/WeakMap';
import { WNode, VNode, DNode, WidgetBaseInterface, VNodeProperties, SupportedClassName } from './interfaces';
import { isVNode, isWNode, VNODE, WNODE } from './d';
import { WidgetData } from './vdom';

interface WNodeWrapper {
	node: WNode;
	instance?: WidgetBaseInterface;
	rendered?: DNodeWrapper[];
	nextWrapper?: DNodeWrapper;
}

interface VNodeWrapper {
	node: VNode;
	domNode?: HTMLElement | Text;
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

function isWNodeWrapper(child: DNodeWrapper): child is WNodeWrapper {
	return isWNode(child.node);
}

function isVNodeWrapper(child: DNodeWrapper): child is VNodeWrapper {
	return isVNode(child.node);
}

export const widgetInstanceMap = new WeakMap<any, WidgetData>();

function same(dnode1: DNode, dnode2: DNode) {
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

function findIndexOfChild(children: any[], sameAs: any, start: number) {
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
	private _dnodeToParentWrapperMap = new WeakMap<any, DNodeWrapper>();
	private _instanceToWrapperMap = new WeakMap<WidgetBaseInterface, WNodeWrapper>();
	private _wrapperSiblingMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	private _wnodeWrapperToDomNodeMap = new WeakMap<WNodeWrapper, Node>();
	private _renderScheduled = false;
	private _applicationQueue: { apply: Function; node: any }[] = [];

	constructor(renderer: () => WNode) {
		this._renderer = renderer;
	}

	public append(node?: HTMLElement) {
		if (node) {
			this._rootNode = node;
		}
		const renderResult = this._renderer();
		this._queueInRender([], [{ node: renderResult }]);
		this._runRenderQueue();
	}

	private _schedule() {
		if (!this._renderScheduled) {
			this._runInvalidationQueue();
		}
	}

	private _runInvalidationQueue() {
		const invalidationQueue = [...this._invalidationQueue];
		this._invalidationQueue = [];
		while (invalidationQueue.length) {
			const item = invalidationQueue.pop()!;
			this._updateWidget(item.current, item.next);
			this._runRenderQueue();
		}
	}

	private _runRenderQueue() {
		while (this._renderQueue.length) {
			const { current, next } = this._renderQueue.pop()!;
			this._process(current, next);
		}
		this._applicationQueue.reverse();
		let temp: any[] = [];
		let previousParentDom: any = undefined;
		let q: any[] = [];
		while (this._applicationQueue.length) {
			const item = this._applicationQueue.pop()!;
			const parentDomNode = this._getParentDomNode(item.node);
			if (!previousParentDom || previousParentDom === parentDomNode) {
				temp.push(item.apply);
			} else {
				q.push(temp.reverse());
				temp = [item.apply];
			}
			previousParentDom = parentDomNode;
		}
		q.push(temp.reverse());
		while (q.length) {
			const a = q.pop()!;
			while (a.length) {
				const b = a.pop()!;
				b();
			}
		}
	}

	private _queueInRender(current: DNodeWrapper[], next: DNodeWrapper[]) {
		this._renderQueue.push({ current, next });
	}

	private _queueApplication(a: { apply: Function; node: any }) {
		this._applicationQueue.push(a);
	}

	private _queue(instance: WidgetBaseInterface) {
		const next = {
			node: {
				type: WNODE,
				widgetConstructor: instance.constructor as any,
				properties: instance.properties,
				children: instance.children
			},
			instance
		};
		const current = this._instanceToWrapperMap.get(instance)!;
		this._invalidationQueue.push({ current, next });
	}

	private _renderedToWrapper(rendered: DNode[], parent: DNodeWrapper): DNodeWrapper[] {
		const wrappedRendered: DNodeWrapper[] = [];
		let previousItem: DNodeWrapper | undefined;
		for (let i = 0; i < rendered.length; i++) {
			let renderedItem = rendered[i];
			if (renderedItem == null) {
				continue;
			}
			if (typeof renderedItem === 'string') {
				renderedItem = toTextVNode(renderedItem);
			}
			this._dnodeToParentWrapperMap.set(renderedItem, parent);
			const wrapper = { node: renderedItem as any };
			if (previousItem) {
				this._wrapperSiblingMap.set(previousItem, wrapper);
			}
			wrappedRendered.push(wrapper);
			previousItem = wrapper;
		}
		return wrappedRendered;
	}

	private _process(current: DNodeWrapper[], next: DNodeWrapper[]) {
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

	private _processOne(instruction: Instruction) {
		let { current, next } = instruction;
		if (!current && next) {
			if (isVNodeWrapper(next)) {
				this._createDom(next);
			} else {
				this._createWidget(next);
			}
		} else if (current && next) {
			if (isVNodeWrapper(current) && isVNodeWrapper(next)) {
				this._updateDom(current, next);
			} else if (isWNodeWrapper(current) && isWNodeWrapper(next)) {
				this._updateWidget(current, next);
			}
		} else if (current && !next) {
			if (isVNodeWrapper(current)) {
				this._removeDom(current);
			} else if (isWNodeWrapper(current)) {
				this._removeWidget(current);
			}
		}
	}

	private _getParentWNodeWrapper(currentNode: VNode | WNode) {
		let parentWNodeWrapper: WNodeWrapper | undefined;
		while (!parentWNodeWrapper) {
			const parentWrapper: DNodeWrapper = this._dnodeToParentWrapperMap.get(currentNode)!;
			if (!parentWrapper) {
				break;
			}
			if (isWNodeWrapper(parentWrapper)) {
				parentWNodeWrapper = parentWrapper;
			}
			currentNode = parentWrapper.node;
		}
		return parentWNodeWrapper;
	}

	private _getParentDomNode(currentNode: VNode | WNode) {
		let parentDomNode: Node | undefined;
		while (!parentDomNode) {
			const parentWrapper: DNodeWrapper = this._dnodeToParentWrapperMap.get(currentNode)!;
			if (!parentWrapper) {
				parentDomNode = this._rootNode;
				break;
			}
			if (isVNodeWrapper(parentWrapper) && parentWrapper.domNode) {
				parentDomNode = parentWrapper.domNode;
				break;
			}
			currentNode = parentWrapper.node;
		}
		return parentDomNode;
	}

	private _createWidget(next: WNodeWrapper) {
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
		this._instanceToWrapperMap.set(instance, next);

		if (rendered) {
			next.rendered = this._renderedToWrapper(rendered, next);
			this._queueInRender([], next.rendered);
		}
	}

	private _updateWidget(current: WNodeWrapper, next: WNodeWrapper) {
		next.instance = current.instance;
		const instanceData = widgetInstanceMap.get(next.instance)!;
		current = this._instanceToWrapperMap.get(next.instance!)!;
		instanceData.rendering = true;
		next.instance!.__setProperties__(next.node.properties);
		next.instance!.__setChildren__(next.node.children);
		const domNode = this._wnodeWrapperToDomNodeMap.get(current);
		if (domNode) {
			this._wnodeWrapperToDomNodeMap.set(next, domNode);
		}

		if (instanceData.dirty) {
			let rendered = next.instance!.__render__();
			instanceData.rendering = false;
			rendered = Array.isArray(rendered) ? rendered : [rendered];
			this._instanceToWrapperMap.set(next.instance!, next);

			if (rendered) {
				next.rendered = this._renderedToWrapper(rendered, next);
				this._queueInRender(current.rendered || [], next.rendered);
			} else {
				next.rendered = current.rendered;
			}
		} else {
			next.rendered = current.rendered;
			instanceData.rendering = false;
		}
	}

	private _removeWidget(current: WNodeWrapper) {
		this._queueInRender(current.rendered || [], []);
	}

	private _findInsertBefore(next: DNodeWrapper) {
		let insertBefore: any = null;
		while (!insertBefore) {
			const nextSibling = this._wrapperSiblingMap.get(next);
			if (nextSibling) {
				if (isVNodeWrapper(nextSibling)) {
					if (nextSibling.domNode && nextSibling.domNode.parentNode) {
						insertBefore = nextSibling.domNode;
					} else {
						break;
					}
				} else if (isWNodeWrapper(nextSibling)) {
					const domNode = this._wnodeWrapperToDomNodeMap.get(nextSibling);
					if (domNode && domNode.parentNode) {
						insertBefore = domNode;
					}
					break;
				}
			} else {
				next = this._dnodeToParentWrapperMap.get(next.node)!;
				if (!next || isVNodeWrapper(next)) {
					break;
				}
			}
		}
		return insertBefore;
	}

	private _createDom(next: VNodeWrapper) {
		const parentDomNode = this._getParentDomNode(next.node);
		let domNode: any;
		if (next.node.tag) {
			domNode = document.createElement(next.node.tag);
		} else if (next.node.text) {
			domNode = document.createTextNode(next.node.text);
		}
		next.domNode = domNode;
		const parentWNodeWrapper = this._getParentWNodeWrapper(next.node);
		if (parentWNodeWrapper) {
			if (!this._wnodeWrapperToDomNodeMap.get(parentWNodeWrapper)) {
				this._wnodeWrapperToDomNodeMap.set(parentWNodeWrapper, domNode);
			}
		}
		if (next.node.children) {
			// this should be a method function
			const children = this._renderedToWrapper(next.node.children, next);
			next.childrenWrappers = children;
			this._queueInRender([], children);
		}

		this._queueApplication({
			node: next.node,
			apply: () => {
				this._setProperties(domNode as HTMLElement, {}, next.node.properties);
				parentDomNode.insertBefore(domNode, this._findInsertBefore(next));
			}
		});
	}

	private _updateDom(current: VNodeWrapper, next: VNodeWrapper) {
		const parentDomNode = this._getParentDomNode(current.node);
		let domNode = current.domNode!;
		next.domNode = domNode;
		if (next.node.text) {
			const newDomNode = parentDomNode.ownerDocument.createTextNode(next.node.text!);
			parentDomNode.replaceChild(newDomNode, domNode);
			next.domNode = newDomNode;
		} else {
			if (next.node.children) {
				const children = this._renderedToWrapper(next.node.children, next);
				next.childrenWrappers = children;
				this._queueInRender(current.childrenWrappers!, children);
			}
			this._setProperties(domNode as HTMLElement, current.node.properties, next.node.properties);
		}
	}

	private _removeDom(current: VNodeWrapper) {
		this._queueApplication({
			node: current.node,
			apply: () => {
				current.domNode!.parentNode!.removeChild(current.domNode!);
			}
		});
	}

	private _setProperties(domNode: HTMLElement, currentProperties: VNodeProperties, nextProperties: VNodeProperties) {
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
