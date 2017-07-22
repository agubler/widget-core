import { VNode, VNodeData } from 'snabbdom/vnode';

export type On = {
	[N in keyof HTMLElementEventMap]?: (ev: HTMLElementEventMap[N]) => void
} & {
	[event: string]: EventListener
};

function invokeHandler(handler: any, vnode?: VNode, event?: Event): void {
	const bind = vnode && vnode.data ? vnode.data.bind || vnode : vnode;
	if (typeof handler === 'function') {
		handler.call(bind, event, vnode);
	} else if (typeof handler === 'object') {
		if (typeof handler[0] === 'function') {
			if (handler.length === 2) {
				handler[0].call(bind, handler[1], event, vnode);
			} else {
				const args = handler.slice(1);
				args.push(event);
				args.push(vnode);
				handler[0].apply(bind, args);
			}
		} else {
			for (let i = 0; i < handler.length; i++) {
				invokeHandler(handler[i]);
			}
		}
	}
}

function handleEvent(event: Event, vnode: VNode) {
	const name = event.type;
	const on = (vnode.data as VNodeData).on;

	if (on && on[name]) {
		invokeHandler(on[name], vnode, event);
	}
}

function createListener() {
	return function handler(event: Event) {
		handleEvent(event, (handler as any).vnode);
	};
}

function updateEventListeners(oldVnode: VNode, vnode?: VNode): void {
	const oldOn = (oldVnode.data as VNodeData).on;
	const oldListener = (oldVnode as any).listener;
	const oldElm: Element = oldVnode.elm as Element;
	const on = vnode && (vnode.data as VNodeData).on;
	const elm: Element = (vnode && vnode.elm) as Element;
	let name: string;

	if (oldOn === on) {
		return;
	}

	if (oldOn && oldListener) {
		if (!on) {
			for (name in oldOn) {
				oldElm.removeEventListener(name, oldListener, false);
			}
		} else {
			for (name in oldOn) {
				if (!on[name]) {
					oldElm.removeEventListener(name, oldListener, false);
				}
			}
		}
	}

	if (on) {
		const listener = (vnode as any).listener = (oldVnode as any).listener || createListener();
		listener.vnode = vnode;

		if (!oldOn) {
			for (name in on) {
				elm.addEventListener(name, listener, false);
			}
		} else {
			for (name in on) {
				if (!oldOn[name]) {
					elm.addEventListener(name, listener, false);
				}
			}
		}
	}
}

export const eventListenersModule = {
	create: updateEventListeners,
	update: updateEventListeners,
	destroy: updateEventListeners
};

export default eventListenersModule;
