"use strict";

var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var jshint = require("gulp-jshint");
var stylish = require("jshint-stylish");
var karma = require('gulp-karma');

gulp.task("scripts", function() {
  return browserify("./likely.js")
    .bundle({standalone: "likely"})
    .pipe(source("likely.js"))
    .pipe(gulp.dest("./dist"));
});

gulp.task("jshint", function() {
  gulp.src("likely.js")
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});

gulp.task("test", ["scripts"], function() {
  return gulp.src(['./dist/likely.js',
                   './tests/tests.js',
                   './tests/tests_tree.js',
                   './tests/regressions.js'])
    .pipe(karma({
      configFile: "karma.conf.js",
      action: "run"
    }))
    .on("error", function() {
      // XXX sverrej 2014-04-25
      // For now, just die to ensure the right exit code, and not
      // produce the gulp plugin failure stacktrace.
      process.exit(1);
    });
});

gulp.task("watch", function() {
  gulp.watch("likely.js", ["scripts"]);
});

gulp.task("default", function() {
  gulp.start("scripts");
});
