import { WeakMap } from '@dojo/shim/WeakMap';
import { WNode, VNode, DNode, WidgetBaseInterface, VNodeProperties, SupportedClassName } from './interfaces';
import { isVNode, isWNode, VNODE, WNODE } from './d';
import { WidgetData } from './vdom';

interface WNodeWrapper {
	node: WNode;
	instance?: WidgetBaseInterface;
	rendered?: DNodeWrapper[];
}

interface VNodeWrapper {
	node: VNode;
	domNode?: HTMLElement | Text;
	childrenWrappers?: DNodeWrapper[];
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

function renderedToWrapper(rendered: DNode[], parent: DNodeWrapper, parentMap: any): DNodeWrapper[] {
	const wrappedRendered: DNodeWrapper[] = [];
	for (let i = 0; i < rendered.length; i++) {
		let renderedItem = rendered[i];
		if (renderedItem == null) {
			continue;
		}
		if (typeof renderedItem === 'string') {
			renderedItem = toTextVNode(renderedItem);
		}
		parentMap.set(renderedItem, parent);
		wrappedRendered.push({ node: renderedItem as any });
	}
	return wrappedRendered;
}

export class Renderer {
	private _renderer: () => WNode;
	private _rootNode: HTMLElement = document.body;
	private _invalidationQueue: InvalidationQueueItem[] = [];
	private _renderQueue: RenderQueueItem[] = [];
	private _dnodeToParentWrapperMap = new WeakMap<any, DNodeWrapper>();
	private _instanceToWrapperMap = new WeakMap<WidgetBaseInterface, WNodeWrapper>();
	private _renderScheduled = false;
	private _instructionQueue: Instruction[] = [];

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
			const item = invalidationQueue.shift()!;
			this._updateWidget(item.current, item.next);
			this._runRenderQueue();
		}
	}

	private _runRenderQueue() {
		while (this._renderQueue.length) {
			const { current, next } = this._renderQueue.shift()!;
			this._process(current, next);
		}
		while (this._instructionQueue.length) {
			const instruction = this._instructionQueue.shift()!;
			this._processOne(instruction);
		}
	}

	private _queueInRender(current: DNodeWrapper[], next: DNodeWrapper[]) {
		this._renderQueue.unshift({ current, next });
	}

	private _queueInstruction(instruction: Instruction) {
		this._instructionQueue.unshift(instruction);
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

	private _process(current: DNodeWrapper[], next: DNodeWrapper[]) {
		const instructions: Instruction[] = next.map((nextWrapper) => {
			const index = findIndexOfChild(current, nextWrapper.node, 0);
			if (index !== -1) {
				const [currentNode] = current.splice(index, 1);
				return { current: currentNode, next: nextWrapper };
			}
			return { current: undefined, next: nextWrapper };
		});

		for (let i = 0; i < instructions.length; i++) {
			this._queueInstruction(instructions[i]);
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
		}
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
			if (!instanceData.rendering) {
				instanceData.dirty = true;
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
			next.rendered = renderedToWrapper(rendered, next, this._dnodeToParentWrapperMap);
			this._queueInRender([], next.rendered);
		}
	}

	private _updateWidget(current: WNodeWrapper, next: WNodeWrapper) {
		next.instance = current.instance;
		this._instanceToWrapperMap.set(current.instance!, next);
		const instanceData = widgetInstanceMap.get(next.instance)!;
		instanceData.rendering = true;
		next.instance!.__setProperties__(next.node.properties);
		next.instance!.__setChildren__(next.node.children);

		if (instanceData.dirty) {
			let rendered = next.instance!.__render__();
			instanceData.rendering = false;
			rendered = Array.isArray(rendered) ? rendered : [rendered];
			this._instanceToWrapperMap.set(next.instance!, next);

			if (rendered) {
				next.rendered = renderedToWrapper(rendered, next, this._dnodeToParentWrapperMap);
				this._queueInRender(current.rendered || [], next.rendered);
			}
		} else {
			instanceData.rendering = false;
		}
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
		if (next.node.children) {
			// this should be a method function
			const children = renderedToWrapper(next.node.children, next, this._dnodeToParentWrapperMap);
			next.childrenWrappers = children;
			this._queueInRender([], children);
		}

		// we don't want to append until the children have been appended. This was done before by it being recursive and
		// therefore waited until the children had been completed.
		this._setProperties(domNode as HTMLElement, {}, next.node.properties);
		parentDomNode.appendChild(domNode);
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
				const children = renderedToWrapper(next.node.children, next, this._dnodeToParentWrapperMap);
				next.childrenWrappers = children;
				this._queueInRender(current.childrenWrappers!, children);
			}
			this._setProperties(domNode as HTMLElement, current.node.properties, next.node.properties);
		}
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
