import { on } from 'dojo-core/aspect';
import {
	EventObject,
	EventTargettedObject,
	Handle
} from 'dojo-interfaces/core';
import {
	EventedListener,
	EventedListenerOrArray,
	EventedListenersMap,
	EventedCallback
} from 'dojo-interfaces/bases';
import { Actionable } from 'dojo-interfaces/abilities';
import Map from 'dojo-shim/Map';
import Destroyable, { DestroyableOptions } from './Destroyable';

function isActionable(value: any): value is Actionable<any, any> {
	return Boolean(value && typeof value.do === 'function');
}

export function resolveListener<T, E extends EventTargettedObject<T>>(listener: EventedListener<T, E>): EventedCallback<E> {
	return isActionable(listener) ? (event: E) => listener.do({ event }) : listener;
}

function handlesArraytoHandle(handles: Handle[]): Handle {
	return {
		destroy() {
			handles.forEach((handle) => handle.destroy());
		}
	};
}

export interface EventedOptions extends DestroyableOptions {
	listeners?: EventedListenersMap<any>;
}

class Evented extends Destroyable {
	protected listenersMap: Map<string, EventedCallback<EventObject>> = new Map<string, EventedCallback<EventObject>>();

	constructor(options: EventedOptions) {
		super(options);
		const { listeners } = options;
		if (listeners) {
			this.own(this.on(listeners));
		}
	}

	emit<E extends EventObject>(this: Evented, event: E): void {
		const method = this.listenersMap.get(event.type);
		if (method) {
			method.call(this, event);
		}
	}

	on(this: Evented, ...args: any[]): Handle {
		if (args.length === 2) {
			const [ type, listeners ] = <[ string, EventedListenerOrArray<any, EventTargettedObject<any>>]> args;
			if (Array.isArray(listeners)) {
				const handles = listeners.map((listener) => on(this.listenersMap, type, resolveListener(listener)));
				return handlesArraytoHandle(handles);
			}
			else {
				return on(this.listenersMap, type, resolveListener(listeners));
			}
		}
		else if (args.length === 1) {
			const [ listenerMapArg ] = <[EventedListenersMap<any>]> args;
			const handles = Object.keys(listenerMapArg).map((type) => this.on(type, listenerMapArg[type]));
			return handlesArraytoHandle(handles);
		}
		else {
			throw new TypeError('Invalid arguments');
		}
	}
}

export default Evented;
