// import { WNode, VNode } from "./interfaces";
// import { WeakMap } from '@dojo/shim/WeakMap';
// import { isVNode, isWNode, WNODE, VNODE } from './d';

// function same(dnode1: any, dnode2: any) {
// 	if (isVNode(dnode1) && isVNode(dnode2)) {
// 		if (dnode1.tag !== dnode2.tag) {
// 			return false;
// 		}
// 		if (dnode1.properties.key !== dnode2.properties.key) {
// 			return false;
// 		}
// 		return true;
// 	} else if (isWNode(dnode1) && isWNode(dnode2)) {
// 		if (typeof dnode2.widgetConstructor === 'string') {
// 			return false;
// 		}
// 		if (dnode1.widgetConstructor !== dnode2.widgetConstructor) {
// 			return false;
// 		}
// 		if (dnode1.properties.key !== dnode2.properties.key) {
// 			return false;
// 		}
// 		return true;
// 	}
// 	return false;
// }

// function findIndexOfChild(children: any[], sameAs: any, start: number) {
// 	for (let i = start; i < children.length; i++) {
// 		if (same(children[i].node, sameAs)) {
// 			return i;
// 		}
// 	}
// 	return -1;
// }

// function findIndex(target: any, callback: any): number {
// 	for (let i = 0; i < target.length; i++) {
// 		if (callback(target[i], i, target)) {
// 			return i;
// 		}
// 	}
// 	return -1;
// };

// export function toTextVNode(data: any): any {
// 	return {
// 		tag: '',
// 		properties: {},
// 		children: undefined,
// 		text: `${data}`,
// 		domNode: undefined,
// 		type: VNODE
// 	};
// }

// interface WNodeWrapper {
// 	wnode: WNode;
// 	instance: any;
// 	rendered: any[];
// }

// interface VNodeWrapper {
// 	vnode: VNode;
// 	domNode: any;
// }

// class Renderer {
// 	private _renderer: () => WNode;
// 	// private _fakeRoot = {};
// 	// private _fakeInstance = {};
// 	// private _childParentDNodeMap = new WeakMap();
// 	// private _instanceToWNodeWrapperMap = new WeakMap();
// 	// private _domNodeToVNodeWrapperMap = new WeakMap();
// 	private _dnodeToParentWrapper = new WeakMap();
// 	private _instanceToWrapperMap = new WeakMap();
// 	private _invalidationQueue: any[] = [];
// 	private _renderQueue: any[] = [];
// 	private _rootNode: any = document.body

// 	constructor(renderer: () => WNode) {
// 		this._renderer = renderer;
// 	}

// 	append(node: Node = document.body) {
// 		if (node) {
// 			this._rootNode = node;
// 		}
// 		const dnodes = this._renderer();
// 		// this._dnodeToParentDomNodeMap.set(dnodes, node);
// 		this._queueInRender([], dnodes);

// 		this._render();
// 	}

// _schedule() {
// 	while (this._invalidationQueue.length) {
// 		const instance = this._invalidationQueue.shift()!;
// 		const node = {
// 			wnode: {
// 				type: WNODE,
// 				widgetConstructor: instance.constructor as any,
// 				properties: instance.properties,
// 				children: instance.children
// 			},
// 			rendered: [],
// 			instance
// 		};
// 		const current = this._instanceToWrapperMap.get(instance) || node
// 		this._updateWidget(current, node);
// 		this._render();
// 	}
// }

// 	_render() {
// 		while (this._renderQueue.length) {
// 			const { current, next } = this._renderQueue.shift();
// 			this._process(current, next);
// 		}
// 	}

// 	_queueInRender(current: any[] | any, next: any[] | any) {
// 		this._renderQueue.unshift({ current, next });
// 	}

// 	_queue(instance: any) {
// 		// more logic in here
// 		this._invalidationQueue.push(instance);
// 		this._render();
// 	}

// 	_process(current: any[], next: any[]) {
// 		current = Array.isArray(current) ? current : [ current ];
// 		next = Array.isArray(next) ? next : [ next ];
// 		const instructions = next.map((node: any) => {
// 			const index = findIndexOfChild(current, node, 0);
// 			if (index !== -1) {
// 				const [ currentNode ] = current.splice(index);
// 				return [ currentNode, node ];
// 			}
// 			return [ undefined, node ];
// 		});

