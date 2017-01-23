import Symbol from '@dojo/shim/Symbol';

export class MultiMap<T> {
	private _map: Map<any, any>;
	private _key: symbol;

	constructor() {
		this._map = new Map<any, any>();
		this._key = Symbol();
	}

	set(keys: any[], value: T): void {
		let map = this._map;
		let childMap;

		for (let i = 0; i < keys.length; i++) {
			if (map.get(keys[i])) {
				map = map.get(keys[i]);
				continue;
			}
			childMap = new Map<any, any>();
			map.set(keys[i], childMap);
			map = childMap;
		};

		map.set(this._key, value);
	}

	get(keys: any[]): T | undefined {
		let map = this._map;

		for (let i = 0; i < keys.length; i++) {
			map = map.get(keys[i]);

			if (!map) {
				return undefined;
			}
		};

		return map.get(this._key);
	}

	has(keys: any[]): boolean {
		let map = this._map;

		for (let i = 0; i < keys.length; i++) {
			map = map.get(keys[i]);
			if (!map) {
				return false;
			}
		}
		return true;
	}

	delete(keys: any[]) {
		let map = this._map;
		const path = [this._map];

		for (let i = 0; i < keys.length; i++) {
			map = map.get(keys[i]);
			path.push(map);
			if (!map) {
				return;
			}
		}

		map.delete(this._key);

		for (let i = keys.length - 1; i >= 0; i--) {
			map = path[i].get(keys[i]);
			if (map.size) {
				break;
			}
			path[i].delete(keys[i]);
		}
	}

	values(): T[] {
		const values: T[] = [];

		const getValues = (map: Map<any, any>) => {
			map.forEach((value, key) => {
				if (key === this._key) {
					values.push(value);
				}
				else {
					getValues(value);
				}
			});
		};

		getValues(this._map);
		return values;
	}

	keys(): any[][] {
		const finalKeys: any[][] = [];

		const getKeys = (map: Map<any, any>, keys: any[] = []) => {
			map.forEach((value, key) => {
				if (key === this._key) {
					finalKeys.push(keys);
				}
				else {
					const nextKeys = [...keys, key];
					getKeys(value, nextKeys);
				}
			});
		};

		getKeys(this._map);
		return finalKeys;
	}

	entries(): [ T, any[] ][] {
		const finalKeys: [ T, any[] ][] = [];

		const getKeys = (map: Map<any, any>, keys: any[] = []) => {
			map.forEach((value, key) => {
				if (key === this._key) {
					finalKeys.push([ value, keys ]);
				}
				else {
					const nextKeys = [...keys, key];
					getKeys(value, nextKeys);
				}
			});
		};

		getKeys(this._map);
		return finalKeys;
	}

	clear() {
		this._map = new Map<any, any>();
	}
}
