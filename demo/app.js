
import Heatmap from '../src/heatmap';
[];

document.addEventListener('DOMContentLoaded', () => {
    let ele = document.getElementById('chart');
    let statusHandle = loading(ele);

    let heatmap = new Heatmap({ele});
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
