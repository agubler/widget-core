import { EventTargettedObject, Handle } from 'dojo-interfaces/core';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { createProjector as createMaquetteProjector, Projector as MaquetteProjector } from 'maquette';
import WidgetBase, { WidgetState, WidgetProperties, WidgetOptions } from './WidgetBase';
import global from 'dojo-core/global';
import Promise from 'dojo-shim/Promise';

export enum ProjectorState {
	Attached = 1,
	Detached
};

export enum AttachType {
	Append = 1,
	Merge = 2,
	Replace = 3
};

export interface AttachOptions {

	type: AttachType;
}

export interface ProjectorOptions extends WidgetOptions<WidgetState, WidgetProperties> {

	root?: Element;

	cssTransitions?: boolean;
}

class Projector extends WidgetBase<WidgetState, WidgetProperties> {
	public projectorState: ProjectorState;
	private readonly projector: MaquetteProjector;

	private _root: Element;
	private attachPromise: Promise<Handle>;
	private attachHandle: Handle;
	private afterCreate: () => void;

	constructor(options: ProjectorOptions) {
		super(options);
		const { root = document.body, cssTransitions = false } = options;
		const maquetteProjectorOptions: { transitions?: any } = {};

		if (cssTransitions) {
			if (global.cssTransitions) {
				maquetteProjectorOptions.transitions = global.cssTransitions;
			}
			else {
				throw new Error('Unable to create projector with css transitions enabled. Is the \'css-transition.js\' script loaded in the page?');
			}
		}

		this.own(this.on('widget:children', this.invalidate));
		this.own(this.on('invalidated', this.scheduleRender));

		this.projector = createMaquetteProjector(maquetteProjectorOptions);
		this.root = root;
		this.projectorState = ProjectorState.Detached;
		this.nodeAttributes.push(this.projectorAttributes);
	}

	set root(this: Projector, root: Element) {
		if (this.projectorState === ProjectorState.Attached) {
			throw new Error('Projector already attached, cannot change root element');
		}
		this._root = root;
	}

	get root(this: Projector): Element {
		return this._root;
	}

	private projectorAttributes (this: Projector): VNodeProperties {
		return { afterCreate: this.afterCreate };
	}

	private attach(this: Projector, { type }: AttachOptions) {
		const self = this;
		const render = self.__render__.bind(self);

		if (self.projectorState === ProjectorState.Attached) {
			return self.attachPromise || Promise.resolve({});
		}
		self.projectorState = ProjectorState.Attached;

		self.attachHandle = self.own({
			destroy() {
				if (self.projectorState === ProjectorState.Attached) {
					self.projector.stop();
					self.projector.detach(render);
					self.projectorState = ProjectorState.Detached;
				}
				self.attachHandle = { destroy() {} };
			}
		});

		self.attachPromise = new Promise((resolve, reject) => {
			self.afterCreate = () => {
				this.emit({
					type: 'projector:attached',
					target: this
				});
				resolve(self.attachHandle);
			};
		});

		switch (type) {
			case AttachType.Append:
				self.projector.append(self.root, render);
			break;
			case AttachType.Merge:
				self.projector.merge(self.root, render);
			break;
			case AttachType.Replace:
				self.projector.replace(self.root, render);
			break;
		}

		return self.attachPromise;
	}

	private scheduleRender(event: EventTargettedObject<Projector>) {
		const { target: projector } = event;
		if (this.projectorState === ProjectorState.Attached) {
			projector.emit({
				type: 'render:scheduled',
				target: projector
			});
			this.projector.scheduleRender();
		}
	}

	append(): Promise<Handle> {
		const options = {
			type: AttachType.Append
		};

		return this.attach(options);
	}

	merge(): Promise<Handle> {
		const options = {
			type: AttachType.Merge
		};

		return this.attach(options);
	}

	replace(): Promise<Handle> {
		const options = {
			type: AttachType.Replace
		};

		return this.attach(options);
	}

	__render__(this: Projector): VNode | string | null {
		const result = super.__render__();
		if (typeof result === 'string' || result === null) {
			throw new Error('Must provide a VNode at the root of a projector');
		}
		return result;
	}

}

export default Projector;
