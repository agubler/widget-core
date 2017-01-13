import { VNodeProperties } from 'dojo-interfaces/vdom';
import { ComposeFactory } from 'dojo-compose/compose';
import createStateful from 'dojo-compose/bases/createStateful';
import createCancelableEvent from 'dojo-compose/bases/createCancelableEvent';
import { EventCancelableObject, Handle } from 'dojo-interfaces/core';
import { EventedListener, Stateful } from 'dojo-interfaces/bases';
import { assign } from 'dojo-core/lang';
import { NodeAttributeFunction, WidgetProperties, WidgetOptions, WidgetState } from './../interfaces';

export interface FormFieldMixinProperties extends WidgetProperties {
	/**
	 * Whether the field is currently disabled or not
	 */
	disabled?: boolean;

	/**
	 * The form widget's name
	 */
	name?: string;

	/**
	 * The current value
	 */
	value?: string;

	/**
	 * Form type
	 */
	type?: string;
}

export interface FormFieldMixinState extends WidgetState {
	value?: string;
}

export interface ValueChangeEvent extends EventCancelableObject<'value:changed', FormFieldMixin<FormFieldMixinProperties>> {
	/**
	 * The event type (in this case, `valuechange`)
	 */
	type: 'value:changed';

	/**
	 * The previous value before this event
	 */
	oldValue: string;

	/**
	 * The current value when this event fires
	 */
	value: string;
}

export interface FormField<P extends FormFieldMixinProperties> {
	/**
	 * An array of functions that generate the node attributes on a render
	 */
	nodeAttributes: NodeAttributeFunction<this>[];

	/**
	 * Form field properties
	 */
	readonly properties?: P;
}

export interface FormFieldOverride {
	/**
	 * Add listener for a `valuechange` event, emitted when the value on the widget changes
	 */
	on(type: 'value:changed', listener: EventedListener<FormFieldMixin<FormFieldMixinProperties>, ValueChangeEvent>): Handle;

}

export type FormFieldMixin<P extends FormFieldMixinProperties> = FormField<P> & Stateful<FormFieldMixinState> & FormFieldOverride

export interface FormMixinFactory extends ComposeFactory<FormFieldMixin<FormFieldMixinProperties>, WidgetOptions<FormFieldMixinState, FormFieldMixinProperties>> { }

const defaultFormFieldProperties: FormFieldMixinProperties = {
	disabled: false,
	name: undefined,
	type: undefined
};

const createFormMixin: FormMixinFactory = createStateful
	.mixin({
		mixin: {
			get value(this: FormFieldMixin<FormFieldMixinProperties>): string | undefined {
				return this.state['value'];
			},

			set value(this: FormFieldMixin<FormFieldMixinProperties>, value: string | undefined) {
				const { state: { value: oldValue } } = this;
				if (value !== oldValue) {
					const valueChangedEvent = createCancelableEvent({ type: 'value:changed', target: this });
					this.emit(assign(valueChangedEvent, { oldValue, value }));
					if (!valueChangedEvent.defaultPrevented) {
						this.setState({ value });
					}
				}
			},

			nodeAttributes: [
				function (this: FormFieldMixin<FormFieldMixinProperties>): VNodeProperties {
					const { properties: { type, name, disabled } = defaultFormFieldProperties, state: { value } } = this;

					return { type, value, name, disabled: Boolean(disabled) };
				}
			]
		}
	});

export default createFormMixin;
