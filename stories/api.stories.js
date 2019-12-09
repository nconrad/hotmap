import Hotmap from '../src/hotmap';
import { start } from './start-demo';
import { getMockData } from './mock-data';

export default {title: 'API'}

const m = 5,
      n = 5;


const initHeatmap = () => {

  const {rows, cols, matrix} = getMockData(m, n)
  console.log('matrix', matrix)

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


export const colorByIndex = () => {
  const demo = () => {
    const heatmap = initHeatmap()

    // example of coloring by indexes
    heatmap.colorByIndex({
      color: 0x114411,
      indexes: [[1, 1], [1, 2], [2, 1], [2, 2]]
    });
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
      heatmap.colorByIndex({
        color: 0x114411,
        indexes: [[1, 1], [1, 2], [2, 1], [2, 2]]
      })

      timeout = setTimeout(update, 2000)
    }

    // timeout for initial render
    setTimeout(update)
  }

  return start(demo, () => clearTimeout(timeout))
}

