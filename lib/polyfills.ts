// Polyfill to suppress punycode and other deprecation warnings
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Server-side polyfill
  const originalEmit = process.emit;
  
  // @ts-ignore - Override process.emit to filter warnings
  process.emit = function (name, data, ...args) {
    // Suppress specific deprecation warnings
    if (name === 'warning' && typeof data === 'object' && data !== null) {
      // Suppress punycode deprecation warnings
      if ((data as any).name === 'DeprecationWarning' && (data as any).message?.includes('punycode')) {
        return false;
      }
      
      // Suppress other common deprecation warnings that don't affect functionality
      if ((data as any).name === 'DeprecationWarning' && (
        (data as any).message?.includes('buffer') ||
        (data as any).message?.includes('util.types.isDate') ||
        (data as any).message?.includes('util.types.isRegExp')
      )) {
        return false;
      }
    }
    
    // Call the original emit for all other events
    return originalEmit.apply(process, [name, data, ...args] as any);
  };
  
  // Also suppress console warnings in development
  if (process.env.NODE_ENV === 'development') {
    const originalWarn = console.warn;
    console.warn = function (...args) {
      const message = args.join(' ');
      if (message.includes('punycode') || message.includes('DEP0040')) {
        return;
      }
      originalWarn.apply(console, args);
    };
  }
}

// Client-side polyfill (if needed)
if (typeof window !== 'undefined') {
  // Suppress client-side console warnings related to punycode
  const originalWarn = console.warn;
  console.warn = function (...args) {
    const message = args.join(' ');
    if (message.includes('punycode') || message.includes('deprecated')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

export {};