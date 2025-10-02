/** @type {import('next').NextConfig} */
const nextConfig = {
  // 啟用 WebWorker 支援
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 設定 Worker 載入規則
      config.module.rules.push({
        test: /\.worker\.(js|ts)$/,
        use: {
          loader: 'worker-loader',
          options: {
            filename: 'static/[hash].worker.js',
            publicPath: '/_next/'
          }
        }
      })
    }
    return config
  },

  // 其他現有設定
  images: {
    domains: ['localhost'],
  },

  // 實驗性功能
  experimental: {
    // 如果需要的話可以啟用
    // workerThreads: true
  }
}

module.exports = nextConfig