/**
 * app.js
 *
 * Demo app using heatmap.
 *
 * Authors: nconrad
 *
 */
import Heatmap from '../src/heatmap';


document.addEventListener('DOMContentLoaded', () => {
    let ele = document.querySelector('#chart');
    let dataPath = ele.getAttribute('data-path');

    let statusHandle = loading(ele);
    fetch(dataPath)
        .then(res => res.json())
        .then(data => {
            console.log('data file:', data);
            loadViewer({ele, data});
        }).catch((e) => {
            console.log(e);
            alert(`Could not load viewer. Please contact owner.`);
        });

    clearInterval(statusHandle);
});


function loadViewer({ele, data}) {
    let rowCatLabels = ['Isolation Country', 'Host', 'Genome Group'];
    let colors = [0x333333, 0xfff4f2, 0xffadad, 0xff6b6b, 0xff0000];
    new Heatmap({
        ele,
        rows: data.rows,
        cols: data.cols,
        matrix: data.matrix,
        rowCatLabels: rowCatLabels,
        colCatLabels: ['Protein Family ID'],
        color: { bins: ['=0', '=1', '=2', '<20', '>=20'], colors },
        onHover: info => {
            let cs = info.rowCategories;
            return `
             <div><b>Genome:</b> ${info.yLabel}</div><br>
             <div><b>Protein Family:</b> ${info.xLabel}<div>
             <div><b>ID:</b> ${info.colCategories[0]}<div><br>
             <div><b>${rowCatLabels[0]}:</b> ${cs && cs[0] != 'undefined' ? cs[0] : 'N/A'}</div>
             <div><b>${rowCatLabels[1]}:</b> ${cs && cs[1] != 'undefined' ? cs[1] : 'N/A'}</div>
             <div><b>${rowCatLabels[2]}:</b> ${cs && cs[2] != 'undefined' ? cs[2] : 'N/A'}</div><br>
             <div><b>Value:</b> ${info.value}</div>
            `;
        }
    });
}

function colorFunction(val) {
    if (val < 1) return 0x333333;
    if (val < 2) return 0xffe8e5;
    if (val < 20) return 0xff7566;
    return 0xff0000;
}


function loading(ele) {
    let i = 0;
    let handle = setInterval(() => {
        ele.innerHTML = `<br>loading${'.'.repeat(i % 4)}`;
        i += 1;
    }, 300);

    return handle;
}


/*
  Example mock data:
    let {xLabels, yLabels, matrix} = getMockData({
        m: 100,
        n: 150
    })
*/
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


function trimData(data) {
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

