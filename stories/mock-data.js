

export function getMockLabels(m, n) {
  let labels = {
      rows: [...Array(m).keys()].map((_, i) => ({name: `This is row ${i}`})),
      cols: [...Array(n).keys()].map((_, i) => ({name: `This is column ${i}`})),
  };
  return labels;
}

/*
 * getMockData
 *  - takes size of matrix (m x n),
 *    returns randomly generated matrix based on options
 *
 * example:
 *    const {cols, rows, matrix} = getMockData(4, 5)
*/
export function getMockData(m, n, opts = {}) {
  let {random, numOfBins, gradient, gradientBottom} = opts;

  let size = m * n;
  let matrix = [];
  for (let i = 0; i < m; i++) {
      let row = [];
      for (let j = 0; j < n; j++) {
          let val;
          if (numOfBins)
              val = (Math.floor(Math.random() * numOfBins) + 1) / numOfBins;
          else if (random)
              val = Math.random();
          else if (gradient)
              val = i * j / size;
          else if (gradientBottom)
              val = i * i / size;
          else
              val = Math.random();

          row.push(val);
      }
      matrix.push(row);
  }
  let {rows, cols} = getMockLabels(m, n);

  return {cols, rows, matrix};
}


function getRandomColorMatrix(m, n) {
    let colors = [];
    for (let i = 0; i < n; i++) {
        let row = [];
        for (let j = 0; j < m; j++) {
            let color = '0x' + (Math.random() * 0xFFFFFF << 0).toString(16);
            row.push(color);
        }
        colors.push(row);
    }
    return colors;
}
