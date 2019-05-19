# Heatmap

A WebGL/Canvas Heatmap for Bioinformatics and Big Data, written in vanilla JS and built with [pixi.js](http://www.pixijs.com/).

[demo](https://nconrad.github.io/heatmap/demo/)

![screenshot](demo/screenshot.png)


## Why?

I wanted to create a heatmap viewer that easy to use and scales to millions of cells.


## Usage

#### Global

Add the required CSS/JS:

```
<link rel="stylesheet" type="text/css" href="dist/heatmap.css">
<script src="dist/heatmap.js"></script>
```

#### ES6

Add required CSS, and import JS:

```
<link href="dist/heatmap.css" rel="stylesheet" type="text/css">
```

```
import Heatmap from 'dist/heatmap';
```

#### AMD

Add required Required CSS, and require:

```
<link href="dist/heatmap.css" rel="stylesheet" type="text/css">
```

```javascript
requirejs.config({
    baseUrl: 'dist',
});

requirejs(['heatmap'], function(Heatmap) {
    ...
})
```


### Config

| Param                 | Type                              | Required? | Default                                                     |
|-----------------------|-----------------------------------|-----------|-------------------------------------------------------------|
| [rows](#rows)         | list of `row` objects (see below) | &check;   | -                                                           |
| [cols](#cols)         | list of `col` objects (see below) | &check;   | -                                                           |
| matrix                | matrix of numbers                 | &check;   | -                                                           |
| rowsLabel             | string                            | -         | 'Rows'                                                      |
| colsLabel             | string                            | -         | 'Columns'                                                   |
| rowCatLabels          | list lof strings                  | -         | []                                                          |
| colCatLabels          | list lof strings                  | -         | []                                                          |
| [defaults](#defaults) | object                            | -         | computed based on window size                               |
| color                 | string \|\| object                | -         | 'gradient'                                                  |
| onHover               | function(info) {}                 | -         | Displays row, column, and matrix value in tooltip on hover. |
| onSelect              | function(selection) {}            | -         | -                                                           |
| theme                 | 'light' \|\| 'dark'               | -         | 'dark'                                                      |


##### rows
```javascript
{
    name: "some label",
    categories: ["cat 1", "cat 2"]
}
```

##### cols
```javascript
{
    name: "some label",
    categories: ["cat foo", "cat bar']
}
```

##### defaults
```javascript
{
    cellWidth: <initial height of cell (integer)>,
    cellHeight: <initial height of cell (integer)>
}
```


### API Methods

| Method   | Definition                   | Description                                                |
|----------|------------------------------|------------------------------------------------------------|
| update   | update({rows, cols, matrix}) | Given object with rows, columns, and matrix, updates chart |
| getState | getState()                   | Returns current rows, columns and matrix                   |



### Example config

```javascript
    let heatmap = new Heatmap({
        ele: document.getElementById('heatmap'),
        rows: [{...}],
        cols: [{...}],
        matrix: [[1, 2, 3], [2, 5.3, 0], ...],
        color: {
            bins: ['=0', '=1', '=2', '<20', '>=20'],
            colors: [0xffffff, 0xfbe6e2, 0xffadad, 0xff6b6b, 0xff0000]
        },
        onHover: info => `<div><b>Genome:</b> ${info.yLabel}</div><br>`
    })
```


## Development

### Local Installation

```
npm install
```


### Development

```
npm start
```

### Build

```
npm run build
```


## Author(s)

Neal Conrad <nconrad@anl.gov>


## Citation

Please cite this repo in the meantime:

N. Conrad, A WebGL Heatmap for Bioinformatics and Big Data, (2019), GitHub repository, https://github.com/nconrad/heatmap


## License

Released under [the MIT license](https://github.com/nconrad/heatmap/blob/master/LICENSE).



