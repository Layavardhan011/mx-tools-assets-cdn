import React from "react"
import PropTypes from "prop-types"

const preventDefault = (e) => e.preventDefault()

export const DeepLink = ({ enabled, path, text }) => {
    return (
        <a className="nostyle"
          onClick={enabled ? preventDefault : null}
          href={enabled ? `#/${path}` : null}>
          <span>{text}</span>
        </a>
    )
}
DeepLink.propTypes = {
  enabled: PropTypes.bool,
  isShown: PropTypes.bool,
  path: PropTypes.string,
  text: PropTypes.node
}

export default DeepLink
