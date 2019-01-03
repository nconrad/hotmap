
import Heatmap from '../src/heatmap';

document.addEventListener('DOMContentLoaded', () => {
    let ele = document.getElementById('chart');
    let statusHandle = loading(ele);

    let matrix = getTestData(10, 2000);
    let heatmap = new Heatmap({ele, matrix});
    clearInterval(statusHandle);
});

function getTestData(m, n) {
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
