/**
 * dom.js
 *
 * Utility functions for dom related operations and things.
 *
 * Authors: nconrad
 *
 */
export function setAttributes(ele, obj) {
    Object.keys(obj).forEach(k => ele.setAttribute(k, obj[k]));
}
