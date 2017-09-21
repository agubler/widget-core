import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import { VNode } from '@dojo/interfaces/vdom';
import { WidgetBase } from './../../../src/WidgetBase';
import { define } from './../../../src/decorators/registry';
import { v, w } from './../../../src/d';

import createTestWidget from './../../support/createTestWidget';

registerSuite({
	name: 'decorators/registry',
	'register items against created default registry'() {
		class RegistryWidget extends WidgetBase {
			render() {
				return v('registry-item');
			}
		}

		@define('registry-item', RegistryWidget)
		class TestWidget extends WidgetBase {
			render() {
				return w('registry-item', {});
			}
			invalidate() {
				super.invalidate();
			}
		}

		const widget = createTestWidget(TestWidget, {});
		let vnode = widget.__render__() as VNode;
		assert.strictEqual(vnode.vnodeSelector, 'registry-item');
		widget.getWidgetUnderTest().invalidate();
		vnode = widget.__render__() as VNode;
		assert.strictEqual(vnode.vnodeSelector, 'registry-item');

	},
	'define items on the local registry'() {
		class RegistryWidget extends WidgetBase {
			render() {
				return v('registry-item');
			}
		}

		class OtherRegistryWidget extends WidgetBase {
			render() {
				return v('other-registry-item');
			}
		}

		@define('registry-item', RegistryWidget)
		@define('other-registry-item', OtherRegistryWidget)
		class TestWidget extends WidgetBase {
			render() {
				return [
					w('registry-item', {}),
					w('other-registry-item', {})
				];
			}
		}
		const widget = createTestWidget(TestWidget, { });
		const vnode = widget.__render__() as VNode[];
		assert.strictEqual(vnode[0].vnodeSelector, 'registry-item');
		assert.strictEqual(vnode[1].vnodeSelector, 'other-registry-item');
	},
	'supports the same widget being used twice'() {
		class RegistryWidget extends WidgetBase {
			render() {
				return v('registry-item');
			}
		}

		@define('registry-item', RegistryWidget)
		class RegistryItemWidget extends WidgetBase {
			render() {
				return w('registry-item', {});
			}
		}

		class TestWidget extends WidgetBase {
			render() {
				return [
					w(RegistryItemWidget, { key: '1' }),
					w(RegistryItemWidget, { key: '2' })
				];
			}
		}
		const widget = createTestWidget(TestWidget, {});
		let vnode = widget.__render__() as VNode[];
		assert.strictEqual(vnode[0].vnodeSelector, 'registry-item');
		assert.strictEqual(vnode[1].vnodeSelector, 'registry-item');
	}
});
