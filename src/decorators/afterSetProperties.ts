import { handleDecorator } from './../WidgetBase';

export function afterSetProperties(method?: Function) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('afterSetProperties', propertyKey ? target[propertyKey] : method);
	});
}
