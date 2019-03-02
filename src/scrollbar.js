/**
 * scrollbar.js
 *
 * A scrollbar implementation for heatmap.js, using fake content area.
 *
 * Authors: nconrad
 *
 */

let barOffset = '15';

export default class ScrollBar {

    constructor({
        ele, x, y, width, height, xMax, yMax,
        contentWidth, contentHeight, onMove,
    }) {
        this.ele = ele;
        this.x = x;
        this.y = y;

        this._xMax = xMax;
        this._yMax = yMax;

        // events
        this._onMove = onMove;

        this.width = width;
        this.height = height;
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;

        this.init();

        return this;
    }

    init() {
        // setup scroll container
        let container = document.querySelector('.scroll-container');
        container.style.padding = `0 ${barOffset}px ${barOffset}px 0`;

        // for firefox, at least show on hover
        if (navigator.userAgent.search('Firefox') != -1) {
            container.classList.add('ff');
        }

        container.style.top = this.y;
        container.style.left = this.x;
        container.style.width = this.width;
        container.style.height = this.height;
        this.scrollContainer = container;

        // setup fake content
        let content = document.createElement('div');
        content.classList.add('scroll-content');
        content.style.top = this.y;
        content.style.left = this.x;
        content.style.width = this.contentWidth - barOffset;
        content.style.height = this.contentHeight - barOffset;

        this.scrollContainer.append(content);
        this.content = content;

        let previousX = 0,
            previousY = 0;
        this.scrollContainer.addEventListener('scroll', evt => {
            let target = evt.target;

            let y = target.scrollTop,
                x = target.scrollLeft;

            let xDirection = x > previousX ? 'right' : (x === previousX ? null : 'left'),
                yDirection = y > previousY ? 'down' : (y === previousY ? null : 'up');

            if (xDirection) {
                let percent = target.scrollLeft / target.scrollWidth;
                let pos = Math.ceil(percent * this._xMax);
                this._onMove('x', pos);
            }

            if (yDirection) {
                let percent = target.scrollTop / target.scrollHeight;
                let pos = Math.ceil(percent * this._yMax);
                this._onMove('y', pos);
            }

            previousX = x;
            previousY = y;
        });
    }

    setWidth(width) {
        this.width = width - barOffset;
        this.content.style.width = this.width;
    }

    setHeight(height) {
        this.height = height - barOffset;
        this.content.style.height = this.height;
    }

    setContentWidth(width) {
        this.contentWidth = width;
        this.scrollContainer.style.width = width;
    }

    setContentHeight(height) {
        this.contentHeight = height;
        this.scrollContainer.style.height = height;
    }

    hideY() {
        this.scrollContainer.style.paddingRight = 0;
    }

    showY() {
        this.scrollContainer.style.paddingRight = `${barOffset}px`;
    }

    hideX() {
        this.scrollContainer.style.paddingBottom = 0;
    }

    showX() {
        this.scrollContainer.style.paddingBottom = `${barOffset}px`;
    }
}
