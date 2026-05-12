import React from "react"
import PropTypes from "prop-types"

export default class AuthorizeBtnContainer extends React.Component {

  static propTypes = {
    specActions: PropTypes.object.isRequired,
    specSelectors: PropTypes.object.isRequired,
    authActions: PropTypes.object.isRequired,
    authSelectors: PropTypes.object.isRequired,
    getComponent: PropTypes.func.isRequired
  }

  handleAuthorizeClick = () => {
    const { authActions, authSelectors } = this.props
    const authorizableDefinitions = authSelectors.definitionsToAuthorize()
    authActions.showDefinitions(authorizableDefinitions)
  }

  render () {
    const { authSelectors, specSelectors, getComponent} = this.props
    
    const securityDefinitions = specSelectors.securityDefinitions()

    const AuthorizeBtn = getComponent("authorizeBtn")

    return securityDefinitions ? (
      <AuthorizeBtn
        onClick={this.handleAuthorizeClick}
        isAuthorized={!!authSelectors.authorized().size}
        showPopup={!!authSelectors.shownDefinitions()}
        getComponent={getComponent}
      />
    ) : null
  }
}
