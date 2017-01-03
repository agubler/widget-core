import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { DNode, Widget, WidgetOptions, WidgetProperties, WidgetState } from '../../interfaces';
import createWidgetBase from '../../createWidgetBase';
import { v } from '../../d';

export interface DialogState extends WidgetState {
	title?: string;
	open?: boolean;
	modal?: boolean;
}

export interface DialogProperties extends WidgetProperties {
	title?: string;
	open?: boolean;
	modal?: boolean;
	onopen?(): void;
	onclose?(): void;
}

export interface DialogOptions extends WidgetOptions<DialogState, DialogProperties> { }

export type Dialog = Widget<DialogState, DialogProperties> & {
	onclose(): void;
	onUnderlayClick(): void;
};

export interface DialogFactory extends ComposeFactory<Dialog, DialogOptions> { };

function onContentClick(this: Dialog, event: MouseEvent) {
	event.stopPropagation();
}

const createDialogWidget: DialogFactory = createWidgetBase
	.mixin({
		mixin: {
			onclose(this: Dialog) {
				if (this.properties.onclose) {
					this.properties.onclose.call(this);
				}
			},
			onUnderlayClick(this: Dialog) {
				if (this.state.modal) {
					return;
				}
				this.onclose.call(this);
			},
			getChildrenNodes: function (this: Dialog): DNode[] {
				const children: DNode[] = [
					v('div.title', { innerHTML: this.state.title }),
					v('div.close', {
						innerHTML: '✖',
						onclick: this.onclose
					}),
					v('div.content', this.children)
				];
				const content: DNode = v('div.content', { onclick: onContentClick }, children);
				return [ content ];
			},

			nodeAttributes: [
				function(this: Dialog): VNodeProperties {
					this.state.open && this.properties.onopen && this.properties.onopen();
					return {
						onclick: this.onUnderlayClick,
						'data-open': this.state.open ? 'true' : 'false',
						'data-modal': this.state.modal ? 'true' : 'false'
					};
				},
				function(this: Dialog): VNodeProperties {
					return { 'data-modal': this.state.modal ? 'true' : 'false' };
				}
			],
			// TODO: CSS modules
			classes: [ 'dialog' ]
		}
	});

export default createDialogWidget;
