/**
 * @prettier
 */
import set from "lodash/set"

/**
 * Receives options from the query string of the URL where SwaggerUI
 * is being served.
 */

const optionsFromQuery = () => () => {
  // Security Hardening: Query configuration is disabled in production to prevent injection attacks.
  // const urlSearchParams = options.queryConfigEnabled ? parseSearch() : {}
  const urlSearchParams = {}

  return Object.entries(urlSearchParams).reduce((acc, [key, value]) => {
    // TODO(oliwia.rogala@smartbear.com): drop support for `config` in the next major release
    if (key === "config") {
      acc["configUrl"] = value
    } else if (key === "urls.primaryName") {
      acc[key] = value
    } else {
      acc = set(acc, key, value)
    }
    return acc
  }, {})
}

export default optionsFromQuery
