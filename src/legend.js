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
    if (!settings || settings === 'gradient') {
        gradientLegend(ele, x, y, min, max);
        return;
    }

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

        let textEl = document.createElement('span');
        textEl.innerHTML = text;
        item.appendChild(textEl);

        legend.appendChild(item);
    });
}


function gradientLegend(ele, x, y, min, max) {
    let w = 100,
        h = 14;

    let legend = ele.querySelector('.legend');

    let gradient = document.createElement('div');
    gradient.style.backgroundImage = 'linear-gradient(to right, #ffffff, #ff0000)';
    gradient.style.width = w;
    gradient.style.height = h;
    gradient.classList.add('gradient');

    let low = document.createElement('span');
    low.innerHTML = `${min} `;
    legend.append(low);

    let high = document.createElement('span');
    high.innerHTML = ` ${max}`;

    legend.appendChild(low);
    legend.appendChild(gradient);
    legend.appendChild(high);
}
