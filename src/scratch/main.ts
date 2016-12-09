import createProjector, { Projector } from './../createProjector';
import { w } from './../d';
import createGrid, { GridState } from './../components/grid/createGrid';
import createMemoryStore from 'dojo-stores/createMemoryStore';

function createData(count: number): any[] {
	const data: any[] = [];

	for (let i = 0; i < count; i++) {
		data.push({
			id: i,
			column1: `row ${(count - 1) - i}`
		});
	}

	return data;
}

const data = createData(5000);
const gridState: GridState = {
	id: 'grid',
	columns: [
		{
			id: 'id',
			label: 'id',
			sortable: true,
			direction: 'none'
		},
		{
			id: 'column1',
			label: 'column 1',
			sortable: true,
			direction: 'none'
		}
	],
	data
};
const store = createMemoryStore({
	data: [ gridState ]
});

const createApp = createProjector.mixin({
	mixin: {
		getChildrenNodes: function(this: Projector): any {
			return [
				w(createGrid, <any> { id: 'grid', stateFrom: store })
			];
		}
	}
});

const app = createApp();

app.setState(gridState);

app.append().then(() => {
	console.log('grid attached');
});
