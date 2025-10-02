/**
 * Performance monitoring utilities for image generation operations
 * Helps track performance metrics and identify bottlenecks
 */

interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private timers: Map<string, number> = new Map()

  /**
   * Start timing an operation
   */
  startTimer(operation: string, metadata?: Record<string, any>): void {
    const key = `${operation}_${Date.now()}`
    this.timers.set(key, performance.now())
    
    if (metadata) {
      console.debug(`Performance: Starting ${operation}`, metadata)
    }
  }

  /**
   * End timing an operation and record the metric
   */
  endTimer(operation: string, metadata?: Record<string, any>): number {
    const keys = Array.from(this.timers.keys()).filter(k => k.startsWith(operation))
    const key = keys[keys.length - 1] // Get the most recent timer for this operation
    
    if (!key) {
      console.warn(`No timer found for operation: ${operation}`)
      return 0
    }

    const startTime = this.timers.get(key)!
    const duration = performance.now() - startTime
    this.timers.delete(key)

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }

    console.debug(`Performance: ${operation} completed in ${duration.toFixed(2)}ms`, metadata)
    
    return duration
  }

  /**
   * Get performance metrics for analysis
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Get average duration for a specific operation
   */
  getAverageDuration(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation)
    if (operationMetrics.length === 0) return 0
    
    const total = operationMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    return total / operationMetrics.length
  }

  /**
   * Clear all metrics and timers
   */
  clear(): void {
    this.metrics = []
    this.timers.clear()
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    if (this.metrics.length === 0) {
      console.log('Performance: No metrics recorded')
      return
    }

    const operations = [...new Set(this.metrics.map(m => m.operation))]
    console.group('Performance Summary')
    
    operations.forEach(operation => {
      const avg = this.getAverageDuration(operation)
      const count = this.metrics.filter(m => m.operation === operation).length
      console.log(`${operation}: ${avg.toFixed(2)}ms average (${count} samples)`)
    })
    
    console.groupEnd()
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Helper function for measuring canvas operations
export function measureCanvasOperation<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  performanceMonitor.startTimer(operation, metadata)
  try {
    const result = fn()
    performanceMonitor.endTimer(operation, metadata)
    return result
  } catch (error) {
    performanceMonitor.endTimer(operation, { ...metadata, error: true })
    throw error
  }
}

// Helper for measuring async operations
export async function measureAsyncOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  performanceMonitor.startTimer(operation, metadata)
  try {
    const result = await fn()
    performanceMonitor.endTimer(operation, metadata)
    return result
  } catch (error) {
    performanceMonitor.endTimer(operation, { ...metadata, error: true })
    throw error
  }
}