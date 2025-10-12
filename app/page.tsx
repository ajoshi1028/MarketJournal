import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto p-8">
      {/* Welcome page for non-logged in users */}
      <SignedOut>
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            Welcome to Market Journal
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your comprehensive trading journal and portfolio tracker. 
            Record trades, analyze performance, and manage your portfolio with powerful tools.
          </p>
          <div className="space-x-4">
            <Link 
              href="/sign-up"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Get Started Free
            </Link>
            <Link 
              href="/sign-in"
              className="inline-block border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
        
        {/* Features showcase */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              📊
            </div>
            <h3 className="text-xl font-semibold mb-3">Trading Journal</h3>
            <p className="text-gray-600">
              Record and analyze your trading activity with detailed performance metrics.
            </p>
          </div>
          
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              💰
            </div>
            <h3 className="text-xl font-semibold mb-3">Portfolio Management</h3>
            <p className="text-gray-600">
              Track your account balance and manage portfolio allocation.
            </p>
          </div>
          
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              🧮
            </div>
            <h3 className="text-xl font-semibold mb-3">Risk Calculator</h3>
            <p className="text-gray-600">
              Calculate optimal position sizes and manage risk effectively.
            </p>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center mt-16 bg-blue-50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Ready to Start Trading Smarter?</h2>
          <p className="text-gray-600 mb-6">
            Join thousands of traders who use Market Journal to improve their performance.
          </p>
          <Link 
            href="/sign-up"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
          >
            Create Your Free Account
          </Link>
        </div>
      </SignedOut>

      {/* Dashboard for logged-in users */}
      <SignedIn>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-blue-700">Options Journal</h1>
          <p className="text-xl text-gray-600">
            Track your trades and manage your portfolio.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Link 
            href="/trades"
            className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-3 text-blue-800">Trading Journal</h2>
            <p className="text-blue-600">
              Record and analyze your trading activity
            </p>
          </Link>

          <Link 
            href="/account"
            className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-3 text-green-800">My Account</h2>
            <p className="text-green-600">
              Manage your portfolio size and balance
            </p>
          </Link>

          <Link 
            href="/calculator"
            className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-3 text-purple-800">Risk Calculator</h2>
            <p className="text-purple-600">
              Calculate optimal position sizes
            </p>
          </Link>
        </div>
      </SignedIn>
    </main>
  )
}