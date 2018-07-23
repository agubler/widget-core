const { describe, it } = intern.getInterface('bdd');

import { renderer } from '../../src/vdom3';
import { WidgetBase } from '../../src/WidgetBase';
import { v, w } from '../../src/d';

class ChildWidget extends WidgetBase<any> {
	private _text = 'Child';
	private _counter = 0;

	constructor() {
		super();
		setInterval(() => {
			this._counter++;
			this.invalidate();
		}, 500);
	}

	render() {
		return v(
			'div',
			{
				classes: ['one', this._counter % 2 ? 'two' : null]
			},
			[`${this._text} ${this._counter}`, null, undefined, 'Another']
		);
	}
}

class TestWidget extends WidgetBase<any> {
	render() {
		return v('div', { styles: { width: '200px', height: '200px', background: 'red' }, classes: ['one', 'two'] }, [
			'Test',
			undefined,
			w(ChildWidget, { counter: this.properties.counter || 0 }),
			null
		]);
	}
}

describe('vdom1', () => {
	it('test', () => {
		// const renderer = new Renderer();
		try {
			const r = renderer(() => w(TestWidget, {}));

			r.append();
		} catch (error) {
			console.log(error);
		}
		return new Promise(() => {});
	});
});
