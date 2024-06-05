import { Driver, DriverFactory } from '../types/driver.js'
import { ChannelMessageSubscribeHandler, Serializable } from '../types/main.js'
import { Redis, RedisOptions } from 'ioredis'
import debug from '../utils/debug.js'
import { Encoder } from '../types/encoder.js'
import { ChannelMessage } from '../types/channel.js'
import { Subscription } from '../channel.js'
import { E_FAILED_DECODE_MESSAGE } from '../errors.js'

interface RedisDriverConfig extends RedisOptions {}

export function redis(config: RedisDriverConfig): DriverFactory {
  return () => new RedisDriver(config)
}

export class RedisDriver implements Driver {
  readonly #publisher: Redis
  readonly #subscriber: Redis

  constructor(config: RedisDriverConfig) {
    this.#publisher = new Redis(config)
    this.#subscriber = new Redis(config)
  }

  async publish<T extends Serializable>(
    channel: string,
    encoder: Encoder<T>,
    message: ChannelMessage<T>
  ) {
    const encoded = encoder.encode(message)
    this.#publisher.publish(channel, encoded)
  }

  async subscribe<T extends Serializable>(
    channel: string,
    encoder: Encoder<T>,
    handler: ChannelMessageSubscribeHandler<T>,
    subscription: Subscription
  ) {
    this.#subscriber.subscribe(channel, (err) => {
      if (err) throw err
    })

    this.#subscriber.on('message', (receivedChannel: string, message: string) => {
      receivedChannel = receivedChannel.toString()

      if (channel !== receivedChannel) return

      debug('received message for channel "%s"', channel)

      const decoded = encoder.decode(message)

      if (!decoded) {
        if (subscription.onFailHandler) {
          subscription.onFailHandler(new E_FAILED_DECODE_MESSAGE())
        }

        return
      }

      handler(decoded)
    })
  }

  async unsubscribe(channel: string) {
    this.#subscriber.unsubscribe(channel)
  }

  async disconnect() {
    this.#publisher.disconnect()
    this.#subscriber.disconnect()
  }

  onReconnect(callback: () => void) {
    this.#subscriber.on('reconnecting', callback)
  }
}
