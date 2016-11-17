import createWidgetBase from '../bases/createWidgetBase';
import { ComposeFactory } from 'dojo-compose/compose';
import { Widget, WidgetState, WidgetOptions } from './../bases/widgetBases';
import createCloseableMixin from '../mixins/createCloseableMixin';
import d from '../util/d';
import css from '../themes/structural/modules/TabbedMixin';

export interface TabOptions extends WidgetOptions<WidgetState> { };

export type Tab = Widget<WidgetState>;

export interface TabFactory extends ComposeFactory<Tab, TabOptions> { };

const createTab: TabFactory = createWidgetBase.mixin(createCloseableMixin)
.mixin({
	initialize(instance: Widget<WidgetState> & { listeners: any }, options: WidgetOptions<WidgetState>) {
		if (options.listeners) {
			instance.listeners = options.listeners;
		}
	}
})
.extend({
	tagName: 'li',
	nodeAttributes: [
		function(this: Widget<WidgetState & { active: boolean }>): any {
			return { 'data-active': this.state.active ? 'true' : 'false' };
		}
	],
	childNodeRenderers: [
		function(this: Widget<WidgetState & { closeable: boolean, label: string }> & { listeners: any }): any[] {
			return [
				this.state.label ? d(`div.${css['tab-label']}`, { innerHTML: this.state.label, onclick: this.listeners.click }) : null,
				this.state.closeable ? d('div', { onclick: this.listeners.close }) : null
			];
		}
	]
});

export default createTab;
