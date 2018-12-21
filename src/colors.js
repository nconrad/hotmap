
function getRandomColorMatrix(m, n) {
    let colors = [];
    for (let i = 0; i < n; i++) {
        let row = [];
        for (let j = 0; j < m; j++) {
            let color = '0x' + (Math.random() * 0xFFFFFF << 0).toString(16);
            row.push(color);
        }
        colors.push(row);
    }
    return colors;
}

export {
    getRandomColorMatrix
};
