/**
 * legend.js
 *
 * Creates various legends for charts.
 *
 * Authors: nconrad
 *
 */
import { parseColorBins, hexToHexColor } from './color';

export function legend(min, max, settings) {
    if (!settings || settings === 'gradient') {
        return gradientLegend(min, max);
    }

    return binLegend(settings);
}


function binLegend(settings) {
    let ele = document.createElement('div');

    let bins = parseColorBins(settings.bins),
        colors = settings.colors;

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
        rectEl.style.backgroundColor = hexToHexColor(color);
        item.appendChild(rectEl);

        let textEl = document.createElement('span');
        textEl.innerHTML = text;
        item.appendChild(textEl);

        ele.appendChild(item);
    });

    return ele.innerHTML;
}


function gradientLegend(min, max) {
    let ele = document.createElement('div');

    let w = 100,
        h = 14;

    let gradient = document.createElement('div');
    gradient.style.backgroundImage = 'linear-gradient(to right, #ffffff, #ff0000)';
    gradient.style.width = w;
    gradient.style.height = h;
    gradient.classList.add('gradient');

    let low = document.createElement('span');
    low.innerHTML = `${min} `;
    ele.appendChild(low);

    let high = document.createElement('span');
    high.innerHTML = ` ${max}`;

    ele.appendChild(low);
    ele.appendChild(gradient);
    ele.appendChild(high);

    return ele.innerHTML;
}
