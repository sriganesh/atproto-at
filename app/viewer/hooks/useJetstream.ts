import { useState, useEffect, useRef, useCallback } from 'react';
import { JetstreamEvent, JetstreamConfig, JetstreamContextType } from '../components/jetstream/types';

interface UseJetstreamResult {
  events: JetstreamEvent[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  eventCount: number;
  start: () => void;
  stop: () => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 100; // Keep last 100 events for performance

export function useJetstream(
  config: JetstreamConfig | null,
  context: JetstreamContextType
): UseJetstreamResult {
  const [events, setEvents] = useState<JetstreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [compressionWarningShown, setCompressionWarningShown] = useState(false);
  const intentionalCloseRef = useRef(false); // Track intentional disconnections
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;

  const buildWebSocketUrl = useCallback((config: JetstreamConfig, context: JetstreamContextType): string => {
    const url = new URL(config.instance.url);
    
    // Set filters based on context
    if (context.type === 'profile') {
      url.searchParams.append('wantedDids', context.did);
    } else if (context.type === 'collection' && context.collection) {
      url.searchParams.append('wantedDids', context.did);
      url.searchParams.append('wantedCollections', context.collection);
    }
    
    // Add compression - but note: we'll handle compression errors by falling back
    if ((config as any).compress) {
      url.searchParams.append('compress', 'true');
    }
    
    return url.toString();
  }, []);

  const handleMessage = useCallback(async (event: MessageEvent) => {
    try {
      let eventData: string;
      
      // Handle different message types
      if (event.data instanceof Blob) {
        // This is compressed data - for now, we'll show a warning and suggest disabling compression
        if (!compressionWarningShown) {
          console.warn('Received compressed data but client-side decompression is not yet implemented. Consider disabling compression for now.');
          setCompressionWarningShown(true);
          setError('Compression is enabled but client-side decompression is not yet implemented. Please disable compression in settings.');
        }
        return;
      } else if (typeof event.data === 'string') {
        // This is uncompressed JSON text
        eventData = event.data;
      } else {
        console.error('Unexpected message data type:', typeof event.data);
        return;
      }
      
      const jetstreamEvent: JetstreamEvent = JSON.parse(eventData);
      
      setEvents(prevEvents => {
        const newEvents = [jetstreamEvent, ...prevEvents.slice(0, MAX_EVENTS - 1)];
        return newEvents;
      });
      
      setEventCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to parse jetstream event:', err);
    }
  }, [compressionWarningShown]);

  const handleOpen = useCallback(() => {
    setIsConnected(true);
    setIsConnecting(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
    console.log('Jetstream connected');
  }, []);

  const handleClose = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    
    // Don't attempt reconnection or show errors if this was an intentional close
    if (intentionalCloseRef.current) {
      intentionalCloseRef.current = false; // Reset the flag
      return;
    }
    
    // Attempt reconnection if it wasn't a manual close
    if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && config) {
      reconnectAttemptsRef.current++;
      setError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (config) {
          connectWebSocket(config, context);
        }
      }, RECONNECT_DELAY * reconnectAttemptsRef.current);
    } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError('Connection failed after maximum retry attempts. Please try again.');
    }
  }, [config, context]);

  const handleError = useCallback((event: Event) => {
    console.error('Jetstream WebSocket error:', event);
    setError('WebSocket connection error occurred');
    setIsConnecting(false);
  }, []);

  const connectWebSocket = useCallback((config: JetstreamConfig, context: JetstreamContextType) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setIsConnecting(true);
    setError(null);
    setCompressionWarningShown(false);
    intentionalCloseRef.current = false; // Reset flag for new connections

    try {
      const wsUrl = buildWebSocketUrl(config, context);
      const ws = new WebSocket(wsUrl);
      
      // Set binary type to handle compressed data properly
      ws.binaryType = 'blob';
      
      ws.addEventListener('open', handleOpen);
      ws.addEventListener('message', handleMessage);
      ws.addEventListener('close', handleClose);
      ws.addEventListener('error', handleError);
      
      wsRef.current = ws;
    } catch (err) {
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [buildWebSocketUrl, handleOpen, handleMessage, handleClose, handleError]);

  const start = useCallback(() => {
    if (!config) return;
    
    reconnectAttemptsRef.current = 0;
    connectWebSocket(config, context);
  }, [config, context, connectWebSocket]);

  const stop = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Mark this as an intentional close to prevent error messages
    intentionalCloseRef.current = true;
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // Prevent reconnection
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setError(null); // Clear any existing errors when manually stopping
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setEventCount(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    events,
    isConnected,
    isConnecting,
    error,
    eventCount,
    start,
    stop,
    clearEvents
  };
} 