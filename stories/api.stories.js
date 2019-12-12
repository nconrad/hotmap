import Hotmap from '../src/hotmap';
import { start } from './start-demo';
import { getMockData } from './mock-data';

export default {title: 'API'}

const m = 5,
      n = 5;


const initHeatmap = () => {

  const {rows, cols, matrix} = getMockData(m, n)

  return new Hotmap({
    ele: document.getElementById('chart'),
    rows,
    cols,
    matrix,
    onSelection: (selection, rowIDs, colIDs) => {
      console.log('colIDs:', colIDs)
      console.log('rowIDs:', rowIDs)

      alert(
        `Selected ${selection.length} cell(s)\n\n` +
        JSON.stringify(selection, null, 4)
      );
    },
    onClick: selection => {
      alert(JSON.stringify(selection, null, 4));
    },
    onHover: info => {
      return `Hovered on: ${JSON.stringify(info)}`;
    },
  })
}


export const updating = () => {
  let timeout;

  const demo = () => {
    const heatmap = initHeatmap()

    // example of updating
    const update = () => {
      console.log('updating...')
      const {rows, cols, matrix} = getMockData(m, n)
      heatmap.update({rows, cols, matrix})
      timeout = setTimeout(update, 500)
    }

    // timeout for initial render
    setTimeout(update)
  }

  return start(demo, () => clearTimeout(timeout))
}


export const colorFilter = () => {
  const demo = () => {
    const heatmap = initHeatmap()


    // color the i, j cell black
    heatmap.colorFilter(({i, j, color, val}) => {
      if (i == 1 && j == 1) return 0x000000;
    })
  }

  return start(demo)
}


export const advancedUpdate = () => {
  let timeout;

  const demo = () => {
    const heatmap = initHeatmap()

    const update = () => {
      const {rows, cols, matrix} = getMockData(m, n)

      console.log('updating...')
      heatmap.update({rows, cols, matrix})

      // colors the cells black when its value is over .5
      heatmap.colorFilter(({val}) => {
        if (val > 0.5) return 0x000000;
      })

      timeout = setTimeout(update, 2000)
    }

    // timeout for initial render
    setTimeout(update)
  }

  return start(demo, () => clearTimeout(timeout))
}

