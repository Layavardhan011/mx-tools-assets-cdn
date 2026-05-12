import React from "react"
import classNames from "classnames"
import PropTypes from "prop-types"
import { CopyToClipboard } from "react-copy-to-clipboard"

const style = {
  cursor: "pointer",
  lineHeight: 1,
  display: "inline-flex",
  backgroundColor: "rgb(250, 250, 250)",
  paddingBottom: "0",
  paddingTop: "0",
  border: "1px solid rgb(51, 51, 51)",
  borderRadius: "4px 4px 0 0",
  boxShadow: "none",
  borderBottom: "none"
}

const activeStyle = {
  cursor: "pointer",
  lineHeight: 1,
  display: "inline-flex",
  backgroundColor: "rgb(51, 51, 51)",
  boxShadow: "none",
  border: "1px solid rgb(51, 51, 51)",
  paddingBottom: "0",
  paddingTop: "0",
  borderRadius: "4px 4px 0 0",
  marginTop: "-5px",
  marginRight: "-5px",
  marginLeft: "-5px",
  zIndex: "9999",
  borderBottom: "none"
}

class RequestSnippetLanguageBtn extends React.Component {
  handleClick = () => {
    this.props.onGenChange(this.props.langKey)
  }
  render() {
    const { langKey, title, activeLanguage, getBtnStyle } = this.props
    return (
      <div
        className={classNames("btn", {"active": langKey === activeLanguage })}
        style={getBtnStyle(langKey)}
        onClick={this.handleClick}
      >
        <h4 style={langKey === activeLanguage ? { color: "white", } : {}}>{title}</h4>
      </div>
    )
  }
}

RequestSnippetLanguageBtn.propTypes = {
  langKey: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  activeLanguage: PropTypes.string,
  onGenChange: PropTypes.func.isRequired,
  getBtnStyle: PropTypes.func.isRequired,
}

const renderPlainText = ({ children, PlainTextViewer }) => (
  <PlainTextViewer className="curl">{children}</PlainTextViewer>
)

renderPlainText.propTypes = {
  children: PropTypes.node,
  PlainTextViewer: PropTypes.func,
}

class RequestSnippets extends React.Component {
  constructor(props) {
    super(props)
    this.rootRef = React.createRef()
    this.state = {
      activeLanguage: props.requestSnippetsSelectors.getSnippetGenerators()?.keySeq().first(),
      isExpanded: props.requestSnippetsSelectors?.getDefaultExpanded()
    }
  }

  handleGenChange = (key) => {
    if (this.state.activeLanguage !== key) {
      this.setState({ activeLanguage: key })
    }
  }

  handleSetIsExpanded = () => {
    this.setState({ isExpanded: !this.state.isExpanded })
  }

  handleGetBtnStyle = (key) => {
    return key === this.state.activeLanguage ? activeStyle : style
  }

  handlePreventYScrollingBeyondElement = (e) => {
    const { target, deltaY } = e
    const { scrollHeight: contentHeight, offsetHeight: visibleHeight, scrollTop } = target
    const scrollOffset = visibleHeight + scrollTop
    const isElementScrollable = contentHeight > visibleHeight
    const isScrollingPastTop = scrollTop === 0 && deltaY < 0
    const isScrollingPastBottom = scrollOffset >= contentHeight && deltaY > 0

    if (isElementScrollable && (isScrollingPastTop || isScrollingPastBottom)) {
      e.preventDefault()
    }
  }

  componentDidMount() {
    this.addScrollEventListener()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.request !== this.props.request) {
      this.removeScrollEventListener()
      this.addScrollEventListener()
    }
  }

  componentWillUnmount() {
    this.removeScrollEventListener()
  }

  addScrollEventListener() {
    if (this.rootRef.current) {
      const childNodes = Array
        .from(this.rootRef.current.childNodes)
        .filter(node => !!node.nodeType && node.classList?.contains("curl-command"))
      childNodes.forEach(node => node.addEventListener("mousewheel", this.handlePreventYScrollingBeyondElement, { passive: false }))
    }
  }

  removeScrollEventListener() {
    if (this.rootRef.current) {
      const childNodes = Array
        .from(this.rootRef.current.childNodes)
        .filter(node => !!node.nodeType && node.classList?.contains("curl-command"))
      childNodes.forEach(node => node.removeEventListener("mousewheel", this.handlePreventYScrollingBeyondElement))
    }
  }

  render() {
    const { request, requestSnippetsSelectors, getComponent } = this.props
    const { activeLanguage, isExpanded } = this.state

    const ArrowIcon = getComponent("ArrowUpIcon")
    const ArrowDownIcon = getComponent("ArrowDownIcon")
    const SyntaxHighlighter = getComponent("SyntaxHighlighter", true)

    const snippetGenerators = requestSnippetsSelectors.getSnippetGenerators()
    const activeGenerator = snippetGenerators.get(activeLanguage)
    const snippet = activeGenerator.get("fn")(request)

    return (
      <div className="request-snippets" ref={this.rootRef}>
        <div style={{ width: "100%", display: "flex", justifyContent: "flex-start", alignItems: "center", marginBottom: "15px" }}>
          <h4
            onClick={this.handleSetIsExpanded}
            style={{ cursor: "pointer" }}
          >Snippets</h4>
          <button
            onClick={this.handleSetIsExpanded}
            style={{ border: "none", background: "none" }}
            title={isExpanded ? "Collapse operation" : "Expand operation"}
          >
            {isExpanded ? <ArrowDownIcon className="arrow" width="10" height="10" /> : <ArrowIcon className="arrow" width="10" height="10" />}
          </button>
        </div>
        {
          isExpanded && <div className="curl-command">
            <div style={{ paddingLeft: "15px", paddingRight: "10px", width: "100%", display: "flex" }}>
              {
                snippetGenerators.entrySeq().map(([key, gen]) => {
                  return (
                    <RequestSnippetLanguageBtn
                      key={key}
                      langKey={key}
                      title={gen.get("title")}
                      activeLanguage={activeLanguage}
                      onGenChange={this.handleGenChange}
                      getBtnStyle={this.handleGetBtnStyle}
                    />
                  )
                })
              }
            </div>
            <div className="copy-to-clipboard">
              <CopyToClipboard text={snippet}>
                <button />
              </CopyToClipboard>
            </div>
            <div>
              <SyntaxHighlighter
                language={activeGenerator.get("syntax")}
                className="curl microlight"
                renderPlainText={renderPlainText}
              >
                {snippet}
              </SyntaxHighlighter>
            </div>
          </div>
        }
      </div>
    )
  }
}

RequestSnippets.propTypes = {
  request: PropTypes.object.isRequired,
  requestSnippetsSelectors: PropTypes.object.isRequired,
  getComponent: PropTypes.func.isRequired,
  requestSnippetsActions: PropTypes.object,
}

export default RequestSnippets
