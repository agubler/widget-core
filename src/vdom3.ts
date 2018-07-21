import { WeakMap } from '@dojo/shim/WeakMap';
import { WNode, VNode, DNode, WidgetBaseInterface } from './interfaces';
import { isVNode, isWNode, VNODE, WNODE } from './d';

interface WNodeWrapper {
	node: WNode;
	instance?: WidgetBaseInterface;
	rendered?: DNodeWrapper[];
}

interface VNodeWrapper {
	node: VNode;
	domNode?: HTMLElement | Text;
}

type DNodeWrapper = VNodeWrapper | WNodeWrapper;

interface RenderQueueItem {
	current: (WNodeWrapper | VNodeWrapper)[];
	next: (WNodeWrapper | VNodeWrapper)[];
}

interface InvalidationQueueItem {
	current: WNodeWrapper[];
	next: WNodeWrapper[];
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

function same(dnode1: any, dnode2: any) {
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

class Renderer {
	private _renderer: () => WNode;
	private _rootNode: HTMLElement = document.body;
	private _invalidationQueue: InvalidationQueueItem[] = [];
	private _renderQueue: RenderQueueItem[] = [];
	private _dnodeToParentWrapperMap = new WeakMap<any, DNodeWrapper>();
	private _instanceToWrapperMap = new WeakMap<WidgetBaseInterface, WNodeWrapper>();
	private _renderScheduled = false;

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

	private _runInvalidationQueue() {}

	private _runRenderQueue() {
		while (this._renderQueue.length) {
			const { current, next } = this._renderQueue.shift()!;
			this._process(current, next);
		}
	}

	private _queueInRender(current: DNodeWrapper[], next: DNodeWrapper[]) {
		this._renderQueue.unshift({ current, next });
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
		this._invalidationQueue.push({ current: [current], next: [next] });
	}

	_process(current: DNodeWrapper[], next: DNodeWrapper[]) {
		const instructions: Instruction[] = next.map((node) => {
			const index = findIndexOfChild(current, node, 0);
			if (index !== -1) {
				const [currentNode] = current.splice(index);
				return { current: currentNode, next: node };
			}
			return { current: undefined, next: node };
		});

		for (let i = 0; i < instructions.length; i++) {
			this._processOne(instructions[i]);
		}
	}

	_processOne(instruction: Instruction) {
		let { current, next } = instruction;
		if (!current && next) {
			if (isVNodeWrapper(next)) {
				this._createDom(next);
			} else {
				this._createWidget(next);
			}
		} else if (current && next) {
			if (isVNodeWrapper(current)) {
				this._updateDom();
			} else {
				this._updateWidget();
			}
		}
	}

	private _createWidget(next: WNodeWrapper) {
		if (typeof next.node.widgetConstructor === 'string' || typeof next.node.widgetConstructor === 'symbol') {
			throw new Error('Do not support registry items');
		}
		const instance = new next.node.widgetConstructor();
		instance.__setInvalidate__(() => {
			this._queue(instance);
			this._schedule();
		});
		instance.__setProperties__(next.node.properties);
		instance.__setChildren__(next.node.children);

		let rendered = instance.__render__();
		rendered = Array.isArray(rendered) ? rendered : [rendered];
		this._instanceToWrapperMap.set(instance, next);

		if (rendered) {
			next.rendered = renderedToWrapper(rendered, next, this._dnodeToParentWrapperMap);
			this._queueInRender([], next.rendered);
		}
	}

	private _updateWidget() {}

	_createDom(node: VNodeWrapper) {
		let parentDomNode: any;
		let lookupNode: VNode | WNode = node.node;
		while (!parentDomNode) {
			const parentWrapper: DNodeWrapper = this._dnodeToParentWrapperMap.get(lookupNode)!;
			if (!parentWrapper) {
				parentDomNode = this._rootNode;
				break;
			}
			if (isVNodeWrapper(parentWrapper) && parentWrapper.domNode) {
				parentDomNode = parentWrapper.domNode;
				break;
			}
			lookupNode = parentWrapper.node;
		}
		let domNode: any;
		if (node.node.tag) {
			domNode = document.createElement(node.node.tag);
		} else if (node.node.text) {
			domNode = document.createTextNode(node.node.text);
		}
		node.domNode = domNode;
		if (node.node.children) {
			const children = renderedToWrapper(node.node.children, node, this._dnodeToParentWrapperMap);
			this._queueInRender([], children);
		}
		parentDomNode.appendChild(domNode);
	}

	private _updateDom() {}
}

export function renderer(render: () => WNode) {
	const r = new Renderer(render);
	return r;
}
