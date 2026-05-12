import React from "react"
import PropTypes from "prop-types"
import { OAS3ComponentWrapFactory } from "../helpers"

class JsonSchemaStringWrapper extends React.Component {
  handleFileChange = (e) => {
    this.props.onChange(e.target.files[0])
  }

  render() {
    const { Ori, ...props } = this.props
    const {
      schema,
      getComponent,
      errors,
      fn
    } = props

    const isFileUploadIntended = fn.isFileUploadIntended(schema)
    const Input = getComponent("Input")

    if (isFileUploadIntended) {
      return <Input type="file"
                     className={ errors.length ? "invalid" : ""}
                     title={ errors.length ? errors : ""}
                     onChange={this.handleFileChange}
                     disabled={Ori.isDisabled}/>
    } else {
      return <Ori {...props} />
    }
  }
}

JsonSchemaStringWrapper.propTypes = {
  Ori: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  getComponent: PropTypes.func.isRequired,
  errors: PropTypes.array.isRequired,
  fn: PropTypes.object.isRequired,
}

export default OAS3ComponentWrapFactory(JsonSchemaStringWrapper)
