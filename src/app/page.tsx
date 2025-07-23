import Link from 'next/link';

export default function Home() {
  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8 pb-20 gap-16 sm:p-20">
      <div className="flex flex-col gap-[32px] items-center text-center">
        {/* Portal Animation */}
        <div className="relative w-32 h-32 mb-8">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"></div>

          {/* Middle spinning ring (opposite direction) */}
          <div
            className="absolute inset-2 rounded-full border-4 border-transparent border-l-purple-500 border-b-purple-400 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '3s' }}
          ></div>

          {/* Inner spinning ring */}
          <div
            className="absolute inset-4 rounded-full border-3 border-transparent border-t-blue-300 border-r-blue-200 animate-spin"
            style={{ animationDuration: '2s' }}
          ></div>

          {/* Center portal core */}
          <div className="absolute inset-8 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 shadow-2xl animate-pulse">
            <div
              className="w-full h-full rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"
              style={{ animationDuration: '4s' }}
            ></div>
          </div>

          {/* Portal glow effect */}
          <div className="absolute inset-6 rounded-full bg-blue-400/30 blur-xl animate-pulse"></div>

          {/* Floating particles */}
          <div
            className="absolute -top-2 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: '0s' }}
          ></div>
          <div
            className="absolute top-1/2 -right-2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.5s' }}
          ></div>
          <div
            className="absolute -bottom-2 left-1/3 w-1 h-1 bg-blue-300 rounded-full animate-bounce"
            style={{ animationDelay: '1s' }}
          ></div>
          <div
            className="absolute top-1/4 -left-2 w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce"
            style={{ animationDelay: '1.5s' }}
          ></div>
        </div>

        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Nillion API Portal
        </h1>

        <p className="text-xl max-w-3xl text-gray-700 dark:text-gray-300 mb-8">
          Portal is for anyone building private apps powered by Nillion Storage
          and Nillion Private LLMs. Manage your Nillion API key subscriptions
          within Nillion API Portal.
        </p>

        <div className="flex justify-center">
          <Link
            href="/api-keys"
            className="group relative inline-flex items-center justify-center bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-medium py-4 px-8 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 border border-gray-600 dark:border-gray-500"
          >
            <span className="text-lg">Get Started</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
