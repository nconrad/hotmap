
import Heatmap from '../src/heatmap';
import data from './data/large.json';

document.addEventListener('DOMContentLoaded', () => {
    let ele = document.getElementById('chart');
    let statusHandle = loading(ele);

    // let {colLabels, rowLabels, matrix} = parseRealData();
    let {colLabels, rowLabels, matrix} = getMockData(10, 2000);

    let heatmap = new Heatmap({
        ele,
        matrix,
        rowLabels,
        colLabels
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


function getMockData(m, n) {
    let matrix = [];
    for (let i = 0; i < m; i++) {
        let row = [];
        for (let j = 0; j < n; j++) {
            // let val = (Math.floor(Math.random() * 2) + 1) / 2 ;
            let val = Math.random();
            row.push(val);
        }
        matrix.push(row);
    }

    let labels = getMockLabelNames(m, n);

    return {rowLabels: labels.y, colLabels: labels.x, matrix};
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

function parseRealData() {
    let colLabels = data.col_nodes.map(obj => obj.name);
    let rowLabels = data.row_nodes.map(obj => obj.name);
    let matrix = data.mat;

    let max = 0;
    matrix.forEach(row => {
        let rowMax = Math.max(...row);
        if (rowMax > max) max = rowMax;
    });

    matrix = matrix.map(row => {
        return row.map(val => (val / max + 0.2 < 1.0 ? val / max + 0.2 : val / max));
    });

    return {colLabels, rowLabels, matrix};
}
