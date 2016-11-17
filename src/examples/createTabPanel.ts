import { ComposeFactory } from 'dojo-compose/compose';
import { DNode, Widget, WidgetState, WidgetOptions, ContainerWidgetState } from './../bases/widgetBases';
import IdentityRegistry from 'dojo-core/IdentityRegistry';
import createWidgetBase from './../bases/createWidgetBase';
import d from './../util/d';
import Map from 'dojo-shim/Map';
import css from '../themes/structural/modules/TabbedMixin';
import tabbedPanelCss from '../themes/structural/modules/TabbedPanel';
import createTab from './createTab';

type WidgetFactory = ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>>;

interface Tab {
	id: string;
	childId: string;
	label: string;
	active: boolean;
	closeable: boolean;
}

interface TabPanelState extends ContainerWidgetState<Tab>  { };

interface TabPanelOptions extends WidgetOptions<TabPanelState> { };

type TabPanel = Widget<TabPanelState>;

interface TabPanelFactory extends ComposeFactory<TabPanel, TabPanelOptions> { };

const createTabPanel: TabPanelFactory = createWidgetBase.extend({
	tagName: `dojo-panel-tabbed.${tabbedPanelCss.tabs}`,
	childNodeRenderers: [
		function(this: TabPanel, registry: IdentityRegistry<WidgetFactory>, childState: Map<string, any>, stateFrom: any): DNode[] {
			const tabs = this.state.children || [];

			const tabBar: DNode = d('ul', {}, tabs.map((currentTab) => {
				const options: WidgetOptions<WidgetState> = {
					id: currentTab.id,
					listeners: {
						click: () => {
							const { children: tabs = []} = this.state;

							tabs.forEach((newTab: any) => {
								newTab.active = newTab.id === currentTab.id;
							});

							this.setState({ children: tabs });
						},
						close: () => {
							let { children: tabs = []} = this.state;

							tabs = tabs.filter((tab: any) => {
								return tab.id !== currentTab.id;
							});

							if (currentTab.active) {
								tabs[0].active = true;
							}

							this.setState({ children: tabs });
						}
					},
					state: currentTab
				};
				return d(createTab, options);
			}));

			const panelNode: DNode = d(`div.${css.panels}`, {}, tabs.map((tab) => {
				const state = childState.get(tab.childId);
				const options: WidgetOptions<WidgetState> = { id: state.id, stateFrom, state };

				return d('dojo-panel', { key: tab, 'data-visible': tab.active ? 'true' : 'false' }, [
						d(registry.get(state.type), options)
					]);
			}));

			return [ tabBar, panelNode ];
		}
	]
});

export default createTabPanel;
