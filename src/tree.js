import Phylocanvas from 'phylocanvas';
import 'phylocanvas/polyfill';


export default class Tree {
    constructor(params) {
        this.ele = params.ele;
        this.margin = params.margin;
        this.newick = params.newick;

        this.width = params.width;
        this.height = params.height;

        this.tree = this.init();
        return this;
    }

    init() {
        let container = this.container = this.ele.querySelector('.tree');
        container.style.top = this.margin.top  - 12 + 'px';
        container.style.marginLeft = '30px';

        var tree = Phylocanvas.createTree(container);
        tree.load(this.newick);

        tree.padding = 0;
        tree.setNodeSize(0);
        tree.alignLabels = true;
        tree.lineWidth = 3;
        tree.shiftKeyDrag = true;
        tree.disableZoom = true;
        tree.setTreeType('rectangular');

        return tree;
    }

    setWidth(width) {
        this.container.style.width = `${width}px`;
        this.tree.canvas.width = width;
        this.tree.resizeToContainer();
        this.tree.draw(true);
    }

    setHeight(height) {
        height = height + 40;
        this.container.style.height = `${height}px`;
        this.tree.canvas.height = height;
        this.tree.resizeToContainer();
        this.tree.draw(true);
    }
}

