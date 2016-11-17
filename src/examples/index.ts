import createMemoryStore from 'dojo-stores/createMemoryStore';
import { WidgetState, WidgetRegistry } from './../bases/widgetBases';
import { createProjector } from '../projector';
import createTabPanel from './createTabPanel';
import createWidgetBase from '../bases/createWidgetBase';

const createLabelWidget = createWidgetBase.extend({
	nodeAttributes: [
		function (this: any): any {
			return { innerHTML: this.state.label };
		}
	]
});

/**
 * A memory store which handles the widget states
 */
const widgetStore = createMemoryStore<any>({
	data: [
		{ id: 'widget-base-tab-panel', children: [
			{ id: 'tab-panel-1', label: 'tab 1', active: true },
			{ id: 'tab-panel-2', label: 'tab 2', closeable: true },
			{ id: 'tab-panel-3', label: 'tab 3' },
			{ id: 'tab-panel-4', label: 'tab 4' }
		]},
		{ id: 'tab-panel-1', type: 'dojo-widget', label: 'I am tabbed pannel one' },
		{ id: 'tab-panel-2', type: 'dojo-widget', label: 'I am tabbed pannel two' },
		{ id: 'tab-panel-3', type: 'dojo-widget', label: 'I am tabbed pannel three' },
		{ id: 'tab-panel-4', type: 'dojo-widget', label: 'I am tabbed pannel four' }
	]
});

const identityRegistry = new WidgetRegistry<WidgetState>();

identityRegistry.register('dojo-widget', createLabelWidget);

identityRegistry.get('dojo-widget');

const tabPanel = createTabPanel({
	id: 'widget-base-tab-panel',
	stateFrom: widgetStore,
	widgetFactoryRegistry: identityRegistry
});

const widgetBaseTabProjector = createProjector({ root: document.body });
widgetBaseTabProjector.append(tabPanel);
widgetBaseTabProjector.attach();
