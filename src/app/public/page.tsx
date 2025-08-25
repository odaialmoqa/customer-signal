// This page should be accessible without authentication
export default function PublicLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">Customer Signal</div>
          <div className="space-x-4">
            <a href="/demo" className="text-gray-600 hover:text-blue-600">Demo</a>
            <a href="/public/help" className="text-gray-600 hover:text-blue-600">Help</a>
            <a href="/public/auth/login" className="text-blue-600 hover:text-blue-700">Sign In</a>
          </div>
        </nav>
      </header>
      
      <main className="container mx-auto px-4 py-16">
        <section className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Customer Signal
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Monitor customer conversations across all platforms. Get insights, track sentiment, and never miss important feedback.
          </p>
          
          <div className="space-x-4 mb-12">
            <a 
              href="/public/auth/signup" 
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors min-h-[44px] min-w-[44px]"
            >
              Get Started Free
            </a>
            <a 
              href="/public/auth/login" 
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors min-h-[44px] min-w-[44px]"
            >
              Sign In
            </a>
          </div>
          
          <section className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">Key Features</h2>
            <ul className="grid md:grid-cols-3 gap-6 list-none">
              <li className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl" role="img" aria-label="Chart">📊</span>
                </div>
                <h3 className="font-semibold mb-2">Real-time Monitoring</h3>
                <p className="text-gray-600">Track conversations across social media, reviews, and support channels</p>
              </li>
              <li className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl" role="img" aria-label="Target">🎯</span>
                </div>
                <h3 className="font-semibold mb-2">Smart Alerts</h3>
                <p className="text-gray-600">Get notified when important conversations need your attention</p>
              </li>
              <li className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl" role="img" aria-label="Analytics">📈</span>
                </div>
                <h3 className="font-semibold mb-2">Analytics & Insights</h3>
                <p className="text-gray-600">Understand sentiment trends and customer satisfaction</p>
              </li>
            </ul>
          </section>
          
          <section className="mt-12 text-center">
            <p className="text-gray-500 mb-4">Having trouble accessing the app?</p>
            <nav className="space-x-4">
              <a href="/auth-test" className="text-blue-600 hover:underline">Test Authentication</a>
              <a href="/demo" className="text-blue-600 hover:underline">View Demo</a>
              <a href="/public/help" className="text-blue-600 hover:underline">Get Help</a>
            </nav>
          </section>
        </section>
      </main>
      
      <footer className="container mx-auto px-4 py-8 text-center text-gray-500">
        <p>&copy; 2025 Customer Signal. All rights reserved.</p>
      </footer>
    </div>
  )
}