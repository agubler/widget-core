import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from './../../createWidgetBase';
import { DNode, Widget, WidgetOptions, WidgetState } from './../../interfaces';
import { v } from './../../d';

export type Column = {
	id: string;
	label: string;
	direction: 'none' | 'asc' | 'desc';
	sortable: boolean;
}

export type GridState = WidgetState & {
	columns?: Column[]
	data?: any[]
}

export type Grid = Widget<GridState>;

export type GridFactory = ComposeFactory<Grid, WidgetOptions<GridState>>;

function columnHeaders(columns: Column[] = []) {
	return columns.map((column) => {
		return v('th.dgrid-cell', { key: column.id, onclick: sortMap.get(column.id)}, [ v('span', [ column.label ]) ]);
	});
}

function gridRow(row: any) {
	const cells = Object.keys(row).map((key) => {
		return v('td.dgrid-cell', [ v('span', { innerHTML: row[key] } )]);
	});

	return v('tr', cells);
}

function gridRows(data: any[] = []) {
	return data.map((item) => {
		return v('div.grid-row', { key: item.id }, [ v('table.dgrid-row-table', [ gridRow(item) ]) ]);
	});
}

function sort(instance: Grid, column: Column) {
	const compare = function(a: any, b: any) {
		if (a[column.id] < b[column.id]) {
			return -1;
		}
		if (a[column.id] > b[column.id]) {
			return 1;
		}
		return 0;
	};

	return () => {
		console.log(`sorting ${column.id}`);
		const { state, state: { data = [] } } = instance;

		if (column.direction === 'asc') {
			data.sort(compare).reverse();
			column.direction = 'desc';
		}
		else {
			data.sort(compare);
			column.direction = 'asc';
		}
		instance.setState(state);
	};
}

const sortMap = new Map<string, () => void>();

const createGrid: GridFactory = createWidgetBase.mixin({
	mixin: {
		classes: [ 'dgrid-maquette', 'dgrid', 'dgrid-grid' ],
		getChildrenNodes: function(this: Grid): DNode[] {
			const { state: { columns = [], data = [] } } = this;

			columns.forEach((column) => {
				if (!sortMap.has(column.id)) {
					sortMap.set(column.id, sort(this, column));
				}
			});

			return [
				v('div.dgrid-header.dgrid-header-row', [ v('table.dgrid-row-table', [ v('tr', columnHeaders(columns)) ] ) ] ),
				v('div.dgrid-scroller', [ v('div.dgrid-content', gridRows(data)) ])
			];
		}
	}
});

export default createGrid;
