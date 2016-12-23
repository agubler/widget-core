(<any> require).config({
	baseUrl: '../../..',
	packages: [
		{ name: 'src', location: '_build/src' },
		{ name: 'dojo-core', location: 'node_modules/dojo-core' },
		{ name: 'dojo-has', location: 'node_modules/dojo-has' },
		{ name: 'dojo-shim', location: 'node_modules/dojo-shim' },
		{ name: 'maquette', location: 'node_modules/maquette/dist', main: 'maquette' }
	]
});

/* Requiring in the main module */
(<any> require)([ 'src/examples/index' ], function () {});
