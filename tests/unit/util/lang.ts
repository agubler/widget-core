import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { insertInArray, stringToValue, valueToString, isChild } from '../../../src/util/lang';
import createWidgetBase from '../../../src/bases/createWidgetBase';

registerSuite({
	name: 'util/lang',
	'insertInArray()': {
		'position "before"'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 'before', last);
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], first);
			assert.strictEqual(result[1], item);
			assert.strictEqual(result[2], last);
			assert.strictEqual(list, result);
		},
		'position "after"'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 'after', first);
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], first);
			assert.strictEqual(result[1], item);
			assert.strictEqual(result[2], last);
			assert.strictEqual(list, result);
		},
		'position "first"'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 'first');
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], item);
			assert.strictEqual(result[1], first);
			assert.strictEqual(result[2], last);
			assert.strictEqual(list, result);
		},
		'position "last"'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 'last');
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], first);
			assert.strictEqual(result[1], last);
			assert.strictEqual(result[2], item);
			assert.strictEqual(list, result);
		},
		'position number'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 1);
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], first);
			assert.strictEqual(result[1], item);
			assert.strictEqual(result[2], last);
			assert.strictEqual(list, result);
		},
		'throws': {
			'invalid position'() {
				assert.throws(() => {
					insertInArray([], {}, <any> undefined);
				}, Error);
			},
			'invalid before reference'() {
				assert.throws(() => {
					insertInArray([], {}, 'before', {});
				}, Error);
			},
			'invalid after reference'() {
				assert.throws(() => {
					insertInArray([], {}, 'after', {});
				}, Error);
			},
			'invalid number position'() {
				assert.throws(() => {
					insertInArray([], {}, -1);
				}, Error);
				assert.throws(() => {
					insertInArray([], {}, 2);
				}, Error);
				assert.throws(() => {
					insertInArray([], {}, Infinity);
				}, Error);
			}
		}
	},
	'stringToValue()'() {
		assert.isUndefined(stringToValue(''), 'emtpy string returns undefined');
		assert.deepEqual(stringToValue('["foo",true,2]'), [ 'foo', true, 2 ]);
		assert.deepEqual(stringToValue('{"foo":{"bar":true},"bar":[1,2,3]}'), {
			foo: { bar: true },
			bar: [ 1, 2, 3 ]
		});
		assert.strictEqual(stringToValue('{foo: "bar"}'), '{foo: "bar"}');
		assert.strictEqual(stringToValue('1'), 1);
		assert.strictEqual(stringToValue('0'), 0);
		assert.strictEqual(stringToValue('Infinity'), Infinity);
		assert.strictEqual(stringToValue('3.141592'), 3.141592);
		assert.strictEqual(stringToValue('-2.12345'), -2.12345);
		assert.instanceOf(stringToValue('{"foo":"__RegExp(/foo/g)"}').foo, RegExp);
		assert.isTrue(stringToValue('true'));
		assert.isFalse(stringToValue('false'));
	},
	'valueToString()'() {
		assert.strictEqual(valueToString({ foo: 2 }), '{"foo":2}');
		assert.strictEqual(valueToString([ 1, 2, 3 ]), '[1,2,3]');
		assert.strictEqual(valueToString(1.23), '1.23');
		assert.strictEqual(valueToString(undefined), '');
		assert.strictEqual(valueToString(null), '');
		assert.strictEqual(valueToString(NaN), '');
		assert.strictEqual(valueToString(Infinity), 'Infinity');
		assert.strictEqual(valueToString({ foo: /foo/g }), '{"foo":"__RegExp(/foo/g)"}');
		assert.strictEqual(valueToString(0), '0');
		assert.strictEqual(valueToString(true), 'true');
		assert.strictEqual(valueToString(false), 'false');
	},
	'isChild()'() {
		const child = createWidgetBase();
		const notChild = {};
		assert.isTrue(isChild(child));
		assert.isFalse(isChild(notChild));
	},
	'getRemoveHandle()': {
		/* TODO: create tests */
	}
});
