import WidgetBase, { WidgetState, WidgetProperties, WidgetOptions } from './../../WidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';

export interface ButtonState extends WidgetState {
	disabled?: boolean;
	name?: string;
	label?: string;
}

export interface ButtonProperties extends WidgetProperties {
	label?: string;
}

export interface ButtonOptions extends WidgetOptions<ButtonState, ButtonProperties> { }

class Button extends WidgetBase<ButtonState, ButtonProperties> {
	private type: string = 'button';

	constructor(options: ButtonOptions) {
		super(options);
		this.tagName = 'button';
		this.nodeAttributes.push(this.buttonAttributes);
	}

	private buttonAttributes(this: Button): VNodeProperties {
		return { type: this.type, innerHTML: this.state.label };
	}
}

export default Button;
