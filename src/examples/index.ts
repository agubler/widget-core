import createMemoryStore from 'dojo-stores/createMemoryStore';
import { WidgetState, WidgetRegistry } from './../bases/widgetBases';
import { createProjector } from '../projector';
import createTabPanel from './createTabPanel';
import createButton from '../createButton';
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
			{ id: 'tab-1', childId: 'tab-panel-1', label: 'tab 1', active: true },
			{ id: 'tab-2', childId: 'tab-panel-2', label: 'tab 2', closeable: true },
			{ id: 'tab-3', childId: 'tab-panel-3', label: 'tab 3' },
			{ is: 'tab-4', childId: 'tab-panel-4', label: 'tab 4' }
		]},
		{ id: 'tab-panel-1', type: 'dojo-widget', label: 'I am tabbed pannel one' },
		{ id: 'tab-panel-2', type: 'dojo-widget', label: 'I am tabbed pannel two' },
		{ id: 'tab-panel-3', type: 'dojo-widget', label: 'I am tabbed pannel three' },
		{ id: 'tab-panel-4', type: 'dojo-widget', label: 'I am tabbed pannel four' }
	]
});

const identityRegistry = new WidgetRegistry<WidgetState>();

identityRegistry.register('dojo-widget', createLabelWidget);
identityRegistry.register('dojo-button', createButton);

const tabPanel = createTabPanel({
	id: 'widget-base-tab-panel',
	stateFrom: widgetStore,
	widgetFactoryRegistry: identityRegistry
});

let i = 1;

setInterval(() => {
	widgetStore.patch({ id: 'tab-panel-1', label: 'I am tabbed panel one ' + i });
	i++;
}, 200);

let label = true;

setInterval(() => {
	const data = {
		id: 'tab-panel-3',
		type: label ? 'dojo-widget' : 'dojo-button',
		label: label ? 'I am a boring label' : 'Look i am an exicting button!'
	};

	label = !label;

	widgetStore.patch(data);
}, 1000);

const widgetBaseTabProjector = createProjector({ root: document.body });
widgetBaseTabProjector.append(tabPanel);
widgetBaseTabProjector.attach();
