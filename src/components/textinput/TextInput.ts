import WidgetBase, { WidgetState, WidgetProperties, WidgetOptions } from './../../WidgetBase';

export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export interface TextInputState extends WidgetState {
	disabled?: boolean;
	value?: string;
	focused?: boolean;
	placeholder?: string;
}

export interface TextInputProperties extends WidgetProperties {
	disabled?: boolean;
	value?: string;
	focused?: boolean;
	placeholder?: string;
}

function valueReplacer(key: string, value: any): any {
	if (value instanceof RegExp) {
		return (`__RegExp(${value.toString()})`);
	}
	return value;
}

function valueReviver(key: string, value: any): any {
	if (value.toString().indexOf('__RegExp(') === 0) {
		const [ , regExpStr ] = value.match(/__RegExp\(([^\)]*)\)/);
		const [ , regExp, flags ] = regExpStr.match(/^\/(.*?)\/([gimy]*)$/);
		return new RegExp(regExp, flags);
	}
	return value;
}

export function valueToString(value: any): string {
	return value
		? Array.isArray(value) || typeof value === 'object'
		? JSON.stringify(value, valueReplacer) : String(value)
		: value === 0
			? '0' : value === false
			? 'false' : '';
}

export function stringToValue(str: string): any {
	try {
		const value = JSON.parse(str, valueReviver);
		return value;
	}
	catch (e) {
		if (/^(\-|\+)?([0-9]+(\.[0-9]+)?|Infinity)$/.test(str)) {
			return Number(str);
		}
		if (str) {
			return str;
		}
		return undefined;
	}
}

export interface TextInputOptions extends WidgetOptions<TextInputState, TextInputProperties> { }

class TextInput extends WidgetBase<TextInputState, TextInputProperties> {
	private type: string = 'input';

	constructor(options: TextInputOptions) {
		super(options);
		this.tagName = 'input';
		this.own(this.on('oninput', (event: TypedTargetEvent<HTMLInputElement>) => {
			this.value = event.target.value;
		}));
		this.nodeAttributes.push(this.textInputAttributes);
	}

	private textInputAttributes(this: TextInput) {
		const { type, value, state } = this;
		const { disabled, name, placeholder } = state;

		return { type, value, name, placeholder, afterCreate: this.afterCreate, disabled: Boolean(disabled) };
	}

	private afterCreate(element: HTMLInputElement) {
		const focused = this.state.focused;
		if (focused) {
			setTimeout(() => element.focus(), 0);
		}
		else if (!focused && document.activeElement === element) {
			element.blur();
		}
	}

	get value(this: TextInput): string {
		return valueToString(this.state.value);
	}

	set value(this: TextInput, value: string) {
		if (value !== this.state.value) {
			this.setState({ value: stringToValue(value) });
		}
	}
}

export default TextInput;
