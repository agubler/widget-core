import { assign } from '@dojo/core/lang';
import global from '@dojo/core/global';
import * as snabbdom from 'snabbdom';
import 'pepjs';
import { Constructor, DNode } from './../interfaces';
import { WidgetBase } from './../WidgetBase';

import classModule from 'snabbdom/modules/class';
import propsModule from 'snabbdom/modules/props';
import styleModule from 'snabbdom/modules/style';
import listenerModule from './../util/eventHandler';

const patch = snabbdom.init([ classModule, propsModule, styleModule, listenerModule ]);

/**
 * Represents the attach state of the projector
 */
export enum ProjectorAttachState {
	Attached = 1,
	Detached
}

export interface ProjectorMixin<P> {

	readonly properties: Readonly<P>;

	attach(root?: Element): void;

	scheduleRender(): void;

	setProperties(properties: this['properties']): void;

	setChildren(children: DNode[]): void;

	root: Element;

	readonly projectorState: ProjectorAttachState;
}

export function ProjectorMixin<P, T extends Constructor<WidgetBase<P>>>(Base: T): T & Constructor<ProjectorMixin<P>> {
	class Projector extends Base {
		public projectorState: ProjectorAttachState;
		private _root: Element;
		private _scheduled: number | undefined;
		private _boundDoRender: () => void;
		private _projectorChildren: DNode[];
		private _projectorProperties: this['properties'];
		private _vnode: any;
		private _paused: boolean;

		constructor(...args: any[]) {
			super(...args);
			this.own(this.on('invalidated', this.scheduleRender));
			this._boundDoRender = this._doRender.bind(this);
			this._root = document.body;
		}

		public attach(root?: Element): void {
			if (root) {
				this._root = root;
			}

			this.projectorState = ProjectorAttachState.Attached;
			this._vnode = this.__render__();
			patch(this._root, this._vnode);
		}

		public pause() {
			if (this._scheduled) {
				global.cancelAnimationFrame(this._scheduled);
				this._scheduled = undefined;
			}
			this._paused = true;
		}

		public resume() {
			this._paused = false;
			this.scheduleRender();
		}

		public scheduleRender() {
			if (this.projectorState === ProjectorAttachState.Attached && !this._scheduled && !this._paused) {
				this._scheduled = global.requestAnimationFrame(this._boundDoRender);
			}
		}

		public get root(): Element {
			return this._root;
		}

		public setChildren(children: DNode[]): void {
			this._projectorChildren = [ ...children ];
			super.__setChildren__(children);
		}

		public setProperties(properties: this['properties']): void {
			this._projectorProperties = assign({}, properties);
			super.__setProperties__(properties);
		}

		public __render__(): any {
			if (this._projectorChildren) {
				this.setChildren(this._projectorChildren);
			}
			if (this._projectorProperties) {
				this.setProperties(this._projectorProperties);
			}
			const vnode = super.__render__();
			return vnode;
		}

		protected invalidate(): void {
			super.invalidate();
			this.scheduleRender();
		}

		private _doRender() {
			this._scheduled = undefined;
			const newVNode = this.__render__();
			patch(this._vnode, newVNode);
			this._vnode = newVNode;
		}
	}

	return Projector;
}

export default ProjectorMixin;
