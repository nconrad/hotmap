/**
 * svg.js
 *
 * Helpers for svg generation
 *
 * Authors: nconrad
 */

export const svgNS = 'http://www.w3.org/2000/svg';;

export function svgG(svg) {
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

    return ele;
}

export function svgRect(x, y, w, h, opts = {}) {
    let ele = document.createElementNS(svgNS, 'rect');

    ele.setAttribute('class', opts.class ? opts.class : '');
    ele.setAttribute('x', x);
    ele.setAttribute('y', y);
    ele.setAttribute('width', w);
    ele.setAttribute('height', h);
    ele.setAttribute('fill', opts.fill || 'none');
    ele.setAttribute('stroke-width', opts.strokeWidth || 1);
    ele.setAttribute('stroke', opts.stroke || 'rgb(0,0,0)');

    return ele;
}
