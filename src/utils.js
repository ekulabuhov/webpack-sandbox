var config = require(`../configs/${process.env.WEBPACK_SANDBOX_ENV}`);
var path = require('path');
var semver = require('semver');
var request = require('request');

var utils = {
  isProduction: function () {
    return process.env.NODE_ENV === 'production';
  },
  sessionHasPackages: function (session) {
    return Boolean(session.packages && Object.keys(session.packages).length)
  },
  log: function (message) {
    return function () {
      console.log(message);
    };
  },
  logError: function (err) {
    console.log(err.message);
    console.log(err.stack);
  },
  getManifest: function (packages) {
    return new Promise(function (resolve, reject) {
      var time = Date.now()
      console.log('Getting manifest from: ' + config.dllServiceUrl + '/' + encodeURIComponent(utils.getDllName(packages)) + '/manifest.json');
      request(config.dllServiceUrl + '/' + encodeURIComponent(utils.getDllName(packages)) + '/manifest.json', function(err, resp, body) {
        if (err) {
          console.log('Manifest ERROR', err.code, err.message);
          reject(err);

          return;
        }

        console.log('Got manifest in ' + (Date.now() - time) + 'ms');
        console.log(JSON.stringify(resp.headers));
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          console.log('Manifest ERROR', err.message, body);
          reject(err);
        }
      });
    })
  },
  getDllName: function (packages) {
    if (!packages || Object.keys(packages).length === 0) {
      return null;
    }

    return Object.keys(packages).map(function (key) {
      return key + '@' + packages[key];
    }).sort(function (a, b) {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }).join('+');
  },
  readMemDir: function (fs, dir) {
    var logOutDir = function (dir) {
      var dirs = [];
      try {
        dirs = fs.readdirSync(dir);
        console.log(dir);
      } catch (e) {
        return;
      }
      dirs.forEach(function (subDir) {
        logOutDir(dir + '/' + subDir);
      });
    }
    logOutDir(dir);
  },
  isSameLoaders: function (loadersA, loadersB) {
    if (!loadersA || !loadersB) {
      return false;
    }

    var sortByName = function (a, b) {
      if (a.name > b.name) {
        return 1;
      } else if (a.name < b.name) {
        return -1;
      }
      return 0;
    };

    var loadersAList = Object.keys(loadersA).map(function (key) {
      return {
        name: key,
        config: loadersA[key]
      }
    }).sort(sortByName);
    var loadersBList = Object.keys(loadersB).map(function (key) {
      return {
        name: key,
        config: loadersB[key]
      }
    }).sort(sortByName);

    return JSON.stringify(loadersAList) === JSON.stringify(loadersBList);
  },
  getEntry: function (files) {
    if (!files) {
      return null;
    }

    return files.reduce(function (entryFile, file) {
      if (file.isEntry) {
        return file.name;
      }
      return entryFile;
    }, null);
  },
  hasChangedPackagesOrEntry: function (req) {
    return (
      req.session.middleware &&
      (
        utils.getDllName(req.session.packages) !== utils.getDllName(req.body.packages) ||
        utils.getEntry(req.session.files) !== utils.getEntry(req.body.files)
      )
    );
  },
  createExternals: function (packages, manifest) {
    return Object.keys(manifest.content).reduce(function (externals, manifestKey, index) {
      var directPath = manifestKey.substr(2).split('/').slice(1).join('/');

      externals[directPath] = 'dll_bundle(' + manifest.content[manifestKey] + ')';
      externals[path.dirname(directPath) + '/' + path.basename(directPath, path.extname(path.basename(directPath)))] = 'dll_bundle(' + manifest.content[manifestKey] + ')';

      return externals;
    }, {});
  }
};

module.exports = utils;

/*
var packageName = Object.keys(packages).reduce((currentPackageName, packageKey) => {
  if (directPath.match(new RegExp(packageKey + '/'))) {
    return packageKey
  }
}, null)
*/
