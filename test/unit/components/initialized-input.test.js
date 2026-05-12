import React from "react"
import { mount } from "enzyme"
import InitializedInput from "core/components/initialized-input"

describe("InitializedInput component", () => {
  it("should render an input element", () => {
    const wrapper = mount(<InitializedInput />)
    expect(wrapper.find("input").exists()).toBe(true)
  })

  it("should pass extra props to the input element", () => {
    const wrapper = mount(<InitializedInput type="text" className="test-class" />)
    const input = wrapper.find("input")
    expect(input.prop("type")).toBe("text")
    expect(input.prop("className")).toBe("test-class")
  })

  it("should NOT pass value, defaultValue, or initialValue to the input element", () => {
    const wrapper = mount(
      <InitializedInput
        value="foo"
        defaultValue="bar"
        initialValue="baz"
        type="text"
      />
    )
    const input = wrapper.find("input")
    expect(input.prop("value")).toBeUndefined()
    expect(input.prop("defaultValue")).toBeUndefined()
    expect(input.prop("initialValue")).toBeUndefined()
  })

  it("should set the input value property on mount", () => {
    const wrapper = mount(<InitializedInput initialValue="hello world" />)
    const inputElement = wrapper.find("input").getDOMNode()
    expect(inputElement.value).toBe("hello world")
  })
})
