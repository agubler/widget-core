import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetProperties } from './../../src/interfaces';
import createWidgetBase from '../../src/createWidgetBase';
import { v, w, registry, WNODE, HNODE, isWNode, isHNode } from '../../src/d';
import FactoryRegistry from './../../src/FactoryRegistry';

class TestFactoryRegistry extends FactoryRegistry {
	clear() {
		this.registry.clear();
	}
}

registerSuite({
	name: 'd',
	'provides default factory registry'() {
		assert.isObject(registry);
	},
	w: {
		'create WNode wrapper'() {
			const properties: WidgetProperties = { id: 'id', classes: [ 'world' ] };
			const dNode = w(createWidgetBase, properties);
			assert.deepEqual(dNode.factory, createWidgetBase);
			assert.deepEqual(dNode.properties, { id: 'id', classes: [ 'world' ]});
			assert.equal(dNode.type, WNODE);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isHNode(dNode));
		},
		'create WNode wrapper using a factory label'() {
			registry.define('my-widget', createWidgetBase);
			const properties: WidgetProperties = { id: 'id', classes: [ 'world' ] };
			const dNode = w('my-widget', properties);
			assert.deepEqual(dNode.factory, 'my-widget');
			assert.deepEqual(dNode.properties, { id: 'id', classes: [ 'world' ] });
			assert.equal(dNode.type, WNODE);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isHNode(dNode));
		},
		'create WNode wrapper with children'() {
			const properties: WidgetProperties = { id: 'id', classes: [ 'world' ] };
			const dNode = w(createWidgetBase, properties, [ w(createWidgetBase, properties) ]);
			assert.deepEqual(dNode.factory, createWidgetBase);
			assert.deepEqual(dNode.properties, { id: 'id', classes: [ 'world' ] });
			assert.lengthOf(dNode.children, 1);
			assert.equal(dNode.type, WNODE);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isHNode(dNode));
		}
	},
	v: {
		'create HNode wrapper'() {
			const hNode = v('div');
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 0);
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		},
		'create HNode wrapper with options'() {
			const hNode = v('div', { innerHTML: 'Hello World' });
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 0);
			const render = hNode.render();
			assert.equal(render.vnodeSelector, 'div');
			assert.equal(render.properties && render.properties.innerHTML, 'Hello World');
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		},
		'create HNode wrapper with children'() {
			const hNode = v('div', {}, [ v('div'), v('div') ]);
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 2);
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		},
		'create HNode wrapper with children as options param'() {
			const hNode = v('div', [ v('div'), v('div') ]);
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 2);
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		},
		'create HNode wrapper with text node children'() {
			const hNode = v('div', {}, [ 'This Text Node', 'That Text Node' ]);
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 2);
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		}
	},
	util: {
		'isWNode returns false for null'() {
			assert.isFalse(isWNode(null));
		},
		'isWNode returns false for a string'() {
			assert.isFalse(isWNode('string'));
		},
		'isHNode returns false for null'() {
			assert.isFalse(isHNode(null));
		},
		'isHNode returns false for a string'() {
			assert.isFalse(isHNode('string'));
		}
	}
});
