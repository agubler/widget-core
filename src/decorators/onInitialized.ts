import { handleDecorator } from './../WidgetBase';

export function onInitialized(method: Function): (target: any) => void;
export function onInitialized(): (target: any, propertyKey: string) => void;
export function onInitialized(method?: Function) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('onInitialized', propertyKey ? target[propertyKey] : method);
	});
}

export default onInitialized;
