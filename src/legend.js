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
import { parseColorBins } from './color';

export function addLegend(svg, x, y, min, max, settings) {
    if (!settings || settings === 'gradient')
        return gradientLegend(svg, x, y, min, max);

    binLegend(svg, x, y, min, max, settings);
}
function binLegend(svg, x, y, min, max, settings) {
    let w = 14,
        h = 14,
        offset = 40;

    let bins = parseColorBins(settings.bins),
        colors = settings.colors;

    let legend = svgG(svg);
    let textOpts = {fill: '#666', fontSize: '.9em'};

    bins.forEach((bin, i) => {
        let op = bin.op,
            val = bin.val;

        let text;
        if (op === '=') text = val;
        else if (op === '<') text = '< ' + val;
        else if (op === '<=') text = '≤ ' + val;
        else if (op === '>=') text = '≥ ' + val;
        else if (op === '>') text = '> ' + val;

        console.log(colors[i].toString(16));
        let rect = svgRect(x + offset * i, y, w, h, {
            fill: '#' + colors[i].toString(16), // hexidecimal to hex
            stroke: '#f2f2f2'
        });

        legend.appendChild(rect);
        legend.append( svgText(text, x + offset * i + w + 3, y + h - 1, textOpts) );
    });

    svg.appendChild(legend);
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
