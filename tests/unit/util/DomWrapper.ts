import * as registerSuite from 'intern!object';
import { WidgetBase } from './../../../src/WidgetBase';
import { v, w } from './../../../src/d';
import { DomWrapper } from '../../../src/util/DomWrapper';
import global from '@dojo/core/global';
import { stub } from 'sinon';
import * as assert from 'intern/chai!assert';
import ProjectorMixin from '../../../src/mixins/Projector';

let rAF: any;
let projector: any;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(0).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'DomWrapper',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
	},

	afterEach() {
		rAF.restore();
		projector && projector.destroy();
	},

	'properties and attributes are maintained from element'() {
		const domNode: any = document.createElement('custom-element');
		domNode.foo = 'blah';
		domNode.setAttribute('original', 'woop');

		const DomNode = DomWrapper(domNode);
		class Foo extends WidgetBase {
			render() {
				return v('div', [
					w(DomNode, { props: { id: 'foo', extra: { foo: 'bar' } } })
				]);
			}
		}
		const Projector = ProjectorMixin(Foo);
		projector = new Projector();
		const root = document.createElement('div');
		projector.attach(root);
		resolveRAF();
		assert.equal(domNode.foo, 'blah');
		assert.equal(domNode.getAttribute('original'), 'woop');
	},
	'supports events'() {
		const domNode: any = document.createElement('custom-element');
		const root = document.createElement('div');
		let clicked = false;

		const DomNode = DomWrapper(domNode);
		class Foo extends WidgetBase {
			_onClick() {
				clicked = true;
			}
			render() {
				return w(DomNode, { onclick: this._onClick });
			}
		}
		const Projector = ProjectorMixin(Foo);
		projector = new Projector();
		projector.attach(root);
		resolveRAF();
		domNode.click();
		assert.isTrue(clicked);
	},
	'onAttached'() {
		let attached = false;
		const domNode: any = document.createElement('custom-element');
		const root = document.createElement('div');

		const DomNode = DomWrapper(domNode, {
			onAttached() {
				attached = true;
			}
		});
		class Foo extends WidgetBase {
			render() {
				return w(DomNode, {});
			}
		}
		const Projector = ProjectorMixin(Foo);
		projector = new Projector();
		projector.attach(root);
		resolveRAF();
		assert.isTrue(attached);
	}
});
