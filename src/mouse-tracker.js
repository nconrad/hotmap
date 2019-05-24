/**
 * mouse-tracker.js
 *
 * Tracks mouse movement on a map of cells.
 *
 * Authors: nconrad
 *
 */
export default class MouseTracker {

    constructor(params) {
        this.mouseContainer = params.ele;

        this.m = params.m; // number of rows
        this.n = params.n; // number of columns
        this.cellXSize = params.cellXSize;
        this.cellYSize = params.cellYSize;

        // events
        this.onCellMouseOver = params.onCellMouseOver;
        this.onCellMouseOut = params.onCellMouseOut;

        this.init(params.top, params.left, params.width, params.height);
    }


    init(top, left, width, height) {
        this.update({top, left, width, height});

        // here we use -1 since new to old cell comparison is made
        let coordinates = {x: -1, y: -1};

        this._onMove = evt => {
            // look at container for scroll offsets
            let scrollCtner = evt.target.parentNode;

            // relative position of mouse on view (taking scrolling into account)
            let _xPos = evt.offsetX - scrollCtner.scrollLeft,
                _yPos = evt.offsetY - scrollCtner.scrollTop;

            // relative position on visible cells
            let x = parseInt(_xPos / this.cellXSize),
                y = parseInt(_yPos / this.cellYSize);

            let oldX = coordinates.x,
                oldY = coordinates.y;

            // only consider new cells
            if (x === oldX && y === oldY) return;

            // enforce boundary
            if (x === -1 || y === -1) return;

            this.onCellMouseOver({x, y, oldX, oldY});

            coordinates = {x, y};
        };

        this._onMouseOut = () => {
            this.onCellMouseOut();
            this.coordinates = {x: -1, y: -1};
        };

        this.mouseContainer.addEventListener('mousemove', this._onMove);
        this.mouseContainer.addEventListener('mouseout', this._onMouseOut);
    }


    update({top, left, width, height, cellXSize, cellYSize}) {
        // update container for scaling and whatnot
        this.mouseContainer.style.top = `${top}px`;
        this.mouseContainer.style.left = `${left}px`;
        this.mouseContainer.style.width = `${width}px`;
        this.mouseContainer.style.height = `${height}px`;

        this.cellXSize = cellXSize;
        this.cellYSize = cellYSize;
    }
}
