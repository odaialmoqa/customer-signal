// This page should be accessible without authentication
export default function PublicLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Customer Signal
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Monitor customer conversations across all platforms. Get insights, track sentiment, and never miss important feedback.
          </p>
          
          <div className="space-x-4 mb-12">
            <a 
              href="/signup" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started Free
            </a>
            <a 
              href="/login" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors"
            >
              Sign In
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">Key Features</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="font-semibold mb-2">Real-time Monitoring</h3>
                <p className="text-gray-600">Track conversations across social media, reviews, and support channels</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="font-semibold mb-2">Smart Alerts</h3>
                <p className="text-gray-600">Get notified when important conversations need your attention</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📈</span>
                </div>
                <h3 className="font-semibold mb-2">Analytics & Insights</h3>
                <p className="text-gray-600">Understand sentiment trends and customer satisfaction</p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-500 mb-4">Having trouble accessing the app?</p>
            <div className="space-x-4">
              <a href="/auth-test" className="text-blue-600 hover:underline">Test Authentication</a>
              <a href="/demo" className="text-blue-600 hover:underline">View Demo</a>
              <a href="/help" className="text-blue-600 hover:underline">Get Help</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}