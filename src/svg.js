/**
 * svg.js
 *
 * Basic helpers for SVG generation
 *
 * Authors: nconrad
 */

export const svgNS = 'http://www.w3.org/2000/svg';

export function createSVG() {
    return svgEle('svg');
}

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
    ele.setAttribute('x', x);
    ele.setAttribute('y', y);
    ele.setAttribute('width', w);
    ele.setAttribute('height', h);
    ele.setAttribute('fill', opts.fill || 'none');
    ele.setAttribute('stroke-width', opts.strokeWidth || 1);
    if (opts.class) ele.setAttribute('class', opts.class);
    if (opts.stroke) ele.setAttribute('stroke', opts.stroke);

    return ele;
}

export function svgLine(x1, y1, x2, y2, opts = {}) {
    let ele = document.createElementNS(svgNS, 'line');
    ele.setAttribute('x1', x1);
    ele.setAttribute('y1', y1);
    ele.setAttribute('x2', x2);
    ele.setAttribute('y2', y2);
    ele.setAttribute('stroke', opts.stroke || '#000');
    ele.setAttribute('stroke-width', opts.strokeWidth || 1);
    if (opts.class) ele.setAttribute('class', opts.class);

    return ele;
}


