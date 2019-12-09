
export function trimData(data) {
    let rows = data.col_nodes.map(row => {
        return {
            categories: [
                row['cat-1'].replace('Isolation Country: ', ''),
                row['cat-2'].replace('Host Name: ', ''),
                row['cat-3'].replace('Genome Group: ', ''),
            ],
            name: row.name
        };
    });

    let cols = data.row_nodes.map(row => {
        return {
            categories: [row['cat-0'].replace('FAMILY ID: ', '')],
            name: row.name
        };
    });

    // let matrix = transpose(data.mat);
    return {rows, cols, matrix: data.mat};
}


