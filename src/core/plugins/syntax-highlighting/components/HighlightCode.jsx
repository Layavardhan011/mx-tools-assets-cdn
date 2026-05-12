/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"
import classNames from "classnames"
import saveAs from "js-file-download"
import { CopyToClipboard } from "react-copy-to-clipboard"

const renderPlainTextHelper = (className) => {
  const Helper = ({ children, PlainTextViewer }) => (
    <PlainTextViewer className={className}>{children}</PlainTextViewer>
  )
  Helper.propTypes = {
    children: PropTypes.node,
    PlainTextViewer: PropTypes.func,
  }
  return Helper
}

class HighlightCode extends React.Component {
  constructor(props) {
    super(props)
    this.rootRef = React.createRef()
    this.renderPlainText = renderPlainTextHelper(this.props.className)
  }

  handleDownload = () => {
    const { children, fileName = "response.txt" } = this.props
    saveAs(children, fileName)
  }

  handlePreventYScrollingBeyondElement = (e) => {
    const { target, deltaY } = e
    const {
      scrollHeight: contentHeight,
      offsetHeight: visibleHeight,
      scrollTop,
    } = target
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
    if (
      prevProps.children !== this.props.children ||
      prevProps.className !== this.props.className ||
      prevProps.language !== this.props.language
    ) {
      this.removeScrollEventListener()
      this.addScrollEventListener()
      this.renderPlainText = renderPlainTextHelper(this.props.className)
    }
  }

  componentWillUnmount() {
    this.removeScrollEventListener()
  }

  addScrollEventListener() {
    const childNodes = Array.from(this.rootRef.current.childNodes).filter(
      (node) => !!node.nodeType && node.classList.contains("microlight")
    )
    childNodes.forEach((node) =>
      node.addEventListener(
        "mousewheel",
        this.handlePreventYScrollingBeyondElement,
        { passive: false }
      )
    )
  }

  removeScrollEventListener() {
    if (this.rootRef.current) {
      const childNodes = Array.from(this.rootRef.current.childNodes).filter(
        (node) => !!node.nodeType && node.classList.contains("microlight")
      )
      childNodes.forEach((node) =>
        node.removeEventListener(
          "mousewheel",
          this.handlePreventYScrollingBeyondElement
        )
      )
    }
  }

  render() {
    const {
      className,
      downloadable,
      getComponent,
      canCopy,
      language,
      children,
    } = this.props
    const SyntaxHighlighter = getComponent("SyntaxHighlighter", true)

    return (
      <div className="highlight-code" ref={this.rootRef}>
        {canCopy && (
          <div className="copy-to-clipboard">
            <CopyToClipboard text={children}>
              <button />
            </CopyToClipboard>
          </div>
        )}

        {!downloadable ? null : (
          <button className="download-contents" onClick={this.handleDownload}>
            Download
          </button>
        )}

        <SyntaxHighlighter
          language={language}
          className={classNames(className, "microlight")}
          renderPlainText={this.renderPlainText}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    )
  }
}

HighlightCode.propTypes = {
  getComponent: PropTypes.func.isRequired,
  className: PropTypes.string,
  downloadable: PropTypes.bool,
  fileName: PropTypes.string,
  language: PropTypes.string,
  canCopy: PropTypes.bool,
  children: PropTypes.string.isRequired,
}

export default HighlightCode
