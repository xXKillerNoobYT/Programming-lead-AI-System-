/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // experimental.reactCompiler was enabled without the required
  // babel-plugin-react-compiler dependency, which broke `next dev`
  // with "Failed to load the `babel-plugin-react-compiler`".
  // Disabled until the dep is intentionally added and benchmarked.
};

export default nextConfig;
