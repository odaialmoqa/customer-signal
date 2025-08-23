export default function PublicHelp() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Help & Support</h1>
            
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">1. Create Your Account</h3>
                    <p className="text-gray-600">Sign up with your email address to get started with Customer Signal.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">2. Set Up Keywords</h3>
                    <p className="text-gray-600">Add keywords and phrases you want to monitor across different platforms.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">3. Choose Platforms</h3>
                    <p className="text-gray-600">Select which social media platforms and websites you want to monitor.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">4. Configure Alerts</h3>
                    <p className="text-gray-600">Set up notifications to stay informed about important mentions.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">How often are mentions updated?</h3>
                    <p className="text-gray-600">We check for new mentions every 15 minutes to ensure you get timely updates.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Can I monitor multiple brands?</h3>
                    <p className="text-gray-600">Yes, you can add multiple keywords and organize them by different brands or campaigns.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">What platforms do you support?</h3>
                    <p className="text-gray-600">We currently support Twitter, Reddit, news sites, forums, and review platforms, with more coming soon.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">How do I set up alerts?</h3>
                    <p className="text-gray-600">Go to the Alerts section in your dashboard to configure email notifications and alert thresholds.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Support</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-600 mb-4">
                    Need more help? Our support team is here to assist you.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Email:</strong> support@customersignal.com
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Response Time:</strong> Within 24 hours
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a
                    href="/public/dashboard"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="font-medium text-gray-900">Dashboard</h3>
                    <p className="text-sm text-gray-600">View your monitoring overview</p>
                  </a>
                  <a
                    href="/public/onboarding"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="font-medium text-gray-900">Setup Guide</h3>
                    <p className="text-sm text-gray-600">Complete your account setup</p>
                  </a>
                  <a
                    href="/public"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="font-medium text-gray-900">Home</h3>
                    <p className="text-sm text-gray-600">Return to the main page</p>
                  </a>
                  <a
                    href="/demo"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="font-medium text-gray-900">Demo</h3>
                    <p className="text-sm text-gray-600">See how it works</p>
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}