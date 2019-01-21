
import Heatmap from '../src/heatmap';
import data from './data/med.json';

document.addEventListener('DOMContentLoaded', () => {
    let ele = document.getElementById('chart');
    let statusHandle = loading(ele);

    /*
    let {xLabels, yLabels, matrix} = getMockData({
        m: 10,
        n: 15,
        gradientBottom: true
    });
    */

    let {xLabels, yLabels, matrix, categories} = parseRealData(data);
    let catLabels = ['Isolation Country', 'Host', 'Genome Group'];
    matrix = transpose(matrix);
    let subset = false;
    new Heatmap({
        ele,
        xLabels: yLabels, // also transpose labels
        yLabels: subset ? xLabels.splice(0, subset) : xLabels,
        matrix: subset ? matrix.splice(0, subset) : matrix,
        xCategories: categories,
        xCategoryLabels: catLabels,
        onHover: info => {
            let cs = info.xCategories;
            return `
             <div><b>Genome:</b> ${info.yLabel}</div>
             <div><b>Protein Family:</b> ${info.xLabel}<div><br>
             <div><b>${catLabels[0]}:</b> ${cs && cs[0] != 'undefined' ? cs[0] : 'N/A'}</div>
             <div><b>${catLabels[1]}:</b> ${cs && cs[1] != 'undefined' ? cs[1] : 'N/A'}</div>
             <div><b>${catLabels[2]}:</b> ${cs && cs[2] != 'undefined' ? cs[2] : 'N/A'}</div><br>
             <div><b>Value:</b> ${info.value}</div>
            `;
        }
    });

    clearInterval(statusHandle);
});


function loading(ele) {
    let i = 0;
    let handle = setInterval(() => {
        ele.innerHTML = `<br>loading${'.'.repeat(i % 4)}`;
        i += 1;
    }, 300);

    return handle;
}


function getMockData({m, n, random, numOfBins, gradient, gradientBottom}) {
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

    let labels = getMockLabelNames(m, n);

    return {xLabels: labels.x, yLabels: labels.y, matrix};
}


function getMockLabelNames(m, n) {
    let labels = { x: [], y: [] };
    for (let i = 0; i < m; i++) {
        labels.y.push(`This is row ${i}`);
    }

    for (let j = 0; j < n; j++) {
        labels.x.push(`This is column ${j}`);
    }
    return labels;
}


function parseRealData(data) {
    let xLabels = data.col_nodes.map(obj => obj.name);
    let yLabels = data.row_nodes.map(obj => obj.name);
    let matrix = data.mat;

    // get some categories for testings
    let categories = data.col_nodes.map(obj => {
        return [
            obj['cat-1'].split(': ')[1],
            obj['cat-2'].split(': ')[1],
            obj['cat-3'].split(': ')[1]
        ];
    });

    return {xLabels, yLabels, matrix, categories};
}


// simple matrix transpose
function transpose(matrix) {
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

