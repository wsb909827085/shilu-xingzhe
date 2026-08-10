import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquarePlus, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import type { PoetView } from "./MapView";
import type { MapNode } from "@db/schema";

const CATEGORIES = [
  { value: "correction", label: "资料勘误" },
  { value: "suggestion", label: "功能建议" },
  { value: "data", label: "提供史料" },
  { value: "other", label: "其他" },
] as const;

const MODULES = [
  { value: "map", label: "地图" },
  { value: "poet", label: "诗人" },
  { value: "poem", label: "诗作" },
  { value: "node", label: "节点" },
  { value: "event", label: "历史事件" },
  { value: "relation", label: "人物关系" },
  { value: "ai", label: "AI 助手" },
  { value: "other", label: "其他" },
] as const;

type Props = {
  poets: PoetView[];
  nodes: MapNode[];
  currentPoet?: string | null;
};

export default function FeedbackDialog({ poets, nodes, currentPoet }: Props) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("suggestion");
  const [module, setModule] = useState<string>(currentPoet ? "poet" : "other");
  const [target, setTarget] = useState<string>(currentPoet ?? "");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setDone(true);
      setContent("");
      setImages([]);
    },
  });

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 4 - images.length)) {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, String(reader.result)]);
      reader.readAsDataURL(f);
    }
  };

  const targetOptions = [
    ...poets.map((p) => ({ value: `poet:${p.slug}`, label: `诗人 · ${p.name}` })),
    ...nodes.map((n) => ({ value: `node:${n.slug}`, label: `节点 · ${n.name}` })),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm text-[#6b5d3f] transition-colors hover:text-[#2e2618]">
          <MessageSquarePlus className="h-4 w-4" /> 反馈建议
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-[#f6f1e3]">
        <DialogHeader>
          <DialogTitle>反馈与建议</DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="py-6 text-center">
            <p className="mb-4 text-sm text-[#6b5d3f]">提交反馈需要先登录账号</p>
            <Button className="bg-[#4a3f2a]" onClick={() => navigate("/login")}>
              去登录 / 注册
            </Button>
          </div>
        ) : done ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#4a3f2a]">已收到您的反馈，感谢！</p>
            <Button variant="outline" className="mt-4" onClick={() => { setDone(false); setOpen(false); }}>
              关闭
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate({
                category: category as "correction" | "suggestion" | "data" | "other",
                module: module as "map" | "poet" | "poem" | "node" | "event" | "relation" | "ai" | "other",
                target: target || undefined,
                content,
                contactEmail: email || undefined,
                images: images.length ? images : undefined,
              });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>反馈类型</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[#faf5e8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>相关模块</Label>
                <Select value={module} onValueChange={setModule}>
                  <SelectTrigger className="bg-[#faf5e8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>关联对象（选填）</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="bg-[#faf5e8]">
                  <SelectValue placeholder="不关联" />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>内容</Label>
              <Textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="请描述您发现的问题或建议…"
                className="bg-[#faf5e8]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>截图（选填，最多 4 张）</Label>
              <div className="flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} className="h-16 w-16 rounded-sm border border-[#d8cba6] object-cover" />
                    <button
                      type="button"
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-[#4a3f2a] p-0.5 text-[#f6f1e3]"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 4 && (
                  <button
                    type="button"
                    className="flex h-16 w-16 items-center justify-center rounded-sm border border-dashed border-[#c9ba8f] text-xs text-[#8a7a54]"
                    onClick={() => fileRef.current?.click()}
                  >
                    ＋ 上传
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>联系邮箱（选填）</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="便于我们回复您"
                className="bg-[#faf5e8]"
              />
            </div>

            {submit.error && <p className="text-sm text-red-600">{submit.error.message}</p>}
            <Button className="w-full bg-[#4a3f2a]" disabled={submit.isPending || !content.trim()}>
              {submit.isPending ? "提交中…" : "提交反馈"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
