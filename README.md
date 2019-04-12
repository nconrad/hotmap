# Heatmap

A WebGL/Canvas Heatmap for Bioinformatics and Big Data, written in vanilla JS and built with [pixi.js](http://www.pixijs.com/).

![screenshot](demo/screenshot.png)


## Why?

I wanted to create a heatmap viewer that easy to use and scales to millions of cells. 


## Usage

Currently requires:

```
npm install 
npm build
```


#### Global

Add the required CSS/JS:

```
<link rel="stylesheet" type="text/css" href="dist/heatmap.css">
<script src="dist/heatmap.js"></script>
```

#### ES6

Add required CSS: 

```
<link href="dist/heatmap.css" rel="stylesheet" type="text/css">
```

Include:

```
import Heatmap from 'dist/heatmap';
```

#### AMD

Required CSS: 

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

| Param        | Type                   | Required? | Default                                                     |
|--------------|------------------------|-----------|-------------------------------------------------------------|
| rows         | list of rows objects   | &check;   | -                                                           |
| cols         | list of col objects    | &check;   | -                                                           |
| matrix       | matrix of numbers      | &check;   | -                                                           |
| rowCatLabels | list lof strings       | -         | -                                                           |
| colCatLabels | list lof strings       | -         | -                                                           |
| color        | string \|\| object     | -         | 'gradient'                                                  |
| onHover      | function(info) {}      | -         | Displays row, column, and matrix value in tooltip on hover. |
| onSelect     | function(selection) {} | -         | -                                                           |
| theme        | 'light' \|\| 'dark'    | -         | 'dark'                                                      |


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



