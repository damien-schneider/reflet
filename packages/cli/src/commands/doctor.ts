import { detectProject, type FileSystemPort } from "../project";
import { SDK_PACKAGE } from "./init";

export interface DoctorCheck {
  hint?: string;
  label: string;
  ok: boolean;
}

export function runDoctor(
  files: FileSystemPort,
  cwd: string
): { checks: DoctorCheck[]; ok: boolean } {
  const manifest = files.read(`${cwd}/package.json`);
  const project = detectProject(files, cwd);
  const entrySource = project.entryFile ? files.read(project.entryFile) : null;
  const env = files.read(project.envFile) ?? files.read(`${cwd}/.env`) ?? "";

  const checks: DoctorCheck[] = [
    {
      hint: "run this from the root of your app",
      label: "package.json found",
      ok: manifest !== null,
    },
    {
      hint: `install it with your package manager: ${SDK_PACKAGE}`,
      label: `${SDK_PACKAGE} installed`,
      ok: manifest?.includes(`"${SDK_PACKAGE}"`) ?? false,
    },
    {
      hint: "supported: Next.js app or pages router, Vite React, React Router",
      label: `entry file detected (${project.framework})`,
      ok: project.entryFile !== null,
    },
    {
      hint: "add <RefletFeedback /> to your app entry — see `reflet prompt`",
      label: "widget mounted",
      ok: entrySource?.includes("RefletFeedback") ?? false,
    },
    {
      hint: `set ${project.envKey} to your fb_pub_… key`,
      label: `${project.envKey} set`,
      ok: new RegExp(`^\\s*${project.envKey}=.+$`, "m").test(env),
    },
  ];

  return { checks, ok: checks.every((check) => check.ok) };
}
