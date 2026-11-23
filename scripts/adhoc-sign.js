// Firma "ad hoc" en Mac: sin certificado de Apple, pero evita el mensaje "está dañada" en Apple Silicon.
const { execFileSync } = require("child_process");
const path = require("path");

exports.default = async function (context) {
  if (context.electronPlatformName !== "darwin") return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "inherit" });
};
