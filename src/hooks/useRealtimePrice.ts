import { useState, useEffect, useRef } from 'react';

const WEBSOCKET_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const LERP_SPEED = 0.02; // Slower interpolation for smoother transitions
const UPDATE_INTERVAL = 2000; // Update display every 1 second

interface RealtimePrice {
  price: number;
  isConnected: boolean;
}

export function useRealtimePrice(tokenId: string | undefined): RealtimePrice {
  const [price, setPrice] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const targetPriceRef = useRef<number>(0);
  const currentPriceRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (targetPriceRef.current > 0) {
        if (currentPriceRef.current === 0) {
          currentPriceRef.current = targetPriceRef.current;
          setPrice(currentPriceRef.current);
          lastUpdateRef.current = timestamp;
        }

        const diff = targetPriceRef.current - currentPriceRef.current;
        if (Math.abs(diff) > 0.0001) {
          currentPriceRef.current += diff * LERP_SPEED;

          if (timestamp - lastUpdateRef.current >= UPDATE_INTERVAL) {
            setPrice(currentPriceRef.current);
            lastUpdateRef.current = timestamp;
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!tokenId) {
      setPrice(0);
      targetPriceRef.current = 0;
      currentPriceRef.current = 0;
      return;
    }

    let isCancelled = false;

    const updateTargetPrice = (newPrice: number) => {
      if (newPrice > 0) {
        targetPriceRef.current = newPrice;
        if (currentPriceRef.current === 0) {
          currentPriceRef.current = newPrice;
          setPrice(newPrice);
        }
      }
    };

    const connect = () => {
      if (isCancelled) return;

      try {
        const ws = new WebSocket(WEBSOCKET_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) {
            ws.close();
            return;
          }
          setIsConnected(true);

          ws.send(
            JSON.stringify({
              assets_ids: [tokenId],
              type: 'market',
            })
          );
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;

          try {
            const data = JSON.parse(event.data);

            if (data.event_type === 'price_change' && Array.isArray(data.price_changes)) {
              data.price_changes.forEach((change: { asset_id: string; price: string; side: string }) => {
                if (change.asset_id !== tokenId) return;

                const side = change.side.toUpperCase();
                if (side === 'BUY' || side === 'BID') {
                  updateTargetPrice(parseFloat(change.price));
                }
              });
            }

            if (data.bids && Array.isArray(data.bids) && data.bids.length > 0) {
              const highestBid = data.bids.reduce((max: number, bid: { price: string }) => {
                const p = parseFloat(bid.price);
                return p > max ? p : max;
              }, 0);
              updateTargetPrice(highestBid);
            }
          } catch (err) {
            // Ignore parse errors
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
        };

        ws.onclose = (event) => {
          if (isCancelled) return;
          setIsConnected(false);

          if (event.code !== 1000) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isCancelled) connect();
            }, 3000);
          }
        };
      } catch (err) {
        setIsConnected(false);
      }
    };

    const fetchInitialPrice = async () => {
      try {
        const response = await fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.bids && data.bids.length > 0) {
            const highestBid = data.bids.reduce((max: number, bid: { price: string }) => {
              const p = parseFloat(bid.price);
              return p > max ? p : max;
            }, 0);
            updateTargetPrice(highestBid);
          }
        }
      } catch (err) {
        // Ignore errors
      }
    };

    fetchInitialPrice();
    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [tokenId]);

  return { price, isConnected };
}
