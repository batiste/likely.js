"use strict";

var gulp = require("gulp");
var browserify = require("browserify");
var watchify = require("watchify");
var source = require("vinyl-source-stream");
var jshint = require("gulp-jshint");
var stylish = require("jshint-stylish");
var karma = require('gulp-karma');

gulp.task("scripts", function() {
  return browserify("./likely.js")
    .bundle({
      debug: true,
      standalone: "likely"
    })
    .pipe(source("likely.js"))
    .pipe(gulp.dest("./dist"));
});

gulp.task("watch-scripts", function() {
  var bundler = watchify("./likely.js");
  var rebundle = function(ids){
    if (ids) {
      ids.map(function(id) {
        console.log("Rebundled: ", id);
      });
    }
    return bundler.bundle({
      debug: true,
      standalone: "likely"
    })
      .pipe(source("likely.js"))
      .pipe(gulp.dest("./dist/"));
  };
  bundler.on("update", rebundle);
  return rebundle();
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

gulp.task("watch", ["watch-scripts"]);

gulp.task("default", function() {
  gulp.start("scripts");
});
