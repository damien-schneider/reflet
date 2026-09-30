import { CodeBlock } from "./code-block";

interface CopyBlockProps {
  content: string;
  label?: string;
}

function CopyBlock({ content, label = "Prompt" }: CopyBlockProps) {
  return (
    <CodeBlock
      code={content}
      copySubject={label.toLowerCase()}
      maxHeightClassName="max-h-96"
      title={label}
      wrap
    />
  );
}

export { CopyBlock };
