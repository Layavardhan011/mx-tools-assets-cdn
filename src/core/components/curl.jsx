import React from "react"
import PropTypes from "prop-types"
import { CopyToClipboard } from "react-copy-to-clipboard"
import { requestSnippetGenerator_curl_bash } from "../plugins/request-snippets/fn"

export default class Curl extends React.Component {
  static propTypes = {
    getComponent: PropTypes.func.isRequired,
    request: PropTypes.object.isRequired
  }

  renderPlainText = ({ children, PlainTextViewer }) => {
    return <PlainTextViewer className="curl">{children}</PlainTextViewer>
  }

  render() {
    const { request, getComponent } = this.props
    const curl = requestSnippetGenerator_curl_bash(request)
    const SyntaxHighlighter = getComponent("SyntaxHighlighter", true)

    return (
      <div className="curl-command">
        <h4>Curl</h4>
        <div className="copy-to-clipboard">
            <CopyToClipboard text={curl}><button/></CopyToClipboard>
        </div>
        <div>
          <SyntaxHighlighter
            language="bash"
            className="curl microlight"
            renderPlainText={this.renderPlainText}
          >
            {curl}
          </SyntaxHighlighter>
        </div>
      </div>
    )
  }

}
