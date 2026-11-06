import { GateForm } from '@/components/GateForm'

export default function GatePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-kitchen-bg px-6">
      <div className="w-full max-w-md rounded-3xl border border-kitchen-line bg-kitchen-surface p-8 shadow-sm sm:p-10">
        <p className="text-sm tracking-[0.2em] text-kitchen-muted">AI COOKING</p>
        <h1 className="mt-3 font-serif text-3xl text-kitchen-ink">
          今晚吃什么？
        </h1>
        <p className="mt-3 mb-8 text-sm leading-6 text-kitchen-muted">
          这是一个私人厨房，输入访问口令开始。
        </p>
        <GateForm />
      </div>
    </main>
  )
}
