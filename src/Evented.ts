
export class Evented {

	private _onMap = new Map<string, Function[]>();

	public on(type: string, on: Function) {
		const onFunctions = this._onMap.get(type);
		if (onFunctions) {
			onFunctions.push(on);
		}
		else {
			this._onMap.set(type, [ on ]);
		}
	}

	public emit(obj: any) {
		const onFunctions = this._onMap.get(obj.type);
		if (onFunctions) {
			for (let i = 0; i < onFunctions.length; i++) {
				onFunctions[i](obj);
			}
		}

	}
}

export default Evented;
