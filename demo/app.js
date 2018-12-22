
import Heatmap from '../src/heatmap';
[];

document.addEventListener('DOMContentLoaded', () => {
    let ele = document.getElementById('chart');
    let statusHandle = loading(ele);

    let matrix = getTestData(15, 15);
    let heatmap = new Heatmap({ele, matrix});
    clearInterval(statusHandle);
});

function getTestData(n, m) {
    let matrix = [];
    for (let i = 0; i < n; i++) {
        let row = [];
        for (let j = 0; j < m; j++) {
            row.push(Math.random());
        }
        matrix.push(row);
    }
    return matrix;
}

function loading(ele) {
    let i = 0;
    let handle = setInterval(() => {
        ele.innerHTML = `<br>loading${'.'.repeat(i % 4)}`;
        i += 1;
    }, 300);

    return handle;
}
