import React from 'react'
import PropTypes from 'prop-types'
import Color from 'color'

import ScatterPlotLoader from './plotloader/PlotLoader'
import AtlasAutocomplete from 'expression-atlas-autocomplete'
import MultiStopGradient from './MultiStopGradient'

import './util/MathRound'
import Responsive from 'react-responsive';


const Desktop = props => <Responsive {...props} minWidth={1800} />;
const Tablet = props => <Responsive {...props} minWidth={1000} maxWidth={1799} />;
const Mobile = props => <Responsive {...props} minWidth={767} maxWidth={999} />;
const Default = props => <Responsive {...props} maxWidth={766} />;


const MAX_WHITE = 90


const _colourize = (colourRanges, defaultColour = `blue`, alpha = 0.65) => {
  return (val) => {
    if (isNaN(val)) {
      return Color(defaultColour).alpha(alpha).rgb().toString()
    }

    if (val === 0) {
      return Color('lightgrey').alpha(alpha).rgb().toString()
    }

    if (val > 9999) {
      return Color(`rgb(0, 0, 115)`).alpha(alpha).rgb().toString()
    }

    const rangeIndex = val <= 0 ? 0 : colourRanges.findIndex((colourRange) => colourRange.threshold >= val) - 1

    const loColour = Color(colourRanges[rangeIndex].colour)
    const hiColour = Color(colourRanges[rangeIndex + 1].colour)

    const redDelta = hiColour.red() - loColour.red()
    const greenDelta = hiColour.green() - loColour.green()
    const blueDelta = hiColour.blue() - loColour.blue()
    const increment = (val - colourRanges[rangeIndex].threshold) / (colourRanges[rangeIndex + 1].threshold - colourRanges[rangeIndex].threshold)

    return Color(
      `rgb(` +
      `${Math.floor(loColour.red() + redDelta * increment)}, ` +
      `${Math.floor(loColour.green() + greenDelta * increment)}, ` +
      `${Math.floor(loColour.blue() + blueDelta * increment)})`
    ).alpha(alpha).rgb().toString()
  }
}


const _colourizeExpressionLevel = (gradientColours, highlightSeries) => {
  const colourize = _colourize(gradientColours)
    return (plotData) => plotData.series.map((aSeries) => {
      // I can’t think of a better way to reconcile series.name being a string and highlightSeries being an array of
      // numbers. For more flexibility we might think of having our series be identified by an arbitrary ID string

      if (!highlightSeries.length || highlightSeries.map((hs) => String(hs)).includes(aSeries.name)) {
        return {
          name: aSeries.name,
          data: aSeries.data.map((point) => {
            if(point.expressionLevel>0){
              return {
                ...point,
                expressionLevel: Math.round10(point.expressionLevel, -2),
                colorv: Math.round10(point.expressionLevel, -2)
              }
            } else {
                return {
                  ...point,
                  expressionLevel: Math.round10(point.expressionLevel, -2),
                  color: Color(`lightgrey`).alpha(0.65).rgb().toString()
                }
            }
 
          })
        }
      } else {
        return {
          name: aSeries.name,
          data: aSeries.data.map((point) => ({
            ...point,
            expressionLevel: Math.round10(point.expressionLevel, -2),
            color: Color(`lightgrey`).alpha(0.65).rgb().toString()
          }))
        }
      }
    }) 
}

