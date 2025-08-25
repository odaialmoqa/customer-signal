import SimpleAuthForm from '@/components/auth/SimpleAuthForm'

export default function PublicLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900">
          CustomerSignal
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Monitor conversations across the internet
        </p>
      </div>
      
      <SimpleAuthForm mode="signin" />
    </div>
  )
}