export function SourcePath({ path }: { path: string }) {
  const fileStart = path.lastIndexOf("/") + 1;
  return (
    <span className="dt-path" title={path}>
      <bdi dir="ltr">
        <span className="dt-path-dir">{path.slice(0, fileStart)}</span>
        <span className="dt-path-file">{path.slice(fileStart)}</span>
      </bdi>
    </span>
  );
}
