

export default class LoadingBar {

    constructor({ele, max}) {
        this.ele = ele;
        this.max = max;
        this.progress = 0;

        this.init();
    }

    init() {
        let loadingBar = this.ele.querySelector('.loading-bar');
        this.bar = document.createElement('div');
        this.bar.className = 'loading-bar-progress';
        loadingBar.appendChild(this.bar);
    }

    setProgress(val) {
        this.progress = val;
        this.bar.style.width = `${val}px`;
    }
}
