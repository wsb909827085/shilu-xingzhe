import { Component, type ReactNode } from "react";

/** 全局错误边界：渲染崩溃时显示可恢复界面，避免整页黄屏无提示 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[shilu] 页面渲染错误:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            background: "#efe6cf",
            color: "#6b5d3f",
            fontFamily: '"Noto Serif SC", serif',
            padding: "24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "18px" }}>页面加载时出了点问题</p>
          <p style={{ fontSize: "13px", maxWidth: "480px", lineHeight: 1.8 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            style={{
              padding: "10px 28px",
              borderRadius: "999px",
              border: "1px solid #c9ba8f",
              background: "#f6f1e3",
              color: "#4a3f2a",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
