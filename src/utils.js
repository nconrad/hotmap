
/**
 * utils.js
 *
 * Utility functions for heatmap.js
 *
 * Author: https://github.com/nconrad
 *
 */

function matUnitize(matrix) {
    let max = matMinMax(matrix).max;
    matrix = matrix.map(row => row.map(val => val / max));
    return {matrix, max};
}

function matMinMax(matrix) {
    let min = matrix[0][0],
        max = matrix[0][0];

    matrix.forEach(row => {
        let rowMin = Math.min(...row);
        let rowMax = Math.max(...row);
        let absMaxVal = Math.abs(rowMax);
        let absMinVal = Math.abs(rowMin);
        if (absMaxVal > max) max = absMaxVal;
        if (absMinVal < min) min = absMinVal;
    });

    return {min, max};
}

export {
    matUnitize,
    matMinMax
};
