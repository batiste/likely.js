module.exports = function(config) {
  "use strict";
  config.set({
    basePath: "",
    frameworks: ["qunit"],
    plugins: [
      "karma-qunit",
      "karma-chrome-launcher"
    ],
    reporters: ["progress"],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ["Chrome"],
    singleRun: true
  });
};
