import { test } from '@japa/runner'
import { JsonEncoder } from '../../src/encoders/json_encoder.js'

test.group('Encoders - Json Encoder', () => {
  test('should encode and decode', ({ assert }) => {
    const encoder = new JsonEncoder()

    const payload = {
      test: 'test',
    }

    const encodedMessage = encoder.encode({
      payload: payload,
    })
    const decodedMessage = encoder.decode(encodedMessage)

    assert.deepEqual({ payload }, decodedMessage)
  })
})