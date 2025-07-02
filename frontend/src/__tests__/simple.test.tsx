import React from 'react'

describe('Simple Test', () => {
  test('basic test should pass', () => {
    expect(1 + 1).toBe(2)
  })
  
  test('React should be available', () => {
    expect(React).toBeDefined()
  })
})