module.exports = function (grunt) {

	const staticFiles = [ 'src/**/*.html' ];

	require('grunt-dojo2').initConfig(grunt, {
		copy: {
			staticTestFiles: {
				expand: true,
				cwd: '.',
				src: staticFiles,
				dest: '<%= devDirectory %>'
			}
		}
	});
};
