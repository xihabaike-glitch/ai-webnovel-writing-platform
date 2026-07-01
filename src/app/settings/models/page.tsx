import { AppShell } from "@/components/app-shell/AppShell";

const providers = ["Claude", "DeepSeek", "Kimi", "GPT", "OpenAI-compatible", "Ollama"];

export default function ModelSettingsPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">模型设置</h1>
      <p className="mt-1 text-sm text-slate-600">MVP 先保留 provider 配置入口，真实密钥只在服务端保存。</p>
      <div className="mt-6 grid gap-3">
        {providers.map((provider) => (
          <div key={provider} className="rounded-md border bg-white p-4">
            <div className="font-medium">{provider}</div>
            <p className="mt-1 text-sm text-slate-600">待接入 Model Gateway。</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

