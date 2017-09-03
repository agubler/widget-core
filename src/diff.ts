import { PropertyChangeRecord } from './interfaces';
import { WIDGET_BASE_TYPE } from './WidgetRegistry';

function isObjectOrArray(value: any): boolean {
	return Object.prototype.toString.call(value) === '[object Object]' || Array.isArray(value);
}

export function always(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: true,
		value: newProperty
	};
}

export function ignore(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: false,
		value: newProperty
	};
}

export function reference(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: previousProperty !== newProperty,
		value: newProperty
	};
}

export function shallow(previousProperty: any, newProperty: any): PropertyChangeRecord {
	let changed = false;

	const validOldProperty = previousProperty && isObjectOrArray(previousProperty);
	const validNewProperty = newProperty && isObjectOrArray(newProperty);

	if (!validOldProperty || !validNewProperty) {
		return {
			changed: true,
			value: newProperty
		};
	}

	const previousKeys = Object.keys(previousProperty);
	const newKeys = Object.keys(newProperty);

	if (previousKeys.length !== newKeys.length) {
		changed = true;
	}
	else {
		changed = newKeys.some((key) => {
			return newProperty[key] !== previousProperty[key];
		});
	}
	return {
		changed,
		value: newProperty
	};
}

export function auto(previousProperty: any, newProperty: any): PropertyChangeRecord {
	let result;
	if (typeof newProperty === 'function') {
		if (newProperty._type === WIDGET_BASE_TYPE) {
			result = reference(previousProperty, newProperty);
		}
		else {
			result = ignore(previousProperty, newProperty);
		}
	}
	else if (isObjectOrArray(newProperty)) {
		result = shallow(previousProperty, newProperty);
	}
	else {
		result = reference(previousProperty, newProperty);
	}
	return result;
}

export interface DiffPropertyResult {
	properties: any;
	changedPropertyKeys: string[];
}

function defaultGetDecorator(name: string) {
	return [];
}

export interface DiffProperties {
	(previousProperties: any, newProperties: any, options?: DiffPropertyOptions): DiffPropertyResult;
}

export interface DiffPropertyOptions {
	bind?: any;
	bindFunctionProperty?: (property: any, bind: any) => any;
	getDecorator?: (name: string) => any[];
}

export function diffProperties(previousProperties: any, newProperties: any, options: DiffPropertyOptions = {}): DiffPropertyResult {
	const { bind, bindFunctionProperty, getDecorator = defaultGetDecorator } = options;
	const changedPropertyKeys: string[] = [];
	const allProperties = [ ...Object.keys(newProperties), ...Object.keys(previousProperties) ];
	const checkedProperties: string[] = [];
	const diffPropertyResults: any = {};
	const registeredDiffPropertyNames = getDecorator('registeredDiffProperty');
	let runReactions = false;

	for (let i = 0; i < allProperties.length; i++) {
		const propertyName = allProperties[i];
		if (checkedProperties.indexOf(propertyName) > 0) {
			continue;
		}
		checkedProperties.push(propertyName);
		const previousProperty = previousProperties[propertyName];
		let newProperty = newProperties[propertyName];
		if (bindFunctionProperty && bind) {
			newProperty = bindFunctionProperty(newProperties[propertyName], bind);
		}
		if (registeredDiffPropertyNames.indexOf(propertyName) !== -1) {
			runReactions = true;
			const diffFunctions = getDecorator(`diffProperty:${propertyName}`);
			for (let i = 0; i < diffFunctions.length; i++) {
				const result = diffFunctions[i](previousProperty, newProperty);
				if (result.changed && changedPropertyKeys.indexOf(propertyName) === -1) {
					changedPropertyKeys.push(propertyName);
				}
				if (propertyName in newProperties) {
					diffPropertyResults[propertyName] = result.value;
				}
			}
		}
		else {
			const result = auto(previousProperty, newProperty);
			if (result.changed && changedPropertyKeys.indexOf(propertyName) === -1) {
				changedPropertyKeys.push(propertyName);
			}
			if (propertyName in newProperties) {
				diffPropertyResults[propertyName] = result.value;
			}
		}
	}

	return {
		properties: diffPropertyResults,
		changedPropertyKeys
	};
}
