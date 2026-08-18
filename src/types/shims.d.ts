// Type the `?url` suffixed font-asset imports used for <link rel="preload">.
declare module "*.woff2?url" {
  const url: string;
  export default url;
}
