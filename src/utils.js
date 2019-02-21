
/**
 * utils.js
 *
 * Utility functions for heatmap.js
 *
 * Author: https://github.com/nconrad
 *
 */

import { svgEle, svgG, svgRect, svgText } from './svg';

function matUnitize(matrix) {
    let max = matAbsMax(matrix);
    matrix = matrix.map(row => row.map(val => val / max));
    return {matrix, max};
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

function addLegend(svg, x, y, min, max) {
    let w = 100,
        h = 14;

    let legend = svgG(svg);

    // define gradient
    let defs = svgEle('defs'),
        linearGradient = svgEle('linearGradient'),
        stop1 = svgEle('stop'),
        stop2 = svgEle('stop');

    linearGradient.setAttribute('id', 'posGradient');
    linearGradient.setAttribute('x1', '0%');
    linearGradient.setAttribute('y1', '0%');
    linearGradient.setAttribute('x2', '100%');
    linearGradient.setAttribute('y2', '0%');
    linearGradient.setAttribute('spreadMethod', 'pad');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#fff');
    stop1.setAttribute('stop-opacity', 1);
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#ff0000');
    stop2.setAttribute('stop-opacity', 1);
    defs.appendChild(linearGradient);
    linearGradient.appendChild(stop1);
    linearGradient.appendChild(stop2);

    svg.appendChild(defs);

    let rect = svgRect(x, y, w, h, {
        fill: "url('#posGradient')",
        stroke: '#f2f2f2'
    });


    let textOpts = {fill: '#666', fontSize: '.9em'};
    let low = svgText(min, x - 15, y + h - 1, textOpts),
        high = svgText(max, x + w + 3, y + h - 1, textOpts);
    legend.append(low);
    legend.append(high);

    legend.appendChild(rect);
    svg.appendChild(legend);
}

export {
    matUnitize,
    addLegend,
    matAbsMax
};
