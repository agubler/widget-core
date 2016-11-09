import createMemoryStore from 'dojo-stores/createMemoryStore';
import createWidget from '../createWidget';
import createPanel from '../createPanel';
import createTabbedPanel from '../createTabbedPanel';
import createButton from '../createButton';
import createWidgetBase from './../bases/createWidgetBase';
import { Child, RegistryProvider } from '../mixins/interfaces';
import d from '../util/d';
import { createProjector } from '../projector';
import Promise from 'dojo-shim/Promise';
import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBaseTabPanel from './createWidgetBaseTabPanel';

/**
 * A memory store which handles the widget states
 */
const widgetStore = createMemoryStore({
	data: [
		{ id: 'tabbed-panel', children: [ 'panel-1', 'panel-2', 'panel-3', 'panel-4' ] },
		{ id: 'panel-1', label: 'foo', closeable: true },
		{ id: 'foo', label: 'Validus os indoles. Demoveo ventosus illum ut refoveo saepius antehabeo euismod gravis aliquam ea aliquip. Autem ratis verto. Accumsan refero capio ludus consequat tincidunt roto modo ea dolore. Ad iustum blandit.' },
		{ id: 'panel-2', label: 'bar foo qut qux quux', active: true },
		{ id: 'bar', label: 'Si at humo euismod fatua melior praesent praemitto camur foras eros. Esca multo transverbero facilisi nisl exputo nisl.' },
		{ id: 'panel-3', label: 'qat' },
		{ id: 'baz', label: 'Odio vel inhibeo nostrud. Ad duis blandit facilisi hos multo nobis quibus zelus bene. Ideo veniam eum iriure ymo.' },
		{ id: 'panel-4', label: 'baz', closeable: true },
		{ id: 'qat', label: 'Sit pertineo at facilisis quidne qui et amet duis. Patria meus proprius immitto ne appellatio cogo jus. Cui genitus sudo. Suscipit abdo dignissim huic accumsan importunus inhibeo luptatum ut neque augue sagaciter. Iaceo odio exerci natu nonummy vel iaceo odio erat.' },
		{ id: 'widget-base-tab-panel', tabs: [
			{ label: 'tab 1', active: true },
			{ label: 'tab 2', closeable: true },
			{ label: 'tab 3' },
			{ label: 'tab 4' }
		]},
		{ id: 'd-example', visible: true }
	]
});

/**
 * This is a mock of dojo/app
 */
const widgetRegistry = {
	get(id: string | symbol): Promise<Child> {
		switch (id) {
		case 'panel-1':
			return Promise.resolve(panel1);
		case 'panel-2':
			return Promise.resolve(panel2);
		case 'panel-3':
			return Promise.resolve(panel3);
		case 'panel-4':
			return Promise.resolve(panel4);
		default:
			return Promise.reject(new Error('Unknown widget'));
		}
	},
	identify(value: Child): string | symbol {
		switch (value) {
		case panel1:
			return 'panel-1';
		case panel2:
			return 'panel-2';
		case panel3:
			return 'panel-3';
		case panel4:
			return 'panel-4';
		default:
			throw new Error('Not registered');
		}
	},
	create(factory: ComposeFactory<any, any>, options?: any): Promise<[ string, Child ]> {
		return factory(options);
	},
	has(id: string | symbol) {
		return Promise.resolve(true);
	}
};

const registryProvider: RegistryProvider<any> = {
	get(type: string) {
		if (type === 'widgets') {
			return widgetRegistry;
		}

		throw new Error('No such registry');
	}
};

const tabWidgets: Child[] = [];

tabWidgets.push(createWidget({
	state: {
		label: 'Tabbed Panel'
	},
	tagName: 'h1'
}));

const tabbedPanel = createTabbedPanel({
	id: 'tabbed-panel',
	stateFrom: widgetStore,
	registryProvider
});

tabWidgets.push(tabbedPanel);

const panel1 = createPanel({
	id: 'panel-1',
	stateFrom: widgetStore
});

panel1.append(createWidget({
	id: 'foo',
	stateFrom: widgetStore
}));

const panel2 = createPanel({
	id: 'panel-2',
	stateFrom: widgetStore
});

panel2.append(createWidget({
	id: 'bar',
	stateFrom: widgetStore
}));

const panel3 = createPanel({
	id: 'panel-3',
	stateFrom: widgetStore
});

panel3.append(createWidget({
	id: 'baz',
	stateFrom: widgetStore
}));

const panel4 = createPanel({
	id: 'panel-4',
	stateFrom: widgetStore
});

panel4.append(createWidget({
	id: 'qat',
	stateFrom: widgetStore
}));

const tabProjector = createProjector({ root: document.body });
tabProjector.append(tabWidgets);
tabProjector.attach();

const widgetBaseTabbedPanelHeader = createWidget({
	state: {
		label: 'Widget Base Tabbed Panel'
	},
	tagName: 'h1'
});

const widgetBaseTabbedPanel = createWidgetBaseTabPanel({
	id: 'widget-base-tab-panel',
	stateFrom: widgetStore
});

const widgetBasetabProjector = createProjector({ root: document.body });
widgetBasetabProjector.append([ widgetBaseTabbedPanelHeader, widgetBaseTabbedPanel ]);
widgetBasetabProjector.attach();

const basicDHeader = createWidget({
	state: {
		label: 'Basic `d` functionality Example'
	},
	tagName: 'h1'
});

const createBasicDWidget = createWidgetBase.extend({
	childNodeRenderers: [
		function(this: any): any[] {
			return [
				this.state.active ? d('div.active', { innerHTML: 'I must be active!' }) : null,
				d('div', { }, [
					d(createWidgetBase.extend({
						nodeAttributes: [
							function (this: any): any {
								return { innerHTML: this.state.label };
							}
						]
					}),
					{ id: 'example-child', state: { label: 'I am a nested widget!' } })
				])
			];
		}
	]
});

const basicDWidget = createBasicDWidget({
	id: 'd-example',
	stateFrom: widgetStore
});

const toggleActiveButton = createButton({
	state: {
		label: 'Toggle Active'
	},
	listeners: {
		click: {
			do() {
				return widgetStore.get('d-example').then((item: any) => {
					return widgetStore.patch(Object.assign({}, item, { active: !item.active }));
				});
			}
		}
	}
});

const basicDProjector = createProjector({ root: document.body });
basicDProjector.append([ basicDHeader, basicDWidget, toggleActiveButton ]);
basicDProjector.attach();

const buttonWidgets: Child[] = [];

buttonWidgets.push(createWidget({
	state: {
		label: 'Buttons'
	},
	tagName: 'h1'
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Button'
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Disabled',
		disabled: true
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Success',
		classes: ['success']
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Disabled',
		classes: ['success'],
		disabled: true
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Alert',
		classes: ['alert']
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Disabled',
		classes: ['alert'],
		disabled: true
	}
}));

const buttonDiv = document.createElement('div');
buttonDiv.classList.add('buttons');
document.body.appendChild(buttonDiv);
const buttonProjector = createProjector({ root: buttonDiv });
buttonProjector.append(buttonWidgets);
buttonProjector.attach();

const panelWidgets: Child[] = [];

panelWidgets.push(createWidget({
	state: {
		label: 'Resize Panel'
	},
	tagName: 'h1'
}));
