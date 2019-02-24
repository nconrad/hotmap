/**
 * legend.js
 *
 * Creates various legends for charts.
 *
 * Authors: nconrad
 *
 */
import { setAttributes } from './dom';
import { svgEle, svgG, svgRect, svgText } from './svg';
import { parseColorBins, toHex } from './color';

export function addLegend(ele, x, y, min, max, settings) {
    if (!settings || settings === 'gradient')
        return gradientLegend(ele.querySelector('.svg-canvas'), x, y, min, max);

    binLegend(ele, x, y, min, max, settings);
}


function binLegend(ele, x, y, min, max, settings) {
    let bins = parseColorBins(settings.bins),
        colors = settings.colors;

    let legend = ele.querySelector('.legend');
    bins.forEach((bin, i) => {
        let op = bin.op,
            val = bin.val,
            color = colors[i];

        let text;
        if (op === '=') text = val;
        else if (op === '<') text = '< ' + val;
        else if (op === '<=') text = '≤ ' + val;
        else if (op === '>=') text = '≥ ' + val;
        else if (op === '>') text = '> ' + val;

        let item = document.createElement('div');
        item.classList.add('item');

        let rectEl = document.createElement('div');
        rectEl.classList.add('box');
        rectEl.style.backgroundColor = isNaN(color) ? color : toHex(color);
        item.appendChild(rectEl);

        let textEl = document.createElement('div');
        textEl.innerHTML = text;
        item.append(text);

        legend.append(item);
    });
}


function gradientLegend(svg, x, y, min, max) {
    let w = 100,
        h = 14;

    let legend = svgG(svg);

    // define gradient
    let defs = svgEle('defs'),
        linearGradient = svgEle('linearGradient'),
        stop1 = svgEle('stop'),
        stop2 = svgEle('stop');

    setAttributes(linearGradient, {
        id: 'posGradient',
        x1: '0%',
        y1: '0%',
        x2: '100%',
        y2: '0%',
        spreadMethod: 'pad'
    });
    setAttributes(stop1, { 'offset': '0%', 'stop-color': '#fff', 'stop-opacity': 1 });
    setAttributes(stop2, { 'offset': '100%', 'stop-color': '#ff0000', 'stop-opacity': 1 });
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
