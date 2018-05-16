import React from 'react'
import PropTypes from 'prop-types'

import URI from 'urijs'

import ClusterTSnePlot from './ClusterTSnePlot'
import GeneExpressionTSnePlot from './GeneExpressionTSnePlot'

const fetchResponseJson = async (base, endpoint) => {
  const response = await fetch(URI(endpoint, base).toString())
  const responseJson = await response.json()
  return responseJson
}

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
      loadingGeneExpression: false
    }
  }

  _fetchAndSetStateCellClusters({atlasUrl, experimentAccession, selectedK, selectedPerplexity}) {
    this.setState({
      loadingCellClusters: true
    }, () => {
      fetchResponseJson(atlasUrl, `json/experiments/${experimentAccession}/tsneplot/${selectedPerplexity}/clusters/k/${selectedK}`)
        .then((responseJson) => {
          this.setState({
            cellClustersData: responseJson,
            cellClustersErrorMessage: null,
            loadingCellClusters: false
          })
        })
        .catch((reason) => {
          this.setState({
            cellClustersErrorMessage: `${reason.name}: ${reason.message}`,
            loadingCellClusters: false
          })
        })
    })
  }

  _fetchAndSetStateGeneId({atlasUrl, experimentAccession, selectedPerplexity, geneId}) {
    this.setState({
      loadingGeneExpression: true
    }, () => {
      fetchResponseJson(atlasUrl, `json/experiments/${experimentAccession}/tsneplot/${selectedPerplexity}/expression/${geneId}`)
        .then((responseJson) => {
          this.setState({
            geneExpressionData: responseJson,
            geneExpressionErrorMessage: null,
            loadingGeneExpression: false,
          })
        })
        .catch((reason) => {
          this.setState({
            geneExpressionErrorMessage: `${reason.name}: ${reason.message}`,
            loadingGeneExpression: false
          })
        })
    })
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.selectedPerplexity !== this.props.selectedPerplexity || nextProps.experimentAccession !== this.props.experimentAccession) {
      this._fetchAndSetStateCellClusters(nextProps)
      this._fetchAndSetStateGeneId(nextProps)
    } else if (nextProps.selectedK !== this.props.selectedK) {
      this._fetchAndSetStateCellClusters(nextProps)
    } else if (nextProps.geneId !== this.props.geneId) {
      this._fetchAndSetStateGeneId(nextProps)
    }
  }

  componentDidMount() {
    this._fetchAndSetStateCellClusters(this.props)
    this._fetchAndSetStateGeneId(this.props)
  }

  render() {
    const {height, atlasUrl, resourcesUrl, suggesterEndpoint} = this.props
    const {geneId, speciesName, highlightClusters} = this.props
    const {ks, selectedK, perplexities, selectedPerplexity} = this.props
    const {onChangePerplexity, onChangeK, onSelectGeneId} = this.props
    const {loadingGeneExpression, geneExpressionData, geneExpressionErrorMessage} = this.state
    const {loadingCellClusters, cellClustersData, cellClustersErrorMessage} = this.state

    const getTooltipContent = (cellId) => {
      return fetchResponseJson(atlasUrl, `json/experiment/${this.props.experimentAccession}/cell/${cellId}/metadata`)
    }

    return (
      <div className={`row`}>
        <div className={`small-12 medium-6 columns`}>
          <ClusterTSnePlot height={height}
                           plotData={cellClustersData}
                           perplexities={perplexities}
                           selectedPerplexity={selectedPerplexity}
                           onChangePerplexity={onChangePerplexity}
                           ks={ks}
                           selectedK={selectedK}
                           onChangeK={onChangeK}
                           highlightClusters={highlightClusters}
                           loading={loadingCellClusters}
                           resourcesUrl={resourcesUrl}
                           errorMessage={cellClustersErrorMessage}
                           tooltipContent={getTooltipContent}
          />
        </div>

        <div className={`small-12 medium-6 columns`}>
          <GeneExpressionTSnePlot height={height}
                                  plotData={geneExpressionData}
                                  atlasUrl={atlasUrl}
                                  suggesterEndpoint={suggesterEndpoint}
                                  onSelectGeneId={onSelectGeneId}
                                  geneId={geneId}
                                  speciesName={speciesName}
                                  highlightClusters={[]}
                                  loading={loadingGeneExpression}
                                  resourcesUrl={resourcesUrl}
                                  errorMessage={geneExpressionErrorMessage}
          />
        </div>

      </div>
    )
  }

  componentDidCatch(error, info) {
    this.setState({
       errorMessage: `${error}`
     })
  }
}

TSnePlotView.propTypes = {
  atlasUrl: PropTypes.string.isRequired,
  suggesterEndpoint: PropTypes.string.isRequired,
  experimentAccession: PropTypes.string.isRequired,
  ks: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedK: PropTypes.number.isRequired,
  perplexities: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedPerplexity: PropTypes.number.isRequired,
  highlightClusters: PropTypes.arrayOf(PropTypes.number),
  geneId: PropTypes.string.isRequired,
  speciesName: PropTypes.string.isRequired,
  height: PropTypes.number,
  resourcesUrl: PropTypes.string,
  onSelectGeneId: PropTypes.func,
  onChangeK: PropTypes.func,
  onChangePerplexity: PropTypes.func
}

TSnePlotView.defaultProps = {
  highlightClusters: [],
  geneId: '',
  speciesName: '',
  height: 600,
  onSelectGeneId: () => {},
  onKChange: () => {},
  onPerplexityChange: () => {}
}

export default TSnePlotView
