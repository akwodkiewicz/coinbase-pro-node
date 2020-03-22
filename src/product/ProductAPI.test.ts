import nock from 'nock';
import {CandleGranularity, OrderBookLevel, ProductAPI} from '.';
import Level1OrderBookBTCEUR from '../test/fixtures/rest/products/BTC-EUR/book/level-1.json';
import Level2OrderBookBTCEUR from '../test/fixtures/rest/products/BTC-EUR/book/level-2.json';
import Level2OrderBookBTCUSD from '../test/fixtures/rest/products/BTC-USD/book/level-2.json';
import Level3OrderBookBTCUSD from '../test/fixtures/rest/products/BTC-USD/book/level-3.json';
import TradesBTCEUR from '../test/fixtures/rest/products/BTC-EUR/trades/GET-200.json';
import CandlesBTCUSD from '../test/fixtures/rest/products/BTC-USD/candles/GET-200.json';

describe('ProductAPI', () => {
  describe('getProducts', () => {
    it('returns list of products', async () => {
      nock(global.REST_URL)
        .get(ProductAPI.URL.PRODUCTS)
        .query(() => true)
        .reply(
          200,
          JSON.stringify([
            {
              base_currency: 'BTC',
              base_increment: '0.00000001',
              base_max_size: '200',
              base_min_size: '0.001',
              cancel_only: false,
              display_name: 'BTC/EUR',
              id: 'BTC-EUR',
              limit_only: false,
              margin_enabled: false,
              max_market_funds: '600000',
              min_market_funds: '10',
              post_only: false,
              quote_currency: 'EUR',
              quote_increment: '0.01',
              status: 'online',
              status_message: '',
            },
            {
              base_currency: 'XRP',
              base_increment: '1',
              base_max_size: '500000',
              base_min_size: '1',
              cancel_only: false,
              display_name: 'XRP/USD',
              id: 'XRP-USD',
              limit_only: false,
              margin_enabled: false,
              max_market_funds: '100000',
              min_market_funds: '10',
              post_only: false,
              quote_currency: 'USD',
              quote_increment: '0.0001',
              status: 'online',
              status_message: '',
            },
          ])
        );

      const products = await global.client.rest.product.getProducts();

      expect(products.length).toBe(2);
      expect(products[0].id).toBe('BTC-EUR');
      expect(products[1].id).toBe('XRP-USD');
    });
  });

  describe('getTrades', () => {
    it('lists the latest public trades for a product', async () => {
      const productId = 'BTC-EUR';
      nock(global.REST_URL)
        .get(`${ProductAPI.URL.PRODUCTS}/${productId}/trades`)
        .reply(() => [200, JSON.stringify(TradesBTCEUR)]);
      const trades = await global.client.rest.product.getTrades(productId);
      expect(trades.length).toBe(100);
    });
  });

  describe('getProductOrderBook', () => {
    it('lists only the best bid and ask by default', async () => {
      const productId = 'BTC-EUR';
      nock(global.REST_URL)
        .get(`${ProductAPI.URL.PRODUCTS}/${productId}/book?level=1`)
        .reply(() => [200, JSON.stringify(Level1OrderBookBTCEUR)]);

      const orderBook = await global.client.rest.product.getProductOrderBook(productId);
      expect(orderBook.asks.length).toBe(1);
      expect(orderBook.bids.length).toBe(1);
    });

    it('lists up to 50 bids and asks with a depth of level 2', async () => {
      nock(global.REST_URL)
        .get(`${ProductAPI.URL.PRODUCTS}/BTC-USD/book?level=2`)
        .reply(() => [200, JSON.stringify(Level2OrderBookBTCUSD)]);

      nock(global.REST_URL)
        .get(`${ProductAPI.URL.PRODUCTS}/BTC-EUR/book?level=2`)
        .reply(() => [200, JSON.stringify(Level2OrderBookBTCEUR)]);

      const orderBookBTCUSD = await global.client.rest.product.getProductOrderBook('BTC-USD', {
        level: OrderBookLevel.TOP_50_BIDS_AND_ASKS,
      });
      expect(orderBookBTCUSD.asks.length).toBe(50);
      expect(orderBookBTCUSD.bids.length).toBe(50);

      const orderBookBTCEUR = await global.client.rest.product.getProductOrderBook('BTC-EUR', {
        level: OrderBookLevel.TOP_50_BIDS_AND_ASKS,
      });
      expect(orderBookBTCEUR.asks.length).toBe(1);
      expect(orderBookBTCEUR.bids.length).toBe(36);
    });

    it('lists the full order book with a depth of level 3', async () => {
      const productId = 'BTC-USD';
      const level = OrderBookLevel.FULL_ORDER_BOOK;

      nock(global.REST_URL)
        .get(`${ProductAPI.URL.PRODUCTS}/${productId}/book?level=${level}`)
        .reply(() => [200, JSON.stringify(Level3OrderBookBTCUSD)]);

      const orderBook = await global.client.rest.product.getProductOrderBook(productId, {level});
      expect(orderBook.asks.length).toBe(60);
      expect(orderBook.bids.length).toBe(877);
    });
  });

  describe('getProductTicker', () => {
    it('returns ticker information', async () => {
      nock(global.REST_URL)
        .get(`${ProductAPI.URL.PRODUCTS}/BTC-USD/ticker`)
        .query(() => true)
        .reply(
          200,
          JSON.stringify({
            ask: '8092.04',
            bid: '8090.99',
            price: '8092.78000000',
            size: '0.07131466',
            time: '2019-05-19T10:13:55.895Z',
            trade_id: 64378404,
            volume: '16915.34524427',
          })
        );

      const ticker = await global.client.rest.product.getProductTicker('BTC-USD');

      expect(ticker.trade_id).toBeDefined();
      expect(ticker.price).toBe('8092.78000000');
    });
  });

  describe('getProductStats', () => {
    it('returns correct product stats', async () => {
      nock(global.REST_URL)
        .get(`${ProductAPI.URL.PRODUCTS}/BTC-USD/stats`)
        .query(() => true)
        .reply(
          200,
          JSON.stringify({
            high: '8139.00000000',
            last: '8137.06000000',
            low: '7215.61000000',
            open: '7277.79000000',
            volume: '16921.40292722',
            volume_30day: '529555.64078247',
          })
        );

      const stats = await global.client.rest.product.getProductStats('BTC-USD');
      expect(stats.open).toBe('7277.79000000');
      expect(stats.volume).toBe('16921.40292722');
    });
  });

  describe('getCandles', () => {
    it('sorts candles by date (oldest first)', async () => {
      const from = '2020-03-09T00:00:00.000Z';
      const to = '2020-03-15T23:59:59.999Z';

      nock(global.REST_URL)
        .get(`${ProductAPI.URL.PRODUCTS}/BTC-USD/candles`)
        .query(() => true)
        .reply(() => {
          const min = new Date(from).getTime();
          const max = new Date(to).getTime();
          // Note: Fixture test set is larger than the requested time slice, so we have to filter:
          const data = CandlesBTCUSD.filter(candle => {
            const [time] = candle;
            const timeInMillis = time * 1000;
            return timeInMillis >= min && timeInMillis <= max;
          });
          return [200, JSON.stringify(data)];
        });

      const candles = await global.client.rest.product.getCandles('BTC-USD', {
        end: to,
        granularity: CandleGranularity.ONE_HOUR,
        start: from,
      });

      expect(candles.length).withContext('7 days * 24 hours = 168 hours / candles').toBe(168);
      expect(candles[0].timeString).withContext('Starting time of first time slice').toBe(from);
      expect(candles[candles.length - 1].timeString)
        .withContext('Starting time of last time slice')
        .toBe('2020-03-15T23:00:00.000Z');
    });
  });
});
