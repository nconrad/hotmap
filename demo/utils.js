
/*
  Example mock data:
    let {xLabels, yLabels, matrix} = getMockData({
        m: 100,
        n: 150
    })
*/
function getMockData(m, n, opts) {
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


export function getMockLabels(m, n) {
    let labels = {
        rows: [...Array(m).keys()].map((_, i) => ({name: `This is row ${i}`})),
        cols: [...Array(n).keys()].map((_, i) => ({name: `This is column ${i}`})),
    };
    return labels;
}


export function trimData(data) {
    let rows = data.col_nodes.map(row => {
        return {
            categories: [
                row['cat-1'].replace('Isolation Country: ', ''),
                row['cat-2'].replace('Host Name: ', ''),
                row['cat-3'].replace('Genome Group: ', ''),
            ],
            name: row.name
        };
    });

    let cols = data.row_nodes.map(row => {
        return {
            categories: [row['cat-0'].replace('FAMILY ID: ', '')],
            name: row.name
        };
    });

    let matrix = transpose(data.mat);

    return {rows, cols, matrix};
}


// simple matrix transpose
export function transpose(matrix) {
    let numOfRows = matrix.length,
        numOfCols = matrix[0].length;

    let matrixT = [];
    for (let i = 0; i < numOfCols; i++) {
        matrixT.push([]);
    }

    // for each row in provided matrix
    for (let rowIdx = 0; rowIdx < numOfRows; rowIdx++) {
        // iterate each element, add to matrix T
        for (let j = 0; j < numOfCols; j++) {
            matrixT[j][rowIdx] = matrix[rowIdx][j];
        }
    }

    return matrixT;
}

