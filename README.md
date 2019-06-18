# Heatmap

A WebGL/Canvas Heatmap for Bioinformatics and Big Data, written in vanilla JS and built with [pixi.js](http://www.pixijs.com/).

[demo](https://nconrad.github.io/heatmap/demo/)

![screenshot](demo/screenshot.png)


## Some Features

- panning/scaling/zoom
- resizing
- various color/binning options
- search
- cell/row/column selection
- categorical/meta data display
- flip axises
- customizable tooltips



## Why?

I wanted to create a heatmap viewer that easy to use and scales to millions of cells.


## Prototype Usage

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

Add required required CSS, and require:

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

### Basic Example Config

```javascript
    let heatmap = new Heatmap({
        ele: document.getElementById('heatmap'),
        rows: [{...}],
        cols: [{...}],
        matrix: [[1, 2, 3], [2, 5.3, 0], ...],
        // note the following configs are optional
        color: {
            bins: ['=0', '=1', '=2', '<20', '>=20'],
            colors: [0xffffff, 0xfbe6e2, 0xffadad, 0xff6b6b, 0xff0000]
        },
        onHover: info => `<div><b>Genome:</b> ${info.yLabel}</div>`
    })
```

### Config

| Param                 | Type                              | Required? | Default                       |
|-----------------------|-----------------------------------|-----------|-------------------------------|
| [rows](#rows)         | list of `row` objects (see below) | &check;   | -                             |
| [cols](#cols)         | list of `col` objects (see below) | &check;   | -                             |
| matrix                | matrix of numbers                 | &check;   | -                             |
| rowsLabel             | string                            | -         | 'Rows'                        |
| colsLabel             | string                            | -         | 'Columns'                     |
| rowCatLabels          | list of strings                   | -         | []                            |
| colCatLabels          | list of strings                   | -         | []                            |
| color                 | string \|\| object                | -         | 'gradient'                    |
| [defaults](#defaults) | Object                            | -         | computed based on window size |
| [options](#options)   | Object                            | -         | -                             |


### Event Callbacks

| Param       | Type                  | Required? | Default                                                     |
|-------------|-----------------------|-----------|-------------------------------------------------------------|
| onHover     | function(Object) {}   | -         | Displays row, column, and matrix value in tooltip on hover. |
| onSelection | function([Object]) {} | -         | -                                                           |
| onClick     | function(Object) {}   | -         | -                                                           |

### API Methods

| Method      | Definition                                      | Description                                                |
|-------------|-------------------------------------------------|------------------------------------------------------------|
| update      | update({rows, cols, matrix})                    | Given object with rows, columns, and matrix, updates chart |
| getState    | getState()                                      | Returns current rows, columns and matrix                   |
| flipAxis    | flipAxis()                                      | Swaps rows, cols, labels, and scaling                      |
| downloadSVG | downloadSVG({{fileName = 'heatmap.svg', full}}) | Downloads chart as SVG.  "full" will include all data.     |



##### rows
```javascript
[
    {
        name: 'some label',
        categories: ['cat 1', 'cat 2']
    },
    ...
]
```

##### cols
```javascript
[
    {
        name: 'some label',
        categories: ['cat foo', 'cat bar']
    },
    ...
]
```

##### defaults
```javascript
{
    cellWidth: <initial height of cell (integer)>,
    cellHeight: <initial height of cell (integer)>
}
```

##### options
```javascript
{
    theme: 'dark' | 'light'
    hideLegend: <bool>
    optionsLabel: 'Options',
    legend: <some_html>,
    showVersion: <bool>     // shows version number bottom right
}
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

[nconrad](https://github.com/nconrad)


## Citation

Paper pending.  Please cite this repo in the meantime:

N. Conrad, A WebGL Heatmap Viewer for Bioinformatics and Big Data, (2019), GitHub repository, https://github.com/nconrad/heatmap


## License

Released under [the MIT license](https://github.com/nconrad/heatmap/blob/master/LICENSE).



