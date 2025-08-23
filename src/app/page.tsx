import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Customer Signal
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            AI-powered customer conversation monitoring and analysis platform
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <Link
              href="/demo"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              View Demo
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Implementation Status</h2>
            <p className="text-gray-600 mt-2">16 out of 26 tasks completed</p>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: '61.5%' }}></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">61.5% Complete</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔐</span>
              </div>
              <h3 className="font-semibold text-gray-900">Authentication</h3>
              <p className="text-sm text-green-600 mt-1">✓ Complete</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold text-gray-900">Data Collection</h3>
              <p className="text-sm text-green-600 mt-1">✓ Complete</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="font-semibold text-gray-900">AI Analysis</h3>
              <p className="text-sm text-green-600 mt-1">✓ Complete</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="font-semibold text-gray-900">Dashboard</h3>
              <p className="text-sm text-green-600 mt-1">✓ Complete</p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Keyword Monitoring</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Track mentions of your brand, products, and competitors across multiple platforms
            </p>
            <div className="flex items-center text-sm text-green-600">
              <span className="mr-2">✓</span>
              Fully implemented
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl">🌐</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Multi-Platform</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Monitor conversations across social media, forums, review sites, and news
            </p>
            <div className="flex items-center text-sm text-green-600">
              <span className="mr-2">✓</span>
              Fully implemented
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">AI Sentiment Analysis</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Automatically analyze sentiment and detect trends in customer conversations
            </p>
            <div className="flex items-center text-sm text-green-600">
              <span className="mr-2">✓</span>
              Fully implemented
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl">🚨</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Real-time Alerts</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Get notified instantly when important conversations happen
            </p>
            <div className="flex items-center text-sm text-green-600">
              <span className="mr-2">✓</span>
              Fully implemented
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Visualize trends, sentiment, and performance with interactive charts
            </p>
            <div className="flex items-center text-sm text-green-600">
              <span className="mr-2">✓</span>
              Fully implemented
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Advanced Search</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Find specific conversations with powerful filtering and search capabilities
            </p>
            <div className="flex items-center text-sm text-green-600">
              <span className="mr-2">✓</span>
              Fully implemented
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">What's Next?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Remaining Tasks</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                  Report generation and export
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                  Advanced visualization components
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                  Mobile responsiveness
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                  Performance optimizations
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                  Production deployment
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Use</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Complete authentication system
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Multi-platform data collection
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  AI-powered analysis
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Interactive dashboard
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Real-time alerting
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}