// 		for (let i = 0; i < instructions.length; i++) {
// 			this._processOne(instructions[i]);
// 		}
// 	}

// 	_processOne(instruction: any) {
// 		let [ current, next ] = instruction;
// 		if (typeof next === 'string') {
// 			next = toTextVNode(next);
// 		}
// 		if (!current) {
// 			if (isVNode(next)) {
// 				this._createDomNode(next);
// 			} else {
// 				this._createWidget(next);
// 			}
// 			// new
// 		} else if (current && next) {
// 			if (isVNode(current)) {
// 				this._updateDomNode(current, next);
// 			} else {
// 				this._updateWidget(current, next);
// 			}
// 		}
// 	}

// 	_updateWidget(current: WNodeWrapper, next: WNodeWrapper ) {
// 		next.instance = current.instance;
// 		next.instance.__setProperties__(next.wnode.properties);
// 		next.instance.__setChildren__(next.wnode.children);

// 		let rendered = next.instance.__render__();
// 		rendered = Array.isArray(rendered) ? rendered : [rendered];

// 		if (rendered) {
// 			rendered = rendered.map((child: any) => {
// 				const childNode = typeof child === 'string' ? toTextVNode(child) : child;
// 				this._dnodeToParentWrapper.set(childNode, next);
// 				return childNode;
// 			});
// 			debugger;
// 			this._queueInRender(current, rendered);
// 		}
// 	}

// 	_createWidget(node: any) {
// 		const instance = new node.widgetConstructor()
// 		instance.__setInvalidate__(() => {
// 			this._invalidationQueue.push(instance);
// 			this._schedule();
// 		});
// 		instance.__setProperties__(node.properties);
// 		instance.__setChildren__(node.children);

// 		let rendered = instance.__render__();
// 		rendered = Array.isArray(rendered) ? rendered : [ rendered ];

// 		const wrapper = {
// 			rendered,
// 			instance,
// 			node
// 		};

// 		this._instanceToWrapperMap.set(instance, wrapper);

// 		if (rendered) {
// 			rendered = rendered.map((child: any) => {
// 				const childNode = typeof child === 'string' ? toTextVNode(child) : child;
// 				const wrapper = {
// 					node: childNode
// 				}
// 				this._dnodeToParentWrapper.set(childNode, wrapper);
// 				return wrapper;
// 			});
// 			this._queueInRender([], rendered);
// 		}
// 	}

// 	_createDomNode(node: any) {
// 		let parentDomNode: any;
// 		let lookupNode = node;
// 		while (!parentDomNode) {
// 			const parentWrapper = this._dnodeToParentWrapper.get(lookupNode)!;
// 			if (!parentWrapper) {
// 				parentDomNode = this._rootNode;
// 				break;
// 			}
// 			if (parentWrapper.domNode) {
// 				parentDomNode = parentWrapper.domNode;
// 				break;
// 			}
// 			lookupNode = parentWrapper.node;
// 		}
// 		let domNode: any;
// 		if (node.tag) {
// 			domNode = document.createElement(node.tag);
// 		} else {
// 			domNode = document.createTextNode(node.text);
// 		}
// 		if (node.children) {
// 			const wrapper = {
// 				domNode,
// 				node
// 			};
// 			if (node.children) {
// 				const children = node.children.map((child: any) => {
// 					const childNode = typeof child === 'string' ? toTextVNode(child) : child;
// 					this._dnodeToParentWrapper.set(childNode, wrapper);
// 					return childNode;
// 				});
// 				this._queueInRender([], children);
// 			}
// 		}
// 		parentDomNode.appendChild(domNode);
// 		// debugger;
// 	}

// 	_updateDomNode(current: any, next: any) {
// 		// const current =
// 		// if (!dnode.tag && typeof dnode.text === 'string') {
// 		// 	if (dnode.text !== previous.text) {
// 		// 		const newDomNode = domNode.ownerDocument.createTextNode(dnode.text!);
// 		// 		domNode.parentNode!.replaceChild(newDomNode, domNode);
// 		// 		dnode.domNode = newDomNode;
// 		// 		textUpdated = true;
// 		// 		return textUpdated;
// 		// 	}
// 		// }
// 	}
// }

// export function renderer(render: () => WNode) {
// 	const r = new Renderer(render);
// 	return r;
// }
