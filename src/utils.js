
/**
 * utils.js
 *
 * utility function for heatmap.js
 *
 * Author: https://github.com/nconrad
 *
 */

function matUnitize(matrix) {
    let max = matAbsMax(matrix);
    matrix = matrix.map(row => row.map(val => val / max));
    return matrix;
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


export {
    matUnitize
};
