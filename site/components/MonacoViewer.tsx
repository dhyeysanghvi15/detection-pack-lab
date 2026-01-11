"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function MonacoViewer({ language, value }: { language: string; value: string }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <Editor
        height="320px"
        theme="vs-dark"
        language={language}
        value={value}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
        }}
      />
    </div>
  );
}