const GeneExpressionScatterPlot = (props) => {
  const {atlasUrl, suggesterEndpoint, geneId, onSelectGeneId, speciesName} = props       // Suggester
  const {height, plotData, expressionGradientColours, highlightClusters} = props  // Chart
  const {loading, resourcesUrl, errorMessage} = props                       // Overlay
  const colourSchema = [`#d4e4fb`,`#95adde`,`#6077bf`,`#1151D1`,`#35419b`,`#0e0573`]; // light blue to dark blue
  const colourSchemaLength = colourSchema.length; 
  const dataScale = plotData.max==null? 0:plotData.max.toFixed(0).toString().length; // The digit before demical

  const highchartsConfig = {
    plotOptions: {
      scatter: {
        tooltip: {
          headerFormat: `<b>Cell ID:</b> {point.key}<br>`,
          pointFormat: geneId ? `<b>Expression level:</b> {point.expressionLevel} ${plotData.unit}` : `No gene selected`
        },
        marker: {
          symbol: `circle`
        }
      }
    },
    chart: {
      height: plotData.max==0 ?  height*0.95 : height,
    },
    title: {
      text: `Gene expression`
    },
    colorAxis: plotData.max==0 ? {} :
    {
      min: 0.1,
      max: 10**dataScale-1,
      type: 'logarithmic',
      reversed: false,
      //Dynamic stop where the last change colour is 100K
      stop: colourSchema.map((val,idx) => {
        return idx <= (Math.min(dataScale,colourSchemaLength) -1) ? [(idx+1)/Math.min(dataScale,colourSchemaLength),val] : []
      }),
      minColor:`rgb(215, 255, 255)`,
      maxColor: dataScale>colourSchemaLength ? colourSchema[colourSchemaLength-1] : colourSchema[dataScale-1],
      marker: {
         color: '#c4463a'    
      }
    },
    legend: plotData.max==0 ? {enabled: false} : 
    {
      title: {
        text: "Expression level (TPM)"
      },
      floating: false,
      align: "center",
      symbolHeight: 5,
      symbolWidth: 450
    },
    tooltip: {
      positioner: function () {
        return { x: 30, y: 50 };
      },
    }
  }

  const renderGradient = plotData.max > 0
  const chartClassName = renderGradient ? `small-10 columns` : `small-12 columns`
  const gradient = renderGradient ?
    <MultiStopGradient height={height}
                       showTicks={true}
                       colourRanges={expressionGradientColours}
                       plotData={plotData}/> :
    null

  return [
    <AtlasAutocomplete key={`expression-autocomplete`}
                       wrapperClassName={`row`}
                       autocompleteClassName={`small-12 columns`}
                       atlasUrl={atlasUrl}
                       suggesterEndpoint={suggesterEndpoint}
                       enableSpeciesFilter={false}
                       initialValue={geneId}
                       defaultSpecies={speciesName}
                       onSelect={ (event) => { onSelectGeneId(event) } }
    />,
    //react-responsive design
    <Desktop key={`Desktop`}>
    <ScatterPlotLoader key={`expression-plot`}
                       wrapperClassName={`row`}
                       chartClassName={`small-12 columns`}
                       series={_colourizeExpressionLevel(expressionGradientColours, highlightClusters)(plotData)}
                       highchartsConfig={highchartsConfig}
                       loading={loading}
                       legendWidth={1800/2.2}
                       resourcesUrl={resourcesUrl}
                       errorMessage={errorMessage}
    />
    </Desktop>,
    <Tablet key={`Tablet`}>
    <ScatterPlotLoader key={`expression-plot`}
                       wrapperClassName={`row`}
                       chartClassName={`small-12 columns`}
                       series={_colourizeExpressionLevel(expressionGradientColours, highlightClusters)(plotData)}
                       highchartsConfig={highchartsConfig}
                       loading={loading}
                       legendWidth={1000/2.2}
                       resourcesUrl={resourcesUrl}
                       errorMessage={errorMessage}
    />
    </Tablet>,
    <Mobile key={`Mobile`}>
    <ScatterPlotLoader key={`expression-plot`}
                       wrapperClassName={`row`}
                       chartClassName={`small-12 columns`}
                       series={_colourizeExpressionLevel(expressionGradientColours, highlightClusters)(plotData)}
                       highchartsConfig={highchartsConfig}
                       loading={loading}
                       legendWidth={750}
                       resourcesUrl={resourcesUrl}
                       errorMessage={errorMessage}
    />
    </Mobile>,
    <Default key={`Default`}>
    <ScatterPlotLoader key={`expression-plot`}
                       wrapperClassName={`row`}
                       chartClassName={`small-12 columns`}
                       series={_colourizeExpressionLevel(expressionGradientColours, highlightClusters)(plotData)}
                       highchartsConfig={highchartsConfig}
                       loading={loading}
                       legendWidth={350}
                       resourcesUrl={resourcesUrl}
                       errorMessage={errorMessage}
    />
    </Default>,

    ]
}

GeneExpressionScatterPlot.propTypes = {
  height: PropTypes.number.isRequired,

  plotData: PropTypes.shape({
    series: PropTypes.array.isRequired,
    unit: PropTypes.string.isRequired,
    max: PropTypes.number,
    min: PropTypes.number
  }),
  expressionGradientColours: PropTypes.arrayOf(PropTypes.shape({
    colour: PropTypes.string.isRequired,
    threshold: PropTypes.number.isRequired,
    stopPosition: PropTypes.number.isRequired
  })).isRequired,
  highlightClusters: PropTypes.array,

  atlasUrl: PropTypes.string.isRequired,
  suggesterEndpoint: PropTypes.string.isRequired,
  speciesName: PropTypes.string.isRequired,
  onSelectGeneId: PropTypes.func.isRequired,

  loading: PropTypes.bool.isRequired,
  resourcesUrl: PropTypes.string,
  errorMessage: PropTypes.string
}

GeneExpressionScatterPlot.defaultProps = {
  expressionGradientColours: [
    {
      colour: `rgb(215, 255, 255)`,
      threshold: 0,
      stopPosition: 0
    },
    {
      colour: `rgb(128, 255, 255)`,
      threshold: 10,
      stopPosition: 20
    },
    {
      colour: `rgb(0, 85, 225)`,
      threshold: 100,
      stopPosition: 40
    },
    {
      colour: `rgb(0, 0, 115)`,
      threshold: 10000,
      stopPosition: 100
    }
  ]
}

export {GeneExpressionScatterPlot as default, _colourizeExpressionLevel}
