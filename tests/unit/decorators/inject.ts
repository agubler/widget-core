import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import { inject } from './../../../src/decorators/inject';
import { WidgetBase } from './../../../src/WidgetBase';
import { Registry } from './../../../src/Registry';
import { Injector } from './../../../src/Injector';
import { WidgetProperties } from './../../../src/interfaces';

import createTestWidget from './../../support/createTestWidget';

let injectorOne = new Injector({ foo: 'bar' });
let injectorTwo = new Injector({ bar: 'foo' });
let registry: Registry;

registerSuite({
	name: 'decorators/inject',
	beforeEach() {
		registry = new Registry();
		injectorOne = new Injector({ foo: 'bar' });
		injectorTwo = new Injector({ bar: 'foo' });
		registry.defineInjector('inject-one', injectorOne);
		registry.defineInjector('inject-two', injectorTwo);
	},
	beforeProperties() {
		function getProperties(context: any, properties: WidgetProperties): WidgetProperties {
			return context;
		}

		@inject({ name: 'inject-one', getProperties })
		class TestWidget extends WidgetBase<any> {}
		const widget = createTestWidget(TestWidget, { registry });
		assert.strictEqual(widget.getWidgetUnderTest().properties.foo, 'bar');
	},
	'multiple injectors'() {
		function getPropertiesOne(context: any, properties: WidgetProperties): WidgetProperties {
			return context;
		}
		function getPropertiesTwo(context: any, properties: WidgetProperties): WidgetProperties {
			return context;
		}

		@inject({ name: 'inject-one', getProperties: getPropertiesOne })
		@inject({ name: 'inject-two', getProperties: getPropertiesTwo })
		class TestWidget extends WidgetBase<any> {}
		const widget = createTestWidget(TestWidget, { registry });
		assert.strictEqual(widget.getWidgetUnderTest().properties.foo, 'bar');
		assert.strictEqual(widget.getWidgetUnderTest().properties.bar, 'foo');
	},
	'context are only attached once'() {
		let invalidateCount = 0;
		function getProperties(context: any, properties: WidgetProperties): WidgetProperties {
			return context;
		}

		@inject({ name: 'inject-one', getProperties })
		class TestWidget extends WidgetBase<any> {}
		const widget = createTestWidget(TestWidget, { registry });
		widget.getWidgetUnderTest().__setProperties__({});
		widget.getWidgetUnderTest().on('invalidated', () => {
			invalidateCount++;
		});
		injectorOne.set({});
		assert.strictEqual(invalidateCount, 1);
	},
	'programmatic registration'() {
		function getPropertiesOne(context: any, properties: WidgetProperties): WidgetProperties {
			return context;
		}
		function getPropertiesTwo(context: any, properties: WidgetProperties): WidgetProperties {
			return context;
		}

		class TestWidget extends WidgetBase<any> {
			constructor() {
				super();
				inject({ name: 'inject-one', getProperties: getPropertiesOne })(this);
				inject({ name: 'inject-two', getProperties: getPropertiesTwo })(this);
			}
		}
		const widget = createTestWidget(TestWidget, { registry });
		assert.strictEqual(widget.getWidgetUnderTest().properties.foo, 'bar');
		assert.strictEqual(widget.getWidgetUnderTest().properties.bar, 'foo');
	}
});
