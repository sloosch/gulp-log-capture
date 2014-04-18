Log Capture Plugin for Gulp
=========

capture logs for any other gulp plugin in the pipe.

##Example

capturing the call to `console.log` from jshint to create a XML report:

```javascript
gulp.task('lint-reports', function() {
	return gulp.src('src/js/*.js')
	.pipe(jshint())
	.pipe(logCapture.start(console, 'log'))
	.pipe(jshint.reporter('jslint_xml'))
	.pipe(logCapture.stop('xml'))
	.pipe(gulp.dest('lint-reports'));
});
```
