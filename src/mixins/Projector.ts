import { Constructor, DNode, Projection, ProjectionOptions } from './../interfaces';
import { WidgetBase } from './../WidgetBase';
import { afterRender } from './../decorators/afterRender';
import { v } from './../d';
import { Registry } from './../Registry';
import { dom, widgetInstanceMap } from './../vdom';

/**
 * Represents the attach state of the projector
 */
export enum ProjectorAttachState {
	Attached = 1,
	Detached
}

/**
 * Attach type for the projector
 */
export enum AttachType {
	Append = 1,
	Merge = 2,
	Replace = 3
}

export interface AttachOptions {

	/**
	 * If `'append'` it will appended to the root. If `'merge'` it will merged with the root.
	 */
	type: AttachType;

	/**
	 * Element to attach the projector.
	 */
	root?: Element;
}

export interface ProjectorProperties {
	registry?: Registry;
}

export interface ProjectorMixin<P> {

	readonly properties: Readonly<P> & Readonly<ProjectorProperties>;

	/**
	 * Merge the projector onto the root.
	 *
	 * The `root` and any of its `children` will be re-used.  Any excess DOM nodes will be ignored and any missing DOM nodes
	 * will be created.
	 * @param root The root element that the root virtual DOM node will be merged with.  Defaults to `document.body`.
	 */
	merge(root?: Element): void;

	append(root?: Element): void;

	/**
	 * Pause the projector.
	 */
	pause(): void;

	/**
	 * Resume the projector.
	 */
	resume(): void;

	/**
	 * Schedule a render.
	 */
	scheduleRender(): void;

	/**
	 * Sets the properties for the widget. Responsible for calling the diffing functions for the properties against the
	 * previous properties. Runs though any registered specific property diff functions collecting the results and then
	 * runs the remainder through the catch all diff function. The aggregate of the two sets of the results is then
	 * set as the widget's properties
	 *
	 * @param properties The new widget properties
	 */
	setProperties(properties: this['properties']): void;

	/**
	 * Sets the widget's children
	 */
	setChildren(children: DNode[]): void;

	/**
	 * Indicates if the projectors is in async mode, configured to `true` by defaults.
	 */
	async: boolean;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorAttachState;

	/**
	 * Exposes invalidate for projector instances
	 */
	invalidate(): void;
}

export function ProjectorMixin<P, T extends Constructor<WidgetBase<P>>>(Base: T): T & Constructor<ProjectorMixin<P>> {
	class Projector extends Base {

		public projectorState: ProjectorAttachState;
		public properties: Readonly<P> & Readonly<ProjectorProperties>;
		private _async = true;
		private _projectionOptions: Partial<ProjectionOptions>;
		private _projection: Projection | undefined;
		private _scheduled: number | undefined;
		private _paused: boolean;
		private _boundDoRender: () => void;
		private _boundRender: Function;
		private _projectorChildren: DNode[] = [];
		private _projectorProperties: this['properties'] = {} as this['properties'];

		constructor(...args: any[]) {
			super(...args);
			const instanceData = widgetInstanceMap.get(this)!;
			instanceData.parentInvalidate = () => {
				this.scheduleRender();
			};
			this._projectionOptions = {};
			this._boundDoRender = this._doRender.bind(this);
			this._boundRender = this.__render__.bind(this);
			this.projectorState = ProjectorAttachState.Detached;
		}

		public append(root?: Element): void {
			const options = {
				type: AttachType.Append,
				root
			};

			return this._attach(options);
		}

		public merge(root?: Element): void {
			const options = {
				type: AttachType.Merge,
				root
			};

			return this._attach(options);
		}

		public pause() {
			if (this._scheduled) {
				window.cancelAnimationFrame(this._scheduled);
				this._scheduled = undefined;
			}
			this._paused = true;
		}

		public resume() {
			this._paused = false;
			this.scheduleRender();
		}

		public scheduleRender() {
			if (this.projectorState === ProjectorAttachState.Attached) {
				this.__setProperties__(this._projectorProperties);
				this.__setChildren__(this._projectorChildren);
				(this as any)._renderState = 1;
				if (!this._scheduled && !this._paused) {
					if (this._async) {
						this._scheduled = window.requestAnimationFrame(this._boundDoRender);
					}
					else {
						this._boundDoRender();
					}
				}
			}
		}

		public get async(): boolean {
			return this._async;
		}

		public set async(async: boolean) {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot change async mode');
			}
			this._async = async;
		}

		public setChildren(children: DNode[]): void {
			this.__setChildren__(children);
			this.scheduleRender();
		}

		public __setChildren__(children: DNode[]) {
			this._projectorChildren = [ ...children ];
			super.__setChildren__(children);
		}

		public setProperties(properties: this['properties']): void {
			this.__setProperties__(properties);
			this.scheduleRender();
		}

		public __setProperties__(properties: this['properties']): void {
			this._projectorProperties = { ...(properties as any) };
			super.__setCoreProperties__({ bind: this, baseRegistry: properties.registry });
			super.__setProperties__(properties);
		}

		@afterRender()
		public afterRender(result: DNode) {
			let node = result;
			if (typeof result === 'string' || result === null || result === undefined) {
				node = v('span', {}, [ result ]);
			}

			return node;
		}

		private _doRender() {
			this._scheduled = undefined;

			if (this._projection) {
				this._projection.update(this._boundRender());
			}
		}

		private _attach({ type, root = document.body }: AttachOptions): void {
			this.projectorState = ProjectorAttachState.Attached;
			this._projectionOptions = { ...this._projectionOptions, ...{ sync: !this._async } };
			switch (type) {
				case AttachType.Append:
					this._projection = dom.append(root, this._boundRender(), this, this._projectionOptions);
				break;
				case AttachType.Merge:
					this._projection = dom.merge(root, this._boundRender(), this , this._projectionOptions);
				break;
			}
		}
	}

	return Projector;
}

export default ProjectorMixin;
