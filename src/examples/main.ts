import { ProjectorMixin } from './../mixins/Projector';
import { WidgetBase } from './../WidgetBase';
import { v } from './../d';
import uuid from '@dojo/core/uuid';

let flag = true;

class Wid extends WidgetBase<any> {
	render() {
		let children: any[] = [
			v('div', { id: '4', classes: { blue: true } }, [ this.properties.other ]),
			v('div', [ 'static' ])
		];
		if (flag) {
			children.reverse();
		}
		const props: any = {
			props: {
				key: '2',
				id: 'a'
			}
		};

		if (this.properties.red) {
			props.class = {
				red: true
			};
		}
		return v('div', props, [ this.properties.text, ...children ]);
	}
}

const Projector = ProjectorMixin(Wid);
const projector = new Projector();
const text = uuid();
projector.setProperties({ text, red: flag });
setInterval(() => {
	flag = !flag;
	projector.setProperties({ text, other: uuid(), red: flag });
}, 1000);
projector.attach();
