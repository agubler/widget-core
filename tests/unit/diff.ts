import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { reference, shallow, auto, always, ignore } from '../../src/diff';
import WidgetBase from '../../src/WidgetBase';

registerSuite({
	name: 'diff',
	'ALWAYS'() {
		const foo = {};
		const result = always(foo, foo);
		assert.equal(result.value, foo);
		assert.isTrue(result.changed);
	},
	'IGNORE'() {
		const result = ignore('foo', 'bar');
		assert.equal(result.value, 'bar');
		assert.isFalse(result.changed);
	},
	'REFERENCE'() {
		const foo = {
			bar: 'bar'
		};
		const bar = {
			bar: 'bar'
		};
		const result = reference(foo, bar);
		assert.equal(result.value, bar);
		assert.isTrue(result.changed);
	},
	'SHALLOW': {
		'object'() {
			const foo = {
				bar: 'bar'
			};
			const bar = {
				bar: 'bar'
			};
			let result = shallow(foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);

			bar.bar = 'qux';
			result = shallow(foo, bar);
			assert.equal(result.value, bar);
			assert.isTrue(result.changed);

			const baz = {
				bar: 'bar',
				baz: 'baz'
			};
			result = shallow(foo, baz);
			assert.equal(result.value, baz);
			assert.isTrue(result.changed);

			result = shallow('foo', baz);
			assert.equal(result.value, baz);
			assert.isTrue(result.changed);
		},
		'array'() {
			const foo = [ 1, 2, 3 ];
			const bar = [ 1, 2, 3 ];
			let result = shallow(foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);

			const qux = [ 1, 3, 2];
			result = shallow(foo, qux);
			assert.equal(result.value, qux);
			assert.isTrue(result.changed);
		}
	},
	'AUTO': {
		'widget constructor'() {
			class Foo extends WidgetBase {}
			class Bar extends WidgetBase {}
			let result = auto(Foo, Bar);
			assert.equal(result.value, Bar);
			assert.isTrue(result.changed);
		},
		'function'() {
			const foo = () => {};
			const bar = () => {};
			let result = auto(foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);
		},
		'object'() {
			const foo = {
				bar: 'bar'
			};
			const bar = {
				bar: 'bar'
			};
			let result = auto(foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);

			bar.bar = 'qux';
			result = auto(foo, bar);
			assert.equal(result.value, bar);
			assert.isTrue(result.changed);
		},
		'other'() {
			const foo = new Date();
			let result = auto(foo, foo);
			assert.equal(result.value, foo);
			assert.isFalse(result.changed);

			const bar = new Date();
			result = auto(foo, bar);
			assert.equal(result.value, bar);
			assert.isTrue(result.changed);
		}
	}
});
