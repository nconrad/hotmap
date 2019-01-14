
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

    let {xLabels, yLabels, matrix} = parseRealData(data);
    matrix = transpose(matrix);
    let subset = 20;
    new Heatmap({
        ele,
        xLabels: yLabels, // also transpose labels
        yLabels: subset ? xLabels.splice(0, subset) : xLabels,
        matrix: subset ? matrix.splice(0, subset) : matrix,
        onHover: info =>
            `<div><b>x:</b> ${info.xLabel}<div>
             <div><b>y:</b> ${info.yLabel}</div>
             <div><b>value:</b> ${info.value}</div>`
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

    let max = matAbsMax(matrix);
    matrix = matrix.map(row => {
        return row.map(val => val / max); // unitize
    });

    return {xLabels, yLabels, matrix};
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


function matAbsMax(matrix) {
    let max = 0;
    matrix.forEach(row => {
        let rowMax = Math.max(...row);
        let absVal = Math.abs(rowMax);
        if (absVal > max) max = absVal;
    });
    return max;
}
