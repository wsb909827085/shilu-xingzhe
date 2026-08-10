import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageCircle, X, Send, KeyRound, Loader2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";

import MusicPlayer from "./MusicPlayer";

type Provider = "kimi" | "deepseek" | "openai" | "custom";
type Msg = { role: "user" | "assistant"; content: string };

const PROVIDER_LABEL: Record<Provider, string> = {
  kimi: "Kimi",
  deepseek: "DeepSeek",
  openai: "OpenAI 兼容",
  custom: "自定义中转站",
};

/** 各平台开通 API Key 的引导链接 */
const PROVIDER_GUIDE: Record<Provider, { url: string; text: string }> = {
  kimi: { url: "https://platform.moonshot.cn/console/api-keys", text: "前往 Kimi 开放平台开通 API Key →" },
  deepseek: { url: "https://platform.deepseek.com/api_keys", text: "前往 DeepSeek 开放平台开通 API Key →" },
  openai: { url: "https://platform.openai.com/api-keys", text: "前往 OpenAI 平台开通 API Key →" },
  custom: { url: "", text: "填写你的中转站 Base URL 与模型名（兼容 OpenAI 接口格式）" },
};

type Props = { selection?: string | null };

/* 音乐播放器独立于聊天窗口：常驻右下角，开关 AI 助手不影响播放 */
export function MusicDock() {
  return (
    /* 与 AI 导游按钮（bottom-5 right-5，高 52px）纵向排列：位于其上方，留足间距 */
    <div className="pointer-events-none fixed bottom-[88px] right-[9px] z-[999]">
      <div className="pointer-events-auto">
        <MusicPlayer />
      </div>
    </div>
  );
}

