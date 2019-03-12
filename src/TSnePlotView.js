import React from 'react'
import PropTypes from 'prop-types'
import { withEmit } from "react-emit"
import URI from 'urijs'
import { EmitProvider } from "react-emit"
import ClusterTSnePlot from './ClusterTSnePlot'

import MyCoolComponent from './MyCoolComponent'

class TSnePlotView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      geneExpressionData: {
        max: null,
        min: null,
        series: [],
        unit: ``
      },
      cellClustersData: {
        series: []
      },
      geneExpressionErrorMessage: null,
      cellClustersErrorMessage: null,
      loadingCellClusters: false,
      loadingGeneExpression: false,
      cluster: null,
      clusterToggle: false
    }
  }

  async _fetchAndSetState(resource, baseUrl, dataField, errorMessageField, loadingField) {
    this.setState({
      [loadingField]: true
    })

    const url = URI(resource, baseUrl).toString()

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`${url} => ${response.status}`)
      }

      this.setState({
        [dataField]: await response.json(),
        [errorMessageField]: null,
        [loadingField]: false,
      })
    } catch(e) {
      this.setState({
        [errorMessageField]: `${e.name}: ${e.message}`,
        [loadingField]: false
      })
    }
  }

  _fetchAndSetStateCellClusters(
    {atlasUrl, experimentAccession, selectedColourBy, selectedColourByCategory, selectedPerplexity, geneId}) {

    const resource =
      selectedColourByCategory === `clusters` ?
        `json/experiments/${experimentAccession}/tsneplot/${selectedPerplexity}/clusters/k/${selectedColourBy}` :
        selectedColourByCategory === `metadata` ?
          `json/experiments/${experimentAccession}/tsneplot/${selectedPerplexity}/metadata/${selectedColourBy}` :
        // We shouldn’t arrive here...
          undefined
    this._fetchAndSetState(
      resource, atlasUrl, `cellClustersData`, `cellClustersErrorMessage`, `loadingCellClusters`)

	  const expressionResource = `${resource}/expression/ENSMUSG00000044338`
	  this._fetchAndSetState(
			  expressionResource, atlasUrl, `geneExpressionData`, `geneExpressionErrorMessage`, `loadingGeneExpression`)
  }

  _fetchAndSetStateGeneId({atlasUrl, experimentAccession, selectedColourBy, selectedPerplexity, geneId}) {
    const resource = `json/experiments/${experimentAccession}/tsneplot/${selectedPerplexity}/clusters/k/${selectedColourBy}/expression/${geneId}`

    this._fetchAndSetState(
      resource, atlasUrl, `geneExpressionData`, `geneExpressionErrorMessage`, `loadingGeneExpression`)
  }

  componentDidUpdate(previousProps) {
    if (previousProps.selectedPerplexity !== this.props.selectedPerplexity ||
        previousProps.experimentAccession !== this.props.experimentAccession) {
      this._fetchAndSetStateCellClusters(this.props)
    } else if (previousProps.selectedColourByCategory !== this.props.selectedColourBy &&
               previousProps.selectedColourBy !== this.props.selectedColourBy) {
      this._fetchAndSetStateCellClusters(this.props)
    } else if (previousProps.geneId !== this.props.geneId) {
      this._fetchAndSetStateGeneId(this.props)
    }
  }

  componentDidMount() {
    this._fetchAndSetStateCellClusters(this.props)
  }

  render() {
    const {height, atlasUrl, resourcesUrl, suggesterEndpoint} = this.props
    const {wrapperClassName, clusterPlotClassName, expressionPlotClassName} = this.props
    const {geneId, speciesName, highlightClusters} = this.props
    const {ks, perplexities, selectedPerplexity, metadata, selectedColourBy, selectedColourByCategory} = this.props
    const {onChangePerplexity, onSelectGeneId, onChangeColourBy} = this.props
    const {loadingGeneExpression, geneExpressionData, geneExpressionErrorMessage} = this.state
    const {loadingCellClusters, cellClustersData, cellClustersErrorMessage} = this.state

    const getTooltipContent = async (cellId) => {
      const url = URI(`json/experiment/${this.props.experimentAccession}/cell/${cellId}/metadata`, atlasUrl).toString()
      try {
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`${url} => ${response.status}`)
        }

        return await response.json()
      } catch(e) {
        throw new Error(`${e.name}: ${e.message}`)
      }
    }

    return (
      <EmitProvider>
        <div className={wrapperClassName}>
          <div className={clusterPlotClassName}>

            <ClusterTSnePlot
              height={height}
              plotData={cellClustersData}
              perplexities={perplexities}
              selectedPerplexity={selectedPerplexity}
              onChangePerplexity={onChangePerplexity}
              ks={ks}
              metadata={metadata}
              clickClusterLegend={
                (cluster)=>{this.setState({cluster: cluster})}
              }
              onChangeColourBy={onChangeColourBy}
              selectedColourBy={selectedColourBy}
              highlightClusters={highlightClusters}
              loading={loadingCellClusters}
              resourcesUrl={resourcesUrl}
              errorMessage={cellClustersErrorMessage}
              tooltipContent={getTooltipContent}
              clusterType={selectedColourByCategory}
            />
          </div>
          <MyCoolComponent {...{expressionPlotClassName,height,geneExpressionData ,atlasUrl, suggesterEndpoint,onSelectGeneId,
            geneId, speciesName, loadingGeneExpression, resourcesUrl, geneExpressionErrorMessage}}/>
        </div>
      </EmitProvider>
    )
  }

  componentDidCatch(error) {
    this.setState({
      errorMessage: `${error}`
    })
  }
}


TSnePlotView.propTypes = {
  atlasUrl: PropTypes.string.isRequired,
  wrapperClassName: PropTypes.string,
  clusterPlotClassName: PropTypes.string,
  expressionPlotClassName: PropTypes.string,
  suggesterEndpoint: PropTypes.string.isRequired,
  experimentAccession: PropTypes.string.isRequired,
  ks: PropTypes.arrayOf(PropTypes.number).isRequired,
  perplexities: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedPerplexity: PropTypes.number.isRequired,

  metadata: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string,
    label: PropTypes.string
  })),
  selectedColourBy: PropTypes.string,
  selectedColourByCategory: PropTypes.string,
  onChangeColourBy: PropTypes.func,

  highlightClusters: PropTypes.arrayOf(PropTypes.number),
  geneId: PropTypes.string.isRequired,
  speciesName: PropTypes.string.isRequired,
  height: PropTypes.number,
  resourcesUrl: PropTypes.string,
  onSelectGeneId: PropTypes.func,
  onChangePerplexity: PropTypes.func
}

TSnePlotView.defaultProps = {
  highlightClusters: [],
  wrapperClassName: `row`,
  clusterPlotClassName: `small-12 medium-6 columns`,
  expressionPlotClassName: `small-12 medium-6 columns`,
  geneId: ``,
  speciesName: ``,
  height: 800,
  onSelectGeneId: () => {},
  onChangeColourBy: () => {},
  onPerplexityChange: () => {}
}

export default TSnePlotView
