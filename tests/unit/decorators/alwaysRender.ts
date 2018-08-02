const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { WidgetBase } from './../../../src/WidgetBase';
import { w } from './../../../src/d';
import { alwaysRender } from './../../../src/decorators/alwaysRender';
import { renderer } from '../../../src/vdom4';

describe('decorators/alwaysRender', () => {
	it('Widgets should always render', () => {
		let renderCount = 0;

		@alwaysRender()
		class Widget extends WidgetBase {
			render() {
				renderCount++;
				return super.render();
			}
		}

		let invalidate: any;
		class Parent extends WidgetBase {
			constructor() {
				super();
				invalidate = this.invalidate.bind(this);
			}
			render() {
				return w(Widget, {});
			}
		}

		const r = renderer(() => w(Parent, {}));
		r.sync = true;
		r.append();
		invalidate();
		assert.strictEqual(renderCount, 1);
		invalidate();
		assert.strictEqual(renderCount, 2);
	});
});
