module.exports = function(config) {
  "use strict";
  config.set({
    basePath: "",
    frameworks: ["qunit"],
    plugins: [
      "karma-qunit",
      "karma-chrome-launcher",
      "karma-coverage"
    ],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ["Chrome"],
    singleRun: true,
    preprocessors: {
      'dist/*.js': 'coverage'
    },
    reporters: ["progress", 'coverage'],
    coverageReporter: {
      type : 'html',
      dir : 'coverage/'
    }
  });
};
