/**
 * svg.js
 *
 * Basic helpers for SVG generation
 *
 * Authors: nconrad
 */
import { setAttributes } from './dom';

export const svgNS = 'http://www.w3.org/2000/svg';

export function svgG() {
    return document.createElementNS(svgNS, 'g');
}

export function svgEle(tag) {
    return document.createElementNS(svgNS, tag);
}

export function svgText(text, x, y, opts = {}) {
    let ele = svgEle('text');
    ele.innerHTML = text;
    ele.setAttribute('x', x);
    ele.setAttribute('y', y);
    ele.setAttribute('fill', opts.fill || '#000');
    if (opts.fontSize) ele.setAttribute('font-size', opts.fontSize);
    if (opts.class) ele.setAttribute('class', opts.class);

    return ele;
}

export function svgRect(x, y, w, h, opts = {}) {
    let ele = document.createElementNS(svgNS, 'rect');

    if (opts.class) ele.setAttribute('class', opts.class);
    ele.setAttribute('x', x);
    ele.setAttribute('y', y);
    ele.setAttribute('width', w);
    ele.setAttribute('height', h);
    ele.setAttribute('fill', opts.fill || 'none');
    ele.setAttribute('stroke-width', opts.strokeWidth || 1);
    if (opts.stroke) ele.setAttribute('stroke', opts.stroke);

    return ele;
}

/* not used */
export function addSvgGradient(svg, startColor, stopColor) {
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
    setAttributes(stop1, { 'offset': '0%', 'stop-color': startColor, 'stop-opacity': 1 });
    setAttributes(stop2, { 'offset': '100%', 'stop-color': stopColor, 'stop-opacity': 1 });
    defs.appendChild(linearGradient);
    linearGradient.appendChild(stop1);
    linearGradient.appendChild(stop2);

    svg.appendChild(defs);
}
