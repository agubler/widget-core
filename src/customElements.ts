import { assign } from '@dojo/core/lang';
import { from as arrayFrom } from '@dojo/shim/array';
import global from '@dojo/shim/global';
import { Constructor, DNode, VirtualDomProperties, WidgetProperties } from './interfaces';
import { WidgetBase } from './WidgetBase';
import { v, w } from './d';
import { ProjectorMixin } from './mixins/Projector';
import { VNode } from '@dojo/interfaces/vdom';

/**
 * @type CustomElementAttributeDescriptor
 *
 * Describes a custom element attribute
 *
 * @property attributeName   The name of the attribute on the DOM element
 * @property propertyName    The name of the property on the widget
 * @property value           A function that takes a string or null value, and returns a new value. The widget's property will be set to the new value.
 */
export interface CustomElementAttributeDescriptor {
	attributeName: string;
	propertyName?: string;
	value?: (value: string | null) => any;
}

/**
 * @type CustomElementPropertyDescriptor
 *
 * Describes a widget property exposed via a custom element
 *
 * @property propertyName        The name of the property on the DOM element
 * @property widgetPropertyName  The name of the property on the widget
 * @property getValue            A transformation function on the widget's property value
 * @property setValue            A transformation function on the DOM elements property value
 */
export interface CustomElementPropertyDescriptor {
	propertyName: string;
	widgetPropertyName?: string;
	getValue?: (value: any) => any;
	setValue?: (value: any) => any;
}

/**
 * @type CustomElementEventDescriptor
 *
 * Describes a custom element event
 *
 * @property propertyName    The name of the property on the widget that takes a function
 * @property eventName       The type of the event to emit (it will be a CustomEvent object of this type)
 */
export interface CustomElementEventDescriptor {
	propertyName: string;
	eventName: string;
}

/**
 * Defines a custom element initializing function. Passes in initial properties so they can be extended
 * by the initializer.
 */
export interface CustomElementInitializer {
	(properties: WidgetProperties): void;
}

export enum ChildrenType {
	DOJO = 'DOJO',
	ELEMENT = 'ELEMENT'
}

/**
 * @type CustomElementDescriptor
 *
 * Describes a custom element.
 *
 * @property tagName             The tag name to register this widget under. Tag names must contain a "-"
 * @property widgetConstructor   widget Constructor that will return the widget to be wrapped in a custom element
 * @property attributes          A list of attributes to define on this element
 * @property properties          A list of properties to define on this element
 * @property events              A list of events to expose on this element
 * @property initialization      A method to run to set custom properties on the wrapped widget
 */
export interface CustomElementDescriptor {
	/**
	 * The name of the custom element tag
	 */
	tagName: string;

	/**
	 * Widget constructor that will create the widget
	 */
	widgetConstructor: Constructor<WidgetBase<WidgetProperties>>;

	/**
	 * List of attributes on the custom element to map to widget properties
	 */
	attributes?: CustomElementAttributeDescriptor[];

	/**
	 * List of widget properties to expose as properties on the custom element
	 */
	properties?: CustomElementPropertyDescriptor[];

	/**
	 * List of events to expose
	 */
	events?: CustomElementEventDescriptor[];

	/**
	 * Initialization function called before the widget is created (for custom property setting)
	 */
	initialization?: CustomElementInitializer;

	/**
	 *
	 */
	childrenType?: ChildrenType;
}

/**
 * @type CustomElement
 *
 * A custom element extends upon a regular HTMLElement but adds fields for describing and wrapping a widget constructor.
 *
 * @property getWidgetConstructor Return the widget constructor for this element
 * @property getDescriptor        Return the element descriptor for this element
 * @property getWidgetInstance    Return the widget instance that this element wraps
 * @property setWidgetInstance    Set the widget instance for this element
 */
export interface CustomElement extends HTMLElement {
	getWidgetConstructor(): Constructor<WidgetBase<WidgetProperties>>;
	getDescriptor(): CustomElementDescriptor;
	getWidgetInstance(): ProjectorMixin<any>;
	setWidgetInstance(instance: ProjectorMixin<any>): void;
}

export interface CustomElementWrapperOptions {
	childrenType?: ChildrenType;
}

export type CustomElementWrapperProperties = VirtualDomProperties & WidgetProperties;

export type CustomElementWrapper = Constructor<WidgetBase<CustomElementWrapperProperties>>;

export function CustomElementWrapper(
	domNode: CustomElement,
	options: CustomElementWrapperOptions = {}
): CustomElementWrapper {
	const { childrenType = ChildrenType.DOJO } = options;

	return class extends WidgetBase<CustomElementWrapperProperties> {

		private _firstRender = true;

		public __render__(): VNode {
			if (this._firstRender && domNode.getWidgetInstance()) {
				this._firstRender = false;
				this.invalidate();
			}
			const vNode = super.__render__() as VNode;
			vNode.domNode = domNode;
			return vNode;
		}

		protected render(): DNode {
			let properties = { ...this.properties, key: 'root' };
			const widgetInstance = domNode.getWidgetInstance();
			if (widgetInstance) {
				widgetInstance.setProperties({ key: 'root', ...widgetInstance.properties, ...this.properties });
			}
			return v(domNode.tagName, childrenType === ChildrenType.DOJO ? {} : properties);
		}
	};
}

