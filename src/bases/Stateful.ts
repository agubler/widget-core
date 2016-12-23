import { deepAssign } from 'dojo-core/lang';
import { Handle } from 'dojo-interfaces/core';
import { StoreObservablePatchable } from 'dojo-interfaces/abilities';
import { Subscription } from 'dojo-shim/Observable';
import Evented, { EventedOptions } from './Evented';

let widgetCount = 0;

function generateID(): string {
	return `widget-${++widgetCount}`;
}

export interface State {
	[key: string]: any;
}

export interface StatefulOptions<S extends State> extends EventedOptions {
	id?: string;

	stateFrom?: StoreObservablePatchable<S>;
}

class Stateful<S> extends Evented {
	private observable: StoreObservablePatchable<S>;
	private subscription: Subscription;
	private handle: Handle;
	private _state: S = <S> {};

	public id: string;

	constructor(options: StatefulOptions<S>) {
		super(options);
		const { id, stateFrom } = options;

		this.id = id || generateID();

		if (typeof id !== 'undefined' && stateFrom) {
			this.own(this.observeState(id, stateFrom));
		}
		else if (stateFrom) {
			throw new TypeError('When "stateFrom" option is supplied, factory also requires "id" option.');
		}
	}

	private completeStatefulState() {
		if (this.handle) {
			this.handle.destroy();
			const statecomplete = {
				type: 'state:completed',
				target: this
			};
			this.emit(statecomplete);
			this.destroy();
		}
	}

	private setStatefulState(newState: Partial<S>) {
		const { _state } = this;
		if (!_state) {
			throw new Error('Unable to set destroyed state');
		}
		const type = 'state:changed';
		deepAssign(_state, newState);
		const eventObject = {
			type,
			state: this.state,
			target: this
		};
		this.emit(eventObject);

	}

	get stateFrom(this: Stateful<S>): StoreObservablePatchable<S> | undefined {
		return this.observable;
	}

	get state(this: Stateful<S>): S {
		return this._state;
	}

	setState(this: Stateful<S>, value: Partial<S>) {
		if (this.observable) {
			this.observable.patch(value, { id: this.id });
		}
		else {
			this.setStatefulState(value);
		}
	}

	observeState(this: Stateful<S>, id: string, observable: StoreObservablePatchable<S>): Handle {
		const self = this;
		if (this.observable) {
			if (this.id === id && this.observable === observable) {
				return this.handle;
			}
			throw new Error(`Already observing state with ID '${this.id}'`);
		}
		const handle = {
			destroy() {
				if (self.subscription) {
					self.subscription.unsubscribe();
				}
			}
		};
		const subscription = observable
		.observe(id)
		.subscribe(
			(state) => {
				self.setStatefulState(state);
			},
			(err) => {
				throw err;
			},
			() => {
				self.completeStatefulState();
			}
		);

		this.observable = observable;
		this.subscription = subscription;
		this.handle = handle;
		return handle;
	}
}

export default Stateful;
