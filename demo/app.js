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

    ele.innerHTML = `<br>loading...`;
    let heatmap;
    fetch(dataPath)
        .then(res => res.json())
        .then(data => {
            console.log('data file:', data);
            heatmap = loadViewer({ele, data});
        }).catch((e) => {
            console.log(e);
            alert(`Could not load viewer. Please contact owner.`);
        });

    // example of updating the chart
    let updateBtn = document.querySelector('.update-btn');
    if (!updateBtn) return;

    document.querySelector('.update-btn').onclick = () => {
        let data = heatmap.getState();
        // remove some rows (example)
        let rows = data.rows.slice(0, 5),
            matrix = data.matrix.slice(0, 5);

        // select 200 columns (example)
        let cols = data.cols.slice(0, 200);
        matrix = matrix.map(row => row.slice(0, 200));
        heatmap.update({rows, cols, matrix});
    };
});


function loadViewer({ele, data}) {
    let {rows, cols, matrix} = data;
    let rowCatLabels = ['Isolation Country', 'Host', 'Genome Group'];
    let heatmap = new Heatmap({
        ele, rows, cols, matrix,
        rowsLabel: 'Genomes',
        colsLabel: 'Protein Families',
        rowCatLabels: rowCatLabels,
        colCatLabels: ['Protein Family ID'],
        //theme: 'light',
        color: {
            bins: ['=0', '=1', '=2', '<20', '>=20'],
            colors: ['#ffffff', '#fbe6e2', 0xffadad, 0xff6b6b, 0xff0000]
        },
        onHover: info => {
            let cs = info.rowCategories;
            return `<div><b>Genome:</b> ${info.yLabel}</div><br>
              <div><b>Protein Family:</b> ${info.xLabel}<div>
              <div><b>ID:</b> ${info.colCategories[0]}<div><br>
              <div><b>${rowCatLabels[0]}:</b> ${cs && cs[0] != 'undefined' ? cs[0] : 'N/A'}</div>
              <div><b>${rowCatLabels[1]}:</b> ${cs && cs[1] != 'undefined' ? cs[1] : 'N/A'}</div>
              <div><b>${rowCatLabels[2]}:</b> ${cs && cs[2] != 'undefined' ? cs[2] : 'N/A'}</div><br>
              <div><b>Value:</b> ${info.value}</div>`;
        }
    });

    return heatmap;
}
