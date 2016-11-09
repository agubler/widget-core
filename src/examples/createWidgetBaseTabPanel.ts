import createWidgetBase from '../bases/createWidgetBase';
import { Widget, WidgetState, WidgetOptions } from 'dojo-interfaces/widgetBases';
import createCloseableMixin from '../mixins/createCloseableMixin';
import d from '../util/d';
import css from '../themes/structural/modules/TabbedMixin';
import tabbedPanelCss from '../themes/structural/modules/TabbedPanel';

const createTab = createWidgetBase.mixin(createCloseableMixin)
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

export default createWidgetBase.extend({
	tagName: `dojo-panel-tabbed.${tabbedPanelCss.tabs}`,
	childNodeRenderers: [
		function(this: Widget<WidgetState & { tabs: any[] }>): any[] {
			let { tabs } = this.state;

			const tabBar: any = d('ul', {}, tabs.map((tab) => {
				const options = {
					id: tab.label,
					listeners: {
						click: (evt: any) => {
							tabs.forEach((newTab) => {
								newTab.active = newTab === tab;
							});
							this.setState({ tabs });
						},
						close: (evt: any) => {
							tabs = tabs.filter((newTab) => {
								return newTab !== tab;
							});
							if (tab.active) {
								tabs[0].active = true;
							}
							this.setState({ tabs });
						}
					},
					state: tab
				};
				return d(createTab, <any> options);
			}));

			const panelNode: any = d(`div.${css.panels}`, {}, tabs.map((tab) => {
				return d('dojo-panel', { key: tab, 'data-visible': tab.active ? 'true' : 'false' }, [
							d('div', { innerHTML: JSON.stringify({ id: tab.label}), key: tab })
					]);
			}));

			return [ tabBar, panelNode ];
		}
	]
});
