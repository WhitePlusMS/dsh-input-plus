import { test, assert } from '../test/harness.js'
import { inject } from './index.js'

test('client entry injects Cordis service names', () => {
  assert.deepEqual(inject, [
    'inputTriggers',
    'slots',
    'conversation',
    'sessions',
  ])
})
