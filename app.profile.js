var miniExcludes = {
	'heatmap/README.md': 1,
	'heatmap/webpack.config': 1,
	'heatmap/package-lock.json': 1,
	'heatmap/entry': 1,
	'heatmap/git-hooks/': 1
	};

var copyOnlyRe = [
	/heatmap\/dist\/*/
];

var profile = {
  resourceTags: {

		miniExclude: function (filename, mid) {
			var shouldExclude =
				/heatmap\/demo\/*/.test(filename) ||
				/heatmap\/node_modules\/*/.test(filename) ||
				/heatmap\/src\/*/.test(filename) ||
				/heatmap\/tests\/*/.test(filename) ||
				/heatmap\/stories\/*/.test(filename) ||
				/heatmap\/storybook\/*/.test(filename) ||
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