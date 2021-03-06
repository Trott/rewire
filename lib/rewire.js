var Module = require("module"),
    fs = require("fs"),
    __get__ = require("./__get__.js"),
    __set__ = require ("./__set__.js"),
    __with__ = require("./__with__.js"),
    getImportGlobalsSrc = require("./getImportGlobalsSrc.js"),
    detectStrictMode = require("./detectStrictMode.js"),
    moduleEnv = require("./moduleEnv.js");

var srcs = {
    "__get__": __get__.toString(),
    "__set__": __set__.toString(),
    "__with__": __with__.toString()
};

/**
 * Does actual rewiring the module. For further documentation @see index.js
 */
function internalRewire(parentModulePath, targetPath) {
    var targetModule,
        prelude,
        appendix;

    // Checking params
    if (typeof targetPath !== "string") {
        throw new TypeError("Filename must be a string");
    }

    // Resolve full filename relative to the parent module
    targetPath = Module._resolveFilename(targetPath, parentModulePath);

    // Special support for older node versions that returned an array on Module._resolveFilename
    // @see https://github.com/joyent/node/blob/865b077819a9271a29f982faaef99dc635b57fbc/lib/module.js#L319
    // TODO Remove this switch on the next major release
    /* istanbul ignore next because it will be removed soon */
    if (Array.isArray(targetPath)) {
        targetPath = targetPath[1];
    }

    // Create testModule as it would be created by require()
    targetModule = new Module(targetPath, parentModulePath);

    // We prepend a list of all globals declared with var so they can be overridden (without changing original globals)
    prelude = getImportGlobalsSrc();

    // We append our special setter and getter.
    appendix = "\n";
    
    Object.keys(srcs).forEach(function forEachSrc(key) {
        appendix += "Object.defineProperty(module.exports, '" +
            key +
            "', {enumerable: false, value: " +
            srcs[key] +
            "}); ";
    });

    // Check if the module uses the strict mode.
    // If so we must ensure that "use strict"; stays at the beginning of the module.
    src = fs.readFileSync(targetPath, "utf8");
    if (detectStrictMode(src) === true) {
        prelude = ' "use strict"; ' + prelude;
    }

    moduleEnv.inject(prelude, appendix);
    moduleEnv.load(targetModule);

    return targetModule.exports;
}

module.exports = internalRewire;