export default function AiChat({ selection }: Props) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<Provider>("kimi");
  const [keyInput, setKeyInput] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState(false);
  /* 游客 Key 存 localStorage（懒初始化读取，避免 effect 内同步 setState） */
  const [guestKeys, setGuestKeys] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("shilu_guest_keys") ?? "{}");
    } catch {
      return {};
    }
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  const myKeys = trpc.ai.myKeys.useQuery(undefined, { enabled: isAuthenticated });
  const saveKey = trpc.ai.saveKey.useMutation({
    onSuccess: () => {
      setKeyInput("");
      setShowKey(false);
      void myKeys.refetch();
    },
  });
  const chat = trpc.ai.chat.useMutation({
    onSuccess: (d) => setMessages((m) => [...m, { role: "assistant", content: d.reply }]),
    onError: (e) =>
      setMessages((m) => [...m, { role: "assistant", content: `（出错：${e.message}）` }]),
  });

  const setGuestKey = (p: string, k: string) => {
    const next = { ...guestKeys, [p]: k };
    setGuestKeys(next);
    localStorage.setItem("shilu_guest_keys", JSON.stringify(next));
  };

  const hasKey = isAuthenticated
    ? !!myKeys.data?.find((k) => k.provider === provider)
    : !!guestKeys[provider];
  const keyMask = isAuthenticated
    ? myKeys.data?.find((k) => k.provider === provider)?.keyMask
    : guestKeys[provider]
      ? `${guestKeys[provider].slice(0, 4)}…${guestKeys[provider].slice(-4)}`
      : undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = () => {
    const text = input.trim();
    if (!text || chat.isPending) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    chat.mutate({
      provider,
      guestKey: isAuthenticated ? undefined : guestKeys[provider],
      messages: next.slice(-12),
      selection: selection ?? undefined,
      search,
    });
  };

  return (
    <>
      {!open && (
        <div className="fixed bottom-5 right-5 z-[1000] flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="flex h-13 w-13 items-center justify-center rounded-full bg-[#4a3f2a] p-3.5 text-[#f6f1e3] shadow-lg transition-transform hover:scale-105"
            aria-label="AI 数字导游"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[1000] flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/50 bg-[#f6f1e3]/95 shadow-2xl backdrop-blur-md">
          {/* 头部 */}
          <div className="flex items-center gap-2 border-b border-[#d8cba6] bg-[#4a3f2a] px-3 py-2.5 text-[#f6f1e3]">
            <span className="text-sm font-medium tracking-wide">AI 数字导游</span>
            <span className="text-xs opacity-70">
              {selection ? `当前：${selection}` : "随我同游梅关诗路"}
            </span>
            <button
              className="ml-auto rounded p-1 hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 提供商 + Key */}
          <div className="flex items-center gap-2 border-b border-[#e0d3ae] px-3 py-2">
            <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
              <SelectTrigger className="h-8 w-32 bg-[#faf5e8] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_LABEL) as Provider[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              className="flex items-center gap-1 text-xs text-[#6b5d3f] hover:underline"
              onClick={() => setShowKey(!showKey)}
            >
              <KeyRound className="h-3.5 w-3.5" />
              {hasKey ? keyMask : "填写 API Key"}
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <Switch id="ai-search" checked={search} onCheckedChange={setSearch} />
              <Label htmlFor="ai-search" className="text-xs text-[#6b5d3f]">
                联网
              </Label>
            </div>
          </div>

          {/* 未配置 Key 时的常驻引导条：指引到官网开通后填回 */}
          {!hasKey && !showKey && (
            <button
              onClick={() => setShowKey(true)}
              className="border-b border-[#e0d3ae] bg-[#faf0dc] px-3 py-2 text-left text-[11px] leading-5 text-[#8a5a2e] transition hover:bg-[#f5e8cc]"
            >
              尚未配置 {PROVIDER_LABEL[provider]} API Key——
              {PROVIDER_GUIDE[provider].url
                ? "点这里前往官网免费开通，拿到后填回来即可开聊 →"
                : "点这里填写你的中转站信息 →"}
            </button>
          )}

          {showKey && (
            <div className="space-y-2 border-b border-[#e0d3ae] bg-[#faf5e8] px-3 py-2.5">
              <Input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={`${PROVIDER_LABEL[provider]} API Key`}
                className="h-8 bg-white text-xs"
              />
              <div className="flex gap-2">
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    provider === "custom"
                      ? "中转站 Base URL（必填）"
                      : "Base URL（可选，默认官方接口）"
                  }
                  className="h-8 bg-white text-xs"
                />
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={
                    provider === "kimi"
                      ? "模型（默认 kimi-k2）"
                      : provider === "deepseek"
                        ? "模型（默认 deepseek-chat）"
                        : provider === "openai"
                          ? "模型（默认 gpt-4o-mini）"
                          : "模型名（必填）"
                  }
                  className="h-8 bg-white text-xs"
                />
              </div>
              {PROVIDER_GUIDE[provider].url ? (
                <a
                  href={PROVIDER_GUIDE[provider].url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-[11px] text-[#8a5a2e] underline hover:text-[#6b3f1a]"
                >
                  {PROVIDER_GUIDE[provider].text}
                </a>
              ) : (
                <p className="text-[11px] text-[#8a7a54]">{PROVIDER_GUIDE[provider].text}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#8a7a54]">
                  {isAuthenticated ? "Key 加密保存于服务器，仅本人可用。" : "游客 Key 仅保存在本浏览器。"}
                </p>
                <Button
                  size="sm"
                  className="h-7 bg-[#4a3f2a] text-xs"
                  disabled={keyInput.length < 8 || saveKey.isPending}
                  onClick={() => {
                    if (isAuthenticated) {
                      saveKey.mutate({
                        provider,
                        apiKey: keyInput,
                        baseUrl: baseUrl || undefined,
                        model: model || undefined,
                      });
                    } else {
                      setGuestKey(provider, keyInput);
                      setKeyInput("");
                      setShowKey(false);
                    }
                  }}
                >
                  保存
                </Button>
              </div>
            </div>
          )}

          {/* 消息区 */}
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <div className="rounded-sm border border-[#e0d3ae] bg-[#faf5e8] p-3 text-xs leading-6 text-[#6b5d3f]">
                您好，我是这条梅关诗路的数字导游。想知道某位贬谪诗人如何走过大庾岭，或某首过岭诗的
                来龙去脉，尽管问我。点击左侧诗人后，我还能结合您正在浏览的内容展开讲述。
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${
                    m.role === "user"
                      ? "bg-[#4a3f2a] text-[#f6f1e3]"
                      : "border border-[#e0d3ae] bg-[#faf5e8] text-[#3d3421]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex items-center gap-2 text-xs text-[#8a7a54]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 导游思索中…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 输入区 */}
          <div className="flex gap-2 border-t border-[#e0d3ae] p-2.5">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={hasKey ? "问一问这条诗路…" : "请先填写 API Key"}
              className="min-h-[40px] flex-1 resize-none bg-[#faf5e8] text-sm"
              rows={1}
            />
            <Button
              size="icon"
              className="h-10 w-10 bg-[#4a3f2a]"
              onClick={send}
              disabled={chat.isPending || !input.trim()}
              aria-label="发送"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
