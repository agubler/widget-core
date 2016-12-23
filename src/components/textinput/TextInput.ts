import WidgetBase, { WidgetState, WidgetProperties, WidgetOptions } from './../../WidgetBase';

export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export interface TextInputState extends WidgetState {
	disabled?: boolean;
	value?: string;
}

export interface TextInputProperties extends WidgetProperties {
	disabled?: boolean;
	value?: string;
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

/**
 * Internal function to convert a state value to a string
 * @param value The value to be converted
 */
export function valueToString(value: any): string {
	return value
		? Array.isArray(value) || typeof value === 'object'
		? JSON.stringify(value, valueReplacer) : String(value)
		: value === 0
			? '0' : value === false
			? 'false' : '';
}

/**
 * Internal function to convert a string to the likely more complex value stored in
 * state
 * @param str The string to convert to a state value
 */
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
		const { disabled, name } = state;

		return { type, value, name, disabled: Boolean(disabled) };

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
