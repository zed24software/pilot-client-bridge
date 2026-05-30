import { execSync } from "child_process";
import { readFileSync } from "fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const viVersion = `${version}.0`;
const outFile = `dist\\24Client Bridge_Setup_v${version}.exe`;

const regQuery = (key, name) => {
  try {
    const out = execSync(`reg query "${key}" /v "${name}"`, { encoding: "utf8", shell: "cmd.exe" });
    return out.split("\n").find(l => l.includes(name))?.split(/\s{2,}/)[3]?.trim() ?? "";
  } catch { return ""; }
};
const machinePath = regQuery("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment", "Path");
const userPath    = regQuery("HKCU\\Environment", "Path");
const freshEnv    = { ...process.env, PATH: `${machinePath};${userPath}`, Path: `${machinePath};${userPath}` };

console.log(`Building installer v${version}...`);
execSync(
  `makensis /DAPP_VERSION=${version} /DAPP_VI_VERSION=${viVersion} installer.nsi`,
  { stdio: "inherit" }
);

console.log("Signing installer...");
execSync(
  `signtool sign /sha1 7B5A9861DE22E43A7343D8AC0C8D201215190FC4 /fd SHA256 /d "24Client Bridge" "${outFile}"`,
  { stdio: "inherit", env: freshEnv }
);

console.log(`Done: ${outFile}`);
