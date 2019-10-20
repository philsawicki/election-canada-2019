import Application from './application';


/**
 * Add Chart.js option to display labels at the center of doughnut charts.
 *
 * This adds the following options to Doughnut charts:
 * options = {
 *      ...defaultOptions,
 *      elements: {
 *          center: {
 *              text: 'Text label',
 *              color: '#fff',
 *              verticalOffset: 0,
 *              fontStyle: 'Arial'
 *          }
 *      }
 * }
 */
Chart.pluginService.register({
    beforeDraw: (chart: any) => {
        const centerConfig = chart.config.options.elements.center;
        if (centerConfig) {
            const { ctx } = chart.chart;

            const fontStyle = centerConfig.fontStyle || 'Arial';
            const text = centerConfig.text || '';
            const color = centerConfig.color || '#000';
            const verticalOffset = centerConfig.verticalOffset || 12;

            if (text !== '') {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                ctx.font = `bolder 1.5rem ${fontStyle}`;
                ctx.fillStyle = color;
                ctx.fillText(text, centerX, centerY - verticalOffset);

                const ctx2 = chart.chart.ctx;
                ctx2.font = `normal 300 1rem ${fontStyle}`;
                ctx2.fillText('LEADING', centerX, centerY + verticalOffset);
            } else {
                const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `normal 300 1rem ${fontStyle}`;
                ctx.fillStyle = color;
                ctx.fillText('(NO RESULTS YET)', centerX, centerY);
            }
        }
    }
});


const app = new Application();