function getWidgetPropertyFromAttribute(attributeName: string, attributeValue: string | null, descriptor: CustomElementAttributeDescriptor): [ string, any ] {
	let { propertyName = attributeName, value = attributeValue } = descriptor;

	if (typeof value === 'function') {
		value = value(attributeValue);
	}

	return [ propertyName, value ];
}

let customEventClass = global.CustomEvent;

if (typeof customEventClass !== 'function') {
	const customEvent = function (event: string, params: any) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		const evt = document.createEvent('CustomEvent');
		evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
		return evt;
	};

	if (global.Event) {
		customEvent.prototype = global.Event.prototype;
	}

	customEventClass = customEvent;
}

/**
 * Called by HTMLElement subclass to initialize itself with the appropriate attributes/properties/events.
 *
 * @param element The element to initialize.
 */
export function initializeElement(element: CustomElement) {
	let initialProperties: any = {};

	const {
		childrenType = ChildrenType.DOJO,
		attributes = [],
		events = [],
		properties = [],
		initialization
	} = element.getDescriptor();

	attributes.forEach(attribute => {
		const attributeName = attribute.attributeName;

		const [ propertyName, propertyValue ] = getWidgetPropertyFromAttribute(attributeName, element.getAttribute(attributeName), attribute);
		initialProperties[ propertyName ] = propertyValue;
	});

	let customProperties: PropertyDescriptorMap = {};

	attributes.reduce((properties, attribute) => {
		const { propertyName = attribute.attributeName } = attribute;

		properties[ propertyName ] = {
			get() {
				return element.getWidgetInstance().properties[ propertyName ];
			},
			set(value: any) {
				const [ propertyName, propertyValue ] = getWidgetPropertyFromAttribute(attribute.attributeName, value, attribute);
				element.getWidgetInstance().setProperties(assign({}, element.getWidgetInstance().properties, {
					[propertyName]: propertyValue
				}));
			}
		};

		return properties;
	}, customProperties);

	properties.reduce((properties, property) => {
		const { propertyName, getValue, setValue } = property;
		const { widgetPropertyName = propertyName } = property;

		properties[ propertyName ] = {
			get() {
				const value = element.getWidgetInstance().properties[ widgetPropertyName ];
				return getValue ? getValue(value) : value;
			},

			set(value: any) {
				element.getWidgetInstance().setProperties(assign(
					{},
					element.getWidgetInstance().properties,
					{ [widgetPropertyName]: setValue ? setValue(value) : value }
				));
			}
		};

		return properties;
	}, customProperties);

	Object.defineProperties(element, customProperties);

	// define events
	events.forEach((event) => {
		const { propertyName, eventName } = event;

		initialProperties[ propertyName ] = (event: any) => {
			element.dispatchEvent(new customEventClass(eventName, {
				bubbles: false,
				detail: event
			}));
		};
	});

	// find children
	let children: DNode[] = [];

	const Projector = ProjectorMixin(element.getWidgetConstructor());
	const widgetInstance = new Projector();

	arrayFrom(element.children).forEach((childNode: CustomElement, index: number) => {
		if (childrenType === ChildrenType.DOJO) {
			childNode.addEventListener('connected', () => {
				widgetInstance.setProperties(initialProperties);
			});
		}
		const DomElement = CustomElementWrapper(childNode, { childrenType  });
		children.push(w(DomElement, {
			key: `child-${index}`
		}));
	});

	if (initialization) {
		initialization.call(element, initialProperties);
	}

	arrayFrom(element.children).forEach((childNode: HTMLElement) => {
		element.removeChild(childNode);
	});

	if (childrenType === ChildrenType.ELEMENT || children.length === 0) {
		widgetInstance.setProperties(initialProperties);
	}
	widgetInstance.setChildren(children);
	element.setWidgetInstance(widgetInstance);

	return function() {
		widgetInstance.append(element);
	};
}

/**
 * Called by HTMLElement subclass when an HTML attribute has changed.
 *
 * @param element     The element whose attributes are being watched
 * @param name        The name of the attribute
 * @param newValue    The new value of the attribute
 * @param oldValue    The old value of the attribute
 */
export function handleAttributeChanged(element: CustomElement, name: string, newValue: string | null, oldValue: string | null) {
	const attributes = element.getDescriptor().attributes || [];

	attributes.forEach((attribute) => {
		if (attribute.attributeName === name) {
			const [ propertyName, propertyValue ] = getWidgetPropertyFromAttribute(name, newValue, attribute);
			element.getWidgetInstance().setProperties(assign(
				{},
				element.getWidgetInstance().properties,
				{ [propertyName]: propertyValue }
			));
		}
	});
}
