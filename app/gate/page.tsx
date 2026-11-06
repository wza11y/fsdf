import { GateForm } from '@/components/GateForm'

export default function GatePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm tracking-[0.2em] text-stone-400">AI COOKING</p>
        <h1 className="mt-3 font-serif text-3xl text-stone-900">
          今晚吃什么？
        </h1>
        <p className="mt-3 mb-8 text-sm leading-6 text-stone-500">
          这是一个私人厨房，输入访问口令开始。
        </p>
        <GateForm />
      </div>
    </main>
  )
}
