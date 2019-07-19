var miniExcludes = {
	'hotmap/README.md': 1,
	'hotmap/webpack.config': 1,
	'hotmap/package-lock.json': 1,
	'hotmap/entry': 1,
	'hotmap/git-hooks/': 1
	};

var copyOnlyRe = [
	/hotmap\/dist\/*/
];

var profile = {
  resourceTags: {

		miniExclude: function (filename, mid) {
			var shouldExclude =
				/hotmap\/demo\/*/.test(filename) ||
				/hotmap\/node_modules\/*/.test(filename) ||
				/hotmap\/src\/*/.test(filename) ||
				/hotmap\/tests\/*/.test(filename) ||
				mid in miniExcludes

	  	return shouldExclude;
		},

		/*
		amd: function (filename, mid) {
			return /\.js$/.test(filename);
		}, */

		copyOnly: function (filename, mid) {
		  for (var i = copyOnlyRe.length; i--;) {
		    if (copyOnlyRe[i].test(mid)) {
		      return true;
		    }
			}
 		  return false;
		}
	}
};