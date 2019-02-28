

PIXI.loader.add('redCell', spritePath).load((ldr, resources) => {
    this.sprites = resources;
});

/**
 * very pretty ellipsis, but
 * not currently used since there's a performance hit
 **/
textEllipsis(ele, text, width) {
    // fixed bug in from the following:
    // https://stackoverflow.com/questions/15975440/add-ellipses-to-overflowing-text-in-svg
    ele.textContent = text;
    let len = text.length;
    while (ele.getSubStringLength(0, len--) > width) {
        ele.textContent = text.slice(0, len) + '...';
    }
}

textureRect(color) {
    let g = new PIXI.Graphics();
    g.beginFill(color);
    g.drawRect(1, 1, 10, 10);
    g.endFill();
    return new PIXI.Sprite(g.generateCanvasTexture());
}
