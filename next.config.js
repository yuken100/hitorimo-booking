/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // トップページは、静的なホームページ（public/index.html）を表示する。
    // beforeFiles にして、アプリ側に "/" のページがあってもこちらを優先する
    return {
      beforeFiles: [{ source: '/', destination: '/index.html' }],
    };
  },
};

module.exports = nextConfig;
